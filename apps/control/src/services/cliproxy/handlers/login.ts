import { isAuthenticated } from "@orbit/core/control/authenticated";
import { cancelLoginJob, getLoginJob, startLoginJob, type CliproxyLoginProvider } from "@orbit/core/control/cliproxy";

export async function start(request: Request): Promise<Response> {
  if (!(await isAuthenticated(request))) return Response.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = (await request.json().catch(() => ({}))) as { provider?: string };
    const provider = body.provider as CliproxyLoginProvider;
    if (!provider) return Response.json({ error: "Missing required 'provider' parameter" }, { status: 400 });
    return Response.json(await startLoginJob(provider));
  } catch (error) { return Response.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 }); }
}

export async function get(request: Request, id: string): Promise<Response> {
  if (!(await isAuthenticated(request))) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const job = getLoginJob(id);
  return job ? Response.json(job) : Response.json({ error: "Job not found" }, { status: 404 });
}

export async function cancel(request: Request, id: string): Promise<Response> {
  if (!(await isAuthenticated(request))) return Response.json({ error: "Unauthorized" }, { status: 401 });
  return Response.json({ success: cancelLoginJob(id) });
}
