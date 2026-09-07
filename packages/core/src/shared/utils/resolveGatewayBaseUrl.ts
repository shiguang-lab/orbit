const DEFAULT_ORBIT_BASE_URL = "http://127.0.0.1:8787";

type OrbitBaseUrlEnv = {
  ORBIT_BASE_URL?: string;
  BASE_URL?: string;
  NEXT_PUBLIC_BASE_URL?: string;
};

function normalizeBaseUrl(value?: string): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  return trimmed.replace(/\/+$/, "");
}

export function resolveGatewayBaseUrl(env: OrbitBaseUrlEnv = process.env): string {
  return (
    normalizeBaseUrl(env.ORBIT_BASE_URL) ||
    normalizeBaseUrl(env.BASE_URL) ||
    normalizeBaseUrl(env.NEXT_PUBLIC_BASE_URL) ||
    DEFAULT_ORBIT_BASE_URL
  );
}

export { DEFAULT_ORBIT_BASE_URL };
