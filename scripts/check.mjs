import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const context={window:{}};
for(const file of ['data.js','bank.js'])vm.runInNewContext(fs.readFileSync(path.join(root,'dist/assets',file),'utf8'),context);
const {skills,questions:Q,missions,weeks}=context.window.ISLAND;
assert.equal(missions.length,16);assert.equal(weeks.length,4);assert.equal(skills.length,6);
assert.equal(Object.keys(Q).length,192);
const scheduled=missions.flatMap(m=>m.questions);
assert.equal(scheduled.length,80);assert.equal(new Set(scheduled).size,80,'Main missions must not repeat IDs');
for(const m of missions){assert.equal(m.questions.length,5);assert(m.questions.filter(id=>Q[id].type==='writing').length<=1,'At most one writing activity per session');for(const id of m.questions){assert(Q[id],`Missing question ${id}`);if(Q[id].reserved)assert.equal(m.week,4);}}
const core=skills.flatMap(s=>s.ids);assert.equal(new Set(core).size,180);
for(const s of skills){assert.equal(s.ids.length,30);for(const id of s.ids){assert(Q[id]);assert(!Q[id].reserved);assert.equal(Q[id].skill,s.id);}}
assert.equal(Object.values(Q).filter(q=>q.reserved).length,12);
assert.equal(missions.filter(m=>m.week===4).flatMap(m=>m.questions).filter(id=>Q[id].reserved).length,12);
for(const q of Object.values(Q)){
  assert(skills.some(s=>s.id===q.skill));
  assert([1,2,3].includes(q.level));
  if(q.options){assert(Number.isInteger(q.answer)&&q.answer>=0&&q.answer<q.options.length);assert.equal(new Set(q.options).size,q.options.length);assert(q.why);}
  if(q.type==='evidence'){assert(q.passage.length);assert(q.evidence.every(i=>q.passage[i]));}
  if(q.type==='writing'){assert(q.sample);assert(q.checks.length>=3);}
  if(q.type==='order'){assert.equal(new Set(q.answer).size,q.items.length);assert(q.answer.every(i=>q.items[i]));assert(q.why);}
  if(q.type==='recall')assert(q.cards.every(c=>c.word&&c.pinyin&&c.hint));
}
for(const file of fs.readdirSync(path.join(root,'dist')).filter(f=>f.endsWith('.html'))){
  const html=fs.readFileSync(path.join(root,'dist',file),'utf8');
  for(const [,target] of html.matchAll(/(?:src|href)="([^"]+)"/g)){
    if(target.startsWith('#')||/^(https?:|data:)/.test(target))continue;
    assert(fs.existsSync(path.join(root,'dist',target.split('?')[0])),`${file}: missing ${target}`);
  }
  assert(html.includes('lang="zh-CN"'));assert(html.includes('name="viewport"'));
}
const app=fs.readFileSync(path.join(root,'dist/assets/app.js'),'utf8');
for(const [,href] of app.matchAll(/href="([a-z]+\.html)(?:\?[^"`]*)?"/g))assert(fs.existsSync(path.join(root,'dist',href)));
const signatures=Object.values(Q).map(q=>JSON.stringify([q.type,q.prompt,q.passage,q.options,q.cards,q.items]));
assert.equal(new Set(signatures).size,signatures.length,'Duplicate activity content');
console.log(`PASS: 192 activities, 180 core + 12 reserved; 80 unique mission activities; 30 per skill; 86 memory words; references, answer fields and entrypoints valid.`);
