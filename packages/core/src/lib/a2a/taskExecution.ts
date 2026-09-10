import type { A2ATask, TaskArtifact } from "./taskManager";
import { appendA2ATaskEvent } from "../db/a2aTasks.ts";
import { memoryManager } from "../memory/manager.ts";

type TaskManagerLike = {
  updateTask: (
    taskId: string,
    state: "completed" | "failed",
    artifacts?: Array<{ type: string; content: string }>,
    message?: string
  ) => unknown;
};

type StreamTaskResult = {
  artifacts: TaskArtifact[];
  metadata: Record<string, unknown>;
};
export interface MemoryHit {id:string;key:string;type:string;snippet:string}
export interface MemoryHitsDeps {search?:(config:{query:string;apiKeyId:string;limit?:number})=>Promise<Array<{id:string;key:string;type:string;content:string}>>;appendEvent?:(taskId:string,eventType:string,dataJson?:string)=>void}
export async function collectMemoryHits(task:A2ATask,deps?:MemoryHitsDeps):Promise<MemoryHit[]>{if(process.env.ORBIT_A2A_MEMORY_HITS==="0")return [];const query=[...(task.input?.messages??[])].reverse().find(message=>message.role==="user")?.content;if(!query?.trim())return [];try{const search=deps?.search??(config=>memoryManager.getPrimaryBackend().search(config));const found=await search({query,apiKeyId:task.owner??"mcp",limit:5});return found.map(memory=>({id:memory.id,key:memory.key,type:String(memory.type),snippet:memory.content.slice(0,200)}));}catch{return []}}

export type A2ASkillHandler = (task: A2ATask) => Promise<StreamTaskResult>;

export const A2A_SKILL_HANDLERS: Record<string, A2ASkillHandler> = {
  "smart-routing": async (task) => {
    const skillModule = await import("./skills/smartRouting");
    return skillModule.executeSmartRouting(task);
  },
  "quota-management": async (task) => {
    const skillModule = await import("./skills/quotaManagement");
    return skillModule.executeQuotaManagement(task);
  },
  "provider-discovery": async (task) => {
    const skillModule = await import("./skills/providerDiscovery");
    return skillModule.executeProviderDiscovery(task);
  },
  "cost-analysis": async (task) => {
    const skillModule = await import("./skills/costAnalysis");
    return skillModule.executeCostAnalysis(task);
  },
  "health-report": async (task) => {
    const skillModule = await import("./skills/healthReport");
    return skillModule.executeHealthReport(task);
  },
  "list-capabilities": async (task) => {
    const skillModule = await import("./skills/listCapabilities");
    return skillModule.executeListCapabilities(task);
  },
};

export async function executeA2ATaskWithState(
  tm: TaskManagerLike,
  task: A2ATask,
  handler: (task: A2ATask) => Promise<StreamTaskResult>,
  deps?: MemoryHitsDeps
) {
  try {
    const hits=await collectMemoryHits(task,deps);if(hits.length){task.metadata.memoryHits=hits;try{(deps?.appendEvent??appendA2ATaskEvent)(task.id,"memory_hits",JSON.stringify(hits))}catch{/* observability must not fail execution */}}
    const result = await handler(task);
    tm.updateTask(task.id, "completed", result.artifacts);
    return result;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    try {
      tm.updateTask(task.id, "failed", [{ type: "error", content: msg }], msg);
    } catch {
      // Task may already be terminal (e.g., cancelled). Preserve original error.
    }
    throw err;
  }
}
