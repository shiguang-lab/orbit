import { Injectable } from "@nestjs/common";
import { GET, OPTIONS } from "./combos.handler.js";

@Injectable()
export class CombosService {
  handleGet(request: Request) {
    return GET(request);
  }

  handleOptions() {
    return OPTIONS();
  }
}
