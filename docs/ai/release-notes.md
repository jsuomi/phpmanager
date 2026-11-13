# Release notes

Draft them in chat for the user to paste into the draft GitHub release. GitHub's generated notes hold only the changelog link, because changes land on `master` without pull requests.

1. Run `npm run release-notes`. It finds the previous published release with `gh`, diffs the rows at `HEAD` against it, checks each listed date against php.net, and prints the draft to stdout. It reads rows from `HEAD`, so uncommitted row changes are missing from it. If `gh` is unavailable, ask the user for the previous release tag and pass `-- --from <tag>`.
2. Read stderr. A date warning (exit 1) means a row and php.net disagree: raise it with the user before the notes go out.
3. Read the commits it lists after the draft, and add a Changes bullet for each user-visible one: installer, UI, and how releases are built.

The notes are done when the script exits 0 (or the user has settled each warning) and every user-visible commit has a bullet.
