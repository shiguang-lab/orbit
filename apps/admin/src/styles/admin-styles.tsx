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
    font-display: block;
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
    display: inline-flex;
    align-items: center;
    justify-content: center;
    vertical-align: middle;
    white-space: nowrap;
    word-wrap: normal;
    direction: ltr;
    font-feature-settings: "liga";
    -webkit-font-feature-settings: "liga";
    -webkit-font-smoothing: antialiased;
    font-variation-settings: "FILL" 0, "wght" 400, "GRAD" 0, "opsz" 24;
    user-select: none;
    overflow: hidden;
    text-rendering: optimizeLegibility;
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
  },
}));

export function AdminStyleBoundary({ children }: PropsWithChildren) {
  const { styles } = useAdminStyles();
  return <div className={styles.root}>{children}</div>;
}
