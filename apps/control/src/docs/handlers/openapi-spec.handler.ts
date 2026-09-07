import { existsSync, readFileSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { load } from "js-yaml";

let cached: { data: unknown; mtime: number } | null = null;
const specPath = fileURLToPath(new URL("../../../../../packages/core/docs/openapi.yaml", import.meta.url));

export function generateExampleFromSchema(schema: any, components: any, depth = 0, propertyName = ""): any {
  if (!schema || depth > 3) return null;
  if (schema.example !== undefined) return schema.example;
  if (schema.default !== undefined) return schema.default;
  if (schema.$ref) return generateExampleFromSchema(components[schema.$ref.replace("#/components/schemas/", "")], components, depth + 1, propertyName);
  if (schema.oneOf?.length) return generateExampleFromSchema(schema.oneOf[0], components, depth + 1, propertyName);
  if (schema.anyOf?.length) return generateExampleFromSchema(schema.anyOf[0], components, depth + 1, propertyName);
  if (schema.allOf?.length) return schema.allOf.reduce((a: any, x: any) => ({ ...a, ...(generateExampleFromSchema(x, components, depth + 1, propertyName) || {}) }), {});
  if (schema.type === "object") {
    const out: Record<string, unknown> = {};
    const properties = schema.properties ?? {};
    const required: string[] = schema.required ?? [];
    const keys = [...required, ...Object.keys(properties).filter((key) => !required.includes(key)).slice(0, 3)];
    for (const key of keys) {
      out[key] = generateExampleFromSchema(properties[key], components, depth + 1, key);
    }
    return out;
  }
  if (schema.type === "array") return schema.items ? [generateExampleFromSchema(schema.items, components, depth + 1, propertyName)] : [];
  if (schema.type === "boolean") return schema.default ?? false;
  if (schema.type === "number" || schema.type === "integer") return schema.minimum ?? 0;
  if (schema.type === "string") return schema.enum?.[0] ?? (schema.format === "email" ? "user@example.com" : schema.format === "date-time" ? "2024-01-01T00:00:00Z" : /url/i.test(propertyName) ? "https://example.com" : "string");
  return null;
}

export function GET(): Response {
  try {
    if (!existsSync(specPath)) return Response.json({ error: "openapi.yaml not found" }, { status: 404 });
    const mtime = statSync(specPath).mtimeMs;
    if (cached?.mtime === mtime) return Response.json(cached.data);
    const raw: any = load(readFileSync(specPath, "utf8"));
    const components = raw.components?.schemas || {};
    const endpoints: any[] = [];
    for (const [pathName, methods] of Object.entries(raw.paths || {})) for (const [method, spec] of Object.entries(methods as any)) {
      if (!["get", "post", "put", "patch", "delete"].includes(method) || !spec) continue;
      const s: any = spec; const body = s.requestBody?.content?.["application/json"];
      endpoints.push({ method: method.toUpperCase(), path: pathName, tags: s.tags || [], summary: s.summary || "", description: s.description || "", security: !!s.security, parameters: s.parameters || [], requestBody: !!s.requestBody, exampleBody: body?.example ?? (body?.schema ? generateExampleFromSchema(body.schema, components) : null), responses: Object.keys(s.responses || {}), loopbackOnly: s["x-loopback-only"] === true, alwaysProtected: s["x-always-protected"] === true, internal: s["x-internal"] === true });
    }
    const data = { info: raw.info || {}, servers: raw.servers || [], tags: raw.tags || [], endpoints, schemas: Object.keys(components) };
    cached = { data, mtime }; return Response.json(data);
  } catch { return Response.json({ error: "Failed to parse OpenAPI spec" }, { status: 500 }); }
}
