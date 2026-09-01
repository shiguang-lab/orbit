/**
 * Combos 路由：迁移自 src/app/api/combos/ 下的 route.ts。
 * 覆盖：
 *  - GET/POST /api/combos
 *  - GET/PUT/PATCH/DELETE /api/combos/:id
 *  - POST /api/combos/reorder
 *  - POST /api/combos/duplicate
 *  - POST /api/combos/test
 *  - GET/DELETE /api/combos/metrics
 *  - GET /api/combos/builder/options
 *  - GET /api/combos/auto
 */
import type { FastifyInstance } from "fastify";

export interface ComboEngine {
  getCombos(limit?: number, offset?: number): Promise<Record<string, unknown>[]>;
  getCombosCount(): number;
  getComboById(id: string): Promise<Record<string, unknown> | null>;
  getComboByName(name: string): Promise<Record<string, unknown> | null>;
  createCombo(data: Record<string, unknown>): Promise<Record<string, unknown>>;
  updateCombo(id: string, data: Record<string, unknown>): Promise<Record<string, unknown> | null>;
  deleteCombo(id: string): Promise<boolean>;
  reorderCombos(comboIds: string[]): Promise<Record<string, unknown>[]>;
  getBuilderOptions(): Promise<Record<string, unknown>>;
  getComboMetrics(comboName?: string): unknown;
  resetComboMetrics(comboName?: string): void;
  testCombo(comboName: string): Promise<Record<string, unknown>>;
  duplicateAutoCombo(name: string, strategy?: string): Promise<Record<string, unknown>>;
  listAutoCombos?(): Promise<Record<string, unknown>[]>;
}

