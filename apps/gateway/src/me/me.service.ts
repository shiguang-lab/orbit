import { Injectable } from "@nestjs/common";
import { GET } from "./me.handler.js";

@Injectable()
export class MeService {
  get(request: Request): Promise<Response> {
    return GET(request);
  }
}
