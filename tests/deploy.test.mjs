import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
function fixture(t){
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'nuonuo-deploy-test-'));
  t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
  for(const name of ['dist','scripts','tests/fixtures'])fs.cpSync(path.join(root,name),path.join(dir,name),{recursive:true});
  const cli=path.join(dir,'node_modules/.bin/edgeone');fs.mkdirSync(path.dirname(cli),{recursive:true});
  fs.writeFileSync(cli,`#!/usr/bin/env node
const fs=require('node:fs'),path=require('node:path');
const args=process.argv.slice(2);
if(args.includes('--help')){
  if(process.env.MOCK_OLD==='1'&&args[0]==='makers')process.exit(1);
  console.log('--area --skip-ai-gateway-sync');process.exit(0);
}
const directory=args[2];
const files=fs.readdirSync(directory,{recursive:true}).filter(f=>fs.statSync(path.join(directory,f)).isFile());
fs.writeFileSync(process.env.MOCK_LOG,JSON.stringify({args,files,directory,token:process.env.EDGEONE_PAGES_API_TOKEN,region:process.env.EDGEONE_PAGES_API_REGION}));
process.exit(Number(process.env.MOCK_FAILURE||0));
`);fs.chmodSync(cli,0o755);
  const log=path.join(dir,'call.json');
  return {dir,log,run:(args=[],env={})=>spawnSync('bash',['scripts/deploy-edgeone.sh',...args],{cwd:dir,encoding:'utf8',env:{...process.env,CI:'false',EDGEONE_API_TOKEN:'',EDGEONE_PROJECT_NAME:'',EDGEONE_SITE:'',EDGEONE_AREA:'',MOCK_LOG:log,...env}})};
}

test('dry-run performs checks but never invokes the CLI',t=>{
  const f=fixture(t),result=f.run();assert.equal(result.status,0,result.stderr);assert(!fs.existsSync(f.log));
});
test('CI deploys only static assets to the new mainland-enabled project with an environment-only token',t=>{
  const f=fixture(t),token='fake-test-token-not-a-real-credential';
  const result=f.run(['--publish'],{CI:'true',EDGEONE_API_TOKEN:token});assert.equal(result.status,0,result.stderr);
  const call=JSON.parse(fs.readFileSync(f.log,'utf8'));
  assert.equal(call.token,token);assert.equal(call.region,'china');assert(!call.args.includes(token));
  assert.deepEqual(call.args.slice(3),['-n','nuonuo-language-island-cn','-e','production','--area','global','--skip-ai-gateway-sync']);
  assert.equal(call.files.length,15);assert(call.files.includes('assets/bank.js'));assert(call.files.includes('library.html'));assert(call.files.includes('curriculum.html'));assert(call.files.includes('assets/curriculum-data.js'));assert(call.files.includes('assets/curriculum.js'));
  assert(!call.files.some(f=>f.endsWith('.pdf')||f.includes('.env')||f.includes('.git')));
  assert(!result.stdout.includes(token));assert(!fs.existsSync(call.directory));
});
test('CI without token fails before any deployment',t=>{
  const f=fixture(t),result=f.run(['--publish'],{CI:'true'});assert.notEqual(result.status,0);assert(!fs.existsSync(f.log));assert(result.stderr.includes('EDGEONE_API_TOKEN'));
});
test('configuration overrides and the transitional namespace work',t=>{
  const f=fixture(t),result=f.run(['--publish'],{MOCK_OLD:'1',EDGEONE_PROJECT_NAME:'another-project',EDGEONE_SITE:'global',EDGEONE_AREA:'global',EDGEONE_ENV:'preview'});
  assert.equal(result.status,0,result.stderr);const call=JSON.parse(fs.readFileSync(f.log,'utf8'));
  assert.equal(call.args[0],'pages');assert.equal(call.region,'global');assert(call.args.includes('preview'));assert(call.args.includes('another-project'));
});
test('CLI failures retain their exit status and clean the staging directory',t=>{
  const f=fixture(t),result=f.run(['--publish'],{MOCK_FAILURE:'7'});assert.equal(result.status,7);const call=JSON.parse(fs.readFileSync(f.log,'utf8'));assert(!fs.existsSync(call.directory));
});
test('unexpected files and symlinks never enter deployment',t=>{
  const f=fixture(t);fs.writeFileSync(path.join(f.dir,'dist/private.pdf'),'do not upload');assert.notEqual(f.run(['--publish']).status,0);assert(!fs.existsSync(f.log));
  fs.unlinkSync(path.join(f.dir,'dist/private.pdf'));fs.symlinkSync('/not/a/real/file',path.join(f.dir,'dist/assets/unsafe.js'));assert.notEqual(f.run(['--publish']).status,0);assert(!fs.existsSync(f.log));
});
test('invalid options fail locally',t=>{
  const f=fixture(t);for(const args of [['--project','bad name'],['--env','bad'],['--site','bad'],['--area','bad'],['--project'],['--unknown']])assert.notEqual(f.run(args).status,0);
  assert(!fs.existsSync(f.log));
});
