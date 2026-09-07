import { Injectable } from "@nestjs/common";
import { OPTIONS, POST } from "./relay-bifrost.handler.js";
@Injectable()
export class RelayBifrostService {
  post(request: Request) { return POST(request); }
  options() { return OPTIONS(); }
}
