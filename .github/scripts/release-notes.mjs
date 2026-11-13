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
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { parseArgs } from "node:util";
import { SOURCE, compareBranches, fetchBranches, parseRows } from "./php-versions.mjs";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
let problems = 0;

const run = (cmd, args) => execFileSync(cmd, args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
const warn = (message) => {
    problems++;
    console.error(`warning: ${message}`);
};
const fail = (message) => {
    console.error(`error: ${message}`);
    process.exit(1);
};
const formatDate = (iso) => {
    const [y, m, d] = iso.split("-").map(Number);
    return `${d} ${MONTHS[m - 1]} ${y}`;
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

// Same rule as the Build MSI workflow: 2.16.0.0 is released as 2.16.0.
let version = values.version;
if (!version) {
    const m = /^\[assembly: AssemblyFileVersion\("([^"]*)"\)\]/m.exec(readFileSync("SharedAssembyInfo.cs", "utf8"));
    if (!m) fail("AssemblyFileVersion not found in SharedAssembyInfo.cs. Pass --version.");
    version = m[1];
}
version = version.replace(/^v/, "");
if (version.split(".").length === 4) version = version.replace(/\.0$/, "");

const remote = /github\.com[:/]([^/]+\/[^/]+?)(\.git)?$/.exec(run("git", ["remote", "get-url", "origin"]));
if (!remote) fail("The origin remote is not a GitHub repository.");
const repo = remote[1];

let oldRows, newRows;
try {
    oldRows = parseRows(run("git", ["show", `${previous}:${SOURCE}`]));
    newRows = parseRows(run("git", ["show", `HEAD:${SOURCE}`]));
} catch (e) {
    fail(e.message);
}

const byNewest = (a, b) => compareBranches(b, a);
const added = [...newRows.keys()].filter((b) => !oldRows.has(b)).sort(byNewest);
const updated = [...newRows.keys()].filter((b) => oldRows.has(b) && oldRows.get(b).date !== newRows.get(b).date).sort(byNewest);
const removed = [...oldRows.keys()].filter((b) => !newRows.has(b)).sort(byNewest);

// Every date the notes mention must match php.net.
const listedDates = [...added, ...updated];
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

const changes = [];
for (const branch of added) changes.push(`- Added PHP ${branch} to the known versions`);
if (updated.length > 0) {
    changes.push("- Updated end-of-support dates to php.net's current schedule:");
    for (const branch of updated) changes.push(`  - PHP ${branch}: ${formatDate(newRows.get(branch).date)}`);
}
for (const branch of removed) changes.push(`- Removed PHP ${branch} from the known versions`);
if (added.length + updated.length > 0) {
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

**Full Changelog**: https://github.com/${repo}/compare/${previous}...v${version}`);

const commits = run("git", ["log", "--no-merges", "--format=%h %s", `${previous}..HEAD`]);
console.error(`\nCommits since ${previous}. Add the user-visible ones (installer, UI, how releases are built) to Changes:`);
console.error(commits || "(none)");

process.exit(problems > 0 ? 1 : 0);
