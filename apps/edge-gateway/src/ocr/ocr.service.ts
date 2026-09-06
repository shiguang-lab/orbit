import { Injectable } from "@nestjs/common";
import { OPTIONS, POST } from "./ocr.route.js";

@Injectable()
export class OcrService {
  handleOptions() {
    return OPTIONS();
  }

  handlePost(req: Request) {
    return POST(req);
  }
}
