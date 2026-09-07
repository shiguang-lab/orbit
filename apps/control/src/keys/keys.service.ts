import { Injectable } from "@nestjs/common";
import {
  GET as getKeysHandler,
  POST as createKeyHandler,
} from "./handlers/keys.js";
import {
  GET as getKeyByIdHandler,
  PATCH as patchKeyByIdHandler,
  DELETE as deleteKeyByIdHandler,
} from "./handlers/key-by-id.js";
import { GET as getKeyDevicesHandler } from "./handlers/key-devices.js";
import { POST as regenerateKeyHandler } from "./handlers/key-regenerate.js";
import { GET as revealKeyHandler } from "./handlers/key-reveal.js";
import { GET as getKeyUsageLimitsHandler } from "./handlers/key-usage-limits.js";
import {
  GET as getKeyGroupsHandler,
  POST as createKeyGroupHandler,
} from "./handlers/key-groups.js";
import {
  GET as getKeyGroupByIdHandler,
  PUT as updateKeyGroupByIdHandler,
  DELETE as deleteKeyGroupByIdHandler,
} from "./handlers/key-group-by-id.js";
import {
  GET as getKeyGroupKeysHandler,
  POST as addKeyToGroupHandler,
  DELETE as removeKeyFromGroupHandler,
} from "./handlers/key-group-keys.js";
import {
  GET as getKeyGroupPermissionsHandler,
  POST as addKeyGroupPermissionHandler,
  DELETE as removeKeyGroupPermissionHandler,
} from "./handlers/key-group-permissions.js";

@Injectable()
export class KeysService {
  handleGetKeys(request: Request) {
    return getKeysHandler(request);
  }

  handleCreateKey(request: Request) {
    return createKeyHandler(request);
  }

  handleGetKeyById(request: Request, id: string) {
    return getKeyByIdHandler(request, { params: { id } });
  }

  handlePatchKeyById(request: Request, id: string) {
    return patchKeyByIdHandler(request, { params: { id } });
  }

  handleDeleteKeyById(request: Request, id: string) {
    return deleteKeyByIdHandler(request, { params: { id } });
  }

  handleGetKeyDevices(request: Request, id: string) {
    return getKeyDevicesHandler(request, { params: { id } });
  }

  handleRegenerateKey(request: Request, id: string) {
    return regenerateKeyHandler(request, { params: { id } });
  }

  handleRevealKey(request: Request, id: string) {
    return revealKeyHandler(request, { params: { id } });
  }

  handleGetKeyUsageLimits(request: Request, id: string) {
    return getKeyUsageLimitsHandler(request, { params: { id } });
  }

  handleGetKeyGroups() {
    return getKeyGroupsHandler();
  }

  handleCreateKeyGroup(request: Request) {
    return createKeyGroupHandler(request);
  }

  handleGetKeyGroupById(request: Request, id: string) {
    return getKeyGroupByIdHandler(request, { params: { id } });
  }

  handleUpdateKeyGroupById(request: Request, id: string) {
    return updateKeyGroupByIdHandler(request, { params: { id } });
  }

  handleDeleteKeyGroupById(request: Request, id: string) {
    return deleteKeyGroupByIdHandler(request, { params: { id } });
  }

  handleGetKeyGroupKeys(request: Request, id: string) {
    return getKeyGroupKeysHandler(request, { params: { id } });
  }

  handleAddKeyToGroup(request: Request, id: string) {
    return addKeyToGroupHandler(request, { params: { id } });
  }

  handleRemoveKeyFromGroup(request: Request, id: string) {
    return removeKeyFromGroupHandler(request, { params: { id } });
  }

  handleGetKeyGroupPermissions(request: Request, id: string) {
    return getKeyGroupPermissionsHandler(request, { params: { id } });
  }

  handleAddKeyGroupPermission(request: Request, id: string) {
    return addKeyGroupPermissionHandler(request, { params: { id } });
  }

  handleRemoveKeyGroupPermission(request: Request, id: string) {
    return removeKeyGroupPermissionHandler(request, { params: { id } });
  }
}
