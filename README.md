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
