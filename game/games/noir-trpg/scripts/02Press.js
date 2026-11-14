(function(root){'use strict';
const C=()=>root.NoirTRPG,copy=x=>JSON.parse(JSON.stringify(x));
function validate(s,p,a){
 if(p.role!=='reporter'||!p.items.camera)return '사진기와 기자 직업이 필요합니다.';
 if(a.type==='photograph'){const t=C().find(s,a.target);if(!t||t.id===p.id||!C().visible(s,p,t)||t.location!==p.location)return '같은 장소에서 모습이 보이는 다른 인물을 선택하세요.';}
 if(a.type==='publish'){
  if(!(p.photos||[]).some(x=>x.id===a.photo))return '직접 촬영해 보관한 사진을 선택하세요.';
  if(!String(a.headline||'').trim()||String(a.headline).length>80)return '신문 제목은 1~80자로 적어 주세요.';
  if(!String(a.article||'').trim()||String(a.article).length>500)return '기사 본문은 1~500자로 적어 주세요.';
 }
 return null;
}
function capture(s,p,a){const c=C(),t=c.find(s,a.target);
 if(p.hp<=0)return;
 if(!t||t.location!==p.location||!c.visible(s,p,t)){c.narrate(s,p.id,'사진기를 들었지만 찍으려던 인물의 모습을 확인할 수 없다. 셔터를 내리고 빈 필름을 그대로 둔다.');return;}
 const subjects=s.players.filter(o=>o.id!==p.id&&o.location===p.location&&c.visible(s,p,o)).map(o=>({id:o.id,name:o.name,condition:o.hp===0?'쓰러져 움직이지 않음':o.bleeding?'상처에서 피가 흐름':o.hp<=5?'상처를 입은 모습':'서 있는 모습'}));
 // Only this observer's confirmed, visible outcomes from this common turn enter the photograph.
 const moments=s.feed.filter(e=>e.kind==='combat'&&e.to.includes(p.id)&&e.epoch===s.epoch&&e.place===p.location&&e.cameraText).map(e=>e.cameraText);
 const frames=s.feed.filter(e=>e.kind==='combat'&&e.to.includes(p.id)&&e.epoch===s.epoch&&e.place===p.location&&e.cameraFrame).map(e=>copy(e.cameraFrame));
 const photo={frames,id:'photo'+(++s.serial),by:p.id,byName:p.name,time:c.label(s),epoch:s.epoch,place:p.location,target:t.id,subjects,moments};
 (p.photos??=[]).push(photo);
 const facts=`${c.places[p.location].name}에서 촬영. ${subjects.map(o=>o.name+' — '+o.condition).join('; ')}.${moments.length?' '+moments.join(' '):''}`;
 c.learn(s,p.id,facts,t.id,'본인이 촬영한 사진','evidence',photo.id);
 c.narrate(s,p.id,`당신은 ${t.name} 쪽으로 사진기를 들어 셔터를 누른다. 그 자리에 보이던 인물과 주변 풍경이 필름에 남는다. 누구에게 보여줄지는 아직 정하지 않았다.`,{photo:photo.id});
 const witnesses=s.players.filter(o=>o.hp>0&&o.id!==p.id&&o.location===p.location&&c.visible(s,o,p));
 for(const o of witnesses)c.emit(s,[o.id],'story',`${p.name}이 사진기를 들어 ${c.visible(s,o,t)?t.name+' 쪽으로':'눈앞의 풍경을 향해'} 셔터를 누른다.`,{localEvent:true});
}
function publish(s,p,a){if(p.hp<=0)return;const c=C(),err=validate(s,p,a);if(err){c.narrate(s,p.id,err);return;}
 const photo=p.photos.find(x=>x.id===a.photo),paper={id:'paper'+(++s.serial),number:(s.newspapers||[]).length+1,by:p.id,byName:'이름 없는 발행인',time:c.label(s),headline:String(a.headline).trim(),article:String(a.article).trim(),photo:{...copy(photo),byName:'이름 없는 사진사'}};
 (s.newspapers??=[]).push(paper);
 const facts=`${c.places[photo.place].name} · ${photo.time}. ${photo.subjects.map(o=>o.name+' — '+o.condition).join('; ')}.${photo.moments.length?' '+photo.moments.join(' '):''}`;
 // A published photograph is evidence; the caption/editorial is somebody's claim.
 for(const o of s.players){c.learn(s,o.id,facts,photo.target,'신문에 실린 사진 · 촬영 당시 장면','evidence',photo.id);c.learn(s,o.id,paper.headline+'\n'+paper.article,photo.target,'신문 기사','claim',paper.id);}
 c.emit(s,s.players.map(o=>o.id),'notice',`누군가 사진을 실은 신문을 배포했습니다. “${paper.headline}”`,{newspaper:paper.id,place:null});
}
function choices(s,p){if(p.role!=='reporter'||!p.items.camera)return [];
 const list=s.players.filter(t=>t.id!==p.id&&t.location===p.location&&C().visible(s,p,t)).map(t=>({type:'photograph',target:t.id,label:t.name+'의 모습 촬영'}));
 for(const photo of p.photos||[])list.push({type:'publish',photo:photo.id,headline:'현장 사진',article:'촬영 당시의 모습을 공개합니다.',label:'사진으로 신문 만들기'});
 return list;
}
root.NoirPress={validate,capture,publish,choices};if(typeof module!=='undefined')module.exports=root.NoirPress;
})(globalThis);
