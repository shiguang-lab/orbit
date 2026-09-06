import { Controller, Get } from "@nestjs/common";
import type { FastifyRequest } from "fastify";
import { DocsSearchService } from "./docs-search.service.js";

@Controller("docs/api/search")
export class DocsSearchController {
  constructor(private readonly service: DocsSearchService) {}

  @Get()
  search(request: FastifyRequest): Promise<Response> {
    return this.service.search(new Request(`http://edge-gateway${request.url}`));
  }
}
