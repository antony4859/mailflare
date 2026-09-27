import assert from 'node:assert/strict';
import test from 'node:test';
import { DatabaseSync } from 'node:sqlite';
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';

test('current migrations export successfully while unknown tables still fail coverage', async () => {
 const directory = await mkdtemp(join(tmpdir(), 'mailflare-backup-'));
 const db = new DatabaseSync(':memory:');
 try {
  const output = join(directory, 'export.mjs');
  await build({entryPoints:['src/lib/backups/export.ts'],outfile:output,bundle:true,platform:'node',format:'esm'});
  const { exportDatabaseRecords, restoreDatabaseRecords } = await import(pathToFileURL(output).href);
  for (const file of (await readdir('drizzle/migrations')).filter(name=>name.endsWith('.sql')).sort()) db.exec(await readFile(join('drizzle/migrations',file),'utf8'));
  db.exec("INSERT INTO users (id,email,password_hash,name,created_at) VALUES ('u','u@example.com','x','U',1); INSERT INTO domains (id,user_id,hostname,zone_id,created_at) VALUES ('d','u','example.com','z',1); INSERT INTO mailboxes (id,user_id,domain_id,local_part,created_at) VALUES ('m','u','d','u',1); INSERT INTO messages (id,user_id,mailbox_id,direction,from_addr,to_addr,subject,created_at) VALUES ('msg','u','m','inbound','a@example.com','u@example.com','Restore me',1)");
  const adapter = {prepare(sql) { let values=[]; return {bind(...args) { values=args;return this; },async all() { return {results:db.prepare(sql).all(...values)}; },async run() { return db.prepare(sql).run(...values); }}; },async batch(statements) { return Promise.all(statements.map(statement=>statement.run())); }};
  const document = JSON.parse(new TextDecoder().decode(await exportDatabaseRecords(adapter)));
  assert.equal(document.format,'mailflare-database-backup');
  assert.ok(Array.isArray(document.tables.messages));
  assert.ok(Array.isArray(document.tables.users));
  const before = db.prepare("SELECT revision FROM jmap_mailbox_revisions WHERE mailbox_id='m'").get().revision;
  const encoded = new TextEncoder().encode(JSON.stringify(document));
  await restoreDatabaseRecords(adapter,encoded.buffer);
  assert.equal(db.prepare("SELECT subject FROM messages WHERE id='msg'").get().subject,'Restore me');
  assert.ok(db.prepare("SELECT revision FROM jmap_mailbox_revisions WHERE mailbox_id='m'").get().revision > before);
  db.exec('CREATE TABLE unknown_business_data (id TEXT)');
  await assert.rejects(()=>exportDatabaseRecords(adapter),/unknown_business_data/);
 } finally {
  db.close();
  await rm(directory,{recursive:true,force:true});
 }
});
