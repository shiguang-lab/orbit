import { theme, type ThemeConfig } from "antd";
import { palette } from "./palette";

const sharedToken = {
  borderRadius: palette.radius.md,
  fontFamily: palette.fontFamily,
};

/**
 * antd ThemeConfig：亮/暗两套，组件级 token 统一收敛到这里，
 * 业务页面不再散落样式覆盖（参考 asset-hub tokens.ts）。
 */
export const themeConfig: Record<"light" | "dark", ThemeConfig> = {
  light: {
    algorithm: theme.defaultAlgorithm,
    token: {
      colorPrimary: palette.brand,
      colorSuccess: palette.success,
      colorWarning: palette.warning,
      colorError: palette.danger,
      colorInfo: palette.info,
      colorBgLayout: palette.scheme.light.bg,
      colorBgContainer: palette.scheme.light.surface,
      colorBorder: palette.scheme.light.border,
      colorText: palette.scheme.light.text,
      colorTextSecondary: palette.scheme.light.textSecondary,
      ...sharedToken,
    },
    components: {
      Layout: {
        siderBg: palette.scheme.light.surface,
        headerBg: palette.scheme.light.surface,
      },
    },
  },
  dark: {
    algorithm: theme.darkAlgorithm,
    token: {
      colorPrimary: palette.brand,
      colorSuccess: palette.success,
      colorWarning: palette.warning,
      colorError: palette.danger,
      colorInfo: palette.info,
      colorBgLayout: palette.scheme.dark.bg,
      colorBgContainer: palette.scheme.dark.surface,
      colorBorder: palette.scheme.dark.border,
      colorText: palette.scheme.dark.text,
      colorTextSecondary: palette.scheme.dark.textSecondary,
      ...sharedToken,
    },
    components: {
      Layout: {
        siderBg: palette.scheme.dark.surface,
        headerBg: palette.scheme.dark.surface,
      },
    },
  },
};
