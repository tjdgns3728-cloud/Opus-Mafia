(function(root){'use strict';
/* 컴퓨터 자리의 판단(2026-11-18 사용자 요청: "ai들도 인간처럼 전략적으로 할 수 있게", "당신이 아는 수준으로").
   컴퓨터 자리는 자기 시야로 알 수 있는 것만 쓴다: 수첩(직접 본 것·들은 증언·사진)과 자기가 아는 재판 신청(이유·근거).
   - 시민: 직접 본 것 > 근거가 붙은 신청 > 근거 없는 주장 순으로 무게를 두고, 말한 사람의 신용을 따진다.
     신용은 그 사람의 고발이 내가 직접 아는 사실과 맞는지로 바뀐다(나를 거짓으로 고발하면 떨어지고, 내가 본 공격자를 고발하면 오른다).
   - 마피아: 같은 편을 감싸고, 자기 편을 고발했거나 근거를 낸 사람을 위협으로 본다. 같은 편이 고발당하면 고발한 사람을 되받아 고발하기도 한다.
   숨은 사실(다른 사람의 진영·직업, 남의 수첩)은 쓰지 않는다. */
const C=()=>root.NoirTRPG;
const ATTACK=/공격|쳐들어/;/* 불침번의 기록은 "밤에 ○○이 내 집에 쳐들어왔다"로 적힌다 */
const known=(p)=>(p.known||[]).filter(k=>!k.teamOnly);
// p가 아는 재판 신청: 자기가 낸 것, 공고로 받은 것, 지금 모두 앞에서 열린 재판
function cases(s,p){return (s.cases||[]).filter(c=>c.by===p.id||(p.knownCases||[]).includes(c.id)||s.trial?.id===c.id);}
// 신청한 사람들: 처음 낸 사람과 이유를 덧붙여 함께 낸 사람(동의만 한 사람은 넣지 않는다)
function filers(c){return [...new Set([c.by,...(c.reasons||[]).map(r=>r.by)].filter(Boolean))];}
function sawAttack(p,x){return known(p).some(k=>k.source==='직접 목격'&&k.about===x&&ATTACK.test(String(k.text))&&!FACELESS.test(String(k.text)));}
// p가 보는 q의 신용(0.1~1.5)
function trust(s,p,q){if(!q||q===p.id)return 1;let t=1;
 for(const c of cases(s,p)){if(!filers(c).includes(q))continue;
  if(c.target===p.id&&p.team!=='mafia')t*=0.3;/* 시민인 나를 고발했다: 내가 아는 거짓 */
  else if(sawAttack(p,c.target))t*=1.3;/* 내가 직접 본 공격자를 고발했다: 맞는 고발 */}
 return Math.max(0.1,Math.min(1.5,t));}
const esc=t=>String(t).replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const byName=(s,name)=>(s.players||[]).find(q=>q.name===name)||null;
// 들은 말을 나눈다: 전해 들은 증언은 "이름의 증언: 말", 그 자리에서 들은 말은 "이름: 말"(그 자리 말은 수첩에 말한 사람 앞으로 적힌다)
function claimInfo(s,text){text=String(text||'');let m=text.match(/^(.{1,20}?)의 증언: ([\s\S]*)$/);if(m)return {speaker:byName(s,m[1])?.id||null,body:m[2]};
 m=text.match(/^([^:]{1,20}):\s([\s\S]*)$/);if(m)return {speaker:byName(s,m[1])?.id||null,body:m[2]};return {speaker:null,body:text};}
// 그 말이 x를 공격한 사람으로 짚는가. 한 문장 안에서 "x이/가" 뒤에 공격하는 동사("공격했다", "공격하는", "쳐들어")가 오고,
// 그 사이에 다른 사람이 주어로 나오지 않아야 한다(2026-11-18 AI 켠 판: "하준과 이안이 … 나린의 단검 공격을 봤다"를 이안을 짚은 말로 셈).
const ATTACK_VERB=/공격(했|하|한|해)|쳐들어/;
function accuses(s,body,x){const name=C().find(s,x)?.name;if(!name)return false;const others=(s.players||[]).map(q=>q.name).filter(n=>n&&n!==name);
 for(const sentence of String(body).split(/[.!?。]\s*/)){const m=sentence.match(new RegExp(esc(name)+'(이|가)\\s'));if(!m)continue;
  const after=sentence.slice(m.index+m[0].length),v=after.match(ATTACK_VERB);if(!v)continue;
  const between=after.slice(0,v.index);if(others.some(n=>new RegExp(esc(n)+'(이|가)\\s').test(between)))continue;return true;}
 return false;}
// 얼굴을 보지 못했다고 적힌 기록은 그 이름의 사람을 본 기록이 아니다(얼굴을 가린 조직원이 꾸민 경우 등)
const FACELESS=/누군지(는)?\s?(보지 못|모르|알 수 없)|얼굴을 (천으로 )?가려/;
const isNight=k=>/밤/.test(String(k.time||''));
// 시민 자리가 x를 얼마나 의심하는가. why는 사람이 읽을 까닭
function suspicion(s,p,x){if(!x||x===p.id)return {score:0,why:[]};const nm=id=>C().find(s,id)?.name||'누군가';let score=0;const why=[];
 /* 밤에 본 얼굴은 변장일 수 있다(마피아는 밤마다 다른 사람으로 꾸민다). 밤의 목격은 밤마다 가장 센 것 하나만 세고,
    첫 밤은 반만, 서로 다른 밤에 또 같은 이름을 봤다면 그 밤부터는 거의 그대로 믿는다. */
 const nights=[];const add=(w,label,k)=>{if(isNight(k))nights.push({w,label,time:String(k.time)});else{score+=w;why.push(label);}};
 /* 한 사람의 말은 한 번만 센다(2026-11-18): 목격 근거를 낸 사람이 회관에서 같은 일을 말해도 따로 더하지 않고,
    같은 사람이 여러 번 말해도, 같은 근거가 여러 신청에 붙어도, 같은 사람이 여러 번 고발해도 한 번으로 센다. */
 const vis=cases(s,p).filter(c=>c.target===x);
 const witnesses=new Set(vis.flatMap(c=>c.caught?[]:(c.evidence||[]).filter(e=>e.by!==p.id&&!FACELESS.test(String(e.text))&&(e.kind==='evidence'||e.kind==='observed'&&ATTACK.test(String(e.text)))).map(e=>e.by)));
 const spoke=new Set(),seenEv=new Set(),seenFiler=new Set();
 const claim=(text,w,label)=>{const c=claimInfo(s,text);/* 피고 자신의 말은 피고를 짚는 근거가 아니다 */if(c.speaker===x||!accuses(s,c.body,x))return;
  const key=c.speaker||'?'+c.body;if(spoke.has(key)||(c.speaker&&witnesses.has(c.speaker)))return;spoke.add(key);score+=w*trust(s,p,c.speaker);why.push(label(c));};
 for(const k of known(p)){const text=String(k.text);
  if(k.kind==='claim'){claim(text,2,c=>(c.speaker?nm(c.speaker)+'의 ':'')+'들은 증언');continue;}
  if(k.about!==x||FACELESS.test(text))continue;
  if(k.source==='직접 목격'&&ATTACK.test(text))add(8,'내가 직접 본 공격',k);
  else if(k.source==='직접 목격'&&/집에 들어가는 것을 봤다/.test(text))add(3,'밤에 남의 집에 들어가는 것을 봄',k);
  else if(k.kind==='evidence'&&ATTACK.test(text))add(4,'공격 장면 사진',k);}
 for(const c of vis){
  if(c.caught){if(c.caughtKind==='npc'){score+=1;why.push('NPC의 고발');}else{score+=6;why.push('여럿 앞에서 붙잡힘');}continue;}
  for(const e of c.evidence||[]){if(e.by===p.id)continue;const key=e.by+'|'+e.text+'|'+e.time;if(seenEv.has(key))continue;seenEv.add(key);
   const t=Math.max(0.6,trust(s,p,e.by)),text=String(e.text);if(FACELESS.test(text))continue;
   if(e.kind==='observed'&&ATTACK.test(text))add(4*t,nm(e.by)+'의 목격 근거',e);
   else if(e.kind==='evidence'){score+=2.5*t;why.push(nm(e.by)+'의 사진 근거');}
   else if(e.kind==='claim')claim(text,1.5,()=>nm(e.by)+'가 붙인 증언');
   else score+=0.8*t;}
  for(const f of filers(c))if(f!==p.id&&!seenFiler.has(f)&&!(c.evidence||[]).some(e=>e.by===f)){seenFiler.add(f);score+=0.6*trust(s,p,f);why.push(nm(f)+'의 근거 없는 고발');}}
 const best={};for(const n of nights)if(!best[n.time]||n.w>best[n.time].w)best[n.time]=n;
 Object.values(best).sort((a,b)=>b.w-a.w).forEach((n,i)=>{score+=n.w*(i?0.9:0.5);why.push(n.label+(i?' · 다른 밤에 또 봄':' · 밤이라 변장일 수 있음'));});
 if(p.team!=='mafia')for(const c of cases(s,p))if(c.target===p.id&&filers(c).includes(x)){score+=4;why.push('나를 거짓으로 고발함');}
 return {score:Math.round(score*10)/10,why:[...new Set(why)]};}
// q에 대해 재판 근거로 붙일 만한 내 기록: q를 직접 본 것·사진, q를 공격한 사람으로 짚는 들은 증언(q 자신의 말은 빼고)
function factsAbout(s,p,q){return known(p).filter(k=>k.kind==='claim'?(c=>c.speaker!==q&&accuses(s,c.body,q))(claimInfo(s,k.text)):k.about===q&&!FACELESS.test(String(k.text))&&(k.kind==='observed'||k.kind==='evidence'));}
const partners=(s,p)=>C().alive(s).filter(q=>q.id!==p.id&&q.team==='mafia').map(q=>q.id);
// 마피아 자리가 보는 위협: 자기나 같은 편을 고발했거나 근거를 낸 사람, 숨어 있던 자기를 본 사람
function threat(s,p,q){if(!q||q===p.id||C().find(s,q)?.team==='mafia')return 0;const ours=[p.id,...partners(s,p)];let t=0;
 for(const c of cases(s,p)){if(!ours.includes(c.target))continue;if(filers(c).includes(q))t+=5;if((c.evidence||[]).some(e=>e.by===q))t+=3;}
 if((p.spotted||[]).includes(q))t+=4;
 return t;}
// 재판 동의(true=동의)
function consent(s,p,c){if(c.target===p.id)return false;
 if(p.team==='mafia')return !partners(s,p).includes(c.target);/* 같은 편은 막고, 시민 재판은 연다 */
 return suspicion(s,p,c.target).score>=3;}
// 재판 표: 'guilty' | 'innocent'. 시민은 확신이 없으면 무죄로 낸다(기권하면 마피아 두 표만으로 유죄가 될 수 있다)
function vote(s,p,trial){const x=trial.target;
 if(p.team==='mafia')return partners(s,p).includes(x)?'innocent':'guilty';
 return suspicion(s,p,x).score>=4?'guilty':'innocent';}
// 시민 자리가 재판을 신청할 대상: 충분히 의심스럽고, 내 수첩에 근거가 있거나 남의 근거가 쌓였을 때
function fileTarget(s,p){if(p.team==='mafia'||p.filedDay===s.day)return null;let best=null;
 for(const q of C().alive(s)){if(q.id===p.id)continue;const sm=suspicion(s,p,q.id);if(sm.score<6)continue;
  const facts=factsAbout(s,p,q.id).slice(0,5);
  if(!best||sm.score>best.score)best={target:q.id,score:sm.score,why:sm.why,facts:facts.map(k=>k.id),reason:facts[0]?.text||`${sm.why.join(', ')} 때문에 의심합니다.`};}
 return best;}
// 마피아 자리의 되받아 고발: 같은 편이나 자기를 고발한 시민을, 근거 없이 이유만 적어 고발한다
function counterFile(s,p,rand=Math.random){if(p.team!=='mafia'||p.filedDay===s.day)return null;const ours=[p.id,...partners(s,p)],day=C().caseDay(s);
 for(const c of cases(s,p)){if(c.closed||c.caught||c.day!==day||!ours.includes(c.target))continue;
  const q=C().find(s,c.by);if(!q||q.hp<=0||q.team==='mafia')continue;
  if((s.cases||[]).some(d=>d.day===day&&d.target===q.id&&filers(d).some(f=>ours.includes(f))))continue;
  if(rand()<0.6)return {target:q.id,reason:`${q.name}의 고발은 근거가 약합니다. 남을 먼저 몰아세우는 쪽이 더 수상합니다.`};}
 return null;}
// 밤 습격 대상: 같은 편 모두가 보는 위협의 합이 가장 큰 시민(같으면 무작위)
function nightTarget(s,gang,rand=Math.random){const towns=C().alive(s).filter(q=>q.team!=='mafia');if(!towns.length)return null;
 const scored=towns.map(q=>({q,t:gang.reduce((a,g)=>a+threat(s,g,q.id),0)})),top=Math.max(...scored.map(x=>x.t)),pool=scored.filter(x=>x.t===top);
 return pool[Math.floor(rand()*pool.length)].q;}
// 마피아의 변장 대상: 이미 고발받거나 근거가 쌓인 시민으로 꾸며 누명을 씌운다(그런 사람이 없으면 null → 아무나)
function disguiseTarget(s,p,ds,rand=Math.random){if(!ds?.length)return null;
 const heat=id=>cases(s,p).filter(c=>c.target===id).reduce((a,c)=>a+(c.closed?0.5:filers(c).length+(c.evidence||[]).length),0);
 const scored=ds.map(a=>({a,h:heat(a.target)})),top=Math.max(...scored.map(x=>x.h));if(top<=0)return null;
 const pool=scored.filter(x=>x.h===top);return pool[Math.floor(rand()*pool.length)].a;}
// 낮 공격 대상 고르기: 위협이 큰 상대를, 같은 상대면 단검을 먼저
function pickAttack(s,p,opts){const atk=opts.filter(a=>a.type==='attack');if(!atk.length)return null;
 const w={knife:3,pistol:2,club:1,fist:0};return atk.slice().sort((a,b)=>threat(s,p,b.target)-threat(s,p,a.target)||(w[b.weapon]||0)-(w[a.weapon]||0))[0];}
// AI 자리 지시문에 붙이는 판단 원칙과, 규칙으로 센 참고 판단(자기 시야 안의 것만)
function principles(p){return p.team==='mafia'
 ?'판단 원칙: 같은 편을 지키되 드러나게 감싸지 않는다. 너의 말은 그 장면을 직접 본 사람이 있으면 거짓이 드러나 신용을 잃는다. 너나 같은 편을 고발했거나 근거를 낸 사람, 숨어 있던 너를 본 사람이 가장 큰 위협이다. 사람이 여럿 있는 곳에서 공격하면 붙잡힌다. 이미 의심받는 시민으로 꾸미면 누명을 씌우기 쉽다.'
 :'판단 원칙: 직접 본 것이 가장 확실하고, 근거가 붙은 재판 신청이 그다음이며, 근거 없는 주장은 약하다. 밤에 본 얼굴은 변장일 수 있으니, 같은 사람을 서로 다른 밤에 또 봤을 때 더 믿는다. 남의 말은 그 사람의 신용만큼만 믿고, 피고 자신의 말은 피고를 짚는 근거가 아니다. 신용은 그 사람의 고발이 네가 직접 아는 사실과 맞았는지, 너를 거짓으로 고발했는지로 따진다. 본 것을 회관에서 알리거나 근거를 붙여 재판을 신청하면 너의 신용이 쌓인다. 의심만으로 사람을 몰지 않는다.';}
function brief(s,p){const nm=id=>C().find(s,id)?.name||'?';
 if(p.team==='mafia'){const list=C().alive(s).filter(q=>q.team!=='mafia').map(q=>({n:q.name,t:threat(s,p,q.id)})).filter(x=>x.t>0).sort((a,b)=>b.t-a.t).slice(0,3);return list.length?'규칙으로 센 위협: '+list.map(x=>`${x.n} ${x.t}`).join(', '):'';}
 const list=C().alive(s).filter(q=>q.id!==p.id).map(q=>({n:q.name,...suspicion(s,p,q.id)})).filter(x=>x.score>0).sort((a,b)=>b.score-a.score).slice(0,3);
 return list.length?'규칙으로 센 의심(네 수첩과 네가 아는 재판 신청만으로): '+list.map(x=>`${x.n} ${x.score}(${x.why.join(', ')})`).join('; '):'';}
root.NoirMinds={suspicion,trust,threat,consent,vote,fileTarget,counterFile,nightTarget,pickAttack,disguiseTarget,claimInfo,principles,brief};if(typeof module!=='undefined')module.exports=root.NoirMinds;
})(globalThis);
