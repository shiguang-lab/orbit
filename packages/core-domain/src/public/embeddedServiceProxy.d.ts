export interface ReverseProxyConfig {
  name: string;
  publicPrefix: string;
  htmlRewrite?: boolean;
}

export function proxyRequest(
  request: Request,
  pathSegments: string[],
  config: ReverseProxyConfig,
): Promise<Response>;
