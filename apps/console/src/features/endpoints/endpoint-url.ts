/** Endpoint paths already include the protocol prefix; SDK base URLs may too. */
export function buildEndpointUrl(baseUrl: string, endpointPath: string): string {
  const root = baseUrl.trim().replace(/\/+$/, "").replace(/\/(?:api\/)?v1$/, "");
  return `${root}/${endpointPath.replace(/^\/+/, "")}`;
}
