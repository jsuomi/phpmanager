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
- Update the version in [SharedAssembyInfo.cs](SharedAssembyInfo.cs), then commit and push
- Tag that commit with the same version and push the tag, e.g. `v2.14.0` for `2.14.0.0`
    - The [workflow](https://github.com/jsuomi/phpmanager/actions/workflows/dotnet-desktop.yml) builds it and creates a draft release with `PHPManagerForIIS-<version>-x86.msi`, `PHPManagerForIIS-<version>-x64.msi` and `SHA256SUMS.txt`
    - The run fails if the tag and `AssemblyFileVersion` differ
- Review the draft release, edit the notes and publish it
- For a test build without a release, run the workflow by hand and download the artifact `PHPManagerForIIS-<version>.zip`
