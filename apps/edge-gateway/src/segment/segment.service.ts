import { Injectable } from "@nestjs/common";
import { OPTIONS, POST } from "./segment.route.js";

@Injectable()
export class SegmentService {
  handleOptions() {
    return OPTIONS();
  }

  handlePost(req: Request) {
    return POST(req);
  }
}
