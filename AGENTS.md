# PHP Manager for IIS

Private fork of the archived PHP Manager 2 for IIS: a WinForms module for IIS Manager on .NET Framework 4.6.2 that registers `php-cgi.exe` as a FastCGI handler and edits `php.ini`. The ongoing work is keeping the PHP branch rows current. Keep the existing architecture, and change only the behavior the task names, in the style of the file you edit.

Words used here: a PHP **branch** is a `major.minor` such as 8.4, and its **row** is its entry in `knownPhpVersions`. A **release** is a release of PHP Manager itself.

## Rules for every edit

- `PHPManager.sln` has four strong-named class libraries: `Client/` (IIS Manager UI), `Server/` (`PHPProvider` and `PHPService`; IIS changes go through `Server/Config/PHPConfigHelper.cs`), `Powershell/` (cmdlets) and `Setup/PHPManagerSetupHelper/` (setup custom action). The WiX project `Setup/PHPManagerForIIS.wixproj` is outside the solution.
- The module supports Server and Site scope. UI calls go through `PHPModuleProxy` to `[ModuleServiceMethod]`s on `PHPService`, which run on the server in Release and in-process in Debug.
- `Server/PHPManager.csproj` also compiles `Client/Config/PHPConfigInfo.cs`, `PHPConfigIssue.cs`, `PHPIniFile.cs`, `PHPRegistrationType.cs`, `PHPVersion.cs` and `Client/RemoteObject.cs`. An edit there ships in both assemblies.
- Generated files: for `*.Designer.cs`, edit `Client/Resources.resx` (satellites in `Client/Languages/`); for `CHANGELOG.md`, edit `.github/scripts/changelog.mjs` and run `npm run changelog`.
- Copyright headers: keep the existing header, including Ruslan Yakushev's line on files this fork changes (the MS-PL in `LICENSE` requires it). A new source file gets the same block with `Copyright (C) <year> jsuomi`.
- Language level: use the one the file already uses. `Client/` sets `LangVersion` 8.0.
- `SharedAssembyInfo.cs` keeps that spelling: the projects and the Build MSI workflow link it by name.

## Updating PHP branch rows

Rows only drive warnings: any `php-cgi.exe` can be registered. A branch with no row is reported obsolete, a row past its date is obsolete, and a row within 180 days of its date is expiring.

1. Run `npm run check:php`. It lists each supported branch with no row and each row whose date differs from php.net's end of security support, ended branches included.
2. In `PHPConfigHelper.ValidateLifecycle`, add a row for each new branch and fix each listed date.
3. Give a new row the third argument (the VC++ runtime: `msvcp{major}0.dll`, compared on the file minor) of the newest row that uses the same CRT.
4. Leave `MakeRecommendedPHPIniChanges` as it is for a new 8.x branch: it inherits the 8.0 extension set. A new major version needs a decision there; ask the user.
5. Leave `SharedAssembyInfo.cs` as it is: the version is bumped when a release is cut.

The rows are done when `npm run check:php` exits 0.

## Checking your work

Compiling needs Windows, so from a macOS checkout check with `npm run check:php` (rows) and `npm run check:actions` (workflows). The MSI build in CI is the compile check; there is no test project.

## More

- Drafting release notes: [docs/ai/release-notes.md](docs/ai/release-notes.md)
- Building on Windows, editing `.github/workflows/` or the build scripts, or cutting a release: [docs/ai/build-and-ci.md](docs/ai/build-and-ci.md)
