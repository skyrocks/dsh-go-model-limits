#!/usr/bin/env node
// 从 OpenCode 官方文档的 Go 价格表生成客户端内嵌的兜底数据。
//
// 运行时优先由 Host 半（index.js）抓线上文档；这里的快照只用于：
//   - Host 首次加载 / 网络失败时先显示旧数据；
//   - 离线环境。
//
// 数据源（都是公开页面，不需要 API Key）：
//   - https://opencode.ai/docs/console/go.md          → 每模型 Monthly limit（Go / Go Plus / Go Teams）
//   - https://opencode.ai/inference/go/v1/models      → 模型 id / name，用来把文档里的名字映射成稳定 id
//
// 用法：
//   node scripts/sync-limits.mjs              # 抓线上文档并改 client.js
//   node scripts/sync-limits.mjs --fixture    # 用 test/fixtures 下的快照（离线/测试）
//   node scripts/sync-limits.mjs --check      # 只检查是否与线上一致，不改文件
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  DEFAULT_PLAN,
  PLAN_LABELS,
  PLAN_ORDER,
  mapLimits,
  parseMonthlyLimits,
} from "../limits.js";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const CLIENT = join(ROOT, "client.js");
const DOCS_URL = "https://opencode.ai/docs/console/go.md";
const MODELS_URL = "https://opencode.ai/inference/go/v1/models";
const FIXTURE_MD = join(ROOT, "test/fixtures/go.md");
const FIXTURE_MODELS = join(ROOT, "test/fixtures/models.json");

const BEGIN_MARKER = "// >>> generated:limits";
const END_MARKER = "// <<< generated:limits";

/**
 * 生成 client.js 里的数据区块（不含首尾标记）。
 * @param {{plans: object}} data
 * @param {{source?: string, modelsSource?: string, generatedAt?: string}} meta
 * @returns {string}
 */
export function renderDataBlock(data, meta) {
  const info = {
    source: meta.source ?? DOCS_URL,
    modelsSource: meta.modelsSource ?? MODELS_URL,
    generatedAt: meta.generatedAt ?? new Date().toISOString(),
  };
  /** 用两空格缩进 JSON，并把续行对齐到区块的缩进。 */
  const embed = (value) => JSON.stringify(value, null, "  ").split("\n").join("\n    ");
  const lines = [
    `${BEGIN_MARKER} (scripts/sync-limits.mjs)`,
    "/** 默认展示的套餐；Go Plus / Go Teams 用户改成对应 key 即可。 */",
    `const DEFAULT_PLAN = ${JSON.stringify(DEFAULT_PLAN)};`,
    `const PLAN_ORDER = ${JSON.stringify(PLAN_ORDER).replaceAll(",", ", ")};`,
    `const PLAN_LABELS = ${JSON.stringify(PLAN_LABELS).replaceAll(",", ", ").replaceAll(":", ": ")};`,
    "/** 兜底快照：Host 尚未返回线上数据时使用。 */",
    `const LIMITS = ${embed(data.plans)};`,
    `const LIMITS_META = ${embed(info)};`,
    END_MARKER,
  ];
  return lines.map((line) => `    ${line}`).join("\n");
}

/** 替换 client.js 里的 generated 区块。 */
export function applyBlock(source, block) {
  const pattern = /^[ \t]*\/\/ >>> generated:limits[\s\S]*?^[ \t]*\/\/ <<< generated:limits/m;
  if (!pattern.test(source)) throw new Error("client.js 里找不到 generated:limits 标记");
  return source.replace(pattern, () => block);
}

/** 只比较额度数据，忽略抓取时间。 */
function stableBlock(block) {
  return block.replace(/(?:"generatedAt"|generatedAt)\s*:\s*"[^"]*"/, '"generatedAt": "<ignored>"');
}

async function fetchText(url) {
  let lastError;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: { Accept: "text/plain, application/json, */*", "User-Agent": "dsh-go-model-limits-sync" },
        signal: AbortSignal.timeout(20000),
      });
      if (!response.ok) throw new Error(`${url} → HTTP ${response.status}`);
      return await response.text();
    } catch (error) {
      lastError = error;
      if (attempt < 2) await new Promise((resolve) => setTimeout(resolve, 800));
    }
  }
  throw lastError;
}

async function main() {
  const args = new Set(process.argv.slice(2));
  let markdown;
  let models;
  if (args.has("--fixture")) {
    markdown = readFileSync(FIXTURE_MD, "utf8");
    models = JSON.parse(readFileSync(FIXTURE_MODELS, "utf8")).data;
  } else {
    markdown = await fetchText(DOCS_URL);
    models = JSON.parse(await fetchText(MODELS_URL)).data;
  }
  const parsed = parseMonthlyLimits(markdown);
  const mapped = mapLimits(parsed, models);
  const block = renderDataBlock(mapped, { generatedAt: new Date().toISOString() });
  if (mapped.unmatchedDocs.length > 0) {
    console.warn(`warn: 文档里有 ${mapped.unmatchedDocs.length} 个名称在当前 Go 模型列表中不存在：${mapped.unmatchedDocs.join(", ")}`);
  }
  if (mapped.unmatchedModels.length > 0) {
    console.warn(`warn: 当前列表里有 ${mapped.unmatchedModels.length} 个模型没有文档额度：${mapped.unmatchedModels.join(", ")}`);
  }
  const source = readFileSync(CLIENT, "utf8");
  if (args.has("--check")) {
    const current = source.match(/^[ \t]*\/\/ >>> generated:limits[\s\S]*?^[ \t]*\/\/ <<< generated:limits/m)?.[0];
    if (current === undefined) throw new Error("client.js 里找不到 generated:limits 标记");
    if (stableBlock(current) !== stableBlock(block)) {
      console.error("generated 区块与线上数据不一致，请运行 node scripts/sync-limits.mjs");
      process.exit(1);
    }
    console.log("generated 区块与线上数据一致");
    return;
  }
  writeFileSync(CLIENT, applyBlock(source, block));
  const counts = PLAN_ORDER.map((plan) => `${plan}: ${Object.keys(mapped.plans[plan].byId).length}`).join(", ");
  console.log(`已更新 client.js（${counts}）`);
}

const isMain = process.argv[1] !== undefined && pathToFileURL(process.argv[1]).href === import.meta.url;
if (isMain) {
  await main();
}
