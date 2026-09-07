export interface KeyGroup {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
export interface GroupModelPermission {
  id: string;
  groupId: string;
  modelPattern: string;
  provider: string | null;
  accessType: "allow" | "deny";
  createdAt: string;
}
export interface KeyGroupMember { keyId: string; groupId: string; createdAt: string; }
export interface KeyGroupWithPermissions extends KeyGroup {
  permissions: GroupModelPermission[];
  memberCount: number;
}
export function getAllKeyGroups(): KeyGroup[];
export function getKeyGroup(id: string): KeyGroup | undefined;
export function getKeyGroupWithPermissions(id: string): KeyGroupWithPermissions | undefined;
export function createKeyGroup(name: string, description?: string): KeyGroup;
export function updateKeyGroup(id: string, updates: { name?: string; description?: string; isActive?: boolean }): KeyGroup | undefined;
export function deleteKeyGroup(id: string): boolean;
export function getGroupPermissions(groupId: string): GroupModelPermission[];
export function addGroupPermission(groupId: string, modelPattern: string, accessType: "allow" | "deny", provider?: string): GroupModelPermission;
export function removeGroupPermission(permissionId: string): boolean;
export function getGroupMembers(groupId: string): KeyGroupMember[];
export function getKeyGroupsForApiKey(keyId: string): KeyGroup[];
export function addKeyToGroup(keyId: string, groupId: string): boolean;
export function removeKeyFromGroup(keyId: string, groupId: string): boolean;
export interface ModelAccessCheck {
  allowed: boolean;
  matchedRules: GroupModelPermission[];
  deniedBy: GroupModelPermission | null;
}
export function checkKeyModelAccess(
  keyId: string,
  model: string,
  provider?: string,
): ModelAccessCheck;
