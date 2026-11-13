# PHP Manager 2 for IIS

[![Build MSI](https://github.com/jsuomi/phpmanager/actions/workflows/dotnet-desktop.yml/badge.svg)](https://github.com/jsuomi/phpmanager/actions/workflows/dotnet-desktop.yml)
[![Test MSI](https://github.com/jsuomi/phpmanager/actions/workflows/msi-test.yml/badge.svg)](https://github.com/jsuomi/phpmanager/actions/workflows/msi-test.yml)

See [CHANGELOG.md](CHANGELOG.md) for what changed in each release of this fork.

---

# IMPORTANT WARNING

- This is a private fork of the public archive for phpmanager
- This is an attempt to add a few more versions of PHP to the installer
- No guarantees of any kind are given, everything is provided "as-is" under [MS-PL](https://opensource.org/license/ms-pl)

**You were warned.**

---

## Installation and setup

### Quick setup with PowerShell

This script does steps 1 to 4 below in one go:
1. adds IIS with CGI and IIS Manager
2. installs the newest PHP Manager release, after checking it against `SHA256SUMS.txt`
3. installs the Visual C++ runtime
4. downloads PHP into `C:\PHP\<version>`, after checking it against windows.php.net's hash
5. registers that PHP with IIS

Run it in **Windows PowerShell as administrator**, not PowerShell 7: the PHP Manager cmdlets only load in Windows PowerShell 5.1. Paste the whole block at once; it stops at the first failed step. Set `$PhpBranch` to the PHP version you want. To add another PHP version later, run it again with a different `$PhpBranch`; the other parts are safe to repeat.

```powershell
& {
$PhpBranch = '8.5'                                   # PHP version to install
$PhpDir    = "C:\PHP\$PhpBranch"                     # must not exist yet, or be empty
$dl        = Join-Path $env:TEMP 'phpmanager-setup'  # downloads go here

if ($PSVersionTable.PSEdition -ne 'Desktop') { throw 'Run this in Windows PowerShell 5.1, not PowerShell 7.' }
if (-not ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole('Administrators')) { throw 'Run this as administrator.' }
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'             # much faster downloads in Windows PowerShell
[Net.ServicePointManager]::SecurityProtocol = [Net.ServicePointManager]::SecurityProtocol -bor [Net.SecurityProtocolType]::Tls12
New-Item -ItemType Directory -Force $dl | Out-Null

# 1. IIS with CGI (FastCGI) and IIS Manager
if ((Get-CimInstance Win32_OperatingSystem).ProductType -eq 1) {
    Enable-WindowsOptionalFeature -Online -All -NoRestart -FeatureName IIS-WebServerRole, IIS-CGI, IIS-ManagementConsole | Out-Null
} else {
    Install-WindowsFeature -Name Web-Server, Web-CGI -IncludeManagementTools | Out-Null
}

# 2. PHP Manager: the newest release, checked against SHA256SUMS.txt
$release = Invoke-RestMethod https://api.github.com/repos/jsuomi/phpmanager/releases/latest
$msi  = $release.assets | Where-Object name -like '*-x64.msi'
$sums = $release.assets | Where-Object name -eq 'SHA256SUMS.txt'
Invoke-WebRequest $msi.browser_download_url -OutFile "$dl\$($msi.name)"
Invoke-WebRequest $sums.browser_download_url -OutFile "$dl\SHA256SUMS.txt"
$expected = (Select-String -Path "$dl\SHA256SUMS.txt" -SimpleMatch $msi.name).Line.Split(' ')[0]
if ((Get-FileHash "$dl\$($msi.name)").Hash -ne $expected) { throw "$($msi.name) does not match SHA256SUMS.txt" }
$p = Start-Process msiexec.exe -Wait -PassThru -ArgumentList '/i', "`"$dl\$($msi.name)`"", '/passive', '/norestart'
if ($p.ExitCode -notin 0, 3010) { throw "PHP Manager setup failed with exit code $($p.ExitCode)" }

# 3. Visual C++ runtime, x64. On ARM64 Windows it installs ARM64 parts too, which is expected.
Invoke-WebRequest https://aka.ms/vs/17/release/vc_redist.x64.exe -OutFile "$dl\vc_redist.x64.exe"
$p = Start-Process "$dl\vc_redist.x64.exe" -Wait -PassThru -ArgumentList '/install', '/passive', '/norestart'
if ($p.ExitCode -notin 0, 1638, 3010) { throw "Visual C++ runtime setup failed with exit code $($p.ExitCode)" }   # 1638: a newer one is installed

# 4. PHP: the Non Thread Safe x64 build, checked against windows.php.net's releases.json
$php = (Invoke-RestMethod https://downloads.php.net/~windows/releases/releases.json).$PhpBranch
if (-not $php) { throw "windows.php.net has no current build of PHP $PhpBranch" }
$zip = ($php.PSObject.Properties | Where-Object Name -match '^nts-v[cs]\d+-x64$' | Select-Object -First 1).Value.zip
Invoke-WebRequest "https://downloads.php.net/~windows/releases/$($zip.path)" -OutFile "$dl\$($zip.path)"
if ((Get-FileHash "$dl\$($zip.path)").Hash -ne $zip.sha256) { throw "$($zip.path) does not match releases.json" }
Expand-Archive "$dl\$($zip.path)" -DestinationPath $PhpDir

# 5. Register PHP with IIS and show the result
if (-not (Get-PSSnapin PHPManagerSnapin -ErrorAction SilentlyContinue)) { Add-PSSnapin PHPManagerSnapin }
New-PHPVersion -ScriptProcessor "$PhpDir\php-cgi.exe"
Get-PHPConfiguration
}
```

Then check it with **Check phpinfo()** in IIS Manager (step 5), and configure PHP (step 6). The downloads in `%TEMP%\phpmanager-setup` can be deleted afterwards.

The same setup by hand:

### 1. Check the requirements

- Windows Server 2012 / Windows 8 or later, with IIS 8 or later
- .NET Framework 4.6.2 or later (built into Windows Server 2016 and later)
- IIS with the **CGI** feature, which provides FastCGI, and the **IIS Management Console**

Windows 11 on ARM64 works too: version 2.16.0 has been tested there with the x64 MSI, the x64 PHP build and the x64 Visual C++ runtime. PHP has no ARM64 Windows builds, so x64 PHP runs under emulation.

To add the IIS features, run this in an elevated PowerShell on Windows Server:

```powershell
Install-WindowsFeature -Name Web-Server, Web-CGI -IncludeManagementTools
```

On Windows 10 or 11:

```powershell
Enable-WindowsOptionalFeature -Online -All -FeatureName IIS-WebServerRole, IIS-CGI, IIS-ManagementConsole
```

### 2. Install PHP Manager

1. Download `PHPManagerForIIS-<version>-x64.msi` and `SHA256SUMS.txt` from [Releases](https://github.com/jsuomi/phpmanager/releases). Use the x86 MSI only on 32-bit Windows.
2. Optional: check the download. The installers are not code-signed.
   - `Get-FileHash -Algorithm SHA256 .\PHPManagerForIIS-<version>-x64.msi` must match the line in `SHA256SUMS.txt`
   - With the GitHub CLI: `gh attestation verify PHPManagerForIIS-<version>-x64.msi -R jsuomi/phpmanager`
3. Close IIS Manager and run the MSI as an administrator.

To upgrade, run the newer MSI. It replaces the installed version and keeps your PHP registrations.

### 3. Download PHP

1. Get PHP from [windows.php.net/download](https://windows.php.net/download/). Pick the **Non Thread Safe** (NTS) x64 zip: IIS runs PHP through FastCGI, which uses the NTS build.
2. Extract it to its own folder, such as `C:\PHP\8.5`. Use one folder per PHP version.
3. Install the Visual C++ runtime the build needs. The download page names it, such as VS17 for PHP 8.4 and later. The [latest Visual C++ Redistributable](https://learn.microsoft.com/cpp/windows/latest-supported-vc-redist) (x64) covers VS16 and VS17 builds. On ARM64 Windows, the x64 installer also installs ARM64 parts; that's expected.

### 4. Register PHP with IIS

1. Open **IIS Manager** and select the server node.
2. Open **PHP Manager**. Until PHP is registered, it shows **PHP is not enabled**.

   ![PHP Manager in IIS Manager](docs/images/iis-manager-home.png)

3. Under **PHP Setup**, choose **Register new PHP version** and browse to `php-cgi.exe`, e.g. `C:\PHP\8.5\php-cgi.exe`.

   ![Register new PHP version](docs/images/register-php.png)

Registering PHP:

- adds a FastCGI application and a `*.php` handler mapping
- adds `index.php` as a default document
- creates `php.ini` from `php.ini-production` if the folder has no `php.ini`
- applies recommended settings and enables common extensions, such as curl, mbstring, mysqli, openssl and gd

The PHP Manager page then shows the PHP version, `php.ini` path and handler mapping:

![PHP Manager after registering PHP 8.5](docs/images/php-manager.png)

If it shows **Not optimal PHP configuration detected on this machine**, choose **View recommendations**, select the issues and choose **OK** to fix them.

### 5. Check that PHP runs

Under **PHP Setup**, choose **Check phpinfo()**, then pick a site and URL. You should see the `phpinfo()` page for the version you registered, with **Server API** `CGI/FastCGI`.

![phpinfo() output](docs/images/phpinfo.png)

### 6. Configure PHP

From the PHP Manager page:

- **PHP Settings**
  - **Configure error reporting**: choose **Development machine** or **Production machine**, and set the error log file
  - **Set runtime limits**: execution time, memory limit, upload and POST sizes
  - **Manage all settings**: add, edit or remove any `php.ini` directive. Set `date.timezone` here.
- **PHP Extensions**: **Enable or disable an extension**, or **Add an extension** from a DLL

**Open php.ini**, in the **Actions** pane of the settings and extensions pages, edits the file directly.

![PHP Extensions](docs/images/php-extensions.png)

![PHP Runtime Limits](docs/images/runtime-limits.png)

### 7. Choose the PHP version

Register each version you want to use (step 4), then:

- **Whole server**: select the server node, open **PHP Manager**, and choose **Change PHP version**. The list shows each registered version with its path.

  ![Change PHP version](docs/images/change-php-version.png)

- **One site**: select the site, open **PHP Manager**, and choose **Change PHP version**. The site then gets its own copy of the handler mappings, and its PHP Manager page shows **Handler mapping: Local** instead of **Inherited**. Later changes at server level don't reach that site.

PHP Manager warns when a version's security support ends within 180 days (**This PHP release will expire soon**) and after it has ended (**This PHP release is already obsolete**). It also warns when the Visual C++ runtime the version needs is missing. To move to a newer PHP, download it (step 3), register it (step 4), then change the version.

### PowerShell

The MSI also installs cmdlets as a snap-in for Windows PowerShell 5.1. They don't load in PowerShell 7 (`pwsh`). Run them elevated:

```powershell
Add-PSSnapin PHPManagerSnapin

New-PHPVersion -ScriptProcessor C:\PHP\8.5\php-cgi.exe   # register
Get-PHPVersion                                           # list registered versions and handler names
Set-PHPVersion -HandlerName php-8.5.12                   # make one active
Get-PHPConfiguration                                     # active version, php.ini path, extensions

Get-PHPExtension -Status Disabled                        # list extensions
Set-PHPExtension -Name php_intl.dll -Status Enabled
Set-PHPSetting -Name date.timezone -Value UTC
```

Add `-SiteName "Default Web Site"` to work on one site instead of the whole server.

---

## Release checklist

- [ ] Check [php.net](https://www.php.net/supported-versions.php) for the supported PHP versions and their end of **security** support. `npm run check:php` compares the rows with php.net, and the [PHP versions workflow](https://github.com/jsuomi/phpmanager/actions/workflows/php-versions.yml) runs it on GitHub
- [ ] Update the rows in [PHPConfigHelper.cs](Server/Config/PHPConfigHelper.cs): add new versions and fix changed dates
- [ ] Bump `AssemblyVersion` and `AssemblyFileVersion` in [SharedAssembyInfo.cs](SharedAssembyInfo.cs), e.g. `2.16.0.0`
- [ ] Run `npm run changelog`. It adds a section for the new version to [CHANGELOG.md](CHANGELOG.md); commit that with the bump
- [ ] If a workflow changed, run `npm run check:actions`
- [ ] Optional test build: run the [Build MSI workflow](https://github.com/jsuomi/phpmanager/actions/workflows/dotnet-desktop.yml) by hand with the new version as `tag`
    - Download the artifact `PHPManagerForIIS-<version>.zip`, unzip it and run `shasum -a 256 -c SHA256SUMS.txt`
- [ ] Commit and push
- [ ] Tag that commit with the same version and push the tag: `git tag v2.16.0`, then `git push origin v2.16.0`
    - The workflow builds it and creates a draft release
    - The run fails if the tag and `AssemblyFileVersion` differ
- [ ] Check the draft has `PHPManagerForIIS-<version>-x64.msi`, `PHPManagerForIIS-<version>-x86.msi` and `SHA256SUMS.txt`
    - Download an MSI from the draft and run `gh attestation verify PHPManagerForIIS-<version>-x64.msi -R jsuomi/phpmanager`
- [ ] Check the [Test MSI workflow](https://github.com/jsuomi/phpmanager/actions/workflows/msi-test.yml) passed for the tag's build. It starts after each successful Build MSI run, installs the x64 MSI, and serves a page with each PHP version that php.net still supports. It also tests an upgrade from the previous published release
- [ ] Write the release notes: `npm run release-notes` prints a draft with the PHP version changes. Add other user-visible changes from the commits it lists. Claude can do this; [AGENTS.md](AGENTS.md) describes how
- [ ] Publish the release

If something is wrong before publishing: discard the draft, delete the tag locally and on GitHub, fix it, then tag again. After publishing, leave the tag alone and release a new version instead.
