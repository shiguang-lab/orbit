import { Injectable } from "@nestjs/common";
import {
  GET as getKeysHandler,
  POST as createKeyHandler,
} from "./handlers/keys.js";
import {
  GET as getKeyByIdHandler,
  PATCH as patchKeyByIdHandler,
  DELETE as deleteKeyByIdHandler,
} from "@shiguang-gateway/core-domain/control/keys-by-id-route";
import { GET as getKeyDevicesHandler } from "@shiguang-gateway/core-domain/control/key-devices-route";
import { POST as regenerateKeyHandler } from "@shiguang-gateway/core-domain/control/key-regenerate-route";
import { GET as revealKeyHandler } from "@shiguang-gateway/core-domain/control/key-reveal-route";
import { GET as getKeyUsageLimitsHandler } from "@shiguang-gateway/core-domain/control/key-usage-limits-route";
import {
  GET as getKeyGroupsHandler,
  POST as createKeyGroupHandler,
} from "@shiguang-gateway/core-domain/control/key-groups-route";
import {
  GET as getKeyGroupByIdHandler,
  PUT as updateKeyGroupByIdHandler,
  DELETE as deleteKeyGroupByIdHandler,
} from "@shiguang-gateway/core-domain/control/key-group-by-id-route";
import {
  GET as getKeyGroupKeysHandler,
  POST as addKeyToGroupHandler,
  DELETE as removeKeyFromGroupHandler,
} from "@shiguang-gateway/core-domain/control/key-group-keys-route";
import {
  GET as getKeyGroupPermissionsHandler,
  POST as addKeyGroupPermissionHandler,
  DELETE as removeKeyGroupPermissionHandler,
} from "@shiguang-gateway/core-domain/control/key-group-permissions-route";

@Injectable()
export class KeysService {
  handleGetKeys(request: Request) {
    return getKeysHandler(request);
  }

  handleCreateKey(request: Request) {
    return createKeyHandler(request);
  }

  handleGetKeyById(request: Request, id: string) {
    return getKeyByIdHandler(request, { params: { id } as any });
  }

  handlePatchKeyById(request: Request, id: string) {
    return patchKeyByIdHandler(request, { params: { id } as any });
  }

  handleDeleteKeyById(request: Request, id: string) {
    return deleteKeyByIdHandler(request, { params: { id } as any });
  }

  handleGetKeyDevices(request: Request, id: string) {
    return getKeyDevicesHandler(request, { params: { id } as any });
  }

  handleRegenerateKey(request: Request, id: string) {
    return regenerateKeyHandler(request, { params: { id } as any });
  }

  handleRevealKey(request: Request, id: string) {
    return revealKeyHandler(request, { params: { id } as any });
  }

  handleGetKeyUsageLimits(request: Request, id: string) {
    return getKeyUsageLimitsHandler(request, { params: { id } as any });
  }

  handleGetKeyGroups() {
    return getKeyGroupsHandler();
  }

  handleCreateKeyGroup(request: Request) {
    return createKeyGroupHandler(request);
  }

  handleGetKeyGroupById(request: Request, id: string) {
    return getKeyGroupByIdHandler(request, { params: { id } as any });
  }

  handleUpdateKeyGroupById(request: Request, id: string) {
    return updateKeyGroupByIdHandler(request, { params: { id } as any });
  }

  handleDeleteKeyGroupById(request: Request, id: string) {
    return deleteKeyGroupByIdHandler(request, { params: { id } as any });
  }

  handleGetKeyGroupKeys(request: Request, id: string) {
    return getKeyGroupKeysHandler(request, { params: { id } as any });
  }

  handleAddKeyToGroup(request: Request, id: string) {
    return addKeyToGroupHandler(request, { params: { id } as any });
  }

  handleRemoveKeyFromGroup(request: Request, id: string) {
    return removeKeyFromGroupHandler(request, { params: { id } as any });
  }

  handleGetKeyGroupPermissions(request: Request, id: string) {
    return getKeyGroupPermissionsHandler(request, { params: { id } as any });
  }

  handleAddKeyGroupPermission(request: Request, id: string) {
    return addKeyGroupPermissionHandler(request, { params: { id } as any });
  }

  handleRemoveKeyGroupPermission(request: Request, id: string) {
    return removeKeyGroupPermissionHandler(request, { params: { id } as any });
  }
}
