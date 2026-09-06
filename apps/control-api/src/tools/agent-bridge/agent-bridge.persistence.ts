import { getDbInstance } from "@shiguang-gateway/core-domain/db/ping";
import { setMitmAliasAll } from "@shiguang-gateway/core-domain/db/mitm-aliases";
import type {
  AgentBridgeBypassRow,
  AgentBridgeMappingRow,
  AgentBridgeStateRow,
} from "@shiguang-gateway/core-domain/control/agent-bridge";

interface AgentBridgeStateDbRow {
  agent_id: string;
  dns_enabled: number;
  cert_trusted: number;
  setup_completed: number;
  last_started_at: string | null;
  last_error: string | null;
}

interface AgentBridgeBypassDbRow {
  pattern: string;
  source: string;
  created_at: string;
}

function mapState(row: AgentBridgeStateDbRow): AgentBridgeStateRow {
  return {
    agent_id: row.agent_id,
    dns_enabled: row.dns_enabled === 1,
    cert_trusted: row.cert_trusted === 1,
    setup_completed: row.setup_completed === 1,
    last_started_at: row.last_started_at,
    last_error: row.last_error,
  };
}

function mapBypass(row: AgentBridgeBypassDbRow): AgentBridgeBypassRow {
  return {
    pattern: row.pattern,
    source: row.source as AgentBridgeBypassRow["source"],
    created_at: row.created_at,
  };
}

/** Control-plane persistence for the three Agent Bridge tables. */
export class AgentBridgePersistence {
  getAllAgentBridgeStates(): AgentBridgeStateRow[] {
    const rows = getDbInstance()
      .prepare("SELECT * FROM agent_bridge_state ORDER BY agent_id ASC")
      .all() as AgentBridgeStateDbRow[];
    return rows.map(mapState);
  }

  getAgentBridgeState(agentId: string): AgentBridgeStateRow | null {
    const row = getDbInstance()
      .prepare("SELECT * FROM agent_bridge_state WHERE agent_id = ?")
      .get(agentId) as AgentBridgeStateDbRow | undefined;
    return row ? mapState(row) : null;
  }

  upsertAgentBridgeState(
    row: Partial<AgentBridgeStateRow> & { agent_id: string },
  ): void {
    const db = getDbInstance();
    const existing = this.getAgentBridgeState(row.agent_id);
    if (!existing) {
      db.prepare(
        `INSERT INTO agent_bridge_state
           (agent_id, dns_enabled, cert_trusted, setup_completed, last_started_at, last_error)
         VALUES (?, ?, ?, ?, ?, ?)`,
      ).run(
        row.agent_id,
        row.dns_enabled ? 1 : 0,
        row.cert_trusted ? 1 : 0,
        row.setup_completed ? 1 : 0,
        row.last_started_at ?? null,
        row.last_error ?? null,
      );
      return;
    }

    const fields: string[] = [];
    const values: (string | number | null)[] = [];
    if (row.dns_enabled !== undefined) {
      fields.push("dns_enabled = ?");
      values.push(row.dns_enabled ? 1 : 0);
    }
    if (row.cert_trusted !== undefined) {
      fields.push("cert_trusted = ?");
      values.push(row.cert_trusted ? 1 : 0);
    }
    if (row.setup_completed !== undefined) {
      fields.push("setup_completed = ?");
      values.push(row.setup_completed ? 1 : 0);
    }
    if (row.last_started_at !== undefined) {
      fields.push("last_started_at = ?");
      values.push(row.last_started_at);
    }
    if (row.last_error !== undefined) {
      fields.push("last_error = ?");
      values.push(row.last_error);
    }
    if (fields.length === 0) return;
    values.push(row.agent_id);
    db.prepare(`UPDATE agent_bridge_state SET ${fields.join(", ")} WHERE agent_id = ?`).run(...values);
  }

  setLastStarted(agentId: string, timestamp: string): void {
    getDbInstance()
      .prepare(
        `INSERT INTO agent_bridge_state (agent_id, last_started_at)
         VALUES (?, ?)
         ON CONFLICT(agent_id) DO UPDATE SET last_started_at = excluded.last_started_at`,
      )
      .run(agentId, timestamp);
  }

  setLastError(agentId: string, error: string | null): void {
    getDbInstance()
      .prepare(
        `INSERT INTO agent_bridge_state (agent_id, last_error)
         VALUES (?, ?)
         ON CONFLICT(agent_id) DO UPDATE SET last_error = excluded.last_error`,
      )
      .run(agentId, error);
  }

  getAllBypassPatterns(): AgentBridgeBypassRow[] {
    const rows = getDbInstance()
      .prepare(
        "SELECT pattern, source, created_at FROM agent_bridge_bypass ORDER BY source ASC, pattern ASC",
      )
      .all() as AgentBridgeBypassDbRow[];
    return rows.map(mapBypass);
  }

  getUserBypassPatterns(): string[] {
    const rows = getDbInstance()
      .prepare("SELECT pattern FROM agent_bridge_bypass WHERE source = 'user' ORDER BY pattern ASC")
      .all() as Array<{ pattern: string }>;
    return rows.map((row) => row.pattern);
  }

  replaceUserBypassPatterns(patterns: string[]): void {
    const db = getDbInstance();
    const now = new Date().toISOString();
    const remove = db.prepare("DELETE FROM agent_bridge_bypass WHERE source = 'user'");
    const insert = db.prepare(
      "INSERT INTO agent_bridge_bypass (pattern, source, created_at) VALUES (?, 'user', ?)",
    );
    db.transaction(() => {
      remove.run();
      for (const pattern of patterns) insert.run(pattern, now);
    })();
  }

  seedDefaultBypassPatterns(patterns: string[]): void {
    const db = getDbInstance();
    const now = new Date().toISOString();
    const insert = db.prepare(
      "INSERT OR IGNORE INTO agent_bridge_bypass (pattern, source, created_at) VALUES (?, 'default', ?)",
    );
    db.transaction(() => {
      for (const pattern of patterns) insert.run(pattern, now);
    })();
  }

  getMappingsForAgent(agentId: string): AgentBridgeMappingRow[] {
    return getDbInstance()
      .prepare(
        "SELECT agent_id, source_model, target_model, updated_at FROM agent_bridge_mappings WHERE agent_id = ? ORDER BY source_model ASC",
      )
      .all(agentId) as AgentBridgeMappingRow[];
  }

  setMappings(agentId: string, mappings: Array<{ source: string; target: string }>): void {
    const db = getDbInstance();
    const now = new Date().toISOString();
    const remove = db.prepare("DELETE FROM agent_bridge_mappings WHERE agent_id = ?");
    const insert = db.prepare(
      `INSERT INTO agent_bridge_mappings (agent_id, source_model, target_model, updated_at)
       VALUES (?, ?, ?, ?)`,
    );
    db.transaction(() => {
      remove.run(agentId);
      for (const mapping of mappings) insert.run(agentId, mapping.source, mapping.target, now);
    })();
  }

  deleteMapping(agentId: string, source: string): void {
    getDbInstance()
      .prepare("DELETE FROM agent_bridge_mappings WHERE agent_id = ? AND source_model = ?")
      .run(agentId, source);
  }

  syncAgentBridgeMappingsToMitmAlias(agentId: string): void {
    if (!new Set(["antigravity", "claude-code", "kiro"]).has(agentId)) return;
    const mappings = Object.fromEntries(
      this.getMappingsForAgent(agentId).map((row) => [row.source_model, row.target_model]),
    );
    void setMitmAliasAll(agentId, mappings);
  }
}

export const agentBridgePersistence = new AgentBridgePersistence();
