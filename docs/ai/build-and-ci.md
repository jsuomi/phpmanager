# Build and CI

## Build

Compiling needs Windows, Visual Studio, and the IIS Management Tools. `Microsoft.Web.Administration` and `Microsoft.Web.Management` resolve from `%WINDIR%\System32\inetsrv`. Post-build events GAC-install the outputs, so a local build needs an elevated prompt.

`dist.release.bat` compiles through `build.net35.bat` (a historical name: the projects target v4.6.2) and `release.ps1`, then builds the x86 and x64 MSIs with WiX (`Setup/PHPManagerForIIS.wixproj`). `sign.ps1` skips signing when its certificate is absent.

## Workflows

Each workflow's header comment says what it does and when it runs. After editing one, run `npm run check:actions`; the Actionlint workflow runs it in CI too.

Test MSI (`msi-test.yml`): run `msiexec` only from a PowerShell process that has not loaded the PHP Manager snap-in. The snap-in keeps its DLL open, Windows Installer's Restart Manager kills that process, and the step fails with exit code 1 and no output. Load the snap-in after `msiexec` in the same step, or in a step of its own.

## Releases

A release of PHP Manager is cut by following the Release checklist in `README.md`: version bump in `SharedAssembyInfo.cs`, changelog, `v*` tag, then the checks on the draft. Row changes alone never bump the version.
