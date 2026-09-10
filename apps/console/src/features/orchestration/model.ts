export type OrchestrationState = "queued"|"running"|"waiting_approval"|"succeeded"|"failed"|"cancelled";
export type OrchestrationSource = "cloud-agent"|"a2a"|"conductor"|"routing";
export type OrchestrationKind = "orchestrator"|"source"|"work"|"overflow";
export interface OrchestrationNode { id:string;kind:OrchestrationKind;source?:OrchestrationSource;state?:OrchestrationState;label:string;sublabel?:string;updatedAt?:string;endedAt?:string;raw?:Record<string,unknown>;droppedByState?:Partial<Record<OrchestrationState,number>> }
export interface OrchestrationEdge { id:string;from:string;to:string;kind:"owns"|"mirror";active:boolean }
export interface OrchestrationSourceStatus { source:OrchestrationSource;ok:boolean;offline?:boolean;error?:string }
export interface OrchestrationSnapshot { nodes:OrchestrationNode[];edges:OrchestrationEdge[];sources:OrchestrationSourceStatus[];generatedAt:string }
export interface OrchestrationInputs { cloudTasks?:Record<string,unknown>[];a2aTasks?:Record<string,unknown>[];conductorTasks?:Record<string,unknown>[];combos?:Record<string,unknown>[];sources:OrchestrationSourceStatus[] }
export const MAX_WORK_NODES=40;
const TERMINAL=new Set<OrchestrationState>(["succeeded","failed","cancelled"]);

function state(value:unknown):OrchestrationState {
  const v=String(value??"").toLowerCase();
  if(["running","working","in_progress","processing"].includes(v))return "running";
  if(["queued","pending","submitted","idle"].includes(v))return "queued";
  if(["waiting_approval","input_required","auth_required"].includes(v))return "waiting_approval";
  if(["completed","complete","succeeded","success","healthy"].includes(v))return "succeeded";
  if(["failed","error","degraded"].includes(v))return "failed";
  return "cancelled";
}
function text(row:Record<string,unknown>,...keys:string[]){for(const key of keys)if(typeof row[key]==="string"&&row[key])return String(row[key]);return undefined;}
function sourcePart(source:OrchestrationSource,rows:Record<string,unknown>[],label:string){
  const sourceId=`source:${source}`; const nodes:OrchestrationNode[]=[{id:sourceId,kind:"source",source,label}]; const edges:OrchestrationEdge[]=[];
  rows.forEach((row,index)=>{const rawId=text(row,"id","taskId","externalId")??String(index);const s=state(row.state??row.status);const input=(row.input&&typeof row.input==="object"?row.input:{}) as Record<string,unknown>;const metadata=(row.metadata&&typeof row.metadata==="object"?row.metadata:{}) as Record<string,unknown>;const conductor=(metadata.conductor&&typeof metadata.conductor==="object"?metadata.conductor:{}) as Record<string,unknown>;const id=`${source}:${rawId}`;nodes.push({id,kind:"work",source,state:s,label:text(row,"name","mode","summary")??text(input,"skill")??rawId,sublabel:text(row,"providerId","provider_id","model"),updatedAt:text(row,"updatedAt","updated_at","createdAt","created_at"),endedAt:TERMINAL.has(s)?text(row,"updatedAt","updated_at","endedAt","completedAt"):undefined,raw:{...row,__conductorTaskId:text(conductor,"task_id")}});edges.push({id:`e:${sourceId}:${id}`,from:sourceId,to:id,kind:"owns",active:s==="running"});});return {nodes,edges};
}
function routingPart(rows:Record<string,unknown>[]){return sourcePart("routing",rows.map((row)=>({...row,id:row.id??row.name,status:row.enabled===false?"cancelled":"queued",name:row.name??row.id})),"Routing");}

export function buildOrchestrationSnapshot(input:OrchestrationInputs,now=Date.now(),showCompleted=false):OrchestrationSnapshot {
  const parts=[sourcePart("cloud-agent",input.cloudTasks??[],"Cloud Agents"),sourcePart("a2a",input.a2aTasks??[],"A2A"),sourcePart("conductor",input.conductorTasks??[],"Conductor"),routingPart(input.combos??[])];
  let nodes=parts.flatMap(x=>x.nodes);let edges=parts.flatMap(x=>x.edges);const conductorIds=new Set((input.conductorTasks??[]).map(x=>text(x,"id","taskId")).filter(Boolean));const dropped=new Set<string>();
  for(const node of nodes){if(node.source!=="a2a"||node.kind!=="work")continue;const mirror=node.raw?.__conductorTaskId;if(typeof mirror==="string"&&conductorIds.has(mirror)){dropped.add(node.id);edges.push({id:`e:mirror:${mirror}`,from:`conductor:${mirror}`,to:"source:a2a",kind:"mirror",active:false});}}
  if(!showCompleted)for(const node of nodes)if(node.kind==="work"&&node.state&&TERMINAL.has(node.state)&&node.endedAt&&now-Date.parse(node.endedAt)>600_000)dropped.add(node.id);
  nodes=nodes.filter(x=>!dropped.has(x.id));edges=edges.filter(x=>!dropped.has(x.from)&&!dropped.has(x.to));const work=nodes.filter(x=>x.kind==="work");
  if(work.length>MAX_WORK_NODES){const keep=new Set(work.sort((a,b)=>Date.parse(b.updatedAt??"0")-Date.parse(a.updatedAt??"0")).slice(0,MAX_WORK_NODES).map(x=>x.id));for(const source of ["cloud-agent","a2a","conductor","routing"] as const){const excess=work.filter(x=>x.source===source&&!keep.has(x.id));if(!excess.length)continue;const counts:Partial<Record<OrchestrationState,number>>={};excess.forEach(x=>{if(x.state)counts[x.state]=(counts[x.state]??0)+1;dropped.add(x.id)});const id=`overflow:${source}`;nodes.push({id,kind:"overflow",source,label:`+${excess.length} more`,droppedByState:counts});edges.push({id:`e:source:${source}:overflow`,from:`source:${source}`,to:id,kind:"owns",active:false});}nodes=nodes.filter(x=>!dropped.has(x.id));edges=edges.filter(x=>!dropped.has(x.from)&&!dropped.has(x.to));}
  const present=new Set(nodes.filter(x=>x.kind==="source").map(x=>x.source));for(const status of input.sources)if((!status.ok||status.offline)&&!present.has(status.source))nodes.push({id:`source:${status.source}`,kind:"source",source:status.source,label:status.source,sublabel:status.offline?"offline":"error"});
  nodes.unshift({id:"orchestrator",kind:"orchestrator",label:"Orbit"});for(const node of nodes.filter(x=>x.kind==="source"))edges.push({id:`e:root:${node.id}`,from:"orchestrator",to:node.id,kind:"owns",active:false});return {nodes,edges,sources:input.sources,generatedAt:new Date(now).toISOString()};
}

export function projectOverview(snapshot:OrchestrationSnapshot){const counts:Record<OrchestrationState,number>={queued:0,running:0,waiting_approval:0,succeeded:0,failed:0,cancelled:0};for(const node of snapshot.nodes){if(node.kind==="work"&&node.state)counts[node.state]++;if(node.kind==="overflow")for(const [key,value] of Object.entries(node.droppedByState??{}))counts[key as OrchestrationState]+=value??0;}return counts;}
