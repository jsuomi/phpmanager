// Shared by release-notes.mjs and changelog.mjs: git, this repository, its
// version, and the upstream project it forks.
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

// The archived project this repository forks, and its last release.
export const UPSTREAM = "phpmanager/phpmanager";
export const UPSTREAM_TAG = "v2.12";
// Upstream's last commit. This fork's own history starts after it.
export const FORK_BASE = "542d0f09e36c7e9ce595cee37443391f3304aa4a";

export const run = (cmd, args) => execFileSync(cmd, args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();

export function fail(message) {
    console.error(`error: ${message}`);
    process.exit(1);
}

// Same rule as the Build MSI workflow: 2.16.0.0 is released as 2.16.0.
export function normalizeVersion(version) {
    let v = version.replace(/^v/, "");
    if (v.split(".").length === 4) v = v.replace(/\.0$/, "");
    return v;
}

// AssemblyFileVersion in SharedAssembyInfo.cs, as a release version.
export function sourceVersion() {
    const m = /^\[assembly: AssemblyFileVersion\("([^"]*)"\)\]/m.exec(readFileSync("SharedAssembyInfo.cs", "utf8"));
    if (!m) fail("AssemblyFileVersion not found in SharedAssembyInfo.cs.");
    return normalizeVersion(m[1]);
}

// "owner/name" of the origin remote.
export function githubRepo() {
    const m = /github\.com[:/]([^/]+\/[^/]+?)(\.git)?$/.exec(run("git", ["remote", "get-url", "origin"]));
    if (!m) fail("The origin remote is not a GitHub repository.");
    return m[1];
}

// Every change from upstream's last release to ref in this repository.
export function upstreamCompareUrl(repo, ref) {
    const [owner, name] = repo.split("/");
    return `https://github.com/${UPSTREAM}/compare/${UPSTREAM_TAG}...${owner}:${name}:${ref}`;
}
