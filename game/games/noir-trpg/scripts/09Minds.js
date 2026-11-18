(function(root){'use strict';
/* 컴퓨터 자리의 판단(2026-11-18 사용자 요청: "ai들도 인간처럼 전략적으로 할 수 있게", "당신이 아는 수준으로").
   컴퓨터 자리는 자기 시야로 알 수 있는 것만 쓴다: 수첩(직접 본 것·들은 증언·사진)과 자기가 아는 재판 신청(이유·근거).
   - 시민: 직접 본 것 > 근거가 붙은 신청 > 근거 없는 주장 순으로 무게를 두고, 말한 사람의 신용을 따진다.
     신용은 그 사람의 고발이 내가 직접 아는 사실과 맞는지로 바뀐다(나를 거짓으로 고발하면 떨어지고, 내가 본 공격자를 고발하면 오른다).
   - 마피아: 같은 편을 감싸고, 자기 편을 고발했거나 근거를 낸 사람을 위협으로 본다. 같은 편이 고발당하면 고발한 사람을 되받아 고발하기도 한다.
   숨은 사실(다른 사람의 진영·직업, 남의 수첩)은 쓰지 않는다. */
const C=()=>root.NoirTRPG;
const ATTACK=/공격/;
const known=(p)=>(p.known||[]).filter(k=>!k.teamOnly);
// p가 아는 재판 신청: 자기가 낸 것, 공고로 받은 것, 지금 모두 앞에서 열린 재판
function cases(s,p){return (s.cases||[]).filter(c=>c.by===p.id||(p.knownCases||[]).includes(c.id)||s.trial?.id===c.id);}
// 신청한 사람들: 처음 낸 사람과 이유를 덧붙여 함께 낸 사람(동의만 한 사람은 넣지 않는다)
function filers(c){return [...new Set([c.by,...(c.reasons||[]).map(r=>r.by)].filter(Boolean))];}
function sawAttack(p,x){return known(p).some(k=>k.source==='직접 목격'&&k.about===x&&ATTACK.test(String(k.text)));}
// p가 보는 q의 신용(0.1~1.5)
function trust(s,p,q){if(!q||q===p.id)return 1;let t=1;
 for(const c of cases(s,p)){if(!filers(c).includes(q))continue;
  if(c.target===p.id&&p.team!=='mafia')t*=0.3;/* 시민인 나를 고발했다: 내가 아는 거짓 */
  else if(sawAttack(p,c.target))t*=1.3;/* 내가 직접 본 공격자를 고발했다: 맞는 고발 */}
 return Math.max(0.1,Math.min(1.5,t));}
// 시민 자리가 x를 얼마나 의심하는가. why는 사람이 읽을 까닭
function suspicion(s,p,x){if(!x||x===p.id)return {score:0,why:[]};const nm=id=>C().find(s,id)?.name||'누군가';let score=0;const why=[];
 /* 밤에는 얼굴을 꾸밀 수 있어(변장) 밤의 목격은 조금 덜 믿는다 */const night=k=>/밤/.test(String(k.time||''))?0.75:1;
 for(const k of known(p)){if(k.about!==x)continue;const text=String(k.text);
  if(k.source==='직접 목격'&&ATTACK.test(text)){score+=8*night(k);why.push('내가 직접 본 공격');}
  else if(k.kind==='evidence'&&ATTACK.test(text)){score+=4;why.push('공격 장면 사진');}
  else if(k.kind==='claim'&&ATTACK.test(text)){score+=2;why.push('들은 증언');}}
 for(const c of cases(s,p)){if(c.target!==x)continue;
  if(c.caught){if(c.caughtKind==='npc'){score+=1;why.push('NPC의 고발');}else{score+=6;why.push('여럿 앞에서 붙잡힘');}continue;}
  for(const e of c.evidence||[]){if(e.by===p.id)continue;const t=Math.max(0.6,trust(s,p,e.by)),text=String(e.text);
   if(e.kind==='observed'&&ATTACK.test(text)){score+=4*t*night(e);why.push(nm(e.by)+'의 목격 근거');}
   else if(e.kind==='evidence'){score+=2.5*t;why.push(nm(e.by)+'의 사진 근거');}
   else score+=0.8*t;}
  for(const f of filers(c))if(f!==p.id&&!(c.evidence||[]).some(e=>e.by===f)){score+=0.6*trust(s,p,f);why.push(nm(f)+'의 근거 없는 고발');}}
 if(p.team!=='mafia')for(const c of cases(s,p))if(c.target===p.id&&filers(c).includes(x)){score+=4;why.push('나를 거짓으로 고발함');}
 return {score:Math.round(score*10)/10,why:[...new Set(why)]};}
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
  const facts=known(p).filter(k=>k.about===q.id&&(k.kind==='observed'||k.kind==='evidence'||k.kind==='claim')).slice(0,5);
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
// 낮 공격 대상 고르기: 위협이 큰 상대를, 같은 상대면 단검을 먼저
function pickAttack(s,p,opts){const atk=opts.filter(a=>a.type==='attack');if(!atk.length)return null;
 const w={knife:3,pistol:2,club:1,fist:0};return atk.slice().sort((a,b)=>threat(s,p,b.target)-threat(s,p,a.target)||(w[b.weapon]||0)-(w[a.weapon]||0))[0];}
// AI 자리 지시문에 붙이는 판단 원칙과, 규칙으로 센 참고 판단(자기 시야 안의 것만)
function principles(p){return p.team==='mafia'
 ?'판단 원칙: 같은 편을 지키되 드러나게 감싸지 않는다. 너의 말은 그 장면을 직접 본 사람이 있으면 거짓이 드러나 신용을 잃는다. 너나 같은 편을 고발했거나 근거를 낸 사람, 숨어 있던 너를 본 사람이 가장 큰 위협이다. 사람이 여럿 있는 곳에서 공격하면 붙잡힌다.'
 :'판단 원칙: 직접 본 것이 가장 확실하고, 근거가 붙은 재판 신청이 그다음이며, 근거 없는 주장은 약하다. 말한 사람의 신용을 따진다(그 사람의 고발이 네가 직접 아는 사실과 맞았는지, 너를 거짓으로 고발했는지). 본 것을 회관에서 알리거나 근거를 붙여 재판을 신청하면 너의 신용이 쌓인다. 의심만으로 사람을 몰지 않는다.';}
function brief(s,p){const nm=id=>C().find(s,id)?.name||'?';
 if(p.team==='mafia'){const list=C().alive(s).filter(q=>q.team!=='mafia').map(q=>({n:q.name,t:threat(s,p,q.id)})).filter(x=>x.t>0).sort((a,b)=>b.t-a.t).slice(0,3);return list.length?'규칙으로 센 위협: '+list.map(x=>`${x.n} ${x.t}`).join(', '):'';}
 const list=C().alive(s).filter(q=>q.id!==p.id).map(q=>({n:q.name,...suspicion(s,p,q.id)})).filter(x=>x.score>0).sort((a,b)=>b.score-a.score).slice(0,3);
 return list.length?'규칙으로 센 의심(네 수첩과 네가 아는 재판 신청만으로): '+list.map(x=>`${x.n} ${x.score}(${x.why.join(', ')})`).join('; '):'';}
root.NoirMinds={suspicion,trust,threat,consent,vote,fileTarget,counterFile,nightTarget,pickAttack,principles,brief};if(typeof module!=='undefined')module.exports=root.NoirMinds;
})(globalThis);
