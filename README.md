# PHP Manager 2 for IIS

---

# IMPORTANT WARNING

- This is a private fork of the public archive for phpmanager
- This is an attempt to add a few more versions of PHP to the installer
- No guarantees of any kind are given, everything is provided "as-is" under [MS-PL](https://opensource.org/license/ms-pl)

**You were warned.**

---

## Notes to self

- Check [php.net](https://www.php.net/supported-versions.php) for the supported PHP versions and dates
- Update the versions and dates in [PHPConfigHelper.cs](Server/Config/PHPConfigHelper.cs)
- Update the version in [SharedAssembyInfo.cs](SharedAssembyInfo.cs)
- Run the [workflow](https://github.com/jsuomi/phpmanager/actions/workflows/dotnet-desktop.yml)
    - Download the artifact: msi-files.zip
