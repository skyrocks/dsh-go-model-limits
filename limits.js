// 纯函数：把 OpenCode 官方文档的 Go 价格表解析成“模型 → 月度额度”。
// 构建脚本（scripts/sync-limits.mjs）、Host 半（index.js）和测试共用同一份逻辑，
// 避免线上解析与内嵌快照漂移。

/** 三档套餐，顺序与文档 PlanTabs 一致。 */
export const PLAN_ORDER = ["go", "go-plus", "go-teams"];
export const PLAN_LABELS = { go: "Go", "go-plus": "Go Plus", "go-teams": "Go Teams" };
/** 默认展示的套餐；Go Plus / Go Teams 用户可改生成区块里的 DEFAULT_PLAN。 */
export const DEFAULT_PLAN = "go";

/**
 * 把模型名归一化成可比较的 key。
 * 文档里的拆分行（Peak/Off-Peak、≤/> 512K tokens、50% off）去掉括号后
 * 与模型目录 / models 接口的 name 对齐。
 * @param {string} value
 * @returns {string}
 */
export function normalizeName(value) {
  return String(value)
    .toLowerCase()
    .replace(/\([^)]*\)/g, " ")
    .replace(/（[^）]*）/g, " ")
    .replace(/[^a-z0-9.]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

/**
 * 解析一个 "Monthly limit" 表格块。
 * @param {string} body 一个 `<div slot="go...">` 的内容
 * @returns {Map<string, {usd: number}|{unlimited: true}>}
 */
function parseTable(body) {
  const rows = new Map();
  for (const line of body.split("\n")) {
    const cells = line.split("|").map((cell) => cell.trim());
    if (cells.length < 8) continue;
    const model = cells[1];
    if (model === "" || /^-+$/.test(model) || model === "Model") continue;
    let limit = cells[6] ?? "";
    const bold = limit.match(/\*\*(.+?)\*\*/);
    if (bold) limit = bold[1];
    limit = limit.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
    if (limit === "") continue;
    const key = normalizeName(model);
    if (key === "") continue;
    let value;
    if (/^unlimited\b/i.test(limit)) {
      value = { unlimited: true };
    } else {
      const usd = limit.match(/\$\s*([\d.]+)/);
      if (!usd) continue;
      value = { usd: Number(usd[1]) };
    }
    // Peak/Off-Peak 等拆分行共享同一个额度；若官方真的给出不同值，保留第一个并提示。
    if (!rows.has(key)) rows.set(key, value);
    else if (JSON.stringify(rows.get(key)) !== JSON.stringify(value)) {
      console.warn(`warn: ${key} 在文档中有多个不同额度，保留 ${JSON.stringify(rows.get(key))}`);
    }
  }
  return rows;
}

/**
 * 从 docs markdown 里解析三档套餐的 Monthly limit 表。
 * @param {string} markdown
 * @returns {Record<string, Map<string, {usd: number}|{unlimited: true}>>}
 */
export function parseMonthlyLimits(markdown) {
  /** @type {Record<string, Map<string, {usd: number}|{unlimited: true}>>} */
  const plans = {};
  const seen = new Set();
  for (const match of markdown.matchAll(/<div slot="(go(?:-plus|-teams)?)">([\s\S]*?)<\/div>/g)) {
    const [, plan, body] = match;
    // 文档里还有 "Estimated requests" 等同样使用 PlanTabs 的表，只取带 Monthly limit 的。
    if (!/Monthly limit/.test(body)) continue;
    // 每个套餐只取第一次出现的价格表。
    if (seen.has(plan)) continue;
    seen.add(plan);
    plans[plan] = parseTable(body);
  }
  for (const plan of PLAN_ORDER) {
    if (!plans[plan]) throw new Error(`文档里找不到套餐 ${plan} 的 Monthly limit 表`);
  }
  return plans;
}

/**
 * 把文档里的模型名映射到模型目录的 id。
 * @param {Record<string, Map<string, object>>} plans
 * @param {Array<{id: string, name: string}>} models
 * @returns {{ plans: Record<string, {byId: Record<string, object>, byName: Record<string, object>}>, unmatchedDocs: string[], unmatchedModels: string[] }}
 */
export function mapLimits(plans, models) {
  const apiByNorm = new Map();
  for (const model of models) {
    const key = normalizeName(model.name);
    if (!apiByNorm.has(key)) apiByNorm.set(key, model);
  }
  /** @type {Record<string, {byId: Record<string, object>, byName: Record<string, object>}>} */
  const mapped = {};
  const unmatchedDocs = new Set();
  const matchedIds = new Set();
  for (const plan of PLAN_ORDER) {
    const byId = {};
    const byName = {};
    const entries = [...plans[plan].entries()].sort(([a], [b]) => a.localeCompare(b));
    for (const [name, value] of entries) {
      byName[name] = value;
      const model = apiByNorm.get(name);
      if (model === undefined) {
        unmatchedDocs.add(name);
        continue;
      }
      byId[model.id] = value;
      matchedIds.add(model.id);
    }
    mapped[plan] = { byId, byName };
  }
  const unmatchedModels = models.filter((model) => !matchedIds.has(model.id)).map((model) => model.id);
  return { plans: mapped, unmatchedDocs: [...unmatchedDocs].sort(), unmatchedModels };
}

/**
 * 抓取并解析官方文档，返回与 Remote 结果一致的结构。
 * Host 半只负责取当前模型目录并调用这里；测试可以注入 fetchImpl。
 * @param {{docsUrl?: string, timeoutMs?: number, models?: Array<{id: string, name: string}>, fetchImpl?: typeof fetch, now?: () => number}} options
 * @returns {Promise<{fetchedAt: number, source: string, error: string|null, plans: object|null}>}
 */
export async function collectLimits(options = {}) {
  const docsUrl = typeof options.docsUrl === "string" && options.docsUrl !== ""
    ? options.docsUrl
    : "https://opencode.ai/docs/console/go.md";
  const timeoutMs = typeof options.timeoutMs === "number" && Number.isFinite(options.timeoutMs) && options.timeoutMs > 0
    ? options.timeoutMs
    : 15000;
  const models = Array.isArray(options.models) ? options.models : [];
  const fetchImpl = typeof options.fetchImpl === "function" ? options.fetchImpl : fetch;
  const now = typeof options.now === "function" ? options.now : Date.now;
  let response;
  try {
    response = await fetchImpl(docsUrl, {
      headers: {
        Accept: "text/markdown, text/plain;q=0.9, */*;q=0.5",
        "User-Agent": "dsh-go-model-limits",
      },
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch {
    return { fetchedAt: now(), source: docsUrl, error: "network", plans: null };
  }
  if (!response.ok) {
    return { fetchedAt: now(), source: docsUrl, error: `http-${response.status}`, plans: null };
  }
  let markdown;
  try {
    markdown = await response.text();
  } catch {
    return { fetchedAt: now(), source: docsUrl, error: "bad-body", plans: null };
  }
  let parsed;
  try {
    parsed = parseMonthlyLimits(markdown);
  } catch {
    return { fetchedAt: now(), source: docsUrl, error: "parse", plans: null };
  }
  const mapped = mapLimits(parsed, models);
  return { fetchedAt: now(), source: docsUrl, error: null, plans: mapped.plans };
}
