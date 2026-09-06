import { Injectable } from "@nestjs/common";
import {
  REDIS_CONTAINER_NAME,
  REDIS_DEFAULT_BIND_HOST,
  buildRedisPublishSpec,
  detectRedisContainerRuntime,
  getRedisContainerState,
  parseRedisUrl,
  pingRedis,
  runRedisRuntimeCommand,
} from "@shiguang-gateway/core-domain/control/local-redis";
import { sanitizeErrorMessage } from "@shiguang-gateway/core-domain/shared/error-response";

@Injectable()
export class LocalRedisService {
  async start() {
    const runtime = await detectRedisContainerRuntime();
    if (!runtime) return { status: 503, body: { ok: false, error: "No container runtime (podman or docker) found on PATH" } };
    const hostPort = process.env.SHIGUANG_GATEWAY_REDIS_HOST_PORT || "6379";
    const bindHost = process.env.SHIGUANG_GATEWAY_REDIS_BIND_HOST || REDIS_DEFAULT_BIND_HOST;
    const image = process.env.SHIGUANG_GATEWAY_REDIS_IMAGE || "docker.io/redis:7-alpine";
    try {
      const { stdout, stderr } = await runRedisRuntimeCommand(runtime, [
        "run", "-d", "--name", REDIS_CONTAINER_NAME, "-p", buildRedisPublishSpec(bindHost, hostPort),
        "--restart", "unless-stopped", image,
      ], 30_000);
      return { status: 200, body: { ok: true, runtime, name: REDIS_CONTAINER_NAME, port: hostPort, bindHost, stdout, stderr } };
    } catch (error) {
      return { status: 500, body: { ok: false, runtime, error: sanitizeErrorMessage(error) } };
    }
  }

  async stop() {
    const runtime = await detectRedisContainerRuntime();
    if (!runtime) return { status: 503, body: { ok: false, error: "No container runtime (podman or docker) found on PATH" } };
    try {
      const { stdout, stderr } = await runRedisRuntimeCommand(runtime, ["stop", REDIS_CONTAINER_NAME], 15_000);
      return { status: 200, body: { ok: true, runtime, name: REDIS_CONTAINER_NAME, stdout, stderr } };
    } catch (error) {
      const rawMessage = error instanceof Error ? error.message : String(error);
      if (rawMessage.includes("no container with name") || rawMessage.includes("No such container")) {
        return { status: 404, body: { ok: false, runtime, error: "not running" } };
      }
      return { status: 500, body: { ok: false, runtime, error: sanitizeErrorMessage(error) } };
    }
  }

  async status() {
    const hostPort = process.env.SHIGUANG_GATEWAY_REDIS_HOST_PORT || "6379";
    const runtime = await detectRedisContainerRuntime();
    let container = { exists: false, running: false, reachable: false };
    if (runtime) {
      const state = await getRedisContainerState(runtime);
      container = { ...state, reachable: state.running ? await pingRedis(hostPort) : false };
    }
    const redisUrl = process.env.REDIS_URL?.trim() || "";
    const parsed = parseRedisUrl(redisUrl);
    const redisUrlReachable = parsed ? await pingRedis(parsed.port, parsed.host) : false;
    return {
      status: 200,
      body: {
        runtime: runtime ?? null,
        name: REDIS_CONTAINER_NAME,
        port: hostPort,
        exists: container.exists || redisUrlReachable,
        running: container.running || redisUrlReachable,
        reachable: container.reachable || redisUrlReachable,
        redisUrlConfigured: Boolean(redisUrl),
        redisUrlReachable,
      },
    };
  }
}