export function comboRoutes(
  app: FastifyInstance,
  opts: { engine?: ComboEngine } = {},
): void {
  const engine = opts.engine;

  /** GET /api/combos */
  app.get("/combos", async (request, reply) => {
    try {
      const url = new URL(request.url, "http://bff");
      const limitValue = url.searchParams.get("limit");
      const offsetValue = url.searchParams.get("offset");
      const limit =
        limitValue && Number.isInteger(Number(limitValue)) && Number(limitValue) > 0
          ? Number(limitValue)
          : undefined;
      const offset =
        offsetValue && Number.isInteger(Number(offsetValue)) && Number(offsetValue) > 0
          ? Number(offsetValue)
          : 0;

      if (!engine) {
        return reply.status(200).send({ combos: [], total: 0 });
      }

      const combos = await engine.getCombos(limit, offset);
      const total = engine.getCombosCount();
      return reply.status(200).send({ combos, total });
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send({ error: "Failed to fetch combos" });
    }
  });

  /** POST /api/combos */
  app.post("/combos", async (request, reply) => {
    try {
      const body = (request.body ?? {}) as Record<string, unknown>;
      const name = typeof body.name === "string" ? body.name.trim() : "";
      if (!name) {
        return reply
          .status(400)
          .send({ error: { message: "Combo name is required" } });
      }

      if (!engine) {
        return reply.status(500).send({ error: "Engine not configured" });
      }

      const created = await engine.createCombo(body);
      return reply.status(201).send(created);
    } catch (error) {
      app.log.error(error);
      const msg = error instanceof Error ? error.message : "Failed to create combo";
      return reply.status(400).send({ error: { message: msg } });
    }
  });

  /** POST /api/combos/reorder */
  app.post("/combos/reorder", async (request, reply) => {
    try {
      const body = (request.body ?? {}) as { comboIds?: unknown };
      const comboIds = Array.isArray(body.comboIds)
        ? body.comboIds.filter((id): id is string => typeof id === "string")
        : [];

      if (!engine) {
        return reply.status(500).send({ error: "Engine not configured" });
      }

      const combos = await engine.reorderCombos(comboIds);
      return reply.status(200).send({ combos });
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send({ error: "Failed to reorder combos" });
    }
  });

  /** POST /api/combos/duplicate */
  app.post("/combos/duplicate", async (request, reply) => {
    try {
      const body = (request.body ?? {}) as { name?: unknown; strategy?: unknown };
      const name = typeof body.name === "string" ? body.name.trim() : "";
      const strategy = typeof body.strategy === "string" ? body.strategy : undefined;

      if (!name) {
        return reply.status(400).send({ error: 'Missing required field: "name"' });
      }

      if (!engine) {
        return reply.status(500).send({ error: "Engine not configured" });
      }

      const created = await engine.duplicateAutoCombo(name, strategy);
      return reply.status(201).send(created);
    } catch (error) {
      app.log.error(error);
      const msg = error instanceof Error ? error.message : "Failed to duplicate combo";
      return reply.status(400).send({ error: msg });
    }
  });

  /** POST /api/combos/test */
  app.post("/combos/test", async (request, reply) => {
    try {
      const body = (request.body ?? {}) as { comboName?: unknown };
      const comboName = typeof body.comboName === "string" ? body.comboName.trim() : "";

      if (!comboName) {
        return reply.status(400).send({ error: "comboName is required" });
      }

      if (!engine) {
        return reply.status(500).send({ error: "Engine not configured" });
      }

      const result = await engine.testCombo(comboName);
      return reply.status(200).send(result);
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send({ error: "Failed to test combo" });
    }
  });

  /** GET /api/combos/metrics */
  app.get("/combos/metrics", async (request, reply) => {
    try {
      const url = new URL(request.url, "http://bff");
      const combo = url.searchParams.get("combo") ?? undefined;

      if (!engine) {
        return reply.status(200).send({ metrics: null });
      }

      const metrics = engine.getComboMetrics(combo);
      return reply.status(200).send({ metrics });
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send({ error: "Failed to fetch combo metrics" });
    }
  });

  /** DELETE /api/combos/metrics */
  app.delete("/combos/metrics", async (request, reply) => {
    try {
      const url = new URL(request.url, "http://bff");
      const combo = url.searchParams.get("combo") ?? undefined;

      if (!engine) {
        return reply.status(500).send({ error: "Engine not configured" });
      }

      engine.resetComboMetrics(combo);
      return reply.status(200).send({ success: true, message: "Metrics reset" });
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send({ error: "Failed to reset combo metrics" });
    }
  });

  /** GET /api/combos/builder/options */
  app.get("/combos/builder/options", async (_request, reply) => {
    try {
      if (!engine) {
        return reply.status(200).send({ providers: [], comboRefs: [] });
      }
      const options = await engine.getBuilderOptions();
      return reply.status(200).send(options);
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send({ error: "Failed to fetch builder options" });
    }
  });

  /** GET /api/combos/auto */
  app.get("/combos/auto", async (_request, reply) => {
    try {
      if (!engine || !engine.listAutoCombos) {
        return reply.status(200).send({ combos: [] });
      }
      const combos = await engine.listAutoCombos();
      return reply.status(200).send({ combos });
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send({ error: "Failed to fetch auto combos" });
    }
  });

  /** GET /api/combos/:id */
  app.get("/combos/:id", async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      if (!engine) return reply.status(500).send({ error: "Engine not configured" });

      const combo = await engine.getComboById(id);
      if (!combo) return reply.status(404).send({ error: "Combo not found" });
      return reply.status(200).send(combo);
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send({ error: "Failed to fetch combo" });
    }
  });

  /** PUT /api/combos/:id */
  app.put("/combos/:id", async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const body = (request.body ?? {}) as Record<string, unknown>;

      if (!engine) return reply.status(500).send({ error: "Engine not configured" });

      const updated = await engine.updateCombo(id, body);
      if (!updated) return reply.status(404).send({ error: "Combo not found" });
      return reply.status(200).send(updated);
    } catch (error) {
      app.log.error(error);
      const msg = error instanceof Error ? error.message : "Failed to update combo";
      return reply.status(400).send({ error: { message: msg } });
    }
  });

  /** PATCH /api/combos/:id */
  app.patch("/combos/:id", async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const body = (request.body ?? {}) as Record<string, unknown>;

      if (!engine) return reply.status(500).send({ error: "Engine not configured" });

      const updated = await engine.updateCombo(id, body);
      if (!updated) return reply.status(404).send({ error: "Combo not found" });
      return reply.status(200).send(updated);
    } catch (error) {
      app.log.error(error);
      const msg = error instanceof Error ? error.message : "Failed to patch combo";
      return reply.status(400).send({ error: { message: msg } });
    }
  });

  /** DELETE /api/combos/:id */
  app.delete("/combos/:id", async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      if (!engine) return reply.status(500).send({ error: "Engine not configured" });

      const ok = await engine.deleteCombo(id);
      if (!ok) return reply.status(404).send({ error: "Combo not found" });
      return reply.status(200).send({ success: true });
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send({ error: "Failed to delete combo" });
    }
  });
}
