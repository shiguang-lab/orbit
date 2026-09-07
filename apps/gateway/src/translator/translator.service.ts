import { Injectable } from "@nestjs/common";
import { detect, history, send, transformStream, translate } from "./translator.handlers.js";

@Injectable()
export class TranslatorService {
  detect(request: Request) { return detect(request); }
  history(request: Request) { return history(request); }
  send(request: Request) { return send(request); }
  transformStream(request: Request) { return transformStream(request); }
  translate(request: Request) { return translate(request); }
}
