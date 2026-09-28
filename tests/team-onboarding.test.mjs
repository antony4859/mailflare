import assert from 'node:assert/strict';
import test from 'node:test';
import { DatabaseSync } from 'node:sqlite';
import { readFile, readdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';

test('invitations expire after 48 hours; manual self replies stay threaded and drafts stay private', async () => {
 const output=join(process.cwd(),'node_modules/.mailflare-onboarding-test.mjs');
 const sqlite=new DatabaseSync(':memory:');
 const sent=[];
 try {
  globalThis.invitationSend=input=>{sent.push(input);return true;};
  await build({stdin:{contents:`export {sendTeamInvitation} from './src/lib/auth/team-invitation';export {completePasswordReset} from './src/lib/auth/password-reset';export {runEmailTool} from './src/lib/agent/tools';export {getMessageThreadForUser} from './src/lib/email/thread-view';`,resolveDir:process.cwd()},outfile:output,bundle:true,platform:'node',format:'esm',packages:'external',plugins:[{name:'system-mail-fixture',setup(build){build.onResolve({filter:/^@\/lib\/email\/system-mail$/},()=>({path:'system-mail',namespace:'fixture'}));build.onLoad({filter:/.*/,namespace:'fixture'},()=>({contents:'export async function sendSystemEmail(env,input){return globalThis.invitationSend(input);}'}));}}]});
  const {sendTeamInvitation,completePasswordReset,runEmailTool,getMessageThreadForUser}=await import(pathToFileURL(output).href);
  for(const file of (await readdir('drizzle/migrations')).filter(x=>x.endsWith('.sql')).sort()) sqlite.exec(await readFile(join('drizzle/migrations',file),'utf8'));
  sqlite.exec(`INSERT INTO users(id,email,password_hash,name,role,created_at) VALUES ('owner','owner@example.com','x','Owner','admin',1),('member','member@example.com','x','Member','user',1);
   UPDATE users SET created_by_user_id='owner' WHERE id='member';
   INSERT INTO domains(id,user_id,hostname,zone_id,created_at) VALUES ('d','owner','example.com','z',1);
   INSERT INTO mailboxes(id,user_id,domain_id,local_part,created_at) VALUES ('m','owner','d','owner',1);
   INSERT INTO messages(id,user_id,mailbox_id,direction,from_addr,to_addr,subject,text_body,status,thread_id,provider_message_id,created_at) VALUES ('email','owner','m','inbound','owner@example.com','owner@example.com','Setup check','Test','received','thread','test@example.com',1);`);
  const DB={prepare(sql){let params=[];return {bind(...p){params=p;return this;},async raw(){const stmt=sqlite.prepare(sql);stmt.setReturnArrays(true);return stmt.all(...params);},async all(){return {results:sqlite.prepare(sql).all(...params)};},async run(){return sqlite.prepare(sql).run(...params);}};}};
  const env={DB,APP_URL:'https://mail.example.com'};
  await assert.rejects(()=>sendTeamInvitation(env,'member','owner','bad@example.com'));
  assert.equal(sent.length,0);
  const before=Date.now();
  const result=await sendTeamInvitation(env,'owner','member','member@old.example');
  assert.ok(Date.parse(result.expiresAt)-before>=48*60*60*1000);
  const token=new URL(sent[0].text.match(/https:\/\/[^\s]+reset-password[^\s]+/)[0]).searchParams.get('token');
  assert.ok(!JSON.stringify(sqlite.prepare('SELECT * FROM password_reset_tokens').all()).includes(token));
  const request=new Request('https://mail.example.com/api/auth/password-reset/confirm');
  sqlite.exec('UPDATE password_reset_tokens SET expires_at=1');
  assert.equal((await completePasswordReset(env,token,'Test-password-123',request)).ok,false);
  await sendTeamInvitation(env,'owner','member','member@old.example');
  const fresh=new URL(sent[1].text.match(/https:\/\/[^\s]+reset-password[^\s]+/)[0]).searchParams.get('token');
  assert.equal((await completePasswordReset(env,fresh,'Test-password-123',request)).ok,true);
  assert.equal((await completePasswordReset(env,fresh,'Test-password-456',request)).ok,false);
  const user={id:'owner',role:'admin'};const context={env,mailboxId:'m',user,origin:'chat'};
  await assert.rejects(()=>runEmailTool({...context,origin:'auto'},'draft_reply',{emailId:'email',body:'Received'}),/Cannot draft a reply/);
  const draft=await runEmailTool(context,'draft_reply',{emailId:'email',body:'Received'});
  const row=sqlite.prepare('SELECT thread_id,in_reply_to,status FROM messages WHERE id=?').get(draft.draftId);
  assert.equal(row.thread_id,'thread');assert.equal(row.in_reply_to,'test@example.com');assert.equal(row.status,'draft');
  assert.equal((await getMessageThreadForUser(env,user,'email')).drafts[0].id,draft.draftId);
  assert.equal(await getMessageThreadForUser(env,{id:'member',role:'user'},'email'),null);
  sqlite.exec("UPDATE mailboxes SET type='shared' WHERE id='m'; INSERT INTO mailbox_access(id,mailbox_id,user_id,permission,created_at) VALUES ('share','m','member','read_only',1)");
  assert.equal((await getMessageThreadForUser(env,{id:'member',role:'user'},'email')).drafts.length,0);
 } finally {delete globalThis.invitationSend;sqlite.close();await rm(output,{force:true});}
});
