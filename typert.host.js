// Typert Host 清单：声明 goModelLimits/read 与 goModelLimits/refresh 两个 direct 调用。
// strict codec 必须是 `{ mode, typeSymbol, create() }`；校验 Host 结果的 wire 形状，
// 防止坏数据拖垮客户端连接。
import { PLAN_ORDER } from "./limits.js";

const isRecord = (value) => value !== null && typeof value === "object" && !Array.isArray(value);

function fail(field, expected) {
  throw new Error(`dsh-go-model-limits result: ${field} must be ${expected}`);
}

function parseEntry(field, value) {
  if (!isRecord(value)) fail(field, "an object");
  if (value.unlimited === true) return value;
  if (typeof value.usd !== "number" || !Number.isFinite(value.usd)) {
    fail(field, "a finite usd number or unlimited");
  }
  return value;
}

function parsePlan(field, value) {
  if (!isRecord(value)) fail(field, "an object");
  if (!isRecord(value.byId)) fail(`${field}.byId`, "an object");
  if (!isRecord(value.byName)) fail(`${field}.byName`, "an object");
  for (const [id, entry] of Object.entries(value.byId)) parseEntry(`${field}.byId.${id}`, entry);
  for (const [name, entry] of Object.entries(value.byName)) parseEntry(`${field}.byName.${name}`, entry);
  return value;
}

/** `create()` 返回的 parser：校验 Host 结果的 wire 形状。 */
function parseResult(value) {
  if (!isRecord(value)) fail("result", "an object");
  if (typeof value.fetchedAt !== "number" || !Number.isFinite(value.fetchedAt)) {
    fail("fetchedAt", "a finite number");
  }
  if (typeof value.source !== "string") fail("source", "a string");
  if (value.error !== null && typeof value.error !== "string") fail("error", "a string or null");
  if (value.plans !== null) {
    if (!isRecord(value.plans)) fail("plans", "an object or null");
    for (const plan of PLAN_ORDER) parsePlan(`plans.${plan}`, value.plans[plan]);
  }
  return value;
}

const resultCodec = {
  mode: "strict",
  typeSymbol: "@skyrocks/dsh-go-model-limits#GoModelLimitsResult",
  create: () => ({ parse: parseResult }),
};

const invocation = (method) => ({
  id: `@skyrocks/dsh-go-model-limits#goModelLimits/${method}`,
  service: "goModelLimits",
  namespace: "goModelLimits",
  method,
  invocation: { kind: "direct" },
  parameters: [],
  result: resultCodec,
});

export const TYPERT = {
  package: "@skyrocks/dsh-go-model-limits",
  face: "host",
  schemas: [],
  invocations: [invocation("read"), invocation("refresh")],
  model: { services: [], events: [], objects: [] },
};
