/**
 * Playwright Global Teardown — 收掉隔離 e2e 環境
 */

import { spawnSync } from "node:child_process";
import * as path from "node:path";

const COMPOSE_DIR = path.resolve(__dirname, "../../dev");
const COMPOSE_ARGS = [
  "compose",
  "-f",
  "docker-compose.yml",
  "-f",
  "docker-compose.test.yml",
  "--profile",
  "test",
];

export default async function globalTeardown() {
  if (process.env.AIBO_E2E_SKIP_DOCKER === "1") return;
  if (process.env.AIBO_E2E_KEEP === "1") {
    process.stdout.write("[global-teardown] AIBO_E2E_KEEP=1，保留環境不收\n");
    return;
  }
  process.stdout.write("[global-teardown] 收掉 e2e 隔離環境...\n");
  spawnSync(
    "docker",
    [...COMPOSE_ARGS, "stop", "test-db", "test-api", "test-frontend"],
    { cwd: COMPOSE_DIR, stdio: "inherit" },
  );
  spawnSync(
    "docker",
    [...COMPOSE_ARGS, "rm", "-f", "test-db", "test-api", "test-frontend"],
    { cwd: COMPOSE_DIR, stdio: "inherit" },
  );
}
