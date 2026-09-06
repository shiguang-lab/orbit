import { Injectable } from "@nestjs/common";
import { GET, OPTIONS } from "./handlers/provider-plugin-manifest.handler.js";

@Injectable()
export class ProviderPluginManifestService {
  get(request: Request): Promise<Response> {
    return GET(request);
  }

  options(): Response {
    return OPTIONS();
  }
}
