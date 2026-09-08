import assert from "node:assert/strict";
import { test, after } from "node:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createServer } from "node:http";
import { once } from "node:events";
import { nodeReportSchema } from "../src/service-nodes/report-schema.js";

const dir = mkdtempSync(join(tmpdir(), "orbit-node-control-test-"));
process.env.DATA_DIR = dir;
process.env.SQLITE_FILE = join(dir, "storage.sqlite");
process.env.NODE_ENV = "test";
delete process.env.STORAGE_ENCRYPTION_KEY;
const store = await import("@orbit/core/control/service-nodes");
const report = {
  nodeId: "nas",
  name: "NAS",
  os: "linux",
  arch: "arm64",
  managerVersion: "0.1.0",
  uptimeSeconds: 10,
  observedAt: new Date().toISOString(),
  metrics: { managerHeapBytes: 100 },
  instances: [],
  jobs: [],
};

test("internal instances need no credentials and reports match their registered ID", () => {
  const created = store.createServiceNode({
    id: "nas",
    name: "NAS",
    endpoint: "http://192.168.1.10:8792",
  });
  assert.deepEqual(Object.keys(created), ["node"]);
  assert.deepEqual(store.getServiceNodeConnection("nas"), {
    endpoint: "http://192.168.1.10:8792",
  });
  assert.equal(
    store.acceptServiceNodeReport("nas", { ...report, nodeId: "another" }),
    false,
  );
  assert.equal(store.acceptServiceNodeReport("unknown", report), false);
  assert.equal(store.acceptServiceNodeReport("nas", report), true);
  assert.equal(store.listServiceNodes()[0].online, true);
  assert.equal(store.deleteServiceNode("nas"), true);
  assert.equal(store.acceptServiceNodeReport("nas", report), false);
});

test("report schema strips credentials and rejects malformed snapshots", () => {
  const parsed = nodeReportSchema.parse({
    ...report,
    token: "secret",
    apiKey: "secret",
    managementKey: "secret",
  });
  assert.ok(!JSON.stringify(parsed).includes("secret"));
  assert.equal(
    nodeReportSchema.safeParse({ ...report, nodeId: "../escape" }).success,
    false,
  );
  assert.equal(
    nodeReportSchema.safeParse({ ...report, observedAt: "not-a-date" }).success,
    false,
  );
  assert.equal(
    nodeReportSchema.safeParse({
      ...report,
      instances: new Array(501).fill({}),
    }).success,
    false,
  );
});

