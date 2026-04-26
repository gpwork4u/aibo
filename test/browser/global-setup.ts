/**
 * Playwright Global Setup — 起隔離 e2e 測試環境
 *
 * 在所有 test 跑之前：
 * 1. docker compose -f dev/docker-compose.test.yml --profile test up -d
 * 2. 等 test-api 健康（HTTP 200 from /api/v1/auth/api-keys 預期 401 但 server alive）
 * 3. 等 test-frontend 200 OK
 *
 * 對應 globalTeardown 會 stop 服務。
 *
 * Note：每次啟動 test-db 都是 fresh DB（tmpfs），所以 ApiClient.bootstrap 永遠可用。
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

const TEST_API_URL = process.env.API_BASE_URL || "http://localhost:8081";
const TEST_FE_URL = process.env.BASE_URL || "http://localhost:3001";

async function waitFor(url: string, label: string, timeoutMs = 60_000) {
  const deadline = Date.now() + timeoutMs;
  let lastErr: unknown = null;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url);
      if (res.status < 500) {
        process.stdout.write(`[global-setup] ${label} ready (status=${res.status})\n`);
        return;
      }
    } catch (err) {
      lastErr = err;
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error(`[global-setup] ${label} not ready within ${timeoutMs}ms: ${lastErr}`);
}

async function bootstrapApiKey(): Promise<string> {
  const url = `${TEST_API_URL}/api/v1/auth/api-keys`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "e2e-shared" }),
  });
  if (!res.ok) {
    throw new Error(
      `[global-setup] bootstrap 失敗：${res.status} ${await res.text()}`,
    );
  }
  const body = (await res.json()) as { key: string };
  if (!body.key) throw new Error("[global-setup] bootstrap 沒返回 key");
  return body.key;
}

export default async function globalSetup() {
  if (process.env.AIBO_E2E_SKIP_DOCKER !== "1") {
    process.stdout.write("[global-setup] 啟動 e2e 隔離環境（force-recreate test-db）...\n");
    const up = spawnSync(
      "docker",
      [
        ...COMPOSE_ARGS,
        "up",
        "-d",
        "--build",
        "--force-recreate",
        "test-db",
        "test-api",
        "test-frontend",
      ],
      { cwd: COMPOSE_DIR, stdio: "inherit" },
    );
    if (up.status !== 0) {
      throw new Error(`docker compose up failed (exit ${up.status})`);
    }
  } else {
    process.stdout.write(
      "[global-setup] AIBO_E2E_SKIP_DOCKER=1，跳過 docker compose（預期外部已起好）\n",
    );
  }

  // 等服務就緒
  await waitFor(`${TEST_API_URL}/api/v1/auth/api-keys`, "test-api");
  await waitFor(TEST_FE_URL, "test-frontend");

  // bootstrap 一次拿 shared key，注入 env var 給 worker process
  if (!process.env.AIBO_E2E_API_KEY) {
    const key = await bootstrapApiKey();
    process.env.AIBO_E2E_API_KEY = key;
    process.stdout.write(
      `[global-setup] 取得 e2e shared API key：${key.slice(0, 14)}…（共 ${key.length} 字元）\n`,
    );
  }
  process.stdout.write("[global-setup] e2e 環境就緒\n");
}
