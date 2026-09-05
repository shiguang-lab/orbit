"use client";

import { ConfigProvider, theme as antdTheme } from "antd";
import { useTheme } from "../hooks/useTheme.ts";

/**
 * Bridges the app's theme store (light/dark via `document.documentElement.dark`,
 * colors via CSS custom properties) into antd's theming system.
 *
 * Without this, antd components (Layout, Menu, Input, etc.) fall back to
 * antd's default light palette (black text) and never react to the app's
 * dark mode or the user-chosen accent color.
 *
 * `hashed={false}` is required here: CSS-in-JS class names must be stable
 * across light/dark switches or cached components render stale colors when
 * the theme toggles.
 */
export function AntdThemeProvider({ children }: { children: React.ReactNode }) {
  const { isDark } = useTheme();

  return (
    <ConfigProvider
      theme={{
        algorithm: isDark ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
        hashed: false,
        token: {
          colorPrimary: "var(--color-primary)",
          colorInfo: "var(--color-primary)",
          colorLink: "var(--color-primary)",
          colorBgLayout: "var(--color-bg)",
          colorBgContainer: "var(--color-surface)",
          colorBgElevated: "var(--color-surface-2)",
          colorBorder: "var(--color-border)",
          colorBorderSecondary: "var(--color-border)",
          colorText: "var(--color-text-main)",
          colorTextSecondary: "var(--color-text-muted)",
          colorTextDescription: "var(--color-text-muted)",
          colorTextPlaceholder: "var(--color-text-muted)",
          colorTextHeading: "var(--color-text-main)",
          colorTextLabel: "var(--color-text-main)",
          colorError: "var(--color-error)",
          colorSuccess: "var(--color-success)",
          colorWarning: "var(--color-warning)",
          borderRadius: 8,
          fontFamily:
            "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'SF Pro Display', system-ui, sans-serif",
        },
        components: {
          Menu: {
            itemBg: "transparent",
            itemColor: "var(--color-text-muted)",
            itemHoverBg: "var(--color-surface)",
            itemHoverColor: "var(--color-text-main)",
            itemSelectedBg: "var(--color-surface)",
            itemSelectedColor: "var(--color-primary)",
            groupTitleColor: "var(--color-text-muted)",
          },
          Layout: {
            bodyBg: "transparent",
            headerBg: "transparent",
            siderBg: "var(--color-sidebar)",
          },
        },
      }}
    >
      {children}
    </ConfigProvider>
  );
}
