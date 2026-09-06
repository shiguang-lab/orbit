import { Injectable } from "@nestjs/common";
import { GET, OPTIONS } from "./usage-command.handler.js";

@Injectable()
export class UsageCommandService {
  get(request: Request) { return GET(request); }
  options() { return OPTIONS(); }
}
