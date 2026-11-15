(function(root){'use strict';
const C=()=>root.NoirTRPG,S=root.NoirScenarios,base={...S},defs=()=>root.BlackRidgeIncidents||[];
const q=s=>s.scenario,d=s=>q(s).continuation,all=s=>C().alive(s).map(p=>p.id),aliveNpc=n=>n&&n.hp>0;
function audience(s,place){return C().alive(s).filter(p=>p.location===place&&!(s.turn===2&&place==='home'&&p.houseId));}
function local(s,p){return C().alive(s).filter(o=>C().sameSpace(s,p,o));}
function emit(s,ids,text,extra={}){if(ids.length)return C().emit(s,ids,'story',text,{authored:true,actionRecord:false,...extra});}
function observed(s,p,text,about=null,kind='evidence',key=null){p.directorKnown??=[];if(key&&p.directorKnown.includes(key))return;if(key)p.directorKnown.push(key);return C().learn(s,p.id,text,about,kind==='claim'?'현장에서 들은 말':'직접 살핀 현장',kind);}
function localAct(s,p,text,extra={}){const e=C().recordEvent(s,'scene',p.id,null,text,p.location);for(const o of local(s,p)){if(o.id===p.id||C().visible(s,o,p)&&s.plans?.[o.id]?.type!=='move'){const shown=C().disguisedAs(s,o,p),tx=shown?text.split(p.name).join(shown.name):text;emit(s,[o.id],tx,{actionRecord:true,event:e.id,localEvent:true,...extra});if(o.id!==p.id)observed(s,o,tx,shown?shown.id:p.id,'observed','act:'+e.id);}}return e;}
function npc(s,id){return d(s).npcs[id];}
function bombCount(s,where){return q(s).bombs.filter(b=>where?b.where===where:!['secured','spent'].includes(b.where)).length;}
function start(s,rng){base.start(s,rng);const x=q(s);Object.assign(x.mayor,{id:'mayor',hp:10,bleeding:false,stats:{fight:4,agility:4},defense:'dodge'});Object.assign(x.doyle,{id:'doyle',bleeding:false});x.continuation={incidents:{},flags:{},npcs:{doyle:x.doyle,mayor:x.mayor,miner:{id:'miner',name:'젊은 광부',hp:10,bleeding:false,location:'warehouse',stats:{fight:5,agility:5},defense:'dodge'}},stock:s.players.length,artifacts:[],executions:[],trials:[],actions:[],signals:[],printed:[],rumors:[],roleSeen:{},serial:0,dayStarted:{},arrivals:{}};
 const sheriff=s.players.find(p=>p.role==='sheriff');if(sheriff)sheriff.items.notebook=1;else artifact(s,{kind:'notebook',title:'리스의 수첩',where:'hall',text:'리스의 수첩. 열쇠 명단과 눌린 글씨가 남아 있다.'});
 for(const p of s.players){p.directorKnown=[];p.initialTeam=p.team;p.initialRole=p.role;p.storyLastSeen={};}
}
function guard(s,def){const x=q(s),z=d(s),f=z.flags;switch(def.guard){
 case 'followOnly':return !!z.incidents[def.id]?.unlocked;
 case 'mineClosed':return x.mineClosed;
 case 'minerEntered':return !!f.minerEntered&&npc(s,'miner').hp>0;
 case 'minerInClinic':return npc(s,'miner').location==='clinic'&&npc(s,'miner').hp>0&&npc(s,'miner').bleeding;
 case 'doyleAlive':return aliveNpc(x.doyle)&&x.doyle.location===def.place;
 case 'mayorAlive':return aliveNpc(x.mayor)&&x.mayor.location===def.place;
 case 'burnHome':return z.actions.some(a=>a.type==='burn'&&a.place==='home'&&s.epoch-a.epoch<=2);
 case 'burnChapel':return z.actions.some(a=>a.type==='burn'&&a.place==='chapel'&&s.epoch-a.epoch<=2);
 case 'doyleAtMine':return aliveNpc(x.doyle)&&x.doyle.location==='warehouse';
 case 'publicThreat':return x.doyle.disclosed||z.artifacts.some(a=>a.kind==='threat'&&a.public);
 case 'caseExists':return s.cases.length>0;
 case 'stockLow':return z.stock<=3;
 case 'travelerLeft':return !!f.travelerLeft&&!f.travelerStayed;
 case 'mayorUnderPressure':return aliveNpc(x.mayor)&&x.mayor.location===def.place&&x.announced&&(x.announcedDay??s.day)<s.day&&bombCount(s)>0;
 case 'fakePosted':return z.printed.some(a=>a.posted&&!a.removed);
 case 'missingBombs':return bombCount(s)>0&&!x.exploded;
 case 'economyChanged':return x.mineClosed||x.doyle.cowed||!aliveNpc(x.doyle)||f.unionFunded;
 case 'doyleDisclosed':return x.doyle.disclosed&&aliveNpc(x.doyle)&&x.doyle.location===def.place;
 case 'cacheDisturbed':return !!f.cacheDisturbed;
 case 'doyleDead':return !aliveNpc(x.doyle);
 case 'executionYesterday':return z.executions.some(e=>e.day<s.day);
 case 'exploded':return x.exploded;
 case 'fuseExtinguished':return x.fuse?.status==='extinguished'||!!f.extinguishedBy;
 default:return true;
}}
function refreshIncidents(s){const z=d(s);for(const def of defs()){const st=z.incidents[def.id];if(st?.done||st?.open)continue;if(s.turn===2||(def.final?s.day<(s.cfg?.days||7):s.day<def.day)||s.day===def.day&&s.turn<def.turn||!guard(s,def))continue;z.incidents[def.id]={...st,open:true,opened:s.epoch,seen:st?.seen||[],unlocked:st?.unlocked||false};}}
function active(s,p){if(s.turn===2)return [];return defs().filter(a=>{const st=d(s).incidents[a.id];if(a.id==='keyAtMine'&&(!aliveNpc(q(s).mayor)||q(s).mayor.location!=='warehouse'))return false;if(a.id==='doyleConfides'&&(!aliveNpc(q(s).doyle)||q(s).doyle.location!=='warehouse'))return false;return st?.open&&!st.done&&a.place===p.location&&guard(s,a);});}
function unlock(s,id){if(!id)return;const st=d(s).incidents[id]??={seen:[]};st.unlocked=true;refreshIncidents(s);}
function named(s,id){return C().find(s,id)?.name||npc(s,id)?.name||'그 사람';}
function artifact(s,obj){const a={id:'a'+(++d(s).serial),created:s.epoch,...obj};d(s).artifacts.push(a);return a;}
function text(s,p,raw){const x=q(s),z=d(s),lastExec=z.executions.at(-1),fake=z.printed.find(a=>a.posted&&!a.removed);const stock=z.stock;
 const homeBombs=lastExec?bombCount(s,'home:'+lastExec.target):0,homeArts=lastExec?z.artifacts.filter(a=>a.where==='home:'+lastExec.target&&!a.taken&&!a.destroyed):[];
 const ashes=z.artifacts.filter(a=>a.kind==='ash'&&a.where===p.location&&!a.destroyed);const values={stock,ashResult:ashes.at(-1)?.text||'타다 남은 조각은 있지만 읽을 수 있는 글자는 확인하지 못했습니다.',accused:s.cases.length?named(s,s.cases.at(-1).target):'고발된 사람',executed:lastExec?named(s,lastExec.target):'사망한 사람',fakeHeadline:fake?.headline||'',
  doyleThreatReply:x.doyle.threatened?'도일이 목소리를 낮춥니다. "노조를 넘기라는 협박을 받았소. 혼자 감당하기 어렵소."':'도일이 고개를 젓습니다. "내가 실제로 받은 협박은 아직 없소. 소문과는 구분해 주시오."',
  childReply:z.flags.childSilenced?'아이가 땅을 보며 말합니다. "꿈이었어. 아무것도 못 봤어." 누가 말을 바꾸게 했는지는 이 말만으로 알 수 없습니다.':'아이가 고개를 끄덕입니다. "긴 외투였어. 얼굴은 여전히 모르겠어." 어제의 말에 새로운 신원 정보가 더해지지는 않습니다.',
  watchReply:'지금 이곳에서 당번을 서는 사람: '+(C().alive(s).filter(o=>o.watchEpoch===s.epoch&&o.location==='warehouse').map(o=>o.name).join(', ')||'아직 없음')+'.',
  cartResult:bombCount(s,'cart')?'광차 덮개 아래에서 폭약 '+bombCount(s,'cart')+'개를 확인했습니다. 가져다 둔 사람은 이 물건만으로 알 수 없습니다.':'광차 덮개 아래에는 현재 폭약이 없습니다. 다른 곳에도 없다는 뜻은 아닙니다.',
  moneyIntro:!aliveNpc(x.doyle)?'도일이 앉던 자리에 모자가 놓였습니다. 주인이 말없이 잔을 하나 채웁니다.':x.doyle.cowed||z.flags.unionFunded?'후원금이 들어온 뒤 광부들이 외상을 갚습니다. 돈을 받지 않겠다는 광부는 구석에 홀로 앉아 있습니다.':'주인이 "외상 사절" 팻말을 세웁니다. 빈 잔을 든 광부들이 문가에서 항의합니다.',
  moneyReply:x.doyle.cowed||z.flags.unionFunded?'광부가 말합니다. "노조 쪽에서 새 돈이 왔소. 누가 댔는지는 직접 묻지 않았소."':'광부가 빈 주머니를 내보입니다. "내게 들어온 후원금은 없소."',
  moneyClue:x.doyle.cowed||z.flags.unionFunded?'카운터에 놓인 일부 새 지폐의 번호가 이어집니다. 한 묶음에서 나왔다는 단서이며, 플레이어 진영을 가리는 표시는 아닙니다.':'비교할 새 지폐 묶음이 이곳에 없습니다. 없는 자금 흐름을 확인한 것으로 적을 수는 없습니다.',
  houseResult:'집 안에서 '+(homeBombs?'폭약 '+homeBombs+'개':homeArts.length?'남겨진 물건 '+homeArts.length+'건':'새 물증 없이 생활 흔적')+'를 확인했습니다. 발견 여부만으로 사망자의 진영을 단정할 수 없습니다.',
  blastResult:'폭발 지점에서 직접 사망한 인물은 '+(z.blastVictims?.map(id=>named(s,id)).join(', ')||'현재 확인한 명단 없음')+'입니다. 새로 도착한 사람에게 점화자의 신원이 저절로 드러나지는 않습니다.',
  armedCount:'현재 설치 지점에 남은 폭약은 '+bombCount(s,'armed')+'개입니다. 회관에 맡긴 수는 '+bombCount(s,'secured')+'개이며, 나머지의 위치를 모르면 모두 찾았다고 말할 수 없습니다.'};
 return String(raw||'').replace(/\{(\w+)\}/g,(_,k)=>values[k]??'확인하지 못한 내용');
}
function announce(s,p){const z=d(s),visible=active(s,p),pending=visible.filter(a=>!z.incidents[a.id].seen.includes(p.id));const def=pending[0];if(!def)return false;z.incidents[def.id].seen.push(p.id);(z.incidents[def.id].intros??={})[p.id]=text(s,p,def.intro);emit(s,[p.id],text(s,p,def.intro),{incident:def.id,source:def.source+':'+def.sourceLine});return true;}
function incidentChoices(s,p,slot){const out=[];if(slot==='big'&&p.jailEpoch===s.epoch)return out;for(const def of active(s,p)){for(const o of def.options){if(!(o.slot===slot||slot==='small'&&o.slot==='free')||d(s).incidents[def.id].answered?.includes(p.id+':'+o.key)||effectError(s,p,o.effect))continue;out.push({type:'scene',sceneKey:'incident',incident:def.id,branch:o.key,label:o.label,hint:text(s,p,def.intro),target:null});}}return out;}
function incidentOption(s,p,a){const def=active(s,p).find(e=>e.id===a.incident),o=def?.options.find(o=>o.key===a.branch);return def&&o?{def,o}:null;}
function effectError(s,p,key){if(key==='pay1'&&p.money<1||key==='pay2'&&p.money<2||key==='fundUnion'&&p.money<3)return '소지금이 부족합니다.';if(key==='donateBandage'&&!p.items.bandage)return '건넬 붕대가 없습니다.';if(key==='bandageMiner'&&!npc(s,'miner').bleeding)return '지금 그 광부는 출혈 중이 아닙니다.';return null;}
function effect(s,p,key){const z=d(s),x=q(s),f=z.flags;if(!key)return;
 if(key==='minerEntered'){f.minerEntered=true;Object.assign(npc(s,'miner'),{hp:2,bleeding:true,location:'warehouse',injuredEpoch:s.epoch});unlock(s,'trapped');return;}
 if(key==='rescueMiner'){npc(s,'miner').location='clinic';f.minerRescued=true;unlock(s,'minerClinic');return;}
 if(key==='bandageMiner'){npc(s,'miner').bleeding=false;if(p.items.bandage)p.items.bandage--;return;}
 if(key==='wageFight'){f.wageFight=true;artifact(s,{kind:'trace',where:'tavern',text:'NPC 광부끼리 품삯 다툼을 벌인 자리. 플레이어 범행의 흔적으로 볼 수 없다.'});return;}
 if(key==='mayorEscort'){x.mayor.escort=p.id;return;}
 if(key==='mayorReturn'){x.mayor.escort=null;x.mayor.location='hall';return;}
 if(key==='watch'){p.watchEpoch=s.epoch;return;}
 if(key==='donateBandage'){p.items.bandage--;z.stock++;return;}
 if(key==='travelerLeft'){f.travelerLeft=true;unlock(s,'railReturn');return;}
 if(key==='escortTraveler'){p.storyTravel='clinic';return;}
 if(key==='takeConfession'){f.confessionTaken=true;artifact(s,{kind:'note',owner:p.id,text:'이름 없는 고해 쪽지: 화약고 언덕에서 내려오는 사람을 봤으나 이름은 적혀 있지 않음.'});return;}
 if(key==='watchConfession'){p.hidden=true;f.confessionWatcher=p.id;return;}
 if(key==='removeExtra'){const e=z.printed.find(e=>e.posted&&!e.removed);if(e){e.removed=true;artifact(s,{kind:'extra',owner:p.id,text:e.headline+' — 출처가 없는 호외',forged:true});}return;}
 if(key==='revealCart'){if(!p.storyKnown.includes('cart'))p.storyKnown.push('cart');return;}
 if(key==='escortDoyle'){p.storyTravel='warehouse';x.doyle.protected=true;x.doyle.escort=p.id;return;}
 if(key==='fundUnion'){p.money-=3;f.unionFunded=true;x.mineClosed=false;return;}
 if(key==='newLeader'){f.newLeader=true;f.reopenTomorrow=s.day+1;return;}
 if(key==='moveMine'){p.storyTravel='warehouse';return;}
 if(key==='pay1'||key==='pay2'){p.money-=key==='pay1'?1:2;return;}
 if(key==='doyleAnswer'){if(x.doyle.threatened)observed(s,p,'도일이 노조를 넘기라는 협박을 받았다고 말했다.',null,'claim','doyle-threat');return;}
 f[key]=true;
}
function resolveIncident(s,p,a,rng){const found=incidentOption(s,p,a);if(!found){const st0=d(s).incidents?.[a.incident];if(st0?.done){const who=st0.resolvedBy&&st0.resolvedBy!==p.id?named(s,st0.resolvedBy)+'이 먼저 이 일을 처리했습니다.':'이 일은 이미 끝났습니다.';return who+(st0.results?.[p.id]?' 그때 있었던 일: '+st0.results[p.id]:' 당신의 행동은 쓰이지 않았습니다.');}return '그 일이 벌어지던 자리가 달라져 이어갈 수 없습니다. 장소를 옮겼거나 때가 지났습니다.';}const {def,o}=found,st=d(s).incidents[def.id],problem=effectError(s,p,o.effect);if(problem)return problem;
 if(st.answered?.includes(p.id+':'+o.key))return '이미 이 질문이나 조사의 답을 확인했습니다.';if(o.check){const terms=o.check[0]==='medical'&&p.location==='clinic'?[{label:'진료소 처치대',value:2}]:[],r=C().check(p,o.check[0],rng,{label:o.label,dc:o.check[1],terms,edge:o.effect==='bandageMiner'?(p.items.bandage?1:-1):0});C().emit(s,[p.id],'check',r.success?'손을 써서 상황을 바꿀 수 있습니다.':'뜻대로 풀리지 않았습니다. 사건은 남아 있으며, 다음 행동에 다른 방법을 택할 수 있습니다.',{roll:r,authored:true});if(!r.success)return null;if(o.effect==='watchConfession'){p.stealth=r.total;p.spotted=local(s,p).filter(t=>t.id!==p.id&&C().visible(s,t,p)).map(t=>t.id);}}
 const result=text(s,p,o.result),fact=o.fact?text(s,p,o.fact):null;effect(s,p,o.effect);const changes=o.slot==='big'||!!o.effect||!!o.next;if(changes){st.done=true;st.open=false;st.resolvedBy=p.id;st.choice=o.key;st.resolvedEpoch=s.epoch;}else(st.answered??=[]).push(p.id+':'+o.key);if(!st.seen.includes(p.id))st.seen.push(p.id);(st.intros??={})[p.id]??=text(s,p,def.intro);st.results??={};for(const to of o.slot==='small'?[p]:local(s,p)){st.results[to.id]=result;if(!st.seen.includes(to.id))st.seen.push(to.id);}
 if(o.slot==='small'){emit(s,[p.id],result,{actionRecord:true,incident:def.id});if(fact)observed(s,p,fact,null,'evidence',def.id+':'+o.key);}else{localAct(s,p,result,{incident:def.id});if(fact)for(const to of local(s,p))observed(s,to,fact,null,o.slot==='free'?'claim':'observed',def.id+':'+o.key);}
 if(o.effect==='searchExecuted'){const target=d(s).executions.filter(e=>e.day<s.day).at(-1)?.target;if(target)root.NoirStory.searches(s,p,target);}unlock(s,o.next);refreshIncidents(s);if(o.next)announce(s,p);return null;
}
function aftermath(s){const z=d(s);for(const def of defs()){const st=z.incidents[def.id];if(!st?.open||st.done||!def.default||st.opened>=s.epoch)continue;effect(s,null,def.default);st.open=false;st.done=true;st.choice='no-intervention';emit(s,audience(s,def.place).map(p=>p.id),def.default==='minerEntered'?'말다툼이 이어지는 사이 광부 하나가 쇠사슬을 넘어갔습니다. 잠시 뒤 어둠 속에서 버팀목이 무너지는 소리와 신음이 들립니다.':def.default==='wageFight'?'품삯 다툼 끝에 NPC 광부끼리 주먹이 오갔습니다. 한 사람이 코피를 닦으며 술집 밖으로 나갑니다.':def.default==='travelerLeft'?'짐을 꾸린 광부가 선로를 따라 마을 밖으로 향합니다. 그가 무엇을 보게 될지는 돌아온 뒤에 알 수 있습니다.':'노조원들이 NPC 대표를 뽑았습니다. 새 대표는 다음 날 갱도를 열겠다고 말합니다.',{incident:def.id});}refreshIncidents(s);}
function journal(s,p){return defs().filter(def=>{const st=d(s).incidents[def.id];return st&&(st.seen.includes(p.id)||st.resolvedBy===p.id);}).map(def=>{const st=d(s).incidents[def.id];return {id:def.id,title:(st.intros?.[p.id]||'현장에서 들은 사건').split(/[.!?]/)[0].slice(0,52),place:def.place,status:st.results?.[p.id]?'내가 확인한 후속 내용':'처음 본 상황',result:st.results?.[p.id]||null,mine:st.resolvedBy===p.id};});}

// The remaining hooks below use only authoritative game events and the current viewer's evidence.
root.NoirStory={start,guard,refreshIncidents,active,text,announce,incidentChoices,resolveIncident,aftermath,journal,observed,localAct,emit,audience,local,npc,artifact,effect,effectError};
S.start=start;
})(globalThis);
