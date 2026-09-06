import { Injectable } from "@nestjs/common";
import { POST as webFetch, OPTIONS as webFetchOptions } from "./web-fetch.handler.js";

/** Edge-owned orchestration for the OpenAI-compatible web fetch endpoint. */
@Injectable()
export class WebFetchService {
  handleFetch(request: Request): Promise<Response> {
    return webFetch(request);
  }

  async handleOptions(): Promise<Response> {
    return webFetchOptions();
  }
}
