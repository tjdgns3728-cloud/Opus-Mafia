(function(root){'use strict';
const particle=(name,a,b)=>{const n=String(name),c=n.charCodeAt(n.length-1);return n+(c>=44032&&c<=55203?(c-44032)%28?a:b:a);};
/* 2026-11-24 사용자 새 방향: 싸움은 누가 누구를 무엇으로 공격했고 어떻게 됐는지만 한 줄로 */function combat(f){
 const selfAttack=f.pov==='attacker',selfTarget=f.pov==='target',a=selfAttack?'당신':f.attacker||'보이지 않는 상대',t=selfTarget?'당신':f.target||'그 사람';
 const weapon=f.weaponKnown&&f.weapon?f.weapon:null,how=weapon?' '+weapon+'으로':'',where=f.ambush?'기습':f.publicAttack?'사람들 앞':f.dark?'어둠 속':'';
 const def=f.defenseType==='block'?'막기':'피하기';let res=f.damage===0?'다치지 않음':f.reduction>0?(f.defenseType==='block'?'일부 막았지만 다침':'일부 피했지만 다침'):'맞음';
 if(f.damage>0){if(f.after===0)res+=' · 쓰러짐';else if(f.bleeding)res+=' · 출혈';else if(f.weapon==='권총'&&f.damage>=5)res+=' · 총상';}
 const exposed=selfAttack&&f.visibleWitnesses?.length?' 목격: '+f.visibleWitnesses.join(', ')+'.':'';
 return `${particle(a,'이','가')} ${particle(t,'을','를')}${how} 공격${where?'('+where+')':''} · ${t} ${def} → ${res}.${exposed}`;
}
function attempt(label){return String(label||'살피기');}
function investigation(clue,success){const key=clue.key.split(':')[0];
 /* 2026-11-24 사용자 새 방향: 성공하면 단서만, 실패하면 무엇을 못 알아냈는지만 */const missed={keys:'수첩의 번진 이름 → 읽지 못함.',payday:'눌린 자국 → 글자인지 흠집인지 모름.',lock:'화약고 자물쇠 → 어떻게 열었는지 모름.',six:'상자 자국 → 없어진 수를 확인하지 못함.',cache:'종탑 아래 → 내용물을 확인하지 못함.',cart:'광차 안 → 확인하지 못함.',fuse:'도화선 → 어디로 이어지는지 모름.',oilpaper:'외투 주머니 → 내용물을 구별하지 못함.',footprints:'발자국 → 모양을 구별하지 못함.',knot:'매듭 → 쓰임을 모름.',planted:'꾸러미 → 무엇인지 모름.',ledger:'장부 메모 → 읽지 못함.'};
 return success?clue.text:(missed[key]||'흔적의 뜻을 가려내지 못함.');
}
root.NoirNarrative={combat,attempt,particle,investigation};if(typeof module!=='undefined')module.exports=root.NoirNarrative;
})(globalThis);
