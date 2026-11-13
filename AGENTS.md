# PHP Manager for IIS

Private fork of the archived PHP Manager 2 for IIS. The ongoing work is keeping the known-PHP list current. Treat the existing architecture as fixed, and change only the behavior the task names, in the style of the file you edit.

WinForms module for IIS Manager on .NET Framework 4.6.2. It registers `php-cgi.exe` as a FastCGI handler and edits `php.ini`. License is MS-PL (`LICENSE`).

## Layout

`PHPManager.sln` is four class libraries. Each is strong-named with `phpmgrpublic.snk` and versioned from `SharedAssembyInfo.cs`. Keep that filename spelling: the projects and the Build MSI workflow link it as written.

| Project | Assembly | Role |
| --- | --- | --- |
| `Client/` | `Web.Management.PHP.Client` | IIS Manager UI. `PHPModule` registers the pages. |
| `Server/` | `Web.Management.PHP` | `PHPProvider` and `PHPService`. IIS changes go through `Server/Config/PHPConfigHelper.cs`. |
| `Powershell/` | `Web.Management.PHP.PowerShell` | Cmdlets. Project-references the server. |
| `Setup/PHPManagerSetupHelper/` | setup custom action | Registers the UI module provider. WiX itself is `Setup/PHPManagerForIIS.wixproj`, outside the solution. |

The module supports Server and Site scope. UI calls go through `PHPModuleProxy` to `[ModuleServiceMethod]`s on `PHPService`. Those methods pass through to the server in Release and run in-process in Debug.

`Server/PHPManager.csproj` also compiles these Client files into the server assembly: `Client/Config/PHPConfigInfo.cs`, `PHPConfigIssue.cs`, `PHPIniFile.cs`, `PHPRegistrationType.cs`, `PHPVersion.cs`, and `Client/RemoteObject.cs`. An edit there ships in both assemblies.

UI strings live in `Client/Resources.resx`, with satellites in `Client/Languages/`. Edit the resx. `*.Designer.cs` is generated. Keep the existing copyright header on files that have one. `Client/` sets `LangVersion` 8.0; stay at the language level the file already uses.

## PHP releases

Any `php-cgi.exe` can be registered. A release is known only as a row in `knownPhpVersions` inside `PHPConfigHelper.ValidateLifecycle`. A missing `major.minor` is reported obsolete. The date is the end of security support from [php.net](https://www.php.net/supported-versions.php): past that date is obsolete, and inside 180 days is expiring. The optional third argument is the VC++ runtime to check (`msvcp{major}0.dll`, compared on the file minor). Copy it from the newest row that uses the same CRT.

Recommended `php.ini` extensions already branch at 7.0 and 8.0 in `MakeRecommendedPHPIniChanges`. Later 8.x releases inherit the 8.0 set (`php_gd.dll`, and no `php_xmlrpc.dll` or `php_gd2.dll`).

The ini file used at registration is `php-cgi-fcgi.ini`, then `php.ini`. If neither exists, `php.ini-production` or `php.ini-recommended` is copied to `php.ini`.

PHP lifecycle rows and the product version are separate. Rows do not change `SharedAssembyInfo.cs`. Bump `AssemblyVersion` and `AssemblyFileVersion` there when shipping a build of this tool. When cutting a release, follow the checklist in `README.md`. The Build MSI workflow can stamp `SharedAssembyInfo.cs` from its `tag` input for that run; the stamp stays in the run. Pushing a `v*` tag runs it as a release: the tag must match `AssemblyFileVersion`, and the run creates a draft GitHub release with `PHPManagerForIIS-<version>-x86.msi`, `PHPManagerForIIS-<version>-x64.msi` and `SHA256SUMS.txt`.

## Release notes

When asked for release notes, draft them in chat for the user to paste into the draft release. GitHub's generated notes hold only the changelog link, because changes land on `master` without pull requests.

1. Find the previous **published** release: `gh release list --exclude-drafts --limit 1 --json tagName --jq '.[0].tagName'`. Compare against that tag. A discarded or unpublished draft can leave a newer tag in between, and its changes still belong in these notes. If `git` or `gh` is unavailable, ask the user for the previous release tag.
2. Diff the rows: `git diff <previous>..HEAD -- Server/Config/PHPConfigHelper.cs`. Each new row is an "Added" line. Each changed date is an "Updated" line with the new date. Scan `git log <previous>..HEAD --oneline` for other user-visible changes: installer, UI, and how releases are built.
3. Check every date you list against [php.net](https://www.php.net/supported-versions.php). Raise a mismatch with the user before writing it into the notes.

The notes are done when every row change since the previous release appears, and each listed date matches both the code and php.net. Use this shape:

```markdown
## Changes
- Added PHP 8.6 to the known versions
- Updated end-of-support dates to php.net's current schedule:
  - PHP 8.5: 31 Dec 2029
- PHP Manager marks a version as expiring 180 days before that date, and obsolete after it

## Downloads
- `PHPManagerForIIS-<version>-x64.msi` for 64-bit Windows
- `PHPManagerForIIS-<version>-x86.msi` for 32-bit Windows

The installers are not code-signed. Check them with `SHA256SUMS.txt`:
`shasum -a 256 -c SHA256SUMS.txt`, or `Get-FileHash -Algorithm SHA256` on Windows.

**Full Changelog**: https://github.com/jsuomi/phpmanager/compare/<previous>...v<version>
```

## Build

Compilation needs Windows, Visual Studio, and the IIS Management Tools. `Microsoft.Web.Administration` and `Microsoft.Web.Management` resolve from `%WINDIR%\System32\inetsrv`. Post-build events GAC-install the outputs, so a local build wants an elevated prompt. Verification is that MSI build. The repository has no test project. `npm run check:actions` lints `.github/workflows/` with actionlint, and the Actionlint workflow runs it in CI.

`npm run check:php` (`.github/scripts/check-php-versions.mjs`) compares the `knownPhpVersions` rows with php.net's `releases/branches.php`. It fails when a supported branch has no row or any row's date differs, ended branches included. The PHP versions workflow runs it on pushes that touch `PHPConfigHelper.cs` and by hand. Its weekly schedule is commented out. The Test MSI workflow (`msi-test.yml`) runs after each successful Build MSI run, or by hand with a run id. On a clean `windows-2022` runner it installs the x64 MSI, registers each PHP branch that php.net still supports and windows.php.net's `releases.json` has a build of, with `New-PHPVersion`, checks a page served through IIS, then uninstalls. One more job, with the newest of those PHP branches, first installs the newest published release older than the build and registers PHP with it. It then installs the build over it and checks that the upgrade replaced the old version and kept the PHP registration. With no older release, that job warns and tests a fresh install.

The workflow runs `dist.release.bat`: compile via `build.net35.bat` and `release.ps1`, then WiX x86 and x64 MSIs (`PHPManagerForIIS_x86.msi`, `PHPManagerForIIS_x64.msi`). `build.net35.bat` is the historical name; the projects target `v4.6.2`. `sign.ps1` skips signing when its certificate is absent. A macOS checkout cannot compile this tree.
