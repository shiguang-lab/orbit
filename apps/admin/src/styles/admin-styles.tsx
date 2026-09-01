import { createGlobalStyle, createStyles } from "antd-style";
import type { PropsWithChildren } from "react";
import materialSymbolsFont from "material-symbols/material-symbols-outlined.woff2";

/** Document-level reset and the vendor icon font, injected through antd-style. */
export const AppDocumentReset = createGlobalStyle`
  html,
  body,
  #root {
    height: 100%;
    margin: 0;
    padding: 0;
  }

  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Helvetica Neue", Arial, sans-serif;
  }

  @font-face {
    font-family: "Material Symbols Outlined";
    font-style: normal;
    font-weight: 100 700;
    src: url(${materialSymbolsFont}) format("woff2");
  }

  :where(.material-symbols-outlined) {
    font-family: "Material Symbols Outlined", sans-serif !important;
    font-weight: normal;
    font-style: normal;
    font-size: 24px;
    line-height: 1;
    letter-spacing: normal;
    text-transform: none;
    display: inline-block;
    white-space: nowrap;
    word-wrap: normal;
    direction: ltr;
    font-feature-settings: "liga";
    -webkit-font-feature-settings: "liga";
    -webkit-font-smoothing: antialiased;
    font-variation-settings: "FILL" 0, "wght" 400, "GRAD" 0, "opsz" 24;
    user-select: none;
  }

  button .material-symbols-outlined,
  [role="button"] .material-symbols-outlined {
    pointer-events: none;
  }

  /* Prevent browser autofill from breaking dark mode backgrounds */
  input:-webkit-autofill,
  input:-webkit-autofill:hover, 
  input:-webkit-autofill:focus,
  input:-webkit-autofill:active,
  textarea:-webkit-autofill,
  textarea:-webkit-autofill:hover,
  textarea:-webkit-autofill:focus,
  textarea:-webkit-autofill:active {
    -webkit-box-shadow: 0 0 0 1000px rgba(255, 255, 255, 0.05) inset !important;
    -webkit-text-fill-color: inherit !important;
    caret-color: inherit !important;
    transition: background-color 50000s ease-in-out 0s;
  }
`;

export const useAdminStyles = createStyles(({ token }) => ({
  root: {
    height: "100%",
    fontFamily: token.fontFamily,
    "& .sidebar-sider": {
      borderRight: `1px solid ${token.colorBorderSecondary}`,
      display: "flex",
      flexDirection: "column",
      minHeight: 0,
      padding: "16px 6px",
      boxSizing: "border-box",
      transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
    },
    "& .sidebar-sider.ant-layout-sider-collapsed": {
      padding: "16px 0",
    },
    "& .sidebar-sider > .ant-layout-sider-children": {
      display: "flex",
      flexDirection: "column",
      minHeight: 0,
      height: "100%",
    },
    "& .sidebar-header": {
      minHeight: 52,
      padding: "4px 18px 16px",
      display: "flex",
      alignItems: "center",
      gap: 12,
      flex: "none",
    },
    "& .sidebar-sider.ant-layout-sider-collapsed .sidebar-header": {
      justifyContent: "center",
      padding: "4px 0 16px",
      minHeight: 52,
    },
    "& .sidebar-brand-mark": {
      width: 34,
      height: 34,
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      flex: "none",
      borderRadius: 9,
      color: "#fff",
      background: "linear-gradient(145deg, #6d59ff, #4d35d7)",
      boxShadow: "0 0 20px rgba(92, 69, 255, 0.25)",
    },
    "& .sidebar-brand-mark .material-symbols-outlined": { fontSize: 19 },
    "& .sidebar-brand-copy": {
      display: "flex",
      flexDirection: "column",
      gap: 3,
      minWidth: 0,
      lineHeight: 1.15,
    },
    "& .sidebar-brand-copy .ant-typography:first-child": {
      color: token.colorText,
      fontSize: 16,
    },
    "& .sidebar-brand-copy .ant-typography:last-child": {
      color: token.colorTextSecondary,
      fontSize: 11,
    },
    "& .sidebar-menu-search": {
      padding: "0 6px 10px",
      flex: "none",
    },
    "& .sidebar-menu-search .ant-input-affix-wrapper": {
      minHeight: 34,
      borderColor: token.colorBorder,
      borderRadius: 7,
      background: token.colorBgContainer,
    },
    "& .sidebar-menu-search .ant-input": {
      color: token.colorText,
      background: "transparent",
      fontSize: 13,
    },
    "& .sidebar-menu-search .ant-input-prefix, & .sidebar-menu-search .ant-input-clear-icon": {
      color: token.colorTextSecondary,
    },
    "& .sidebar-menu .sidebar-menu-icon": {
      fontSize: 18,
      lineHeight: "18px",
      width: 18,
      height: 18,
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
      marginInlineEnd: 10,
    },
    "& .sidebar-menu": {
      marginTop: 4,
    },
    "& .sidebar-menu .ant-menu-item, & .sidebar-menu .ant-menu-submenu-title": {
      borderRadius: 8,
      marginInline: 4,
      width: "calc(100% - 8px)",
      display: "flex",
      alignItems: "center",
    },
    "& .sidebar-sider.ant-layout-sider-collapsed .sidebar-menu": {
      marginInline: 0,
      width: "100%",
    },
    "& .sidebar-menu.ant-menu-inline-collapsed .ant-menu-item, & .sidebar-menu.ant-menu-inline-collapsed .ant-menu-submenu-title": {
      width: 38,
      height: 38,
      lineHeight: "38px",
      margin: "4px auto !important",
      padding: "0 !important",
      display: "flex !important",
      alignItems: "center !important",
      justifyContent: "center !important",
      borderRadius: 8,
    },
    "& .sidebar-menu.ant-menu-inline-collapsed .sidebar-menu-icon": {
      fontSize: 20,
      width: 20,
      height: 20,
      lineHeight: "20px",
      margin: "0 !important",
    },
    "& .app-header": {
      height: 60,
      minHeight: 60,
      display: "flex",
      alignItems: "center",
      gap: 14,
      padding: "0 24px",
      lineHeight: "normal",
      boxSizing: "border-box",
      borderBottom: `1px solid ${token.colorBorderSecondary}`,
      background: token.colorBgContainer,
      backdropFilter: "blur(14px)",
    },
    "& .app-header-left": {
      minWidth: 0,
      flex: 1,
      display: "flex",
      alignItems: "center",
      gap: 12,
    },
    "& .app-breadcrumb": {
      minWidth: 130,
      display: "flex",
      alignItems: "center",
      gap: 8,
      color: token.colorTextSecondary,
    },
    "& .app-breadcrumb-current": {
      color: token.colorText,
      fontWeight: 600,
    },
    "& .app-header-tools": {
      display: "flex",
      alignItems: "center",
      gap: 12,
      flex: "none",
    },
    "& .app-global-search": {
      width: "min(340px, 30vw)",
      minHeight: 36,
      borderRadius: 7,
      borderColor: token.colorBorder,
      background: token.colorBgContainer,
    },
    "& .app-global-search .ant-input": { fontSize: 14 },
    // Ant Design only adds the icon-to-label gap for its own `.anticon`
    // wrapper. Material Symbols are plain spans, so keep the same rhythm for
    // tags that receive an icon through the `icon` prop.
    "& .ant-tag > .material-symbols-outlined + span": { marginInlineStart: token.paddingXS },
  },
}));

export function AdminStyleBoundary({ children }: PropsWithChildren) {
  const { styles } = useAdminStyles();
  return <div className={styles.root}>{children}</div>;
}
