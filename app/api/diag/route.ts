import { NextResponse } from "next/server";
import { execSync } from "node:child_process";

export const dynamic = "force-dynamic";

export async function GET() {
  let commit = "unknown";
  let branch = "unknown";
  try {
    commit = execSync("git rev-parse HEAD", { encoding: "utf8" }).trim();
    branch = execSync("git branch --show-current", { encoding: "utf8" }).trim();
  } catch {
    commit = process.env.GIT_COMMIT_SHA || process.env.DEPLOYMENT_ID || "unknown";
  }

  const dbHost = process.env.DB_HOST || "not set";
  const dbName = process.env.DB_NAME || "not set";

  return NextResponse.json({
    activeCommit: commit,
    activeBranch: branch,
    databaseHost: dbHost,
    databaseName: dbName,
    nodeEnv: process.env.NODE_ENV,
    serverTimestamp: new Date().toISOString(),
  });
}
