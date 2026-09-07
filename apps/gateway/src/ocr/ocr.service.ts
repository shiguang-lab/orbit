import { Injectable } from "@nestjs/common";
import { OPTIONS, POST } from "./ocr.handler.js";

@Injectable()
export class OcrService {
  handleOptions() {
    return OPTIONS();
  }

  handlePost(req: Request) {
    return POST(req);
  }
}
