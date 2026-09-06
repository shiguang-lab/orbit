export function getKimiWebBaseUrl(): string {
  const configured = process.env.KIMI_WEB_BASE_URL?.trim();
  return configured ? configured.replace(/\/+$/, "") : "https://www.kimi.ai";
}
