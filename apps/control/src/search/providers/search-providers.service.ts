import { Injectable } from "@nestjs/common";
import { GET } from "./handlers/search-providers.handler.js";

@Injectable()
export class SearchProvidersService {
  get(request: Request): Promise<Response> {
    return GET(request);
  }
}
