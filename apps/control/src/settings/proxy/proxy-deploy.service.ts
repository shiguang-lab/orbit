import { Injectable } from "@nestjs/common";
import { deployCloudflare } from "./cloudflare-deploy.handler.js";
import { deployDeno } from "./deno-deploy.handler.js";
import { deployVercel } from "./vercel-deploy.handler.js";

/** Deployment use cases for managed proxy relay backends. */
@Injectable()
export class ProxyDeployService {
  cloudflare(request: Request, body: unknown) { return deployCloudflare(request, body); }
  deno(request: Request, body: unknown) { return deployDeno(request, body); }
  vercel(request: Request, body: unknown) { return deployVercel(request, body); }
}