test("one instance scope deduplicates models and retains exact credential identities", async () => {
  const { getProviderNodes } = await import("@orbit/core/db/provider-nodes");
  const { getProviderConnections } = await import(
    "@orbit/core/db/provider-connections"
  );
  const { getSyncedAvailableModels } = await import("@orbit/core/db/models");
  const { installRuntimePorts } = await import(
    "@orbit/inference/services/dbRuntimeHooks"
  );
  installRuntimePorts();
  const { getComboBuilderOptions } = await import(
    "../src/combos/builder-options.js"
  );
  const first = store.createServiceNode({
    id: "scope-a",
    name: "NAS A",
    endpoint: "http://127.0.0.1:8792",
  }).node;
  const second = store.createServiceNode({
    id: "scope-b",
    name: "NAS B",
    endpoint: "http://127.0.0.1:8793",
  }).node;
  const credentials = ["a.json", "b.json"].map((id) => ({
    id,
    instanceId: "local",
    name: id,
    provider: "xai",
    disabled: false,
    routable: true,
    models: ["shared", ...(id === "a.json" ? ["only-a"] : [])],
  }));
  const snapshot = {
    ...report,
    instances: [{ id: "local", healthy: true, credentials }],
  };
  store.storeServiceNodeReport(first.id, snapshot);
  store.storeServiceNodeReport(second.id, snapshot);
  const scopes = (await getProviderNodes()).filter((node) =>
    String(node.id).startsWith("openai-compatible-cliproxy-"),
  );
  assert.equal(scopes.length, 2);
  const connections = await getProviderConnections({ provider: first.scopeId });
  const otherConnections = await getProviderConnections({
    provider: second.scopeId,
  });
  assert.equal(connections.length, 2);
  assert.equal(otherConnections.length, 2);
  assert.ok(
    connections.every(
      (c) => !otherConnections.some((other) => other.id === c.id),
    ),
  );
  assert.ok(
    connections.every(
      (c) => c.authType === "none" && !c.apiKey && !c.accessToken,
    ),
  );
  const { getProviderCredentials } = await import(
    "@orbit/inference/services/auth"
  );
  const { getModelInfo } = await import(
    "@orbit/inference/services/runtimeModel"
  );
  const modelTarget = await getModelInfo(`${first.scopePrefix}/shared`);
  assert.equal(modelTarget.provider, first.scopeId);
  assert.equal(modelTarget.model, "shared");
  const selectedA = connections.find((c) => c.name === "a.json")!;
  const selectedB = connections.find((c) => c.name === "b.json")!;
  const selected = await getProviderCredentials(
    first.scopeId,
    null,
    [selectedA.id],
    "shared",
  );
  assert.equal(selected?.connectionId, selectedA.id);
  const fixed = await getProviderCredentials(
    first.scopeId,
    null,
    null,
    "shared",
    { forcedConnectionId: selectedB.id },
  );
  assert.equal(fixed?.connectionId, selectedB.id);
  const excludedFixed = await getProviderCredentials(
    first.scopeId,
    selectedB.id,
    null,
    "shared",
    { forcedConnectionId: selectedB.id },
  );
  assert.ok(!excludedFixed || !("connectionId" in excludedFixed));
  const wrongScope = await getProviderCredentials(
    first.scopeId,
    null,
    [otherConnections[0].id],
    "shared",
  );
  assert.ok(!wrongScope || !("connectionId" in wrongScope));
  const unsupported = await getProviderCredentials(
    first.scopeId,
    null,
    [selectedB.id],
    "only-a",
  );
  assert.ok(!unsupported || !("connectionId" in unsupported));
  assert.deepEqual(
    (await getSyncedAvailableModels(first.scopeId))
      .map((model) => model.id)
      .sort(),
    ["only-a", "shared"],
  );
  const options = await getComboBuilderOptions();
  const scope = options.providers.find(
    (item) => item.providerId === first.scopeId,
  )!;
  assert.ok(scope);
  assert.equal(scope.connections.length, 2);
  assert.deepEqual(scope.models.map((model) => model.id).sort(), [
    "only-a",
    "shared",
  ]);
  const target = store.resolveCliproxyCredentialTarget(
    first.id,
    "local",
    "a.json",
  );
  assert.equal(
    target,
    "http://127.0.0.1:8792/v1/instances/local/credentials/a.json/inference",
  );
  assert.throws(() =>
    store.resolveCliproxyCredentialTarget(first.id, "wrong", "a.json"),
  );
  store.storeServiceNodeReport(first.id, {
    ...report,
    instances: [{ ...snapshot.instances[0], providerExpose: false }],
  });
  assert.equal((await getProviderConnections({ provider: first.scopeId })).filter(c => c.isActive).length, 0);
  assert.throws(() => store.resolveCliproxyCredentialTarget(first.id, "local", "a.json"));
  store.storeServiceNodeReport(first.id, snapshot);
  const ids = connections.map((c) => c.id).sort();
  store.storeServiceNodeReport(first.id, snapshot);
  assert.deepEqual(
    (await getProviderConnections({ provider: first.scopeId }))
      .map((c) => c.id)
      .sort(),
    ids,
  );
  store.storeServiceNodeReport(first.id, {
    ...report,
    instances: [{ id: "local", healthy: true, credentials: [credentials[1]] }],
  });
  assert.equal(
    (await getProviderConnections({ provider: first.scopeId })).filter(
      (c) => c.isActive,
    ).length,
    1,
  );
  assert.throws(() =>
    store.resolveCliproxyCredentialTarget(first.id, "local", "a.json"),
  );
  const removedFixed = await getProviderCredentials(
    first.scopeId,
    null,
    null,
    "shared",
    { forcedConnectionId: selectedA.id },
  );
  assert.ok(!removedFixed || !("connectionId" in removedFixed));
  assert.deepEqual(
    (await getSyncedAvailableModels(first.scopeId)).map((model) => model.id),
    ["shared"],
  );
  store.deleteServiceNode(first.id);
  assert.equal(
    (await getProviderConnections({ provider: first.scopeId })).length,
    0,
  );
  assert.throws(() =>
    store.resolveCliproxyCredentialTarget(first.id, "local", "b.json"),
  );
  assert.equal(
    (await getProviderConnections({ provider: second.scopeId })).length,
    2,
  );
  store.deleteServiceNode(second.id);
});

