import type { FastifyInstance, FastifyPluginAsync } from "fastify";
import { randomUUID, createHash } from "node:crypto";

export const gamificationRoutes: FastifyPluginAsync = async (app: FastifyInstance) => {
  // 1. Leaderboard
  app.get("/gamification/leaderboard", async (request, reply) => {
    const { scope = "global", limit = 50, apiKeyId } = request.query as any;
    try {
      const { getTopN, getRank, getNeighbors } = await import("@/lib/gamification/leaderboard");
      const entries = await getTopN(scope, Number(limit) || 50);
      let myRank: number | null = null;
      let neighbors = null;
      if (apiKeyId) {
        myRank = await getRank(apiKeyId, scope);
        neighbors = await getNeighbors(apiKeyId, scope);
      }
      return reply.send({ entries: entries || [], myRank, neighbors });
    } catch {
      return reply.send({ entries: [], myRank: null });
    }
  });

  // 2. User Level & XP
  app.get("/gamification/level", async (request, reply) => {
    try {
      const { getXp } = await import("@/lib/db/gamification");
      const level = getXp("admin") || {
        apiKeyId: "admin",
        totalXp: 0,
        currentLevel: 1,
        updatedAt: new Date().toISOString(),
      };
      return reply.send({ level });
    } catch {
      return reply.send({
        level: { apiKeyId: "admin", totalXp: 0, currentLevel: 1, updatedAt: new Date().toISOString() },
      });
    }
  });

  // 3. Badges definitions
  app.get("/gamification/badges", async (request, reply) => {
    try {
      const { getAllBadges } = await import("@/lib/db/gamification");
      const badges = getAllBadges();
      return reply.send({ badges: badges || [] });
    } catch {
      return reply.send({ badges: [] });
    }
  });

  // 4. Earned badges
  app.get("/gamification/badges/earned", async (request, reply) => {
    try {
      const { getUserBadges } = await import("@/lib/db/gamification");
      const badges = getUserBadges("admin");
      return reply.send({ badges: badges || [] });
    } catch {
      return reply.send({ badges: [] });
    }
  });

  // 5. Token Ledger Transfer
  app.get("/gamification/transfer", async (request, reply) => {
    try {
      const { getLedger, getBalance } = await import("@/lib/db/gamification");
      const balance = getBalance ? getBalance("admin") : 0;
      const history = getLedger("admin", 20);
      return reply.send({ balance: balance || 0, history: history || [] });
    } catch {
      return reply.send({ balance: 0, history: [] });
    }
  });

  app.post("/gamification/transfer", async (request, reply) => {
    const { toApiKeyId, amount, reason } = (request.body as any) || {};
    if (!toApiKeyId || !amount) {
      return reply.status(400).send({ error: "Missing toApiKeyId or amount" });
    }
    try {
      const { transferTokens } = await import("@/lib/db/gamification");
      const idempotencyKey = `tx-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      transferTokens("admin", toApiKeyId, Number(amount), reason || null, idempotencyKey);
      return reply.send({ success: true, idempotencyKey, transferredAmount: Number(amount) });
    } catch (err: any) {
      return reply.status(400).send({ error: err.message || "Transfer failed" });
    }
  });

  // 6. Community Invites
  app.get("/gamification/invite", async (request, reply) => {
    try {
      const { listInviteTokens } = await import("@/lib/db/gamification");
      const invites = listInviteTokens ? listInviteTokens() : [];
      return reply.send({ invites: invites || [] });
    } catch {
      return reply.send({ invites: [] });
    }
  });

  app.post("/gamification/invite", async (request, reply) => {
    const { maxUses = 1 } = (request.body as any) || {};
    try {
      const { createInviteToken } = await import("@/lib/db/gamification");
      const code = `SGW-${Math.random().toString(36).toUpperCase().slice(2, 6)}-${Math.random().toString(36).toUpperCase().slice(2, 6)}`;
      const tokenHash = createHash("sha256").update(code).digest("hex");
      const newInvite = createInviteToken({
        id: randomUUID(),
        code,
        tokenHash,
        createdBy: "admin",
        maxUses: Number(maxUses) || 1,
      });
      return reply.send(newInvite);
    } catch (err: any) {
      return reply.status(400).send({ error: err.message || "Failed to create invite" });
    }
  });

  app.delete("/gamification/invite", async (request, reply) => {
    const { id } = request.query as any;
    if (!id) return reply.status(400).send({ error: "Missing id" });
    try {
      const { revokeInviteToken } = await import("@/lib/db/gamification");
      revokeInviteToken(id);
      return reply.send({ success: true });
    } catch (err: any) {
      return reply.status(400).send({ error: err.message || "Failed to revoke invite" });
    }
  });

  app.post("/gamification/invite/redeem", async (request, reply) => {
    const { code } = (request.body as any) || {};
    if (!code) return reply.status(400).send({ error: "Missing code" });
    try {
      const { redeemInviteToken } = await import("@/lib/db/gamification");
      const res = redeemInviteToken(code, "admin");
      return reply.send({ success: true, ...res });
    } catch (err: any) {
      return reply.status(400).send({ error: err.message || "Failed to redeem invite" });
    }
  });

  // 7. Community Servers Federation
  app.get("/gamification/servers", async (request, reply) => {
    try {
      const { listCommunityServers } = await import("@/lib/db/gamification");
      const servers = listCommunityServers ? listCommunityServers() : [];
      return reply.send({ servers: servers || [] });
    } catch {
      return reply.send({ servers: [] });
    }
  });

  app.post("/gamification/servers", async (request, reply) => {
    const { name, url, apiKey } = (request.body as any) || {};
    if (!name || !url) return reply.status(400).send({ error: "Missing server name or url" });
    try {
      const { addCommunityServer } = await import("@/lib/db/gamification");
      const apiKeyHash = apiKey ? createHash("sha256").update(apiKey).digest("hex") : "";
      const res = addCommunityServer({
        id: randomUUID(),
        name,
        url,
        apiKeyHash,
      });
      return reply.send(res);
    } catch (err: any) {
      return reply.status(400).send({ error: err.message || "Failed to add server" });
    }
  });
};
