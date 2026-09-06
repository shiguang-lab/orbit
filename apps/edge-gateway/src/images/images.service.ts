import { Injectable } from "@nestjs/common";
import {
  GET as getImageGenerations,
  POST as imageGenerations,
} from "@shiguang-gateway/core-domain/edge/image-generations-handler";
import { POST as imageEdits } from "./edits/image-edits.handler.js";
import {
  GET as getImageUpscale,
  POST as imageUpscale,
} from "./upscale/image-upscale.handler.js";

@Injectable()
export class ImagesService {
  handleGetGenerations(req?: Request) {
    return getImageGenerations(req);
  }

  handleGenerations(req: Request) {
    return imageGenerations(req);
  }

  handleEdits(req: Request) {
    return imageEdits(req);
  }

  handleGetUpscale(req?: Request) {
    return getImageUpscale();
  }

  handleUpscale(req: Request) {
    return imageUpscale(req);
  }
}
