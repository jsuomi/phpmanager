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

## Installation

PHP Manager adds a PHP page to IIS Manager. It registers PHP versions with IIS as FastCGI handlers, edits `php.ini` and its extensions, and warns when a PHP version's security support is ending.

1. You need Windows Server 2012 / Windows 8 or later, IIS with the **CGI** feature and the **IIS Management Console**, and .NET Framework 4.6.2 or later.
2. Download `PHPManagerForIIS-<version>-x64.msi` and `SHA256SUMS.txt` from [Releases](https://github.com/jsuomi/phpmanager/releases), and check the MSI's hash against `SHA256SUMS.txt`.
3. Close IIS Manager, run the MSI as an administrator, then register PHP in IIS Manager: **PHP Manager** > **Register new PHP version**.

[docs/INSTALL.md](docs/INSTALL.md) has the rest:

- a PowerShell script that sets up IIS, PHP Manager, the Visual C++ runtime and PHP in one go
- every step by hand, with screenshots, and configuring and switching PHP versions
- the PowerShell cmdlets
- removing PHP versions and uninstalling PHP Manager

To cut a release of PHP Manager, follow [docs/RELEASING.md](docs/RELEASING.md).
