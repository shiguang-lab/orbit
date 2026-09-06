import { Injectable } from "@nestjs/common";
import { GET, OPTIONS, POST } from "./search.handler.js";

@Injectable()
export class SearchService {
  get(): Promise<Response> { return GET(); }
  post(request: Request): Promise<Response> { return POST(request, undefined); }
  options(): Promise<Response> { return OPTIONS(); }
}
