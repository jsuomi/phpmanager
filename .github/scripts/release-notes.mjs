// Prints draft release notes for the next release to stdout, ready to paste
// into the draft GitHub release. Warnings and the commits to review go to
// stderr. Exits 1 when a listed date does not match php.net or cannot be checked.
//
//   npm run release-notes
//   npm run release-notes -- --from v2.14.0 --version 2.16.0
//
// --from defaults to the newest published release (needs gh). --version
// defaults to AssemblyFileVersion in SharedAssembyInfo.cs. Rows are read from
// HEAD, so commit row changes first. Needs git and Node 18 or later.
import { parseArgs } from "node:util";
import { SOURCE, describeRowChanges, fetchBranches, parseRows, rowChanges } from "./php-versions.mjs";
import { UPSTREAM_TAG, fail, githubRepo, normalizeVersion, run, sourceVersion, upstreamCompareUrl } from "./repo.mjs";

let problems = 0;
const warn = (message) => {
    problems++;
    console.error(`warning: ${message}`);
};

const { values } = parseArgs({ options: { from: { type: "string" }, version: { type: "string" } } });

// The previous published release. A discarded draft can leave a newer tag,
// and its changes still belong in these notes.
let previous = values.from;
if (!previous) {
    try {
        previous = run("gh", ["release", "list", "--exclude-drafts", "--limit", "1", "--json", "tagName", "--jq", ".[0].tagName"]);
    } catch {
        fail("Could not ask gh for the newest published release. Pass the previous tag with --from <tag>.");
    }
    if (!previous) fail("No published release found. Pass the previous tag with --from <tag>.");
}
try {
    run("git", ["rev-parse", "--verify", "--quiet", `${previous}^{commit}`]);
} catch {
    fail(`${previous} is not a tag or commit here. Run git fetch --tags, or check --from.`);
}

const version = values.version ? normalizeVersion(values.version) : sourceVersion();
const repo = githubRepo();

let oldRows, newRows;
try {
    oldRows = parseRows(run("git", ["show", `${previous}:${SOURCE}`]));
    newRows = parseRows(run("git", ["show", `HEAD:${SOURCE}`]));
} catch (e) {
    fail(e.message);
}
const diff = rowChanges(oldRows, newRows);

// Every date the notes mention must match php.net.
const listedDates = [...diff.added, ...diff.updated];
if (listedDates.length > 0) {
    try {
        const php = new Map((await fetchBranches()).map((b) => [b.branch, b.end]));
        for (const branch of listedDates) {
            const ours = newRows.get(branch).date;
            if (!php.has(branch)) warn(`PHP ${branch} is not listed on php.net. Check its date (${ours}) by hand.`);
            else if (php.get(branch) !== ours) warn(`PHP ${branch} row says ${ours}; php.net says ${php.get(branch)}. Fix the row or raise it before publishing.`);
        }
    } catch (e) {
        warn(`${e.message} Check the dates by hand.`);
    }
}

const changes = describeRowChanges(diff, newRows);
if (listedDates.length > 0) {
    changes.push("- PHP Manager marks a version as expiring 180 days before that date, and obsolete after it");
}
if (changes.length === 0) console.error(`note: No known-version rows changed since ${previous}.`);

console.log(`## Changes
${changes.join("\n")}

## Downloads
- \`PHPManagerForIIS-${version}-x64.msi\` for 64-bit Windows
- \`PHPManagerForIIS-${version}-x86.msi\` for 32-bit Windows

The installers are not code-signed. Check them with \`SHA256SUMS.txt\`:
\`shasum -a 256 -c SHA256SUMS.txt\`, or \`Get-FileHash -Algorithm SHA256\` on Windows.

To check that an installer was built by this repository's release workflow:
\`gh attestation verify PHPManagerForIIS-${version}-x64.msi -R ${repo}\`

**Full Changelog**: https://github.com/${repo}/compare/${previous}...v${version}

**All changes since upstream ${UPSTREAM_TAG}**: ${upstreamCompareUrl(repo, `v${version}`)}`);

const commits = run("git", ["log", "--no-merges", "--format=%h %s", `${previous}..HEAD`]);
console.error(`\nCommits since ${previous}. Add the user-visible ones (installer, UI, how releases are built) to Changes:`);
console.error(commits || "(none)");

process.exit(problems > 0 ? 1 : 0);
