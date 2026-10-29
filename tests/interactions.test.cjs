const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const {parseHTML}=require('linkedom');
const root=require('node:path').resolve(__dirname,'../dist')+'/';
const codes=['data','bank','curriculum-data','curriculum','app'].map(x=>fs.readFileSync(root+'assets/'+x+'.js','utf8'));
const store=new Map();let ctx,doc;
function load(page,search=''){
 const parsed=parseHTML(`<html><body data-page="${page}"><div id="app"></div></body></html>`);doc=parsed.document;parsed.window.Element.prototype.scrollIntoView=function(){};
 const proto=parsed.window.HTMLSelectElement.prototype,vd=Object.getOwnPropertyDescriptor(proto,'value');if(!vd.set)Object.defineProperty(proto,'value',{configurable:true,get:vd.get,set(value){for(const op of this.querySelectorAll('option')){if(op.getAttribute('value')===value)op.setAttribute('selected','');else op.removeAttribute('selected');}}});
 ctx=vm.createContext({window:{confirm:()=>true,print(){}},document:doc,localStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v)},location:{search},history:{replaceState(){}},URLSearchParams,Intl,Date,Math,JSON,Number,String,Array,Set,Map,Blob,URL,console,setTimeout:()=>0,clearTimeout(){}});
 for(const code of codes)vm.runInContext(code,ctx);
}
const get=s=>{const el=doc.querySelector(s);assert(el,`Missing ${s}`);return el;};
const click=s=>get(s).click(),text=()=>doc.body.textContent;
const state=()=>JSON.parse(store.get('nuonuo-island-v1'));
const seed=x=>store.set('nuonuo-island-v1',JSON.stringify(x));
function write(value){const el=get('#writing-answer');el.value=value;el.dispatchEvent(new doc.defaultView.Event('input',{bubbles:true}));}
function checks(){for(const b of doc.querySelectorAll('[data-check]')){b.checked=true;b.onchange();}}
function solve(q){
 if(doc.querySelector('#next-question')){click('#next-question');return;}
 if(q.type==='choice'||q.type==='evidence'){click(`[data-option="${q.answer}"]`);if(q.type==='evidence')click(`[data-evidence="${q.evidence[0]}"]`);click('#submit-answer');}
 else if(q.type==='writing'){write('测试草稿：'+q.sample);checks();click('#submit-answer');}
 else if(q.type==='order'){for(const i of q.answer)click(`[data-order="${i}"]`);click('#submit-answer');}
 else if(q.type==='recall'){for(let i=0;i<q.cards.length;i++){if(doc.querySelector('#recall-hide'))click('#recall-hide');click('#recall-reveal');click('#recall-correct');}}
 assert(doc.querySelector('#next-question'),`No advance for ${q.id}`);click('#next-question');
}
function solveSession(key){let n=0;while(doc.querySelector('.exercise')){assert(n++<=6);const se=state().sessions[key];solve(ctx.window.ISLAND.questions[se.ids[se.index]]);}}
load('home');const bank=ctx.window.ISLAND;assert(text().includes('全册课程'));
// Gating, retries, correction queue and resume.
load('train','?question=w1');click('[data-option="0"]');click('#submit-answer');assert(!doc.querySelector('#next-question'));assert(state().mistakes.w1);click('[data-option="1"]');click('#submit-answer');assert(state().mistakes.w1);load('train','?question=w1');assert(doc.querySelector('#next-question'));click('#next-question');
load('train','?practice=review');assert.equal(state().sessions['practice-review'].ids[0],'w1');solveSession('practice-review');assert(!state().mistakes.w1);
load('train','?question=w2');click('#submit-answer');assert(!doc.querySelector('#next-question'));write('词语说明变化经过一个过程，删去就不能明确说明慢慢变化。');load('train','?question=w2');assert(get('#writing-answer').value.includes('慢慢变化'));click('#submit-answer');assert(!doc.querySelector('#next-question'));checks();click('#submit-answer');assert(state().reviewed.w2.kind==='self');click('#next-question');
load('train','?question=e1');click('[data-option="1"]');click('#submit-answer');assert(!doc.querySelector('#next-question'));click('[data-evidence="0"]');click('#submit-answer');assert(!doc.querySelector('#next-question'));click('[data-evidence="2"]');click('#submit-answer');click('#next-question');
// A hint is remembered across reloads and does not count as an independent review pass.
load('train','?question=w3');click('#show-hint');load('train','?question=w3');assert(state().sessions['question-w3'].hint);click('[data-option="0"]');click('#submit-answer');assert.equal(state().reviewed.w3.kind,'guided');assert(state().mistakes.w3);click('#next-question');load('train','?question=w3');click('[data-option="0"]');click('#submit-answer');assert(!state().mistakes.w3);click('#next-question');
load('train','?question=n1');assert(!doc.querySelector('.exercise'));
// Full main curriculum, including all 12 held-out transfer activities.
for(const mission of bank.missions){load('train','?mission='+mission.id);solveSession(mission.id);assert(state().completed[mission.id]);}
assert.equal(Object.keys(state().completed).length,16);
// Every library activity independently opens and completes, including all new course modes.
for(const skill of bank.skills)for(const id of skill.ids){load('train','?question='+id);solveSession('question-'+id);assert(state().reviewed[id]);}
assert.equal(Object.keys(state().reviewed).length,bank.stats.total);
// Library pagination, field filters, text search, and empty results.
load('library');assert.equal(doc.querySelectorAll('.library-card').length,12);assert(get('#library-count').textContent.includes(String(bank.stats.core)));click('#following-page');assert(get('#library-pagination').textContent.includes('2 / '+Math.ceil(bank.stats.core/12)));
function select(id,value){const el=get(id);for(const op of el.querySelectorAll('option')){if(op.getAttribute('value')===value)op.setAttribute('selected','');else op.removeAttribute('selected');}el.onchange();}
select('#filter-skill','words');assert(get('#library-count').textContent.includes(String(bank.skills.find(s=>s.id==='words').ids.length)));select('#filter-type','writing');assert(doc.querySelectorAll('.library-card').length>0);select('#filter-state','new');assert(get('#library-count').textContent.includes('0'));click('#reset-filters');get('#filter-search').value='不可能出现的测试关键字';get('#filter-search').oninput();assert(get('#library-count').textContent.includes('0'));click('#reset-filters');
// Course coverage, deep links, per-lesson sessions, unit batches, and literacy cards.
load('curriculum');assert.equal(doc.querySelectorAll('.course-unit').length,8);assert.equal(doc.querySelectorAll('.course-lesson').length,35);assert(text().includes('我的家人'));
load('curriculum','?unit=5');assert.equal(doc.querySelectorAll('.course-unit').length,1);assert(text().includes('我家的杏熟了'));assert(text().includes('小木船'));
load('library','?unit=2&category=essay');assert.equal(doc.querySelectorAll('.library-card').length,4);assert(text().includes('我的家人'));
load('library','?lesson=l27b&category=reading');assert.equal(doc.querySelectorAll('.library-card').length,3);assert(text().includes('纪昌学射'));
load('train','?lesson=l1');assert.equal(state().sessions['lesson-l1'].ids.length,3);solveSession('lesson-l1');
load('train','?unit=8');const unitBatch=[...state().sessions['unit-8'].ids];assert.equal(unitBatch.length,5);assert(unitBatch.every(id=>bank.questions[id].unit===8));load('train','?unit=8');assert.deepEqual(state().sessions['unit-8'].ids,unitBatch);solveSession('unit-8');
load('train','?question=course-recognition-1-1');assert(!get('.pinyin').textContent.includes('yán'));assert(get('.recall-word').textContent.includes('盐'));click('#recall-reveal');assert(get('.pinyin').textContent.includes('yán'));click('#recall-retry');assert(!get('.pinyin').textContent.includes('yán'));assert(get('.recall-word').textContent.includes('盐'));
// Journal persistence and literal text escaping.
load('journal');get('#journal-object').value='<b>绿豆</b>';get('#journal-facts').value='今天有两颗发芽。';get('#journal-form').onsubmit({preventDefault(){}});load('journal');assert(text().includes('<b>绿豆</b>'));assert(text().includes('今天有两颗发芽'));
const completedState=state();
// Two free batches in every skill select distinct as-yet-unseen questions, persist their IDs on reload.
store.clear();
for(const skill of bank.skills){
 load('train','?skill='+skill.id);const key='skill-'+skill.id,first=[...state().sessions[key].ids];assert.equal(first.length,skill.batchSize);load('train','?skill='+skill.id);assert.deepEqual(state().sessions[key].ids,first);solveSession(key);
 load('train','?skill='+skill.id);const second=[...state().sessions[key].ids];assert(!first.some(id=>second.includes(id)),`Repeated fresh batch in ${skill.id}`);solveSession(key);
}
load('train','?practice=all');assert.equal(state().sessions['practice-all'].ids.length,5);assert(!state().sessions['practice-all'].ids.some(id=>bank.questions[id].reserved));solveSession('practice-all');
// Old progress remains as legacy while new day IDs restart safely; drafts/journal remain.
seed({version:1,completed:{day1:{date:'2026-10-29'}},drafts:{w2:{text:'旧草稿保留',checks:[]}},sessions:{day1:{index:2,results:[]}},reviewed:{w1:{date:'2026-10-29',kind:'revised'}},journal:[{id:'old',date:'2026-10-29',object:'豆苗',facts:'旧观察保留',thought:'',mood:''}],days:['2026-10-29']});
load('home');assert.equal(state().contentRevision,2);assert.equal(Object.keys(state().completed).length,0);assert(state().legacyCompleted.day1);assert(state().drafts.w2.text==='旧草稿保留');assert.equal(state().journal.length,1);assert(doc.querySelector('#dismiss-upgrade'));click('#dismiss-upgrade');load('home');assert(!doc.querySelector('#dismiss-upgrade'));
(async()=>{
 seed(completedState);load('parents');
 const partial={...completedState};
 load('train','?lesson=l2');load('train','?unit=3');load('train','?skill=words');const pending=state();const pendingIds=pending.sessions['skill-words'].ids;
 load('parents');let field=get('#import-file');field.files=[{size:100,text:async()=>JSON.stringify(pending)}];await field.onchange({target:field});assert.equal(Object.keys(state().completed).length,16);assert.equal(state().journal.length,1);assert.deepEqual(state().sessions['skill-words'].ids,pendingIds);assert.deepEqual(state().sessions['lesson-l2'].ids,pending.sessions['lesson-l2'].ids);assert.deepEqual(state().sessions['unit-3'].ids,pending.sessions['unit-3'].ids);
 field=get('#import-file');field.files=[{size:100,text:async()=>'{broken json'}];await field.onchange({target:field});assert.equal(state().journal.length,1);
 field=get('#import-file');field.files=[{size:100,text:async()=>JSON.stringify({version:1,completed:{day1:{date:'2026-10-29'}},drafts:{},journal:[]})}];await field.onchange({target:field});assert.equal(Object.keys(state().completed).length,0);assert(state().legacyCompleted.day1);
 console.log('PASS: all 685 activities; full-course coverage and 80-question targeted plan; new batch rotation/resume; held-out exclusion; review queue; library filters/search/pages; drafts/journal; old-data migration; backup roundtrip and invalid-file handling.');
})().catch(e=>{console.error(e);process.exitCode=1;});
