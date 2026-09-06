import { Injectable } from "@nestjs/common";
import {
  create as createMapping,
  getById as getMappingById,
  list as listMappings,
  remove as removeMapping,
  update as updateMapping,
} from "./handlers/model-combo-mappings.js";

@Injectable()
export class ModelComboMappingsService {
  handleList(request: Request) {
    return listMappings(request);
  }

  handleCreate(request: Request) {
    return createMapping(request);
  }

  handleGetById(request: Request, id: string) {
    return getMappingById(request, { params: { id } });
  }

  handleUpdate(request: Request, id: string) {
    return updateMapping(request, { params: { id } });
  }

  handleRemove(request: Request, id: string) {
    return removeMapping(request, { params: { id } });
  }
}
