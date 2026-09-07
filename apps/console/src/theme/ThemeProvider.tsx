import { App, ConfigProvider, theme as antdTheme } from "antd";
import zhCN from "antd/locale/zh_CN";
import enUS from "antd/locale/en_US";
import { StyleProvider } from "antd-style";
import { useEffect, type ReactNode } from "react";
import { AdminStyleBoundary, AppDocumentReset } from "@/styles/admin-styles";
import { useLocaleStore } from "@/i18n";
import { themeConfig } from "./tokens";
import { useThemeMode } from "./useThemeMode";

interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const mode = useThemeMode((s) => s.mode);
  const locale = useLocaleStore((state) => state.locale);
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);
  return (
    <StyleProvider>
      <ConfigProvider
        locale={locale === "zh-CN" ? zhCN : enUS}
        theme={themeConfig[mode]}
        // antd 静态方法(modal/message/notification)感知主题
        wave={{ disabled: false }}
      >
        <App>
          <AppDocumentReset />
          <AdminStyleBoundary>{children}</AdminStyleBoundary>
        </App>
      </ConfigProvider>
    </StyleProvider>
  );
}

export function useAntdTheme() {
  return antdTheme;
}
