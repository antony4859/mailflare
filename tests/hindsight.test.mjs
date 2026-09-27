import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { mkdtemp,rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

test('Hindsight is opt-in, uses only the configured shared bank, and uses MCP with bounded responses',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'hindsight-test-'));
 const original=globalThis.fetch;
 try {
  const output=join(dir,'mcp.mjs');
  await build({entryPoints:['src/lib/agent/hindsight.ts'],outfile:output,bundle:true,platform:'node',format:'esm'});
  const {callHindsight,hindsightBankId}=await import(pathToFileURL(output).href);
  const requests=[];
  globalThis.fetch=async(url,options)=>{
   const request=JSON.parse(options.body);requests.push({url,request,headers:options.headers});
   const result=request.method==='initialize'?{protocolVersion:'2024-11-05'}:{content:[{type:'text',text:'{"results":[]}'}]};
   return new Response(JSON.stringify({jsonrpc:'2.0',id:request.id,result}),{headers:{'Content-Type':'application/json'}});
  };
  const env={HINDSIGHT_MCP_URL:'https://memory.example.com/mcp',HINDSIGHT_API_KEY:'test-only'};
  await assert.rejects(()=>callHindsight(env,'mailbox-a','recall',{query:'hi'},{read:false,write:false}),/disabled/);
  assert.equal(requests.length,0);
  await callHindsight(env,'mailbox-a','recall',{query:'hi'},{read:true,write:false});
  assert.ok(requests.every(x=>x.url.endsWith('/'+hindsightBankId()+'/')));
  assert.equal(requests.at(-1).request.params.name,'recall');
  assert.equal(hindsightBankId(),'zimo-workspace');
  await assert.rejects(()=>callHindsight(env,'mailbox-a','retain',{content:'hi'},{read:true,write:false}),/disabled/);
  globalThis.fetch=async()=>new Response(JSON.stringify({error:{code:-1,message:'SECRET INTERNAL DETAIL'}}));
  await assert.rejects(()=>callHindsight(env,'mailbox-a','recall',{query:'hi'},{read:true,write:false}),/Hindsight request failed/);
 }finally{globalThis.fetch=original;await rm(dir,{recursive:true,force:true});}
});
