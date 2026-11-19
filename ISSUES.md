# Issues and todos

Found in a review of the code, installer, build scripts, workflows and docs on 2026-11-13, at commit `d332c90`. Line numbers refer to that commit.

Nothing was compiled or run: a macOS checkout cannot build this tree. Each item says how far it was checked:

- **Confirmed**: the code was read and does what the item says.
- **Likely**: the code path is confirmed, but the effect was reasoned out, not run.
- **Unverified**: a guess worth checking.

Two checks could not run during the review: `npm run check:php` (php.net was unreachable from the sandbox; the rows were compared by hand and all 19 matched), and `gh run list` (blocked locally), so recent CI health is unchecked.

## P1: bugs users will hit

### 1. PHP RC and dev builds crash version parsing

- **Where:** [PHPConfigHelper.cs:948](Server/Config/PHPConfigHelper.cs#L948), [:954](Server/Config/PHPConfigHelper.cs#L954), [:961](Server/Config/PHPConfigHelper.cs#L961), [:1772](Server/Config/PHPConfigHelper.cs#L1772); [ErrorReportingPage.cs:136](Client/Settings/ErrorReportingPage.cs#L136), [:497](Client/Settings/ErrorReportingPage.cs#L497)
- **Evidence:** the version comes straight from the file's version resource, and these lines pass it to `new Version(...)`:
  ```csharp
  // PHPConfigHelper.cs:464
  FileVersionInfo fileVersionInfo = FileVersionInfo.GetVersionInfo(phpexePath);
  return fileVersionInfo.ProductVersion;
  // PHPConfigHelper.cs:1772
  var detected = new Version(info.Version);
  ```
  A value such as `8.5.0RC1` or `8.4.0-dev` throws `FormatException`. The helper `ExtractVersion` ([:366](Server/Config/PHPConfigHelper.cs#L366)) strips such suffixes and is already used at [:561](Server/Config/PHPConfigHelper.cs#L561), but not at these call sites.
- **Impact:**
  - `GetPHPConfigInfo` throws, so the PHP page fails to load while an RC build is active.
  - `RegisterPHPWithIIS` commits the IIS changes ([:1102](Server/Config/PHPConfigHelper.cs#L1102)) before `MakeRecommendedPHPIniChanges(version)` ([:1109](Server/Config/PHPConfigHelper.cs#L1109)), so registering an RC build leaves PHP half-registered with `php.ini` untouched.
  - `PHPService.UnregisterPHPVersion` calls `GetPHPConfigInfo()` ([PHPService.cs:456](Server/PHPService.cs#L456)), so removing any version fails while an RC build is active.
- **Fix:** parse with `ExtractVersion` everywhere a PHP version string becomes a `Version`. The two Client call sites need the same treatment; `ExtractVersion` is private to the server, so the Client needs its own parse or the server should return a clean version.
- **Status:** Likely. The code paths are confirmed. What an RC binary's `ProductVersion` contains is unverified; check one from windows.php.net/qa.

### 2. Remove PHP version ignores registrations whose PHP folder is gone

- **Where:** [PHPConfigHelper.cs:412-414](Server/Config/PHPConfigHelper.cs#L412), used by the guard at [:1178-1179](Server/Config/PHPConfigHelper.cs#L1178) and by `RemoveVersionDialog`
- **Evidence:**
  ```csharp
  if (String.Equals(handler.Modules, "FastCgiModule", StringComparison.OrdinalIgnoreCase) &&
      File.Exists(handler.Executable))
  ```
  ```csharp
  if (String.Equals(handler.Name, _currentPhpHandler.Name, StringComparison.OrdinalIgnoreCase) &&
      GetAllPHPVersions().Count > 1)
      throw new InvalidOperationException(...);
  ```
- **Impact:**
  - A registration whose PHP folder was deleted is not listed, so it cannot be removed in IIS Manager. That is the most likely reason to remove a version. `Remove-PHPVersion -HandlerName` still works.
  - With A (active) and B registered and B's folder deleted, the count is 1, so A can be removed. B's dead handler becomes the active `*.php` mapping and PHP stops serving. `Initialize()` after the commit ([:1201](Server/Config/PHPConfigHelper.cs#L1201)) may then throw, so the UI reports an error for a removal that succeeded.
- **Fix:** count and list every `*.php` FastCGI handler for removal, and mark the missing ones in the dialog instead of hiding them.
- **Status:** Confirmed in code.

### 3. Installing the same version again installs a second copy

- **Where:** [Product.wxs:21](Setup/Product.wxs#L21), [:44-53](Setup/Product.wxs#L44)
- **Evidence:** `Product Id="*"` gives every build a new product code. The upgrade range for older versions ends at `IncludeMaximum="no"`, and the range for newer versions starts at `IncludeMinimum="no"`. Windows Installer compares only the first three version fields.
- **Impact:** a rebuild with the same `x.y.z` matches neither range and installs next to the existing product, with two entries in Installed apps that share components. This hits manual Build MSI runs (which keep the version in source) and a tag like `v2.17.0.1`, which [dotnet-desktop.yml:58](.github/workflows/dotnet-desktop.yml#L58) accepts. Uninstalling one copy probably removes the module provider while the other stays installed (unverified).
- **Fix:** set `IncludeMaximum="yes"` on the older-versions range (or move to `MajorUpgrade` with `AllowSameVersionUpgrades="yes"`), and reject 4-part tags whose 4th field is not 0 in the version check.
- **Status:** Confirmed in code; the uninstall effect is unverified.

### 4. Uninstall fails when IIS was removed first

- **Where:** [SetupAction.cs:39](Setup/PHPManagerSetupHelper/SetupAction.cs#L39)
- **Evidence:**
  ```csharp
  public override void Uninstall(System.Collections.IDictionary savedState)
  {
      base.Uninstall(savedState);
      InstallUtil.RemoveUIModuleProvider("PHP");   // no try/catch
  ```
  The `REMOVEPHP` cleanup just below is wrapped in a try/catch so that it can't fail the uninstall; this call is not.
- **Impact:** `RemoveUIModuleProvider` needs `Microsoft.Web.Administration` and `administration.config`. If IIS or its management tools were removed first, the deferred action throws, the uninstall rolls back, and PHP Manager cannot be removed.
- **Fix:** catch and log, as the `REMOVEPHP` path does.
- **Status:** Likely. The code is confirmed; not run.

## P2: should do

### 5. A new PHP branch is due, and nothing checks for it on a schedule

- **Where:** [php-versions.yml:6-10](.github/workflows/php-versions.yml#L6)
- **Evidence:** the weekly `schedule` is commented out. The check runs only by hand or on pushes that touch `PHPConfigHelper.cs`.
- **Impact:** PHP usually releases a new branch in late November. Until it has a row, PHP Manager reports it obsolete. PHP 8.6's row is in (security support ends 2030-12-31, VS18). Row 8.2 ends 2026-12-31, so it already shows as expiring.
- **Fix:** run `npm run check:php` after each PHP release and add the row. Consider a scheduled run with a keep-alive, or a reminder.
- **Status:** Confirmed (schedule off); the release timing is an expectation.

### 6. Build MSI runs every job step with write access

- **Where:** [dotnet-desktop.yml:26-31](.github/workflows/dotnet-desktop.yml#L26), [:39](.github/workflows/dotnet-desktop.yml#L39); action pins at [actionlint.yml:24](.github/workflows/actionlint.yml#L24), [msi-test.yml:98](.github/workflows/msi-test.yml#L98), [:365](.github/workflows/msi-test.yml#L365), [php-versions.yml:28](.github/workflows/php-versions.yml#L28), [dotnet-desktop.yml:105](.github/workflows/dotnet-desktop.yml#L105), [:111](.github/workflows/dotnet-desktop.yml#L111)
- **Evidence:** workflow-wide `contents: write`, `id-token: write`, `attestations: write`, `artifact-metadata: write`. The single job runs `dist.release.bat`, `choco` and PSGallery installs (#9) with that token, on manual runs too, where nothing is attested or released. `actions/checkout` keeps `persist-credentials: true`. Actions are pinned to major tags (`@v7`, `@v8`, `@v4`), not commit SHAs.
- **Impact:** a compromised build tool or a moved action tag runs with a token that can push and rewrite releases.
- **Fix:** give the build job `contents: read`, and move attestation and the draft release into a tag-only job that downloads the artifact. Set `persist-credentials: false`. Pin actions by SHA; Dependabot ([.github/dependabot.yml](.github/dependabot.yml)) keeps SHA pins updated.
- **Status:** Confirmed.

### 7. Removing a version can delete a FastCGI app that a site's web.config still uses

- **Where:** [PHPConfigHelper.cs:825](Server/Config/PHPConfigHelper.cs#L825)
- **Evidence:** `IsFastCgiApplicationInUse` checks handlers on the current level and in `<location>` paths of `applicationHost.config`, not handlers in site `web.config` files. The uninstall cleanup in [InstallUtil.cs:87](Setup/PHPManagerSetupHelper/InstallUtil.cs#L87) does read site `web.config` files, so the two paths disagree.
- **Impact:** when a site pins a PHP version in its own `web.config` (for example with `Set-PHPVersion -SiteName` while the handlers section is unlocked), removing that version at server level deletes its FastCGI app, and the site returns 500 errors.
- **Fix:** also check each site's root `web.config`, as `InstallUtil` does.
- **Status:** Likely.

### 8. Piping versions into Remove-PHPVersion stops at the active one

- **Where:** [RemovePHPVersionCmdlet.cs:55](Powershell/RemovePHPVersionCmdlet.cs#L55), [BaseCmdlet.cs:69-71](Powershell/BaseCmdlet.cs#L69)
- **Evidence:** refusing to remove the active version throws `InvalidOperationException` (#2's guard), and `BaseCmdlet` reports it with `ReportTerminatingError`.
- **Impact:** `Get-PHPVersion | Remove-PHPVersion -Force` aborts the pipeline when it reaches the active version; the versions after it are not removed.
- **Fix:** report the active-version refusal as a non-terminating error in `RemovePHPVersionCmdlet`.
- **Status:** Confirmed.

### 9. The build installs unpinned tools and ignores their failures

- **Where:** [verify.ps1:1-3](verify.ps1#L1), [release.ps1:7-13](release.ps1#L7), [:38-39](release.ps1#L38)
- **Evidence:**
  - `choco install -y asmspy` is unpinned and its exit code is ignored. If it fails, `$output` is empty and the wrong-assembly check passes silently.
  - `Install-Module VSSetup` and `Update-Module VSSetup` run from PSGallery on every build, and `Get-VSSetupInstance -All -Prerelease` can pick a preview Visual Studio.
  - `release.ps1:7` always prints "MSBuild doesn't exist" (its `if` is gone), and `:13` prints a literal `+`.
  - The exit codes of restore and clean (`:38-39`) are ignored.
- **Impact:** network-dependent, unpinned code runs in the write-token job (#6), and a broken check can pass.
- **Fix:** pin versions or drop the tools (`vswhere` ships on the runner and replaces VSSetup), and check exit codes.
- **Status:** Confirmed.

### 10. `.bat` files are stored and checked out with LF

- **Where:** [.gitattributes:2](.gitattributes#L2), [.editorconfig:29-30](.editorconfig#L29)
- **Evidence:** `* text=auto`, and `git ls-files --eol` shows `i/lf w/lf` for every `.bat`. `.editorconfig` only affects editors.
- **Impact:** whether CI gets CRLF depends on the runner's `core.autocrlf`. `cmd` can misjump `goto` labels in LF batch files.
- **Fix:** add `*.bat text eol=crlf` and `*.cmd text eol=crlf` to `.gitattributes`, then `git add --renormalize .`.
- **Status:** Confirmed; no failure observed so far.

### 11. Failed installs and upgrades leave things half-done

- **Where:** [Product.wxs:271-274](Setup/Product.wxs#L271), [:311](Setup/Product.wxs#L311)
- **Evidence:** the deferred `InstallPHPSetup` action has no rollback action. `RemoveExistingProducts` runs `Before="InstallInitialize"`, outside the install transaction.
- **Impact:** if the install fails after `InstallPHPSetup` has written `administration.config`, the module provider stays registered against rolled-back GAC assemblies, and IIS Manager may error on every start. A failed upgrade can leave no PHP Manager installed at all.
- **Fix:** add a rollback custom action that removes the module provider. Moving `RemoveExistingProducts` later needs care; the comment at [:286-310](Setup/Product.wxs#L286) explains why it is early.
- **Status:** Likely.

### 12. Doc errors

- [docs/ai/build-and-ci.md:11](docs/ai/build-and-ci.md#L11) says each workflow's header comment says what it does. `actionlint.yml` and `force-cancel.yml` have none, and the [msi-test.yml:3-9](.github/workflows/msi-test.yml#L3) header leaves out the `Remove-PHPVersion` test and the `REMOVEPHP=1` check. The old AGENTS.md described both; the split lost them.
- [docs/INSTALL.md:9](docs/INSTALL.md#L9) says the script "does steps 1 to 4 below", then lists 5 items that don't match sections 1 to 4.
- [docs/ai/release-notes.md:6](docs/ai/release-notes.md#L6) says exit 1 means a row and php.net disagree. [release-notes.mjs:3](.github/scripts/release-notes.mjs#L3) also exits 1 when a date cannot be checked, such as when the network is down.
- Nothing says to run `npm ci` first. `npm run check:actions` fails on a fresh clone; only [actionlint.yml](.github/workflows/actionlint.yml) runs `npm ci`.
- [docs/RELEASING.md](docs/RELEASING.md) examples still use 2.16.0.
- [docs/INSTALL.md](docs/INSTALL.md) removal: the FastCGI app is removed only when no other mapping uses it ([PHPConfigHelper.cs:1191](Server/Config/PHPConfigHelper.cs#L1191)). Registration prefers `php-cgi-fcgi.ini`, and `php.ini-recommended` over `php.ini-production`.
- **Status:** Confirmed.

## P3: cleanup

### 13. Dead files

- [Powershell/Documentation/copyhelp.bat](Powershell/Documentation/copyhelp.bat) copies a file that doesn't exist into a hard-coded GAC path for version 2.1.0.0. Nothing references it.
- `dist.debug.bat` and `dist.sign.bat` are referenced nowhere, workflows included.
- [sign.ps1:1](sign.ps1#L1) and [sign.installers.ps1:1](sign.installers.ps1#L1) only accept upstream's certificate thumbprint `8ef9a86d…`, so signing always skips (with exit 0). If a certificate were present, `signtool /a` would pick any certificate in the store. `sign.installers.ps1` also ignores the sign step's exit code and prints `"$_.FullName"` (interpolation bug). `sign.txt` is read only by `sign.ps1`.
- **Fix:** delete the dead files; delete the signing scripts or make the thumbprint a parameter.
- **Status:** Confirmed.

### 14. Upstream leftovers

- `Manufacturer="LeXtudio"` ([Product.wxs:25](Setup/Product.wxs#L25)), snap-in vendor "PHP Manager Project", and the 2011 copyright in `SharedAssembyInfo.cs`. Keep the registry key `Software\LeXtudio\PhpManager` ([Product.wxs:102](Setup/Product.wxs#L102)): `Client/Config/PHPIniFile.cs` reads it.
- Unused `ProductCode` and `PackageCode` defines ([Product.wxs:6-7](Setup/Product.wxs#L6)) suggest fixed codes; both are `*`.
- Component Id `...tr_BR.comp` ([Product.wxs:91](Setup/Product.wxs#L91), [:199](Setup/Product.wxs#L199)) means tr-TR.
- Upstream comments with a dead MSDN link ([Product.wxs:260-310](Setup/Product.wxs#L260)), and `VS90COMNTOOLS` in [release.ps1:37](release.ps1#L37).
- Post-build events ([PHPManager.csproj:127-131](Server/PHPManager.csproj#L127), same in Client and Powershell) look for `VsDevCmd.bat` under `VS120COMNTOOLS` (set only by `release.ps1`) or hard-coded VS 2022 Enterprise and Preview paths. An IDE build on Community or Build Tools probably can't find `gacutil`. `> NULL` writes a file named `NULL`.
- **Status:** Confirmed.

### 15. Installer launch checks are loose

- [Product.wxs:244-245](Setup/Product.wxs#L244): `IISMAJORVERSION >= "#8" OR IISMAJORVERSION = "#10"` compares strings, so a future IIS 11 would be refused.
- Only IIS is checked, not the IIS Management Console. Without it, the install likely fails with a bare "Error 1001".
- All 26 files are `Vital="no"`, the GAC components included, so a failed GAC copy doesn't fail the install.
- **Status:** Confirmed; effects Likely.

### 16. `REMOVEPHP=1` edge cases

- [InstallUtil.cs:120](Setup/PHPManagerSetupHelper/InstallUtil.cs#L120) expands environment variables in handler paths, but [:97](Setup/PHPManagerSetupHelper/InstallUtil.cs#L97) compares FastCGI `fullPath` raw. Apps stored as `%SystemDrive%\php\php-cgi.exe` by other tools are left behind.
- Only site-root `web.config` files are cleaned ([:87](Setup/PHPManagerSetupHelper/InstallUtil.cs#L87)); application and virtual-directory `web.config` files keep `*.php` mappings to a FastCGI app that no longer exists.
- One `CommitChanges` at the end ([:104](Setup/PHPManagerSetupHelper/InstallUtil.cs#L104)): a failure is only logged, and the cleanup may be partly applied.
- **Status:** Likely.

### 17. Smaller CI and script items

- No `setup-node` step and no `engines` in `package.json`. The scripts need Node 18+ and use the runner's Node.
- `windows-2022` ([dotnet-desktop.yml:35](.github/workflows/dotnet-desktop.yml#L35), [msi-test.yml:74](.github/workflows/msi-test.yml#L74)) will retire eventually; WiX 3 works only because that image ships it.
- `Install IIS Manager` ([dotnet-desktop.yml:80](.github/workflows/dotnet-desktop.yml#L80)) doesn't check `.Success`, unlike `msi-test.yml`.
- Re-running a tag build after its release was published attests the MSIs before the release step fails, leaving an attestation for files that were never released.
- `fetchBranches` ([php-versions.mjs:33](.github/scripts/php-versions.mjs#L33)) and the jq at [msi-test.yml:54-55](.github/workflows/msi-test.yml#L54) drop a branch with no `security_support_end`, so it is never reported missing.
- The `ROW` regex ([php-versions.mjs:7](.github/scripts/php-versions.mjs#L7)) is unanchored, so a commented-out row still counts; a row split over lines is skipped silently.
- `githubRepo()` ([repo.mjs:35](.github/scripts/repo.mjs#L35)) rejects an origin URL with a trailing slash.
- The x86 MSI is never tested ([msi-test.yml:9](.github/workflows/msi-test.yml#L9)), and the custom action runs 32-bit in both MSIs (`Setup/InstallUtilLib.dll` is 32-bit).
- New UI strings are missing from the 9 satellite resx files; they fall back to English.
- **Status:** Confirmed.

## Proposals

### 18. Table of PHP versions in the README

Show which PHP branches PHP Manager knows, so users can see at a glance what's current. Any `php-cgi.exe` can be registered; the rows decide only whether PHP Manager shows it as supported, expiring (within 180 days of the end of security support) or obsolete. So the table is really "what PHP Manager warns about", and it is worth saying that in one line above it.

Draft from the current rows. PHP 8.6 was added on 2026-11-19; the other rows are the draft from `d332c90` on 2026-11-13:

| PHP | Security support ends | Visual C++ runtime | Status |
| --- | --- | --- | --- |
| 8.6 | 2030-12-31 | VS18 | Supported |
| 8.5 | 2029-12-31 | VS17 | Supported |
| 8.4 | 2028-12-31 | VS17 | Supported |
| 8.3 | 2027-12-31 | VS16 | Supported |
| 8.2 | 2026-12-31 | VS16 | Expiring |

Obsolete, in a section of its own: 8.1, 8.0, 7.4, 7.3, 7.2, 7.1, 7.0, 5.6, 5.5, 5.4, 5.3, 5.2, 5.1, 5.0, 4.4.

- **Keep it from drifting:** a hand-written table becomes a fourth place to update with each row. Generate it from the rows instead: a script on top of `parseRows` in [php-versions.mjs](.github/scripts/php-versions.mjs) that rewrites the section between two markers in the README, the way `npm run changelog` regenerates `CHANGELOG.md`. `npm run check:php` can then also fail when the README table differs from the rows. A status that depends on today's date goes stale between runs, so either show only dates and let the reader compare, or regenerate as part of the release checklist.
- **Where:** README.md, in a "Supported PHP versions" section after Installation. Add a step to [docs/RELEASING.md](docs/RELEASING.md) and AGENTS.md's row steps.
- **Effort:** small.

### 19. Download and install PHP from the PHP page

A task on the PHP page that lists the supported PHP branches, downloads the chosen one into `C:\PHP\<version>` (editable) and registers it.

**Feasible, medium effort.** The pieces exist:

- **Source:** windows.php.net's `releases.json` lists each current branch with the NTS x64 zip and its SHA-256. The quick setup script in [docs/INSTALL.md](docs/INSTALL.md) already uses it, and so does [msi-test.yml](.github/workflows/msi-test.yml).
- **Registration:** after extracting, the existing `RegisterPHPWithIIS(path)` ([PHPConfigHelper.cs:1010](Server/Config/PHPConfigHelper.cs#L1010)) does the rest.
- **UI:** dialogs like `RemoveVersionDialog` and `RegisterPHPDialog` are `TaskForm`s that already run slow work with `StartAsyncTask`, and the page adds tasks the same way.
- **Offering only known branches:** intersect `releases.json` with the `knownPhpVersions` rows, so the list matches what PHP Manager calls supported.

What it takes:

- **Server side, not client side.** IIS Manager can manage a remote server, and PHP must land on that server, so the download, hash check and extraction belong in a new `[ModuleServiceMethod]` on `PHPService`, called through `PHPModuleProxy`. Nothing in the tree downloads or unzips today: the server project needs references to `System.IO.Compression` and `System.IO.Compression.FileSystem` (`ZipFile` is in .NET 4.5+), and `HttpWebRequest` or `WebClient` with TLS 1.2 enabled explicitly.
- **A PowerShell cmdlet first.** An `Install-PHPVersion -Branch 8.5 [-Path ...]` cmdlet on the same server method can be tested in Test MSI on a clean runner. The UI then becomes a thin dialog over a tested path. The repository has no other tests.
- **Visual C++ runtime:** installing it means running Microsoft's `vc_redist` installer, which is a bigger step. Start by checking for it with the existing `ValidateLifecycle` runtime check and linking to the download.

Risks to check before building:

- **Remote management:** proxy calls run inside WMSvc, as its service account. Whether that account may write to `C:\PHP`, and whether a 30 MB download within one call hits a timeout, is unknown. A local-only first version (hidden when connected remotely) avoids both.
- **Servers without internet access, or behind a proxy:** fail with a clear message and keep "Register new PHP version" for a manual download.
- **Trust:** PHP Manager runs as administrator and would download executables. Verify the SHA-256 from `releases.json` over HTTPS, the same trust as the manual steps, and refuse a non-empty target folder.
- **Architecture:** pick x86 builds on 32-bit Windows; PHP has no ARM64 Windows builds, so x64 runs emulated there.
- **Strings:** new UI text goes in `Client/Resources.resx`.

## Checked and fine

- Copyright headers: fork-added files carry the jsuomi line, and changed upstream files keep Ruslan Yakushev's line.
- Every cmdlet, parameter and UI label in [docs/INSTALL.md](docs/INSTALL.md) exists in the code; all 7 images are present and referenced.
- The Build MSI → Test MSI chain tests the right artifact for tag and manual runs; the tag and `AssemblyFileVersion` check is correct; `SHA256SUMS.txt` works with `shasum -c`.
- Workflow inputs reach scripts through `env:` and run ids are checked to be digits; Test MSI's `workflow_run` has read-only permissions and no secrets.
- `npm run check:actions` passes.
- `CHANGELOG.md` lacks the newest tag's compare link and tagged commit by design: the file is generated before the tag exists.
- Nothing under `bin/`, `obj/`, `*.user` or `node_modules` is tracked. `phpmgrpublic.snk` is upstream's published key pair; keep it so assembly identity survives upgrades from upstream.
