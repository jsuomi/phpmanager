// Compares the knownPhpVersions rows in PHPConfigHelper.cs with php.net.
// Fails when a supported PHP branch has no row, or when any row's date differs
// from php.net's end of security support. Run with `npm run check:php`.
// Needs Node 18 or later and no packages.
import { appendFileSync, readFileSync } from "node:fs";

const SOURCE = "Server/Config/PHPConfigHelper.cs";
const BRANCHES_URL = "https://www.php.net/releases/branches.php";
const ROW = /\{\s*"(\d+\.\d+)",\s*new PhpVersion\("\1",\s*new DateTime\((\d+),\s*(\d+),\s*(\d+)\)/;

const inActions = process.env.GITHUB_ACTIONS === "true";
let failed = false;

function report(level, message, line) {
    if (level === "error") failed = true;
    if (inActions) {
        const where = line ? ` file=${SOURCE},line=${line}` : "";
        console.log(`::${level}${where}::${message}`);
    } else {
        console.log(`${level}: ${line ? `${SOURCE}:${line}: ` : ""}${message}`);
    }
}

const pad = (n) => String(n).padStart(2, "0");

const rows = new Map();
readFileSync(SOURCE, "utf8")
    .split(/\r?\n/)
    .forEach((text, i) => {
        const m = ROW.exec(text);
        if (m) rows.set(m[1], { date: `${m[2]}-${pad(m[3])}-${pad(m[4])}`, line: i + 1 });
    });
if (rows.size === 0) {
    report("error", "No knownPhpVersions rows found. The row format may have changed.");
    process.exit(1);
}

let branches;
try {
    const response = await fetch(BRANCHES_URL, { signal: AbortSignal.timeout(30000) });
    if (!response.ok) throw new Error(`answered ${response.status}`);
    branches = await response.json();
} catch (e) {
    report("error", `Could not read ${BRANCHES_URL}: ${e.cause?.message ?? e.message}`);
    process.exit(1);
}
if (!Array.isArray(branches) || branches.length === 0) {
    report("error", `${BRANCHES_URL} did not return a list of branches.`);
    process.exit(1);
}

const today = new Date().toISOString().slice(0, 10);
const summary = ["| PHP | php.net security end | Row | Result |", "| --- | --- | --- | --- |"];
const listed = new Set();

for (const b of branches) {
    const end = typeof b.security_support_end === "string" ? b.security_support_end.slice(0, 10) : "";
    if (!/^\d+\.\d+$/.test(b.branch) || !/^\d{4}-\d{2}-\d{2}$/.test(end)) continue;
    listed.add(b.branch);
    const row = rows.get(b.branch);

    if (end < today) {
        // Ended branches need no row, but a row they have must match php.net.
        if (row && row.date !== end) {
            report("error", `PHP ${b.branch} row says ${row.date}; php.net says ${end}.`, row.line);
        }
        continue;
    }

    let result = "ok";
    if (!row) {
        result = "missing";
        report("error", `PHP ${b.branch} is supported until ${end} but has no row, so PHP Manager reports it as obsolete. Add a row.`);
    } else if (row.date !== end) {
        result = "date differs";
        report("error", `PHP ${b.branch} row says ${row.date}; php.net says ${end}.`, row.line);
    }
    summary.push(`| ${b.branch} | ${end} | ${row ? row.date : "none"} | ${result} |`);
}

for (const [branch, row] of rows) {
    if (!listed.has(branch) && row.date >= today) {
        report("warning", `PHP ${branch} has a row but php.net does not list the branch.`, row.line);
    }
}

if (process.env.GITHUB_STEP_SUMMARY) {
    appendFileSync(process.env.GITHUB_STEP_SUMMARY, `## Supported PHP versions\n\n${summary.join("\n")}\n`);
}
console.log(failed ? "Known PHP versions do not match php.net." : "Known PHP versions match php.net.");
process.exit(failed ? 1 : 0);