test("inference resolves the registered manager route and sends no CPA secret", async () => {
  const requests: { path: string; authorization?: string; body: string }[] = [];
  const server = createServer(async (request, response) => {
    let body = "";
    for await (const chunk of request) body += chunk;
    requests.push({
      path: request.url!,
      authorization: request.headers.authorization,
      body,
    });
    response.writeHead(200, { "Content-Type": "application/json" });
    response.end(
      JSON.stringify({
        id: "test",
        model: "shared",
        choices: [{ message: { role: "assistant", content: "ok" } }],
      }),
    );
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address() as { port: number };
  const node = store.createServiceNode({
    id: "transport",
    name: "Transport",
    endpoint: `http://127.0.0.1:${address.port}`,
  }).node;
  try {
    store.storeServiceNodeReport(node.id, {
      ...report,
      instances: [
        {
          id: "process",
          healthy: true,
          credentials: [
            {
              id: "account.json",
              instanceId: "process",
              name: "Account",
              provider: "xai",
              disabled: false,
              routable: true,
              models: ["shared"],
            },
          ],
        },
      ],
    });
    const { getProviderCredentials } = await import(
      "@orbit/inference/services/auth"
    );
    const { getExecutor } = await import("@orbit/inference/executors/index");
    const credentials = await getProviderCredentials(
      node.scopeId,
      null,
      null,
      "shared",
    );
    assert.ok(credentials && "connectionId" in credentials);
    const executor = await getExecutor(node.scopeId);
    const input = {
      model: "shared",
      stream: false,
      body: { model: "shared", messages: [{ role: "user", content: "test" }] },
      credentials: {
        ...credentials,
        apiKey: "must-not-leave-orbit",
        accessToken: "must-not-leave-orbit",
        providerSpecificData: {
          ...credentials.providerSpecificData,
          baseUrl: "http://unregistered.invalid/v1",
        },
      },
    };
    const result = await executor.execute(input);
    assert.equal(result.response.status, 200);
    await result.response.text();
    assert.equal(requests.length, 1);
    assert.equal(
      requests[0].path,
      "/v1/instances/process/credentials/account.json/inference/v1/chat/completions",
    );
    assert.equal(requests[0].authorization, undefined);
    assert.equal(JSON.parse(requests[0].body).model, "shared");
    store.deleteServiceNode(node.id);
    await assert.rejects(() => executor.execute(input), /offline or removed/);
    const legacy = await getExecutor("cliproxyapi");
    await assert.rejects(
      () => legacy.execute({ ...input, credentials: {} }),
      /Select a CLIProxyAPI instance/,
    );
    assert.equal(requests.length, 1);
  } finally {
    store.deleteServiceNode(node.id);
    server.closeAllConnections();
    server.close();
    await once(server, "close");
  }
});

after(async () => {
  const { closeDbInstance } = await import("@orbit/core/db/runtime-lifecycle");
  closeDbInstance();
  rmSync(dir, { recursive: true, force: true });
});

test("configured NAS automatically registers once across control restarts", async () => {
  const { ServiceNodesService } = await import("../src/service-nodes/service-nodes.service.js");
  process.env.ORBIT_CLIPROXY_MANAGER_ENDPOINT = "http://127.0.0.1:8792";
  process.env.ORBIT_CLIPROXY_MANAGER_ID = "auto-nas";
  process.env.ORBIT_CLIPROXY_MANAGER_NAME = "NAS";
  class OfflineService extends ServiceNodesService {
    override async refresh() { throw new Error("offline during boot"); }
  }
  try {
    for (let n = 0; n < 2; n++) {
      const service = new OfflineService();
      service.onModuleInit();
      service.onModuleDestroy();
    }
    const nodes = store.listServiceNodes().filter(node => node.id === "auto-nas");
    assert.equal(nodes.length, 1);
    assert.equal(nodes[0].scopePrefix, "cpa-auto-nas");
  } finally {
    store.deleteServiceNode("auto-nas");
    delete process.env.ORBIT_CLIPROXY_MANAGER_ENDPOINT;
    delete process.env.ORBIT_CLIPROXY_MANAGER_ID;
    delete process.env.ORBIT_CLIPROXY_MANAGER_NAME;
  }
});

test("node HTTP errors retain their status instead of becoming bad gateway", async () => {
  const server = createServer((_request, response) => {
    response.writeHead(404, { "Content-Type": "application/json" });
    response.end(JSON.stringify({ error: "not found" }));
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address() as { port: number };
  const node = store.createServiceNode({
    id: "status-forwarding",
    name: "Status forwarding",
    endpoint: `http://127.0.0.1:${address.port}`,
  }).node;
  try {
    const { ServiceNodesService } = await import("../src/service-nodes/service-nodes.service.js");
    const service = new ServiceNodesService();
    await assert.rejects(
      () => service.request(node.id, "missing"),
      (error: { getStatus?: () => number }) => error.getStatus?.() === 404,
    );
  } finally {
    store.deleteServiceNode(node.id);
    server.closeAllConnections();
    server.close();
    await once(server, "close");
  }
});
