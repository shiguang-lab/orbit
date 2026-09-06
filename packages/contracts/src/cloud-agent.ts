/** Shared endpoint contract for cloud-agent integrations. */
export const JULES_API_BASE_URL = "https://jules.googleapis.com/v1alpha";

export function buildJulesApiUrl(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${JULES_API_BASE_URL}${normalized}`;
}
