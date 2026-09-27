import assert from 'node:assert/strict';
import test from 'node:test';
import { DatabaseSync } from 'node:sqlite';
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';

test('self-hosted team features preserve mailbox isolation, delegation and forwarding', async () => {
 const directory = await mkdtemp(join(tmpdir(), 'mailflare-team-'));
 const sqlite = new DatabaseSync(':memory:');
 try {
  const output = join(directory, 'team.mjs');
  await build({stdin:{contents:`
   export { createDb } from './src/db/index.ts';
   export { getLicenseEntitlements } from './src/lib/licenses/service.ts';
   export { getMailboxAccessLevel, listAccessibleMailboxIds } from './src/lib/mailboxes/access.ts';
   export { getSharedMailboxForAdmin } from './src/app/api/mailboxes/[id]/access/utils.ts';
   export { getAccountForwardingDestination } from './src/lib/email/account-forwarding.ts';
   export { assertAdmin } from './src/lib/auth/admin.ts';
  `,resolveDir:process.cwd(),loader:'ts'},outfile:output,bundle:true,platform:'node',format:'esm',packages:'external'});
  const source = await readFile(output,'utf8');
  const localOutput = join(process.cwd(), 'node_modules', '.mailflare-team-test.mjs');
  await import('node:fs/promises').then(fs=>fs.writeFile(localOutput,source));
  const api = await import(pathToFileURL(localOutput).href);
  await rm(localOutput);
  for (const file of (await readdir('drizzle/migrations')).filter(name=>name.endsWith('.sql')).sort()) sqlite.exec(await readFile(join('drizzle/migrations',file),'utf8'));
  const adapter = {prepare(sql) {let values=[];return {bind(...args){values=args;return this;},async raw(){const statement=sqlite.prepare(sql);statement.setReturnArrays(true);return statement.all(...values);},async all(){return {results:sqlite.prepare(sql).all(...values)};},async run(){return sqlite.prepare(sql).run(...values);}};}};
  const env={DB:adapter};
  const db=api.createDb(adapter);
  sqlite.exec(`
   INSERT INTO users (id,email,password_hash,name,created_at) VALUES
   ('owner','owner@example.com','x','Owner',1),('leo','leo@example.com','x','Leo',1),('max','max@example.com','x','Max',1),('other','other@example.com','x','Other',1);
   INSERT INTO domains (id,user_id,hostname,zone_id,status,created_at) VALUES ('domain','owner','example.com','z','active',1);
   INSERT INTO mailboxes (id,user_id,domain_id,local_part,type,created_at) VALUES
   ('private','owner','domain','owner','personal',1),('leo-private','leo','domain','leo','personal',1),('shared','owner','domain','hello','shared',1);
   INSERT INTO mailbox_access (id,mailbox_id,user_id,permission,created_by_user_id,created_at) VALUES ('grant','shared','leo','read_only','owner',1);
  `);
  const owner={id:'owner',email:'owner@example.com',role:'admin'};
  const leo={id:'leo',email:'leo@example.com',role:'user'};
  const max={id:'max',email:'max@example.com',role:'user'};
  const entitlements=await api.getLicenseEntitlements(env);
  assert.equal(entitlements.canManageAccounts,true);
  assert.equal(entitlements.canForwardEmail,true);
  assert.equal(entitlements.canCustomizeBranding,true);
  assert.throws(()=>api.assertAdmin(leo),/Forbidden/);
  assert.equal(await api.getMailboxAccessLevel(db,leo,'private'),null);
  assert.equal(await api.getMailboxAccessLevel(db,owner,'leo-private'),null);
  assert.equal(await api.getMailboxAccessLevel(db,max,'shared'),null);
  let access=await api.getMailboxAccessLevel(db,leo,'shared');
  assert.ok(access,'explicit shared mailbox grant works without a paid license');
  assert.equal(access.canRead,true);
  assert.equal(access.canSendAs,false);
  assert.equal(access.canManage,false);
  assert.deepEqual((await api.listAccessibleMailboxIds(db,leo)).sort(),['leo-private','shared']);
  assert.equal(await api.getSharedMailboxForAdmin(db,'shared','other'),null);
  assert.ok(await api.getSharedMailboxForAdmin(db,'shared','owner'));
  sqlite.exec("UPDATE mailbox_access SET permission='send_as' WHERE id='grant'");
  access=await api.getMailboxAccessLevel(db,leo,'shared');
  assert.equal(access.canSendAs,true);
  assert.equal(access.canManage,false);
  sqlite.exec("DELETE FROM mailbox_access WHERE id='grant'");
  assert.equal(await api.getMailboxAccessLevel(db,leo,'shared'),null);
  assert.deepEqual(await api.listAccessibleMailboxIds(db,leo),['leo-private']);
  sqlite.exec("UPDATE mailboxes SET disabled=1 WHERE id='private'");
  assert.equal(await api.getMailboxAccessLevel(db,owner,'private'),null);
  sqlite.exec("UPDATE users SET forwarding_email='destination@example.net' WHERE id='leo'");
  assert.equal(await api.getAccountForwardingDestination(env,'leo@example.com'),'destination@example.net');
  assert.equal(await api.getAccountForwardingDestination(env,'missing@example.com'),null);
  sqlite.exec("UPDATE users SET forwarding_email='leo@example.com' WHERE id='leo'");
  assert.equal(await api.getAccountForwardingDestination(env,'leo@example.com'),null);
 } finally {sqlite.close();await rm(directory,{recursive:true,force:true});}
});
