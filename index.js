// Host 半：抓取 OpenCode 官方 Go 价格文档，解析出每模型 Monthly limit，
// 再用当前 DSH 的 opencode-go 模型目录把名称映射成模型 id，通过 Remote 下发给客户端。
//
// 为什么在 Host 抓：文档页没有 CORS，浏览器不能直接 fetch；Host 抓完缓存，
// 客户端只在首次打开和数据过期时读一次。文档是公开页面，不需要 API Key。
//
// 缓存默认 6 小时；抓取失败时返回旧缓存（客户端继续显示旧数据 / 内置快照）。
import z from "@deepseek-ai/schemastery";
import { TypertRemoteService } from "@deepseek-ai/dsh-typert-protocol";
import { collectLimits } from "./limits.js";

const DEFAULT_DOCS_URL = "https://opencode.ai/docs/console/go.md";
const DEFAULT_TIMEOUT_MS = 15000;
const DEFAULT_CACHE_MS = 6 * 60 * 60 * 1000;
const GO_PROVIDER = "opencode-go";

export const Config = z.object({
  docsUrl: z.string().default(DEFAULT_DOCS_URL),
  timeoutMs: z.number().default(DEFAULT_TIMEOUT_MS),
  cacheMs: z.number().default(DEFAULT_CACHE_MS),
});

/** 读取配置里的正数，否则用默认值。 */
function positive(value, fallback) {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : fallback;
}

export class GoModelLimitsGateway extends TypertRemoteService {
  static inject = ["llm"];
  static Config = Config;

  constructor(ctx, config) {
    super(ctx, "goModelLimits");
    this.config = config ?? {};
    this.cache = null;
    this.inflight = null;
  }

  /**
   * 读取额度：命中缓存直接返回；否则抓一次文档。
   * 抓取失败时若有旧缓存，返回旧值并带上 error，避免界面突然清空。
   */
  async read() {
    const cacheMs = positive(this.config.cacheMs, DEFAULT_CACHE_MS);
    if (this.cache !== null && Date.now() - this.cache.at < cacheMs) return this.cache.payload;
    if (this.inflight !== null) return this.inflight;
    this.inflight = this.collect()
      .then((payload) => {
        if (payload.plans !== null) {
          this.cache = { at: Date.now(), payload };
          return payload;
        }
        // 失败时保留上一份可用数据，并把失败原因带上，让客户端提示“沿用上次数据”。
        if (this.cache !== null) {
          this.cache.payload = { ...this.cache.payload, error: payload.error };
          return this.cache.payload;
        }
        return payload;
      })
      .catch(() => ({
        fetchedAt: Date.now(),
        source: typeof this.config.docsUrl === "string" ? this.config.docsUrl : DEFAULT_DOCS_URL,
        error: "internal",
        plans: null,
      }))
      .finally(() => {
        this.inflight = null;
      });
    return this.inflight;
  }

  /** 绕过缓存强制刷新；失败时恢复上一份可用数据。 */
  async refresh() {
    const previous = this.cache;
    this.cache = null;
    const payload = await this.read();
    if (payload.plans === null && previous !== null) {
      this.cache = { at: previous.at, payload: { ...previous.payload, error: payload.error } };
      return this.cache.payload;
    }
    return payload;
  }

  async collect() {
    const docsUrl = typeof this.config.docsUrl === "string" && this.config.docsUrl !== ""
      ? this.config.docsUrl
      : DEFAULT_DOCS_URL;
    const timeoutMs = positive(this.config.timeoutMs, DEFAULT_TIMEOUT_MS);
    // 模型目录不可用时仍然下发 byName，客户端可以按名字匹配。
    let models = [];
    try {
      models = await this.ctx.llm.listModels(GO_PROVIDER);
    } catch {
      models = [];
    }
    return collectLimits({
      docsUrl,
      timeoutMs,
      models: Array.isArray(models) ? models : [],
    });
  }
}

export default GoModelLimitsGateway;
