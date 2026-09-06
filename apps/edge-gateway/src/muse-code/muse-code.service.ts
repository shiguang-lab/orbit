import { Injectable } from "@nestjs/common";
import { GET, OPTIONS } from "./muse-code.handler.js";

@Injectable()
export class MuseCodeService {
  handleGet() {
    return GET();
  }

  handleOptions() {
    return OPTIONS();
  }
}
