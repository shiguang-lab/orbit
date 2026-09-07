import { Injectable } from "@nestjs/common";
import { GET, OPTIONS } from "./vscode-version.handler.js";

@Injectable()
export class VscodeVersionService {
  get(): Response {
    return GET();
  }

  options(): Response {
    return OPTIONS();
  }
}
