import { Injectable } from "@nestjs/common";
import { listFreeModels } from "@shiguang-gateway/core-domain/shared/free-models";

@Injectable()
export class FreeModelsService {
  list() { return listFreeModels(); }
}
