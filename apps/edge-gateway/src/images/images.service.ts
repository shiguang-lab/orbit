import { Injectable } from "@nestjs/common";
import {
  GET as getImageGenerations,
  POST as imageGenerations,
} from "@shiguang-gateway/core-domain/edge/image-generations-handler";
import { POST as imageEdits } from "@shiguang-gateway/core-domain/edge/image-edits-handler";
import {
  GET as getImageUpscale,
  POST as imageUpscale,
} from "@shiguang-gateway/core-domain/edge/image-upscale-handler";

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
    return getImageUpscale(req);
  }

  handleUpscale(req: Request) {
    return imageUpscale(req);
  }
}
