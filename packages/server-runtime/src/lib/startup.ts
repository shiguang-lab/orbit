/**
 * 启动初始化：复刻 Shiguang Gateway src/instrumentation-node.ts 的关键启动逻辑。
 *
 * 引擎正常运行依赖以下环境变量，缺失时按 Shiguang Gateway 同款策略处理：
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
  // Secrets must be persisted by the local runtime database. Falling back to
  // process memory would silently invalidate sessions after every restart.
  let getPersistedSecret: (key: string) => string | null;
  let persistSecret: (key: string, value: string) => void;
  try {
    const secrets = await import("@/lib/db/secrets");
    getPersistedSecret = secrets.getPersistedSecret;
    persistSecret = secrets.persistSecret;
  } catch (err) {
    throw new Error(`Local secrets persistence is unavailable: ${(err as Error).message}`);
  }

  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.trim() === "") {
    const persisted = getPersistedSecret("jwtSecret");
    if (persisted) {
      process.env.JWT_SECRET = persisted;
      console.log("[gateway:startup] JWT_SECRET restored from persistent store");
    } else {
      const generated = toBase64(getRandomBytes(48));
      process.env.JWT_SECRET = generated;
      persistSecret("jwtSecret", generated);
      console.log("[gateway:startup] JWT_SECRET auto-generated and persisted");
    }
  }

  if (!process.env.API_KEY_SECRET || process.env.API_KEY_SECRET.trim() === "") {
    const persisted = getPersistedSecret("apiKeySecret");
    if (persisted) {
      process.env.API_KEY_SECRET = persisted;
    } else {
      const generated = toHex(getRandomBytes(32));
      process.env.API_KEY_SECRET = generated;
      persistSecret("apiKeySecret", generated);
      console.log("[gateway:startup] API_KEY_SECRET auto-generated and persisted");
    }
  }
}
