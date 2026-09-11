import { createGlobalStyle, createStyles } from "antd-style";
import type { PropsWithChildren } from "react";

/** Document-level reset injected through antd-style. */
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
