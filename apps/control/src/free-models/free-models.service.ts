import { Injectable } from "@nestjs/common";
import { listFreeModels } from "@orbit/core/catalog/free-models";

@Injectable()
export class FreeModelsService {
  list() { return listFreeModels(); }
}
