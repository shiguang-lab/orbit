import { isAuthenticated } from "@orbit/core/control/authenticated";
import {
  getCliproxyAccountHealth,
  sanitizeCliproxyAuthFiles,
  listCliproxyInstances,
  getCliproxyInstance,
  type CliproxyAccountHealth,
} from "@orbit/core/control/cliproxy";

export async function accounts(request: Request): Promise<Response> {
  if (!(await isAuthenticated(request))) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const instanceId = url.searchParams.get("instanceId");

  if (instanceId && instanceId !== "all") {
    const instance = getCliproxyInstance(instanceId);
    if (!instance) {
      return Response.json({ error: "Instance not found" }, { status: 404 });
    }

    if (instance.type === "local_managed") {
      const res = await getCliproxyAccountHealth();
      const accountsWithMeta = res.accounts.map((acc) => ({
        ...acc,
        instanceId: instance.id,
        instanceName: instance.name,
      }));
      return Response.json(
        { ...res, accounts: accountsWithMeta, instanceId: instance.id },
        { headers: { "Cache-Control": "no-store" } }
      );
    }

    // Remote instance fetch
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 6000);
      const headers: Record<string, string> = {};
      if (instance.managementKey) {
        headers.Authorization = `Bearer ${instance.managementKey}`;
      }
      const response = await fetch(`${instance.endpoint.replace(/\/+$/, "")}/v0/management/auth-files`, {
        headers,
        signal: controller.signal,
      });
      clearTimeout(timer);

      const version = response.headers.get("x-cpa-version") || instance.version;
      if (response.status === 401 || response.status === 403) {
        return Response.json({ state: "unauthorized", accounts: [], version, instanceId: instance.id });
      }
      if (!response.ok) {
        return Response.json({ state: "unreachable", accounts: [], version, instanceId: instance.id });
      }
      const payload = await response.json().catch(() => null);
      const rawAccounts = sanitizeCliproxyAuthFiles(payload);
      if (!rawAccounts) {
        return Response.json({ state: "invalid_response", accounts: [], version, instanceId: instance.id });
      }
      const accountsWithMeta = rawAccounts.map((acc: CliproxyAccountHealth) => ({
        ...acc,
        instanceId: instance.id,
        instanceName: instance.name,
      }));
      return Response.json(
        { state: "ready", accounts: accountsWithMeta, version, instanceId: instance.id },
        { headers: { "Cache-Control": "no-store" } }
      );
    } catch {
      return Response.json({ state: "unreachable", accounts: [], version: null, instanceId: instance.id });
    }
  }

  // All enabled instances aggregated
  const allInstances = listCliproxyInstances().filter((i) => i.enabled);
  if (allInstances.length === 0) {
    return Response.json({ state: "disabled", accounts: [], instances: [] });
  }

  const results = await Promise.allSettled(
    allInstances.map(async (inst) => {
      if (inst.type === "local_managed") {
        const local = await getCliproxyAccountHealth();
        return (local.accounts || []).map((acc: CliproxyAccountHealth) => ({
          ...acc,
          instanceId: inst.id,
          instanceName: inst.name,
        }));
      }

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 5000);
      try {
        const headers: Record<string, string> = {};
        if (inst.managementKey) {
          headers.Authorization = `Bearer ${inst.managementKey}`;
        }
        const resp = await fetch(`${inst.endpoint.replace(/\/+$/, "")}/v0/management/auth-files`, {
          headers,
          signal: controller.signal,
        });
        if (!resp.ok) return [];
        const data = await resp.json().catch(() => null);
        const parsed = sanitizeCliproxyAuthFiles(data);
        return (parsed || []).map((acc: CliproxyAccountHealth) => ({
          ...acc,
          instanceId: inst.id,
          instanceName: inst.name,
        }));
      } finally {
        clearTimeout(timer);
      }
    })
  );

  const aggregatedAccounts: CliproxyAccountHealth[] = [];
  for (const res of results) {
    if (res.status === "fulfilled" && Array.isArray(res.value)) {
      aggregatedAccounts.push(...res.value);
    }
  }

  return Response.json(
    {
      state: "ready",
      accounts: aggregatedAccounts,
      instances: allInstances.map((i) => ({
        id: i.id,
        name: i.name,
        type: i.type,
        status: i.status,
        endpoint: i.endpoint,
      })),
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
