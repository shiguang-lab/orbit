import { AGY_CONFIG } from "../constants/oauth.js";
import { createAntigravityOAuthProvider } from "./antigravity.js";

/** Official Antigravity CLI OAuth flow with an explicit CLI client identity. */
export const agy = createAntigravityOAuthProvider(AGY_CONFIG, "cli");
