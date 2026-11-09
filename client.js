// Client 半：在模型选择列表的 opencode-go 模型名后显示官方 Monthly limit。
//
// 扩展点：`conversation.input.model.label`（single / session / inline）。
// 没有贡献时，DSH 的默认 label 只渲染 badge + 模型名；本插件注册后接管这个
// inline 位置，为非 opencode-go 的模型保留原来的名字/badge，只给 GO 模型加额度标签。
//
// 手写 lazy-CJS bundle：脚本执行时只注册 factory，模块体在 materialize 时才运行。
window.__ModuleLoader__.load({
  id: "@skyrocks/dsh-go-model-limits",
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
    Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
    const React = require("react");
    // 共享静态 UI 库；拿不到就退回本插件自己的中性 badge 样式。
    let Tag = null;
    try {
      Tag = require("@deepseek-ai/dsh-client-ui-primitives").Tag ?? null;
    } catch {
      Tag = null;
    }

    const GO_PROVIDER = "opencode-go";
    const NS = "goModelLimits";
    const LIMITS_REFRESH_MS = 6 * 60 * 60 * 1000;

    // 客户端只声明调用形状；结果校验在 Host 侧完成。
    const passThrough = () => ({ parse: (value) => value });
    const REMOTE = {
      package: "@skyrocks/dsh-go-model-limits",
      descriptors: [
        {
          id: "@skyrocks/dsh-go-model-limits#goModelLimits/read",
          service: "goModelLimits",
          namespace: "goModelLimits",
          method: "read",
          invocation: { kind: "direct" },
          parameters: [],
          result: {
            mode: "strict",
            typeSymbol: "@skyrocks/dsh-go-model-limits#GoModelLimitsResult",
            create: passThrough,
          },
        },
        {
          id: "@skyrocks/dsh-go-model-limits#goModelLimits/refresh",
          service: "goModelLimits",
          namespace: "goModelLimits",
          method: "refresh",
          invocation: { kind: "direct" },
          parameters: [],
          result: {
            mode: "strict",
            typeSymbol: "@skyrocks/dsh-go-model-limits#GoModelLimitsResult",
            create: passThrough,
          },
        },
      ],
    };

    // >>> generated:limits (scripts/sync-limits.mjs)
    /** 默认展示的套餐；Go Plus / Go Teams 用户改成对应 key 即可。 */
    const DEFAULT_PLAN = "go";
    const PLAN_ORDER = ["go", "go-plus", "go-teams"];
    const PLAN_LABELS = {"go": "Go", "go-plus": "Go Plus", "go-teams": "Go Teams"};
    /** 所有出现过的价格值（升序）；每个值在客户端有独立颜色。 */
    const PRICE_ORDER = [15, 20, 25, 30, 35, 60, 65, 80, 90, 100, 105, 120, 180, 200, 240];
    /** 兜底快照：Host 尚未返回线上数据时使用。 */
    const LIMITS = {
      "go": {
        "byId": {
          "beam-free": {
            "unlimited": true
          },
          "claude-haiku-5-5": {
            "usd": 15
          },
          "crouton-alpha-free": {
            "unlimited": true
          },
          "deepseek-v4-pro": {
            "usd": 15
          },
          "deepseek-v4.1-flash": {
            "usd": 100
          },
          "gemini-4-argon": {
            "usd": 30
          },
          "glm-5.2": {
            "usd": 60
          },
          "glm-5.3": {
            "usd": 15
          },
          "glm-5.3-flash": {
            "usd": 60
          },
          "gpt-5.6-luna": {
            "usd": 15
          },
          "gpt-6-luna": {
            "usd": 15
          },
          "grok-4.7": {
            "usd": 15
          },
          "hy3": {
            "usd": 60
          },
          "hy4": {
            "usd": 60
          },
          "hy4-preview": {
            "usd": 30
          },
          "iceman-contributor-free": {
            "unlimited": true
          },
          "kimi-k2.7-code": {
            "usd": 60
          },
          "kimi-k3": {
            "usd": 15
          },
          "kimi-k3.1-pro": {
            "usd": 15
          },
          "longcat-2.0": {
            "usd": 60
          },
          "mimo-v2.6-flash": {
            "usd": 60
          },
          "mimo-v2.6-pro": {
            "usd": 15
          },
          "minimax-m3": {
            "usd": 60
          },
          "minimax-m3.1-flash": {
            "usd": 20
          },
          "muse-spark-1.2-contributor": {
            "usd": 60
          },
          "muse-spark-1.3-contributor": {
            "usd": 60
          },
          "qwen3.7-plus": {
            "usd": 60
          },
          "qwen3.8-flash": {
            "usd": 30
          },
          "qwen3.8-max": {
            "usd": 15
          },
          "step-5-preview": {
            "usd": 15
          }
        },
        "byName": {
          "beam free": {
            "unlimited": true
          },
          "claude haiku 5.5": {
            "usd": 15
          },
          "crouton alpha free": {
            "unlimited": true
          },
          "deepseek v4 pro": {
            "usd": 15
          },
          "deepseek v4.1 flash": {
            "usd": 100
          },
          "gemini 4 argon": {
            "usd": 30
          },
          "glm 5.2": {
            "usd": 60
          },
          "glm 5.3": {
            "usd": 15
          },
          "glm 5.3 flash": {
            "usd": 60
          },
          "gpt 5.6 luna": {
            "usd": 15
          },
          "gpt 6 luna": {
            "usd": 15
          },
          "grok 4.7": {
            "usd": 15
          },
          "hy3": {
            "usd": 60
          },
          "hy4": {
            "usd": 60
          },
          "hy4 preview": {
            "usd": 30
          },
          "iceman contributor free": {
            "unlimited": true
          },
          "kimi k2.7 code": {
            "usd": 60
          },
          "kimi k3": {
            "usd": 15
          },
          "kimi k3.1 pro": {
            "usd": 15
          },
          "longcat 2.0": {
            "usd": 60
          },
          "mimo v2.5": {
            "usd": 60
          },
          "mimo v2.5 pro": {
            "usd": 15
          },
          "mimo v2.6 flash": {
            "usd": 60
          },
          "mimo v2.6 pro": {
            "usd": 15
          },
          "minimax m3": {
            "usd": 60
          },
          "minimax m3.1 flash": {
            "usd": 20
          },
          "muse spark 1.2 contributor": {
            "usd": 60
          },
          "muse spark 1.3 contributor": {
            "usd": 60
          },
          "qwen3.7 plus": {
            "usd": 60
          },
          "qwen3.8 flash": {
            "usd": 30
          },
          "qwen3.8 max": {
            "usd": 15
          },
          "step 5 preview": {
            "usd": 15
          }
        }
      },
      "go-plus": {
        "byId": {
          "beam-free": {
            "unlimited": true
          },
          "claude-haiku-5-5": {
            "usd": 60
          },
          "crouton-alpha-free": {
            "unlimited": true
          },
          "deepseek-v4-pro": {
            "usd": 60
          },
          "deepseek-v4.1-flash": {
            "usd": 200
          },
          "gemini-4-argon": {
            "usd": 120
          },
          "glm-5.2": {
            "usd": 180
          },
          "glm-5.3": {
            "usd": 120
          },
          "glm-5.3-flash": {
            "usd": 180
          },
          "gpt-5.6-luna": {
            "usd": 60
          },
          "gpt-6-luna": {
            "usd": 60
          },
          "grok-4.7": {
            "usd": 60
          },
          "hy3": {
            "usd": 240
          },
          "hy4": {
            "usd": 240
          },
          "hy4-preview": {
            "usd": 120
          },
          "iceman-contributor-free": {
            "unlimited": true
          },
          "kimi-k2.7-code": {
            "usd": 180
          },
          "kimi-k3": {
            "usd": 60
          },
          "kimi-k3.1-pro": {
            "usd": 60
          },
          "longcat-2.0": {
            "usd": 240
          },
          "mimo-v2.6-flash": {
            "usd": 120
          },
          "mimo-v2.6-pro": {
            "usd": 60
          },
          "minimax-m3": {
            "usd": 180
          },
          "minimax-m3.1-flash": {
            "usd": 80
          },
          "muse-spark-1.2-contributor": {
            "usd": 120
          },
          "muse-spark-1.3-contributor": {
            "usd": 120
          },
          "qwen3.7-plus": {
            "usd": 180
          },
          "qwen3.8-flash": {
            "usd": 90
          },
          "qwen3.8-max": {
            "usd": 60
          },
          "step-5-preview": {
            "usd": 60
          }
        },
        "byName": {
          "beam free": {
            "unlimited": true
          },
          "claude haiku 5.5": {
            "usd": 60
          },
          "crouton alpha free": {
            "unlimited": true
          },
          "deepseek v4 pro": {
            "usd": 60
          },
          "deepseek v4.1 flash": {
            "usd": 200
          },
          "gemini 4 argon": {
            "usd": 120
          },
          "glm 5.2": {
            "usd": 180
          },
          "glm 5.3": {
            "usd": 120
          },
          "glm 5.3 flash": {
            "usd": 180
          },
          "gpt 5.6 luna": {
            "usd": 60
          },
          "gpt 6 luna": {
            "usd": 60
          },
          "grok 4.7": {
            "usd": 60
          },
          "hy3": {
            "usd": 240
          },
          "hy4": {
            "usd": 240
          },
          "hy4 preview": {
            "usd": 120
          },
          "iceman contributor free": {
            "unlimited": true
          },
          "kimi k2.7 code": {
            "usd": 180
          },
          "kimi k3": {
            "usd": 60
          },
          "kimi k3.1 pro": {
            "usd": 60
          },
          "longcat 2.0": {
            "usd": 240
          },
          "mimo v2.5": {
            "usd": 120
          },
          "mimo v2.5 pro": {
            "usd": 60
          },
          "mimo v2.6 flash": {
            "usd": 120
          },
          "mimo v2.6 pro": {
            "usd": 60
          },
          "minimax m3": {
            "usd": 180
          },
          "minimax m3.1 flash": {
            "usd": 80
          },
          "muse spark 1.2 contributor": {
            "usd": 120
          },
          "muse spark 1.3 contributor": {
            "usd": 120
          },
          "qwen3.7 plus": {
            "usd": 180
          },
          "qwen3.8 flash": {
            "usd": 90
          },
          "qwen3.8 max": {
            "usd": 60
          },
          "step 5 preview": {
            "usd": 60
          }
        }
      },
      "go-teams": {
        "byId": {
          "beam-free": {
            "unlimited": true
          },
          "claude-haiku-5-5": {
            "usd": 20
          },
          "crouton-alpha-free": {
            "unlimited": true
          },
          "deepseek-v4-pro": {
            "usd": 20
          },
          "deepseek-v4.1-flash": {
            "usd": 105
          },
          "gemini-4-argon": {
            "usd": 35
          },
          "glm-5.2": {
            "usd": 65
          },
          "glm-5.3": {
            "usd": 20
          },
          "glm-5.3-flash": {
            "usd": 65
          },
          "gpt-5.6-luna": {
            "usd": 20
          },
          "gpt-6-luna": {
            "usd": 20
          },
          "grok-4.7": {
            "usd": 20
          },
          "hy3": {
            "usd": 65
          },
          "hy4": {
            "usd": 65
          },
          "hy4-preview": {
            "usd": 35
          },
          "iceman-contributor-free": {
            "unlimited": true
          },
          "kimi-k2.7-code": {
            "usd": 65
          },
          "kimi-k3": {
            "usd": 20
          },
          "kimi-k3.1-pro": {
            "usd": 20
          },
          "longcat-2.0": {
            "usd": 65
          },
          "mimo-v2.6-flash": {
            "usd": 65
          },
          "mimo-v2.6-pro": {
            "usd": 20
          },
          "minimax-m3": {
            "usd": 65
          },
          "minimax-m3.1-flash": {
            "usd": 25
          },
          "muse-spark-1.2-contributor": {
            "usd": 65
          },
          "muse-spark-1.3-contributor": {
            "usd": 65
          },
          "qwen3.7-plus": {
            "usd": 65
          },
          "qwen3.8-flash": {
            "usd": 35
          },
          "qwen3.8-max": {
            "usd": 20
          },
          "step-5-preview": {
            "usd": 20
          }
        },
        "byName": {
          "beam free": {
            "unlimited": true
          },
          "claude haiku 5.5": {
            "usd": 20
          },
          "crouton alpha free": {
            "unlimited": true
          },
          "deepseek v4 pro": {
            "usd": 20
          },
          "deepseek v4.1 flash": {
            "usd": 105
          },
          "gemini 4 argon": {
            "usd": 35
          },
          "glm 5.2": {
            "usd": 65
          },
          "glm 5.3": {
            "usd": 20
          },
          "glm 5.3 flash": {
            "usd": 65
          },
          "gpt 5.6 luna": {
            "usd": 20
          },
          "gpt 6 luna": {
            "usd": 20
          },
          "grok 4.7": {
            "usd": 20
          },
          "hy3": {
            "usd": 65
          },
          "hy4": {
            "usd": 65
          },
          "hy4 preview": {
            "usd": 35
          },
          "iceman contributor free": {
            "unlimited": true
          },
          "kimi k2.7 code": {
            "usd": 65
          },
          "kimi k3": {
            "usd": 20
          },
          "kimi k3.1 pro": {
            "usd": 20
          },
          "longcat 2.0": {
            "usd": 65
          },
          "mimo v2.5": {
            "usd": 65
          },
          "mimo v2.5 pro": {
            "usd": 20
          },
          "mimo v2.6 flash": {
            "usd": 65
          },
          "mimo v2.6 pro": {
            "usd": 20
          },
          "minimax m3": {
            "usd": 65
          },
          "minimax m3.1 flash": {
            "usd": 25
          },
          "muse spark 1.2 contributor": {
            "usd": 65
          },
          "muse spark 1.3 contributor": {
            "usd": 65
          },
          "qwen3.7 plus": {
            "usd": 65
          },
          "qwen3.8 flash": {
            "usd": 35
          },
          "qwen3.8 max": {
            "usd": 20
          },
          "step 5 preview": {
            "usd": 20
          }
        }
      }
    };
    const LIMITS_META = {
      "source": "https://opencode.ai/docs/console/go.md",
      "modelsSource": "https://opencode.ai/inference/go/v1/models",
      "generatedAt": "2026-11-09T03:28:17.466Z"
    };
    // <<< generated:limits

    // 每个价格值一种颜色，顺序与 generated 区块的 PRICE_ORDER 一致。
    // 15 个已知价格覆盖 Go / Go Plus / Go Teams 的全部档位；未知新价格回退到按值散列的色相。
    const PRICE_PALETTE = [
      { light: "#d1242f", dark: "#ff7b72" }, // 15
      { light: "#1d4ed8", dark: "#93c5fd" }, // 20
      { light: "#0f766e", dark: "#5eead4" }, // 25
      { light: "#a21caf", dark: "#f0abfc" }, // 30
      { light: "#7e22ce", dark: "#d8b4fe" }, // 35
      { light: "#c2410c", dark: "#fdba74" }, // 60
      { light: "#0e7490", dark: "#67e8f9" }, // 65
      { light: "#4338ca", dark: "#a5b4fc" }, // 80
      { light: "#b91c1c", dark: "#fca5a5" }, // 90
      { light: "#047857", dark: "#6ee7b7" }, // 100
      { light: "#be123c", dark: "#fda4af" }, // 105
      { light: "#0369a1", dark: "#7dd3fc" }, // 120
      { light: "#4d7c0f", dark: "#bef264" }, // 180
      { light: "#6d28d9", dark: "#c4b5fd" }, // 200
      { light: "#a16207", dark: "#fde047" }, // 240
    ];

    const DICT = {
      zh: {
        "tag.monthly": "{amount}/月",
        "tag.unlimited": "无限",
        "tip.title": "OpenCode GO 月度额度（{plan} 套餐）",
        "tip.line": "{plan}：{value}",
        "tip.live": "数据：opencode.ai 文档 · {date}（实时）",
        "tip.liveStale": "数据：opencode.ai 文档 · {date}（刷新失败，沿用上次数据）",
        "tip.snapshot": "数据：内置快照 · {date}",
      },
      en: {
        "tag.monthly": "{amount}/mo",
        "tag.unlimited": "Unlimited",
        "tip.title": "OpenCode GO monthly limit ({plan} plan)",
        "tip.line": "{plan}: {value}",
        "tip.live": "Source: opencode.ai docs · {date} (live)",
        "tip.liveStale": "Source: opencode.ai docs · {date} (refresh failed, using last data)",
        "tip.snapshot": "Built-in snapshot · {date}",
      },
    };

    const CSS = [
      ".dsh-gml-limit{display:inline-block;margin-left:6px;padding:1px 5px;border-radius:5px;font-size:10.5px;line-height:14px;vertical-align:1px;white-space:nowrap;font-variant-numeric:tabular-nums;color:var(--dsh-gml-c-light,#8a8f98);background:rgba(127,127,127,.12);background:color-mix(in srgb,var(--dsh-gml-c-light,#8a8f98) 14%,transparent);}",
      "@media (prefers-color-scheme:dark){.dsh-gml-limit{color:var(--dsh-gml-c-dark,#cbd5e1);background:color-mix(in srgb,var(--dsh-gml-c-dark,#cbd5e1) 20%,transparent);}}",
      ".dsh-gml-limit[data-kind=\"unlimited\"]{color:#4c1d95;background:linear-gradient(90deg,rgba(244,114,182,.20),rgba(96,165,250,.20),rgba(52,211,153,.20));}",
      "@media (prefers-color-scheme:dark){.dsh-gml-limit[data-kind=\"unlimited\"]{color:#ede9fe;}}",
      ".dsh-gml-badge{display:inline-block;margin:0 2px;padding:0 4px;border-radius:4px;font-size:10px;line-height:14px;vertical-align:1px;white-space:nowrap;color:var(--dsw-alias-label-secondary,#6b7280);background:var(--dsw-alias-bg-module-platform,rgba(127,127,127,.12));border:1px solid var(--dsw-alias-border-l1,rgba(127,127,127,.2));}",
    ].join("");

    let localeRef = null;
    let styleDispose = null;
    let ctxRef = null;
    let mountReady = Promise.resolve();

    // Host 返回的线上数据；没有时退回 generated 区块里的内置快照。
    const store = {
      value: null,
      version: 0,
      listeners: new Set(),
      subscribe: (listener) => {
        store.listeners.add(listener);
        return () => {
          store.listeners.delete(listener);
        };
      },
      getSnapshot: () => store.version,
      set: (value) => {
        store.value = value;
        store.version += 1;
        for (const listener of [...store.listeners]) {
          try {
            listener();
          } catch {
            // 单个订阅者异常不影响其他订阅者。
          }
        }
      },
    };

    /** 当前生效的额度表：优先 Host 线上数据，其次内置快照。 */
    function activePlans() {
      return store.value !== null && store.value.plans !== null ? store.value.plans : LIMITS;
    }

    /** 把 fetchedAt / generatedAt 统一成 YYYY-MM-DD。 */
    function dateOf(value) {
      if (typeof value === "number" && Number.isFinite(value)) {
        return new Date(value).toISOString().slice(0, 10);
      }
      if (typeof value === "string" && value.length >= 10) return value.slice(0, 10);
      return "";
    }

    /** 读一次 Host 的额度；失败时保持当前数据。 */
    async function loadLimits() {
      try {
        await mountReady;
      } catch {
        return;
      }
      const api = ctxRef === null ? undefined : ctxRef.get("remote.goModelLimits");
      if (api === undefined) return;
      try {
        const result = await api.read();
        if (!result || result.ok === false) return;
        const value = result.value;
        if (value && value.plans) store.set(value);
      } catch {
        // Host 不可用：继续用上一份数据 / 内置快照。
      }
    }

    /** 与 scripts/sync-limits.mjs 保持一致的名称归一化。 */
    function normalizeName(value) {
      return String(value ?? "")
        .toLowerCase()
        .replace(/\([^)]*\)/g, " ")
        .replace(/（[^）]*）/g, " ")
        .replace(/[^a-z0-9.]+/g, " ")
        .trim()
        .replace(/\s+/g, " ");
    }

    /** 某模型在某档套餐下的额度条目；未收录返回 undefined。 */
    function limitOf(model, plan) {
      if (!model || typeof model.id !== "string") return undefined;
      const bucket = activePlans()[plan];
      if (!bucket) return undefined;
      if (Object.prototype.hasOwnProperty.call(bucket.byId, model.id)) return bucket.byId[model.id];
      const key = normalizeName(model.name);
      if (Object.prototype.hasOwnProperty.call(bucket.byName, key)) return bucket.byName[key];
      return undefined;
    }

    /** 兜底翻译：slot 没有注入 t 时退回中文词典。 */
    function translate(key, params) {
      const template = DICT.zh[key] ?? key;
      if (!params) return template;
      return template.replace(/\{(\w+)\}/g, (match, name) => (name in params ? String(params[name]) : match));
    }

    function formatValue(entry) {
      return entry.unlimited ? "Unlimited" : `$${entry.usd}`;
    }

    function tagText(entry, t) {
      if (entry.unlimited) return t("tag.unlimited");
      return t("tag.monthly", { amount: `$${entry.usd}` });
    }

    /** 每个价格值取一个固定颜色；无限单独用渐变。 */
    function colorOf(entry) {
      if (entry.unlimited) return null;
      const index = PRICE_ORDER.indexOf(entry.usd);
      if (index >= 0 && index < PRICE_PALETTE.length) return PRICE_PALETTE[index];
      // 官方新增了还没同步进 PRICE_ORDER 的价格：按值散列一个色相，避免所有新价格同色。
      const hue = Math.round((Number(entry.usd) * 137.508) % 360);
      return { light: `hsl(${hue} 60% 34%)`, dark: `hsl(${hue} 70% 68%)` };
    }

    /** 悬浮提示：当前套餐 + 三档对照 + 数据日期。 */
    function tooltip(entry, model, t) {
      const lines = [t("tip.title", { plan: PLAN_LABELS[DEFAULT_PLAN] ?? DEFAULT_PLAN })];
      for (const plan of PLAN_ORDER) {
        const value = limitOf(model, plan);
        if (value === undefined) continue;
        lines.push(t("tip.line", { plan: PLAN_LABELS[plan] ?? plan, value: formatValue(value) }));
      }
      const runtime = store.value;
      const date = dateOf(runtime !== null && runtime.plans !== null ? runtime.fetchedAt : LIMITS_META.generatedAt);
      if (runtime !== null && runtime.plans !== null) {
        lines.push(t(runtime.error === null ? "tip.live" : "tip.liveStale", { date }));
      } else {
        lines.push(t("tip.snapshot", { date }));
      }
      return lines.join("\n");
    }

    /** badge 的文案由 catalog 提供；与 DSH 默认 label 一样交给 locale 解析。 */
    function badgeText(badge) {
      if (!badge || badge.text === undefined) return "";
      if (typeof badge.text === "string") return badge.text;
      if (localeRef !== null && typeof localeRef.resolveText === "function") {
        try {
          return localeRef.resolveText(badge.text);
        } catch {
          // 解析失败时退回第一段可用文本。
        }
      }
      if (typeof badge.text === "object") {
        const values = Object.values(badge.text);
        return typeof values[0] === "string" ? values[0] : "";
      }
      return "";
    }

    function ModelLabel(props) {
      React.useSyncExternalStore(store.subscribe, store.getSnapshot);
      const { provider, model, placement } = props;
      const t = typeof props.t === "function" ? props.t : translate;
      const children = [];
      const text = badgeText(model.badge);
      const badge = text === ""
        ? null
        : Tag !== null
          ? React.createElement(Tag, { tone: model.badge.tone }, text)
          : React.createElement(
              "span",
              { className: "dsh-gml-badge", "data-tone": model.badge.tone },
              text,
            );
      // 与 DSH 默认一致：trigger 里 badge 在前，菜单行里 badge 在后。
      if (badge !== null && placement === "trigger") {
        children.push(badge, " ");
      }
      children.push(React.createElement("span", { className: "dsh-gml-name", key: "name" }, model.name));
      if (badge !== null && placement !== "trigger") {
        children.push(" ", badge);
      }
      const entry = provider !== null && provider !== undefined && provider.id === GO_PROVIDER
        ? limitOf(model, DEFAULT_PLAN)
        : undefined;
      // 只在可选择的模型行显示额度；trigger / 根菜单当前值保持干净。
      if (entry !== undefined && placement === "option") {
        const color = colorOf(entry);
        children.push(
          " ",
          React.createElement(
            "span",
            {
              className: "dsh-gml-limit",
              key: "limit",
              "data-kind": entry.unlimited ? "unlimited" : "priced",
              style: color === null
                ? undefined
                : {
                    "--dsh-gml-c-light": color.light,
                    "--dsh-gml-c-dark": color.dark,
                  },
              title: tooltip(entry, model, t),
            },
            tagText(entry, t),
          ),
        );
      }
      return React.createElement("span", { className: "dsh-gml-label" }, ...children);
    }

    function ensureStyle() {
      if (typeof document === "undefined") return () => {};
      const id = "dsh-go-model-limits-style";
      if (document.getElementById(id) !== null) return () => {};
      const element = document.createElement("style");
      element.id = id;
      element.textContent = CSS;
      document.head.appendChild(element);
      return () => {
        element.remove();
      };
    }

    function apply(ctx) {
      ctxRef = ctx;
      localeRef = typeof ctx.locale === "object" ? ctx.locale : null;
      if (localeRef !== null) {
        ctx.effect(
          () => localeRef.register(NS, { zh: DICT.zh, en: DICT.en }),
          "go-model-limits: dictionaries",
        );
      }
      const slots = ctx.get("slots");
      if (slots === undefined) return;
      if (typeof ctx.remote === "object") {
        mountReady = ctx.remote.$mount(REMOTE);
        void loadLimits();
        ctx.effect(() => {
          const timer = ctx.get("timer");
          if (timer !== undefined && typeof timer.interval === "function") {
            const stop = timer.interval(() => {
              void loadLimits();
            }, LIMITS_REFRESH_MS);
            return () => {
              if (typeof stop === "function") stop();
            };
          }
          const handle = setInterval(() => {
            void loadLimits();
          }, LIMITS_REFRESH_MS);
          return () => clearInterval(handle);
        }, "go-model-limits: refresh");
      }
      ctx.effect(() => {
        styleDispose = ensureStyle();
        return () => {
          if (typeof styleDispose === "function") styleDispose();
          styleDispose = null;
        };
      }, "go-model-limits: style");
      slots.inject("conversation.input.model.label", () =>
        slots.register(
          { name: "conversation.input.model.label", locale: NS },
          ModelLabel,
        ),
      );
    }

    exports.apply = apply;
    exports.inject = ["slots", "locale", "remote"];
    return module.exports;
  },
});
