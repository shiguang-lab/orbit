import { spawn, type ChildProcess } from "node:child_process";
import { createServer } from "node:net";

let shared: { child: ChildProcess | null; endpoint: string } | null = null;
let starting: Promise<typeof shared> | null = null;
const enabled = () => !["off", "0", "false"].includes((process.env.ORBIT_BROWSER_POOL || "on").toLowerCase());
const freePort = () => new Promise<number>((resolve, reject) => { const server = createServer(); server.once("error", reject); server.listen(0,"127.0.0.1",()=>{ const addr=server.address(); server.close(()=>typeof addr === "object" && addr ? resolve(addr.port) : reject(new Error("No free port"))); }); });
async function binary() { if (process.env.OBSCURA_BIN) return process.env.OBSCURA_BIN; const { access } = await import("node:fs/promises"); for (const dir of (process.env.PATH || "").split(":")) { const path = `${dir}/obscura`; try { await access(path); return path; } catch {} } return null; }
async function ready(endpoint: string) { for (let i=0;i<120;i++) { try { const r=await fetch(`${endpoint}/json/version`,{signal:AbortSignal.timeout(1000)}); if(r.ok)return true; } catch {} await new Promise((r)=>setTimeout(r,250)); } return false; }
export async function ensureObscuraServer() {
  if (!enabled()) return null; if (shared) return shared; if (starting) return starting;
  starting = (async () => { if (process.env.OBSCURA_CDP_ENDPOINT) return shared={child:null,endpoint:process.env.OBSCURA_CDP_ENDPOINT}; const bin=await binary(); if(!bin)return null; const port=Number(process.env.OBSCURA_PORT)||await freePort(); const child=spawn(bin,["serve","--port",String(port),"--host","127.0.0.1"],{stdio:["ignore","ignore","ignore"]}); const endpoint=`http://127.0.0.1:${port}`; if(!await ready(endpoint)){child.kill("SIGKILL");return null;} return shared={child,endpoint}; })();
  try { return await starting; } finally { starting=null; }
}
export async function connectObscuraBrowser() { const server=await ensureObscuraServer(); if(!server)return null; try { const {chromium}=await import("playwright"); return {browser:await chromium.connectOverCDP(server.endpoint),child:server.child}; } catch { return null; } }
