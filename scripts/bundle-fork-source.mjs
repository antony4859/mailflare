import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, copyFileSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

const root = process.cwd();
const staging = mkdtempSync(join(tmpdir(), 'mailflare-source-'));
try {
 const files = execFileSync('git', ['ls-files', '-z'], {encoding:'utf8'}).split('\0').filter(Boolean);
 const additions = ['FORK.md', 'scripts/bundle-fork-source.mjs', 'tests/team-fork.test.mjs', 'tests/backup-schema-coverage.test.mjs'];
 for (const file of new Set([...files, ...additions])) {
  if (/\.(mp4|wav)$/.test(file) || file.startsWith('public/source/') || ['DEPLOYMENT-STATUS.md', 'PILOT-REVIEW.md'].includes(file) || file.startsWith('pilot-review/')) continue;
  const source = file === 'wrangler.jsonc' ? 'wrangler.jsonc.example' : file;
  if (!existsSync(join(root,source))) continue;
  const destination = join(staging,'mailflare-zimo',file);
  mkdirSync(dirname(destination),{recursive:true});
  copyFileSync(join(root,source),destination);
 }
 mkdirSync(join(root,'public/source'),{recursive:true});
 execFileSync('tar',['-czf',join(root,'public/source/mailflare-zimo.tar.gz'),'-C',staging,'mailflare-zimo']);
 console.log('Built public/source/mailflare-zimo.tar.gz from current source.');
} finally {rmSync(staging,{recursive:true,force:true});}
