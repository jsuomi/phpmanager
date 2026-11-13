// Shared by check-php-versions.mjs and release-notes.mjs: reads the
// knownPhpVersions rows and php.net's supported-versions data.

export const SOURCE = "Server/Config/PHPConfigHelper.cs";
export const BRANCHES_URL = "https://www.php.net/releases/branches.php";

const ROW = /\{\s*"(\d+\.\d+)",\s*new PhpVersion\("\1",\s*new DateTime\((\d+),\s*(\d+),\s*(\d+)\)/;
const pad = (n) => String(n).padStart(2, "0");

// Returns a Map of "8.5" -> { date: "2029-12-31", line: 1687 }.
export function parseRows(text) {
    const rows = new Map();
    text.split(/\r?\n/).forEach((line, i) => {
        const m = ROW.exec(line);
        if (m) rows.set(m[1], { date: `${m[2]}-${pad(m[3])}-${pad(m[4])}`, line: i + 1 });
    });
    if (rows.size === 0) throw new Error(`No knownPhpVersions rows found in ${SOURCE}. The row format may have changed.`);
    return rows;
}

// Returns php.net's branches as [{ branch: "8.5", end: "2029-12-31" }].
export async function fetchBranches() {
    let data;
    try {
        const response = await fetch(BRANCHES_URL, { signal: AbortSignal.timeout(30000) });
        if (!response.ok) throw new Error(`answered ${response.status}`);
        data = await response.json();
    } catch (e) {
        throw new Error(`Could not read ${BRANCHES_URL}: ${e.cause?.message ?? e.message}`);
    }
    if (!Array.isArray(data) || data.length === 0) throw new Error(`${BRANCHES_URL} did not return a list of branches.`);
    return data
        .map((b) => ({ branch: b.branch, end: typeof b.security_support_end === "string" ? b.security_support_end.slice(0, 10) : "" }))
        .filter((b) => /^\d+\.\d+$/.test(b.branch) && /^\d{4}-\d{2}-\d{2}$/.test(b.end));
}

// Sorts "8.10" after "8.9".
export function compareBranches(a, b) {
    const [x, y] = [a, b].map((v) => v.split(".").map(Number));
    return x[0] - y[0] || x[1] - y[1];
}
