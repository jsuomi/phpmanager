// Compares the knownPhpVersions rows in PHPConfigHelper.cs with php.net.
// Fails when a supported PHP branch has no row, or when any row's date differs
// from php.net's end of security support. Run with `npm run check:php`.
// Needs Node 18 or later and no packages.
import { appendFileSync, readFileSync } from "node:fs";
import { SOURCE, fetchBranches, parseRows } from "./php-versions.mjs";

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

let rows, branches;
try {
    rows = parseRows(readFileSync(SOURCE, "utf8"));
    branches = await fetchBranches();
} catch (e) {
    report("error", e.message);
    process.exit(1);
}

const today = new Date().toISOString().slice(0, 10);
const summary = ["| PHP | php.net security end | Row | Result |", "| --- | --- | --- | --- |"];
const listed = new Set();

for (const { branch, end } of branches) {
    listed.add(branch);
    const row = rows.get(branch);

    if (end < today) {
        // Ended branches need no row, but a row they have must match php.net.
        if (row && row.date !== end) {
            report("error", `PHP ${branch} row says ${row.date}; php.net says ${end}.`, row.line);
        }
        continue;
    }

    let result = "ok";
    if (!row) {
        result = "missing";
        report("error", `PHP ${branch} is supported until ${end} but has no row, so PHP Manager reports it as obsolete. Add a row.`);
    } else if (row.date !== end) {
        result = "date differs";
        report("error", `PHP ${branch} row says ${row.date}; php.net says ${end}.`, row.line);
    }
    summary.push(`| ${branch} | ${end} | ${row ? row.date : "none"} | ${result} |`);
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
