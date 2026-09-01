/**
 * @omniroute/ui
 * 共享 UI 组件/主题(跨 apps/admin 等复用)。
 * 起步先放主题 token；后续把 AppTable/AppPagination/useDeleteConfirm 等
 * 跨页面通用组件从 apps/admin/shared 抽到这里。
 */
export { themeConfig } from "./theme/tokens";
export { palette } from "./theme/palette";
export type { Palette, SchemeName } from "./theme/palette";
