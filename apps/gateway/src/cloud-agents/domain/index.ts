export * from "./types.js";
export * from "./baseAgent.js";
export * from "./registry.js";
export * from "./db.js";
export * from "./credentials.js";

import { createCloudAgentTaskTable } from "./db.js";
import { createCloudAgentCredentialsTable } from "./credentials.js";

createCloudAgentTaskTable();
createCloudAgentCredentialsTable();
