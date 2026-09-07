import { Module } from "@nestjs/common";
import { CommonModule } from "../common/common.module.js";
import { SearchController } from "./search.controller.js";
import { SearchService } from "./search.service.js";

@Module({ imports: [CommonModule], controllers: [SearchController], providers: [SearchService] })
export class SearchModule {}
