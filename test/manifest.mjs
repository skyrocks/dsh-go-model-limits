// 发布前自检：入口存在、插件行名与包名一致、files 白名单完整、client 声明正确。
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const read = (name) => readFileSync(join(root, name), "utf8");
const manifest = JSON.parse(read("package.json"));

assert.equal(typeof manifest.name, "string");
assert.match(manifest.name, /^@[a-z0-9-]+\/[a-z0-9-]+$/);
assert.equal(typeof manifest.version, "string");
assert.equal(manifest.type, "module");
assert.equal(manifest.dsh?.manifestVersion, 1);
assert.equal(manifest.dsh?.bundle?.patch, "./cordis.patch.yml");

// 包名必须等于插件行名：DSH 按模块名解析 bundle 里的插件行。
const patch = read("cordis.patch.yml");
const rowName = patch.match(/name:\s*"?([^"\s]+)"?/)?.[1];
assert.equal(rowName, manifest.name, "cordis.patch.yml 的插件行名必须与包名一致");
assert.match(patch, /id:\s*go-model-limits/);

// 浏览器半：入口、平台与注入边都要声明。
assert.equal(manifest.dsh?.client?.platform, "web");
assert.equal(manifest.exports?.["./client"], "./client.js");
assert.ok(
  manifest.dsh?.client?.inject?.includes("@deepseek-ai/dsh-client-ui-model-selection"),
  "dsh.client.inject 必须等待 ui-model-selection 先声明 slot",
);

// 入口与运行时模块都要在 files 白名单里，否则装完缺文件。
for (const file of [
  "index.js",
  "client.js",
  "limits.js",
  "typert.host.js",
  "cordis.patch.yml",
  "README.md",
  "README.en.md",
  "CHANGELOG.md",
  "LICENSE",
  "scripts/sync-limits.mjs",
  "test/smoke.mjs",
  "test/manifest.mjs",
]) {
  assert.ok(manifest.files.includes(file.split("/")[0]), `files 缺少 ${file.split("/")[0]}`);
  assert.ok(existsSync(join(root, file)), `仓库里缺少 ${file}`);
}
assert.equal(manifest.main, "./index.js");
assert.equal(manifest.exports?.["."], "./index.js");
assert.equal(manifest.exports?.["./typert"], "./typert.host.js");

// 零运行时依赖：只允许 peerDependencies（宿主已提供）。
assert.equal(manifest.dependencies, undefined);
for (const peer of Object.keys(manifest.peerDependencies ?? {})) {
  assert.ok(peer === "react" || peer.startsWith("@deepseek-ai/"), `意外的 peerDependency：${peer}`);
}

// generated 区块存在，且不是空占位。
const client = read("client.js");
assert.match(client, /\/\/ >>> generated:limits/);
assert.match(client, /\/\/ <<< generated:limits/);
assert.match(client, /const DEFAULT_PLAN = "go";/);
assert.match(client, /"deepseek-v4\.1-flash"/);

console.log(`manifest ok — ${manifest.name}@${manifest.version}（插件行 ${rowName}）`);
