/**
 * 平台级视觉 token 单一事实来源（参考 asset-hub apps/web/src/theme/palette.ts）。
 * 业务样式一律引用语义色，不直接写死 hex。
 */
export const palette = {
  brand: "#5B36F5",
  success: "#22A06B",
  warning: "#D97706",
  danger: "#D64545",
  info: "#2E86DE",

  radius: {
    sm: 6,
    md: 8,
    lg: 12,
  },

  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Helvetica Neue", Arial, sans-serif',

  scheme: {
    light: {
      bg: "#F5F6FA",
      surface: "#FFFFFF",
      surfaceSecondary: "#F7F8FC",
      border: "#E4E6EE",
      text: "#1A1D26",
      textSecondary: "#5A6072",
      textMuted: "#8A91A5",
    },
    dark: {
      bg: "#0F1115",
      surface: "#171A21",
      surfaceSecondary: "#1E222B",
      border: "#2A2F3A",
      text: "#E6E8EF",
      textSecondary: "#9AA1B0",
      textMuted: "#6B7280",
    },
  },
} as const;

export type Palette = typeof palette;
export type SchemeName = keyof typeof palette.scheme;
