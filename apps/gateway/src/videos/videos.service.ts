import { Injectable } from "@nestjs/common";
import { GET, OPTIONS, POST } from "./video-generation.handler.js";

@Injectable()
export class VideosService {
  handleOptions(): Promise<Response> {
    return OPTIONS();
  }

  handleGetGenerations(request?: Request): Promise<Response> {
    return GET(request);
  }

  handleGenerations(request: Request): Promise<Response> {
    return POST(request);
  }
}
