// 纯逻辑 + 客户端组件回归：不依赖 DSH 运行时，直接 `node test/smoke.mjs`。
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

import {
  collectLimits,
  mapLimits,
  normalizeName,
  parseMonthlyLimits,
} from "../limits.js";
import { applyBlock, renderDataBlock } from "../scripts/sync-limits.mjs";
import { TYPERT } from "../typert.host.js";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const read = (name) => readFileSync(join(root, name), "utf8");

let passed = 0;
function test(name, fn) {
  try {
    fn();
    passed += 1;
    console.log(`ok   ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

const markdown = read("test/fixtures/go.md");
const models = JSON.parse(read("test/fixtures/models.json")).data;

// ------------------------------------------------------------ 文档解析
test("名称归一化：拆分行与 models 接口对齐", () => {
  assert.equal(normalizeName("DeepSeek V4.1 Flash (Off-Peak)"), "deepseek v4.1 flash");
  assert.equal(normalizeName("DeepSeek-V4.1-Flash"), "deepseek v4.1 flash");
  assert.equal(normalizeName("MiniMax M3 (≤ 512K tokens)"), "minimax m3");
  assert.equal(normalizeName("Gemini 4 Argon (50% off)"), "gemini 4 argon");
  assert.equal(normalizeName("Qwen3.7 Plus（> 256K tokens）"), "qwen3.7 plus");
});

test("解析出三档套餐的 Monthly limit", () => {
  const plans = parseMonthlyLimits(markdown);
  assert.deepEqual(Object.keys(plans).sort(), ["go", "go-plus", "go-teams"]);
  assert.deepEqual(plans.go.get("deepseek v4.1 flash"), { usd: 100 });
  assert.deepEqual(plans.go.get("glm 5.3"), { usd: 15 });
  assert.deepEqual(plans.go.get("glm 5.3 flash"), { usd: 60 });
  assert.deepEqual(plans.go.get("beam free"), { unlimited: true });
  assert.deepEqual(plans["go-plus"].get("deepseek v4.1 flash"), { usd: 200 });
  assert.deepEqual(plans["go-teams"].get("deepseek v4.1 flash"), { usd: 105 });
  // Peak / Off-Peak 两行同一个额度，去重后仍是 15。
  assert.deepEqual(plans.go.get("deepseek v4 pro"), { usd: 15 });
});

test("文档名称映射到 models 接口 id", () => {
  const plans = parseMonthlyLimits(markdown);
  const mapped = mapLimits(plans, models);
  assert.equal(Object.keys(mapped.plans.go.byId).length, models.length);
  assert.deepEqual(mapped.plans.go.byId["deepseek-v4.1-flash"], { usd: 100 });
  assert.deepEqual(mapped.plans["go-plus"].byId["deepseek-v4.1-flash"], { usd: 200 });
  assert.deepEqual(mapped.plans["go-teams"].byId["deepseek-v4.1-flash"], { usd: 105 });
  assert.deepEqual(mapped.plans.go.byId["glm-5.3-flash"], { usd: 60 });
  assert.deepEqual(mapped.plans.go.byId["beam-free"], { unlimited: true });
  assert.deepEqual(mapped.unmatchedModels, []);
  // 文档里还有两个已下架的 MiMo V2.5，保留在 byName 里但不阻断发布。
  assert.deepEqual(mapped.unmatchedDocs, ["mimo v2.5", "mimo v2.5 pro"]);
  assert.deepEqual(mapped.plans.go.byName["mimo v2.5"], { usd: 60 });
});

// ------------------------------------------------------------ 生成区块
test("generated 区块可重复替换且不破坏文件", () => {
  const plans = parseMonthlyLimits(markdown);
  const mapped = mapLimits(plans, models);
  const block = renderDataBlock(mapped, { generatedAt: "2026-11-09T00:00:00.000Z" });
  const template = read("client.js");
  const once = applyBlock(template, block);
  const twice = applyBlock(once, block);
  assert.equal(once, twice);
  assert.match(once, /const DEFAULT_PLAN = "go";/);
  assert.match(once, /const LIMITS = \{/);
  assert.match(once, /"deepseek-v4\.1-flash": \{/);
});

// ------------------------------------------------------ 客户端组件冒烟
function flatten(children) {
  return children.flat(Infinity).filter((child) => child !== null && child !== undefined && child !== false);
}

function loadClient() {
  const registrations = [];
  const sandbox = {
    window: { __ModuleLoader__: { load: (entry) => registrations.push(entry) } },
    console,
  };
  vm.runInNewContext(read("client.js"), sandbox, { filename: "client.js" });
  assert.equal(registrations.length, 1);
  const entry = registrations[0];
  assert.equal(entry.id, "@skyrocks/dsh-go-model-limits");
  const React = {
    createElement(type, props, ...children) {
      return { type, props: props ?? {}, children: flatten(children) };
    },
    useSyncExternalStore: (_subscribe, getSnapshot) => getSnapshot(),
  };
  const primitives = {
    Tag: ({ tone, children }) => React.createElement("span", { className: "dsh-gml-badge", "data-tone": tone }, children),
  };
  const moduleExports = entry.factory((id) => {
    if (id === "react") return React;
    if (id === "@deepseek-ai/dsh-client-ui-primitives") return primitives;
    throw new Error(`unexpected require: ${id}`);
  });
  return moduleExports;
}

function mountLabel(options = {}) {
  const moduleExports = loadClient();
  assert.deepEqual(Array.from(moduleExports.inject), ["slots", "locale", "remote"]);
  let component = null;
  const dictionary = {
    "tag.monthly": "{amount}/月",
    "tag.unlimited": "无限",
    "tip.title": "OpenCode GO 月度额度（{plan} 套餐）",
    "tip.line": "{plan}：{value}",
    "tip.live": "数据：opencode.ai 文档 · {date}（实时）",
    "tip.liveStale": "数据：opencode.ai 文档 · {date}（刷新失败，沿用上次数据）",
    "tip.snapshot": "数据：内置快照 · {date}",
  };
  const t = (key, params = {}) => (dictionary[key] ?? key).replace(/\{(\w+)\}/g, (match, name) => params[name] ?? match);
  const locale = {
    register: () => () => {},
    bind: () => t,
    resolveText: (text) => (typeof text === "string" ? text : "resolved"),
  };
  const slots = {
    inject: (name, callback) => callback(),
    register: (options, value) => {
      assert.equal(options.name, "conversation.input.model.label");
      component = value;
      return () => {};
    },
  };
  moduleExports.apply({
    locale,
    remote: options.remote === undefined ? undefined : { $mount: () => Promise.resolve() },
    get: (name) => {
      if (name === "slots") return slots;
      if (name === "remote.goModelLimits") return options.remote;
      if (name === "timer") return options.timer;
      return undefined;
    },
    effect: (fn) => fn(),
  });
  assert.equal(typeof component, "function");
  return (props) => component({ t, selected: false, ...props });
}

function find(node, className) {
  if (node === null || typeof node !== "object") return null;
  if (typeof node.props?.className === "string" && node.props.className.includes(className)) return node;
  for (const child of node.children ?? []) {
    const found = find(child, className);
    if (found !== null) return found;
  }
  return null;
}

function textOf(node) {
  if (node === null || node === undefined) return "";
  if (typeof node === "string") return node;
  return (node.children ?? []).map(textOf).join("");
}

test("GO 模型行显示月度额度；非 GO / trigger / 未知模型不显示", () => {
  const render = mountLabel();
  const go = { id: "opencode-go", name: "OpenCode GO" };
  const flash = render({
    provider: go,
    model: { id: "deepseek-v4.1-flash", name: "DeepSeek V4.1 Flash" },
    placement: "option",
  });
  assert.equal(textOf(flash), "DeepSeek V4.1 Flash $100/月");
  const tag = find(flash, "dsh-gml-limit");
  assert.ok(tag);
  assert.equal(tag.props["data-kind"], "priced");
  assert.equal(tag.props.style["--dsh-gml-c-light"], "#047857");
  assert.match(tag.props.title, /Go：\$100/);
  assert.match(tag.props.title, /Go Plus：\$200/);
  assert.match(tag.props.title, /Go Teams：\$105/);

  const cheap = render({
    provider: go,
    model: { id: "glm-5.3", name: "GLM-5.3" },
    placement: "option",
  });
  assert.equal(textOf(cheap), "GLM-5.3 $15/月");
  assert.equal(find(cheap, "dsh-gml-limit").props.style["--dsh-gml-c-light"], "#d1242f");

  const mid = render({
    provider: go,
    model: { id: "glm-5.3-flash", name: "GLM-5.3-Flash" },
    placement: "option",
  });
  assert.equal(textOf(mid), "GLM-5.3-Flash $60/月");
  assert.equal(find(mid, "dsh-gml-limit").props.style["--dsh-gml-c-light"], "#c2410c");

  // $20 与 $15 也必须是不同颜色（相邻价格不共用配色）。
  const twenty = render({
    provider: go,
    model: { id: "minimax-m3.1-flash", name: "MiniMax M3.1 Flash" },
    placement: "option",
  });
  assert.equal(find(twenty, "dsh-gml-limit").props.style["--dsh-gml-c-light"], "#1d4ed8");
  assert.notEqual(
    find(twenty, "dsh-gml-limit").props.style["--dsh-gml-c-light"],
    find(cheap, "dsh-gml-limit").props.style["--dsh-gml-c-light"],
  );

  // $30 与 $60 必须是不同颜色（用户反馈过这两个之前撞色）。
  const thirty = render({
    provider: go,
    model: { id: "gemini-4-argon", name: "Gemini 4 Argon" },
    placement: "option",
  });
  const thirtyColor = find(thirty, "dsh-gml-limit").props.style["--dsh-gml-c-light"];
  assert.equal(thirtyColor, "#a21caf");
  assert.notEqual(thirtyColor, find(mid, "dsh-gml-limit").props.style["--dsh-gml-c-light"]);

  const free = render({
    provider: go,
    model: { id: "beam-free", name: "Beam Free" },
    placement: "option",
  });
  assert.equal(textOf(free), "Beam Free 无限");
  const freeTag = find(free, "dsh-gml-limit");
  assert.equal(freeTag.props["data-kind"], "unlimited");
  assert.equal(freeTag.props.style, undefined);

  const other = render({
    provider: { id: "deepseek-account", name: "DeepSeek" },
    model: { id: "deepseek-chat", name: "DeepSeek Chat" },
    placement: "option",
  });
  assert.equal(find(other, "dsh-gml-limit"), null);

  // 同一个模型 id 出现在官方 provider 下也不加标签：判断只看 provider。
  const sameId = render({
    provider: { id: "deepseek-account", name: "DeepSeek" },
    model: { id: "deepseek-v4.1-flash", name: "DeepSeek V4.1 Flash" },
    placement: "option",
  });
  assert.equal(find(sameId, "dsh-gml-limit"), null);

  const trigger = render({
    provider: go,
    model: { id: "deepseek-v4.1-flash", name: "DeepSeek V4.1 Flash" },
    placement: "trigger",
  });
  assert.equal(find(trigger, "dsh-gml-limit"), null);

  const unknown = render({
    provider: go,
    model: { id: "not-in-data", name: "Not In Data" },
    placement: "option",
  });
  assert.equal(find(unknown, "dsh-gml-limit"), null);

  // id 变了但名字还能对上文档时，走 byName 兜底。
  const renamed = render({
    provider: go,
    model: { id: "renamed-model-id", name: "MiniMax M3" },
    placement: "option",
  });
  assert.equal(textOf(renamed), "MiniMax M3 $60/月");
});

test("保留模型 badge 的默认位置", () => {
  const render = mountLabel();
  const props = {
    provider: { id: "deepseek-account", name: "DeepSeek" },
    model: { id: "deepseek-chat", name: "DeepSeek Chat", badge: { tone: "info", text: "新" } },
  };
  assert.equal(textOf(render({ ...props, placement: "option" })), "DeepSeek Chat 新");
  assert.equal(textOf(render({ ...props, placement: "trigger" })), "新 DeepSeek Chat");
});

// ------------------------------------------------------------ Host / 运行时
test("Typert codec 接受实时结果、拒绝坏形状", () => {
  const codec = TYPERT.invocations[0].result.create();
  const plans = Object.fromEntries(["go", "go-plus", "go-teams"].map((plan) => [plan, { byId: {}, byName: {} }]));
  plans.go.byId["deepseek-v4.1-flash"] = { usd: 100 };
  const result = { fetchedAt: 1, source: "https://opencode.ai/docs/console/go.md", error: null, plans };
  assert.equal(codec.parse(result).plans.go.byId["deepseek-v4.1-flash"].usd, 100);
  assert.doesNotThrow(() => codec.parse({ ...result, plans: null, error: "network" }));
  assert.throws(() => codec.parse({ ...result, fetchedAt: "x" }), /fetchedAt/);
  assert.throws(
    () => codec.parse({ ...result, plans: { ...plans, go: { byId: { bad: { usd: "x" } }, byName: {} } } }),
    /usd/,
  );
});

// Host 返回的线上数据要能覆盖内置快照，并让悬浮提示标出“实时”。
await (async () => {
  const plans = Object.fromEntries(["go", "go-plus", "go-teams"].map((plan) => [plan, { byId: {}, byName: {} }]));
  plans.go.byId["deepseek-v4.1-flash"] = { usd: 999 };
  const remote = {
    read: async () => ({
      ok: true,
      value: { fetchedAt: Date.parse("2026-11-09T00:00:00Z"), source: "docs", error: null, plans },
    }),
  };
  const render = mountLabel({ remote, timer: { interval: () => () => {} } });
  await new Promise((resolve) => setTimeout(resolve, 0));
  const tree = render({
    provider: { id: "opencode-go", name: "OpenCode GO" },
    model: { id: "deepseek-v4.1-flash", name: "DeepSeek V4.1 Flash" },
    placement: "option",
  });
  assert.equal(textOf(tree), "DeepSeek V4.1 Flash $999/月");
  assert.match(find(tree, "dsh-gml-limit").props.title, /实时/);
  passed += 1;
  console.log("ok   运行时数据覆盖内置快照");
})();

// Host collect：成功/网络失败/HTTP 失败/文档结构变化，都要返回可判定的结果。
await (async () => {
  const models = [{ id: "deepseek-v4.1-flash", name: "DeepSeek V4.1 Flash" }];
  const ok = await collectLimits({
    docsUrl: "docs",
    models,
    now: () => 1,
    fetchImpl: async () => ({ ok: true, text: async () => markdown }),
  });
  assert.equal(ok.error, null);
  assert.deepEqual(ok.plans.go.byId["deepseek-v4.1-flash"], { usd: 100 });

  const network = await collectLimits({
    docsUrl: "docs",
    models,
    now: () => 2,
    fetchImpl: async () => {
      throw new Error("offline");
    },
  });
  assert.equal(network.error, "network");
  assert.equal(network.plans, null);

  const http = await collectLimits({
    docsUrl: "docs",
    models,
    now: () => 3,
    fetchImpl: async () => ({ ok: false, status: 503 }),
  });
  assert.equal(http.error, "http-503");

  const broken = await collectLimits({
    docsUrl: "docs",
    models,
    now: () => 4,
    fetchImpl: async () => ({ ok: true, text: async () => "changed layout" }),
  });
  assert.equal(broken.error, "parse");
  passed += 1;
  console.log("ok   Host collect 成功与失败路径");
})();

// ------------------------------------------------------------ 自包含
test("client bundle 自包含（没有相对 require）", () => {
  assert.doesNotMatch(read("client.js"), /require\(\s*["']\.\.?\//);
});

console.log(`\n${passed} passed`);
