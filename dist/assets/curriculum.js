/* Expand the audited course inventory into stable, individually addressable activities. */
(() => {
  'use strict';
  const B=window.ISLAND,C=window.CURRICULUM_SOURCE,Q=B.questions;
  const unitFor=n=>n<=4?1:n<=8?2:n<=11?3:n<=15?4:n<=17?5:n<=20?6:n<=24?7:8;
  const lessonFor=key=>C.lessons.find(l=>l.number===String(key))||C.lessons.find(l=>l.number.startsWith(String(key)));
  const put=(id,type,skill,title,prompt,extra)=>{
    if(Q[id])throw new Error('Duplicate course ID: '+id);
    const q={id,type,skill,title,prompt,level:2,course:true,...extra};
    Q[id]=q;B.skills.find(s=>s.id===skill).ids.push(id);return id;
  };
  // Answers rotate deterministically so the key cannot be learned by position.
  const choice=(id,skill,title,prompt,correct,wrong,why,meta={})=>{
    const shift=Array.from(id).reduce((n,c)=>n+c.charCodeAt(0),0)%3,options=[...wrong];options.splice(shift,0,correct);
    return put(id,'choice',skill,title,prompt,{options,answer:shift,why,tip:'先核对题目方向，再把选项放回材料。',...meta});
  };
  const write=(id,title,prompt,sample,checks,meta={})=>put(id,'writing','story',title,['essay','oral'].includes(meta.category)?meta.sourceTitle+'：'+prompt:prompt,{sample,checks,tip:'先口述，再落笔。完成后逐项核对，有缺漏先修改。',...meta});
  const memory=(id,title,cards,meta={})=>put(id,'recall','recall',title,meta.mode==='read'?'先看字试着读，再翻卡核对读音。认识不等于已经会写。':'先读懂，看清字形，再遮住在纸上默写，翻卡逐项核对。',{cards,level:1,...meta});
  C.lessons.forEach(l=>{
    const meta={unit:l.unit,lesson:l.id,category:'reading',page:l.page,sourceTitle:l.title};
    const eid=choice('course-'+l.id+'-proof','clues',l.title+' · 线索侦探',l.evidencePrompt,l.evidenceAnswer,l.evidenceWrong,'导读摘要中，'+l.evidenceAnswer,{...meta,passage:l.passage});
    const q=Q[eid];q.type='evidence';q.evidence=[l.evidenceAnswer.startsWith('第一')?0:l.evidenceAnswer.startsWith('第二')?1:2];
    const wid=choice('course-'+l.id+'-word','words',l.title+' · 词义钥匙','结合这句话，“'+l.word+'”是什么意思？',l.meaning,l.meaningWrong,'结合语境，“'+l.word+'”表示'+l.meaning,{...meta,passage:[l.wordContext]});
    const tid=write('course-'+l.id+'-express',l.title+' · 小小表达家',l.task,l.sample,l.checks,{...meta,level:3});
    l.questions=[eid,wid,tid];
  });
  C.gardens.forEach(([unit,page,title,prompt,answer,wrong,why],i)=>choice('course-garden-'+(i+1),'sentences',title,prompt,answer,wrong.split('/'),why,{unit,page,category:unit===5?'method':'garden',sourceTitle:unit===5?'第五单元交流平台与初试身手':'语文园地'}));
  choice('course-garden-writing-1','sentences','横格里的书写小教练','在横格里抄写一句话，哪种做法更符合书写提示？','字的中心大致在横格中线，字距较均匀，标点也留适当距离。',['每个字都贴到前一个字上。','把所有标点挤到下一行的最右边。'],'横格书写应注意字的水平位置、字距和标点间距。',{unit:1,page:14,category:'garden',sourceTitle:'书写提示'});
  choice('course-garden-writing-8','sentences','写得快，也写得稳','想在保持清楚的前提下提高书写速度，怎样练习更合适？','集中注意力，运笔正确，一句话连贯写，速度均匀。',['只求最快，写完自己也认不出来。','每写一笔就停下来做别的事。'],'教材强调专注、正确运笔、连贯与均匀；速度练习仍要保证可辨认。',{unit:8,page:122,category:'garden',sourceTitle:'书写提示'});
  write('course-method-action','动作慢镜头 · 初试身手','观察家人整理书桌或做一项家务，按先后写一段过程，使用准确的动作词。','例如先把书分类，再摆齐，最后擦净桌面。实际看过再写，重点让别人能照着过程理解。',['实际观察一个完整过程','动作顺序清楚','动词准确且对象明确'],{unit:5,page:67,category:'method',sourceTitle:'初试身手'});
  write('course-method-scene','场景小导演 · 初试身手','想象“风把纸片吹到树枝上，两个伙伴合作取回”的画面，先交代人物地点，再写清怎么解决。','可以用长杆轻轻挑下，也可以请大人帮助；要写具体合作步骤及结果，不只说大家努力。',['人物地点交代清楚','动作之间衔接合理','经过与结果有联系'],{unit:5,page:67,category:'method',sourceTitle:'初试身手'});
  // Every inventory entry appears exactly once in its category; groups are short enough for a child.
  for(const [category,items,label] of [['recognition',C.literacy.recognition,'识字探宝'],['handwriting',C.literacy.writing,'写字练功'],['vocabulary',C.literacy.vocabulary,'词语寻宝']]){
    const groups=new Map();
    items.forEach(c=>{if(!groups.has(c.lesson))groups.set(c.lesson,[]);groups.get(c.lesson).push(c);});
    for(const [key,cards] of groups){
      const garden=key.startsWith('g'),unit=garden?Number(key.slice(1)):unitFor(Number(key)),l=garden?null:lessonFor(key);
      for(let start=0;start<cards.length;start+=4){
        const id=`course-${category}-${key}-${start/4+1}`,part=cards.slice(start,start+4);
        const sourceTitle=garden?'语文园地':'第'+key+'课';
        memory(id,sourceTitle+' · '+label+' '+(start/4+1),part.map(c=>({...c,hint:category==='recognition'?(c.supplement?'这是识字表中的多音字复习项，留意本课读音。':'核对读音，再口头组一个本课的词。'):category==='handwriting'?'逐笔核对偏旁、结构和关键笔画，再读一读自己写的字。':'逐字核对字形，再用这个词口头说一句符合词义的话。',sentence:category==='recognition'?'认读后，回到教材中的词句再读一次。':category==='handwriting'?'写字表中的本课用字；请在纸上练习。':'教材词语表中的本课词语；先解释意思再默写。'})),{unit,lesson:l?.id,category,sourceTitle,page:category==='vocabulary'?128:category==='handwriting'?126:123,mode:category==='recognition'?'read':'write'});
      }
    }
  }
  C.accumulation.forEach(([unit,title,page,lines,note],i)=>{
    for(let start=0;start<lines.length;start+=3)memory(`course-accum-${i+1}-${start/3+1}`,title+' · 积累卡 '+(start/3+1),lines.slice(start,start+3).map(word=>({word,pinyin:'理解后再回忆',sentence:note,hint:'朗读、解释，再遮住背诵；默写请对照教材核对字形与标点。'})),{unit,page,category:'accumulation',sourceTitle:title,mode:'recite'});
    write('course-accum-'+(i+1)+'-use',title+' · 用一用','从“'+title+'”中选一项，先解释意思，再写一个能表现它的画面或生活情境。',note,['选的词句与本项相符','解释意思而不是只抄词句','例子或画面与意思有联系'],{unit,page,category:'accumulation',sourceTitle:title});
  });
  const essayGuides={
    1:['地点—推荐理由—具体例子','一个熟悉的公园、书店或村庄',['地点明确','每条理由有细节','能让读者知道值得去哪里看什么']],
    2:['人物—印象最深的特点—具体事件','家人怎样处理一件事',['选定一位或几位家人','特点有具体行动支撑','事情经过让人看懂']],
    3:['日期与对象—连续记录—变化与发现','同一植物在几天里的变化',['日期对象清楚','记录连续且具体','观察事实与猜想区分']],
    4:['相遇—共同经历—分别后的感受','与一个神话或童话人物共同解决问题',['人物特点和本领相符','想象情节有起因经过结果','写出自己的参与与感受']],
    5:['起因—关键经过—结果和感受','生活里难忘的一件小事',['事情经过清楚','关键部分写具体','结果与前面的行动有联系']],
    6:['游戏准备与规则—游戏过程—结果和感受','亲自参加的一次游戏',['时间人物和必要规则清楚','重点写游戏过程','动作语言表现心情']],
    7:['称呼—正文分段—祝福语—署名日期','给亲友介绍近况并表达心意',['称呼和落款位置合适','正文事情交代清楚','祝福语得体并有日期']],
    8:['事情起因—变化与反应—结果和感受','让自己紧张、害怕或激动的一件事',['事情前因后果清楚','心情随事情发展变化','用动作语言或神态表现感受']]
  };
  C.units.forEach(u=>{
    const [outline,example,checks]=essayGuides[u.id],meta={unit:u.id,page:u.essayPage,category:'essay',sourceTitle:'习作·'+u.essay};
    u.essayQuestions=[
      write(`course-essay-${u.id}-choose`,u.essay+' · 选材盒','为这次习作列两个真实可写的选材（想象习作可自拟），选一个并说明更适合的理由。','可以从“'+example+'”寻找素材。选择自己能说出具体细节的，不必追求惊天动地。',['两个候选素材明确','选定一个并说明理由','符合“'+u.essay+'”的要求'],meta),
      write(`course-essay-${u.id}-outline`,u.essay+' · 故事地图','围绕选定素材列提纲，并标出最需要写具体的一部分。','参考组织：'+outline+'。每部分写要点，重点部分列出可观察的细节或行动。',['顺序符合本次文体','要点有具体内容','标出重点与准备写的细节'],meta),
      write(`course-essay-${u.id}-draft`,u.essay+' · 完整初稿','按提纲完成一篇习作（可先口述或在纸上写，再录入）。建议300—400字，观察日记可分多天，书信注意格式。','本题没有统一范文。可按“'+outline+'”组织，写完让家人说说哪里还需要补充。篇幅只是建议，系统不会按字数判断质量。',checks,{...meta,level:3}),
      write(`course-essay-${u.id}-revise`,u.essay+' · 修改工作台','选初稿里一段需要改进的文字，写出“原句/原段—修改后—为什么改”。','检查“'+checks.join('；')+'”。改动要帮助读者看清内容；可补动作、删空话、调顺序或核对书信格式。',['保留需要修改的原文','给出实质性修改','理由对应本次习作要求'],{...meta,level:3})
    ];
  });
  C.oral.forEach(([unit,title,page,task,guide,check,sample],i)=>{
    write(`course-oral-${i+1}-prepare`,title+' · 发言准备',task,sample,check[0].split('/'),{unit,page,category:'oral',sourceTitle:title});
    write(`course-oral-${i+1}-talk`,title+' · 双人练习','请家人扮演听众，讲述后交换角色。记下对方的一条回应、你的回答，以及下一次想改进的一点。',guide,['实际完成一次倾听和交流','记录回应及自己的回答','写出具体改进办法'],{unit,page,category:'oral',sourceTitle:title});
  });
  C.transfer.forEach(([unit,title,passage,items,task])=>{
    const lines=passage.split('/'),meta={unit,category:'unit-test',sourceTitle:'单元新材料挑战',passage:lines,level:3};
    items.forEach(([prompt,correct,wrong],i)=>choice(`course-test-${unit}-${i+1}`,'clues',title+' · 挑战 '+(i+1),prompt,correct,wrong.split('/'),'对照材料：'+correct+' 请用原文信息说明理由，避免扩大结论。',meta));
    write(`course-test-${unit}-write`,title+' · 方法迁移',task,'把本单元的方法用于新材料。先抓住材料里的对象、条件和变化，再组织自己的表达。',['回应本题指定的任务','使用材料信息或本单元方法','表达连贯且不与材料矛盾'],meta);
  });
  write('course-reading-myth-plan','很久很久以前 · 阅读护照','为中国神话和另一地区的神话各选一个故事，记录书名、人物、主要情节与最神奇的地方。','例如从教材“快乐读书吧”推荐的中国神话入手，再选一本适合自己的世界神话读物。阅读后填写，未读的项目写“计划阅读”，不假装已经读过。',['两则故事的来源清楚','人物情节写得具体','说明神奇之处并区分已读与待读'],{unit:4,page:59,category:'reading-project',sourceTitle:'快乐读书吧'});
  write('course-reading-myth-compare','神话朋友对对碰','从读过的两个地区神话各选一个人物，从“遇到的问题、怎样行动、人物特点”三个角度比较。','同一角度对应两人，再说共同点或差异；人物特点用行动作证。神话文化可以不同，不需要硬分高低。',['两个来源有依据','三角度双方对应','评价用情节支持'],{unit:4,page:60,category:'reading-project',sourceTitle:'快乐读书吧',level:3});
  C.units.forEach(u=>{u.questions=Object.values(Q).filter(q=>q.unit===u.id).map(q=>q.id);});
  B.curriculum=C;
  B.stats={...B.stats,total:Object.keys(Q).length,core:Object.values(Q).filter(q=>!q.reserved).length,course:Object.values(Q).filter(q=>q.course).length,lessons:C.lessons.length,units:C.units.length,newCharacters:250,polyphonic:21,handwriting:250,vocabulary:C.literacy.vocabulary.length};
})();
