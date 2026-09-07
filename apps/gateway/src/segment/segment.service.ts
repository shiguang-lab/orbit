import { Injectable } from "@nestjs/common";
import { OPTIONS, POST } from "./segment.handler.js";

@Injectable()
export class SegmentService {
  handleOptions() {
    return OPTIONS();
  }

  handlePost(req: Request) {
    return POST(req);
  }
}
