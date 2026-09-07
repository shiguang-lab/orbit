import { Module } from "@nestjs/common";
import { DocsSearchController } from "./docs-search.controller.js";
import { DocsSearchService } from "./docs-search.service.js";

@Module({ controllers: [DocsSearchController], providers: [DocsSearchService] })
export class DocsSearchModule {}
