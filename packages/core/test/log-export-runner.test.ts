import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { z } from "zod";

const testDataDir=fs.mkdtempSync(path.join(os.tmpdir(),"orbit-log-runner-"));
process.env.DATA_DIR=testDataDir;
const core=await import("../src/lib/db/core.js");
const db=await import("../src/lib/db/logExportDestinations.js");
const registry=await import("../src/lib/logExport/registry.js");
const runner=await import("../src/lib/logExport/runner.js");
const received: string[]=[];

registry.__registerLogExportDestinationTypeForTest({
  id:"test",label:"Test",description:"Test",secretFields:[],fields:[],configSchema:z.object({}),
  createClient:()=>({test:async()=>({ok:true,detail:"ok"}),prepare:async()=>{},send:async(records)=>{received.push(...records.map((r)=>r.id));}}),
});

test.after(()=>{registry.__resetLogExportDestinationTypesForTest();core.resetDbInstance();fs.rmSync(testDataDir,{recursive:true,force:true});});

test("runner exports rows in rowid order and advances only accepted batches",async()=>{
  const database=core.getDbInstance();
  for (const id of ["a","b","c"]) database.prepare("INSERT INTO call_logs (id,timestamp,status) VALUES (?,?,?)").run(id,new Date().toISOString(),200);
  const destination=db.createLogExportDestination({name:"sink",type:"test",enabled:true,config:{},batchSize:2,maxRowsPerRun:10});
  const result=await runner.runDestinationExport(destination);
  assert.deepEqual(received,["a","b","c"]);
  assert.equal(result.exported,3);assert.equal(result.batches,2);assert.equal(result.pendingAfterRun,0);
  assert.equal(db.getLogExportDestination(destination.id)?.cursorRowId,3);
});

test("runner leaves the cursor unchanged when destination rejects a batch",async()=>{
  registry.__registerLogExportDestinationTypeForTest({
    id:"fail",label:"Fail",description:"Fail",secretFields:[],fields:[],configSchema:z.object({}),
    createClient:()=>({test:async()=>({ok:true,detail:"ok"}),prepare:async()=>{},send:async()=>{throw new Error("secret-token failure");}}),
  });
  const destination=db.createLogExportDestination({name:"fail",type:"fail",enabled:true,config:{}});
  const result=await runner.runDestinationExport(destination);
  assert.equal(result.success,false);assert.equal(result.cursorRowId,0);
  assert.equal(db.getLogExportDestination(destination.id)?.cursorRowId,0);
});
