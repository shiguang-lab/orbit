/**
 * 启动初始化：复刻 Orbit src/instrumentation-node.ts 的关键启动逻辑。
 *
 * 引擎正常运行依赖以下环境变量，缺失时按 Orbit 同款策略处理：
 *  - JWT_SECRET：从持久化存储恢复，否则随机生成并持久化(否则 session 校验/csrf 失效)
 *  - API_KEY_SECRET：同上(否则 API key CRC 生成失败)
 *
 * 必须在使用引擎模块之前调用(顶层 await 或 index 开头)。
 */
import { randomBytes } from "node:crypto";

function getRandomBytes(byteLength: number): Uint8Array {
  return randomBytes(byteLength);
}

function toBase64(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString("base64");
}

function toHex(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString("hex");
}

export async function ensureSecrets(): Promise<void> {
  // Remote-data mode must not open or mutate the developer's local Orbit DB.
  // Generate ephemeral process secrets only when local auth explicitly needs
  // them; NAS authentication is handled by the broker/API key at proxy time.
  if (process.env.OMNIROUTE_NAS_API_TARGET?.trim()) {
    if (!process.env.JWT_SECRET?.trim()) process.env.JWT_SECRET = toBase64(getRandomBytes(48));
    if (!process.env.API_KEY_SECRET?.trim()) process.env.API_KEY_SECRET = toHex(getRandomBytes(32));
    return;
  }

  // 引擎的 secrets 持久化模块(通过 shim 解析)
  let getPersistedSecret = (_key: string): string | null => null;
  let persistSecret = (_key: string, _value: string): void => {};
  try {
    const secrets = await import("@/lib/db/secrets");
    getPersistedSecret = secrets.getPersistedSecret;
    persistSecret = secrets.persistSecret;
  } catch (err) {
    console.warn(
      "[bff:startup] secrets persistence unavailable; falling back to process-local secrets:",
      (err as Error).message,
    );
  }

  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.trim() === "") {
    const persisted = getPersistedSecret("jwtSecret");
    if (persisted) {
      process.env.JWT_SECRET = persisted;
      console.log("[bff:startup] JWT_SECRET restored from persistent store");
    } else {
      const generated = toBase64(getRandomBytes(48));
      process.env.JWT_SECRET = generated;
      try {
        persistSecret("jwtSecret", generated);
      } catch {
        // 持久化失败不阻塞启动
      }
      console.log("[bff:startup] JWT_SECRET auto-generated and persisted");
    }
  }

  if (!process.env.API_KEY_SECRET || process.env.API_KEY_SECRET.trim() === "") {
    const persisted = getPersistedSecret("apiKeySecret");
    if (persisted) {
      process.env.API_KEY_SECRET = persisted;
    } else {
      const generated = toHex(getRandomBytes(32));
      process.env.API_KEY_SECRET = generated;
      try {
        persistSecret("apiKeySecret", generated);
      } catch {
        // 持久化失败不阻塞启动
      }
      console.log("[bff:startup] API_KEY_SECRET auto-generated and persisted");
    }
  }
}
