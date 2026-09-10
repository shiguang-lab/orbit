import { api } from "@/entities/api";
import type { OrchestrationInputs, OrchestrationSource, OrchestrationSourceStatus } from "./model";

function rows(value:unknown,key:string):Record<string,unknown>[] {const body=value as Record<string,unknown>|null;const list=body?.[key]??body?.data;return Array.isArray(list)?list as Record<string,unknown>[]:[];}
export async function loadOrchestrationInputs():Promise<OrchestrationInputs>{
  const calls:[OrchestrationSource,Promise<unknown>,string][]=[
    ["cloud-agent",api("/cloud-agents/tasks?limit=100"),"data"],
    ["a2a",api("/a2a/tasks?limit=100"),"tasks"],
    ["conductor",api("/conductor/fleet"),"tasks"],
    ["routing",api("/combos"),"combos"],
  ];
  const settled=await Promise.allSettled(calls.map(x=>x[1]));const sources:OrchestrationSourceStatus[]=[];const output:Omit<OrchestrationInputs,"sources">={};
  settled.forEach((result,index)=>{const [source,,key]=calls[index];if(result.status==="fulfilled"){const list=rows(result.value,key);sources.push({source,ok:true,offline:source==="conductor"&&list.length===0});if(source==="cloud-agent")output.cloudTasks=list;else if(source==="a2a")output.a2aTasks=list;else if(source==="conductor")output.conductorTasks=list;else output.combos=list;}else sources.push({source,ok:false,error:result.reason instanceof Error?result.reason.message:String(result.reason)});});
  return {...output,sources};
}
export async function loadOrchestrationHistory(){const value=await api<unknown>("/a2a/tasks/history?limit=200");return rows(value,"tasks").map(row=>({...row,...(row.metadata&&typeof row.metadata==="object"?row.metadata:{} as Record<string,unknown>)}));}
