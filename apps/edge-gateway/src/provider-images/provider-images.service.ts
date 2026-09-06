import { Injectable } from "@nestjs/common";
import { OPTIONS, POST } from "./provider-images.handler.js";

@Injectable()
export class ProviderImagesService {
  options() { return OPTIONS(); }
  generate(request: Request, provider: string) { return POST(request, provider); }
}
