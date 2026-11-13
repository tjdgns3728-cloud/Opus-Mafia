(function(root){'use strict';
const particle=(name,a,b)=>{const n=String(name),c=n.charCodeAt(n.length-1);return n+(c>=44032&&c<=55203?(c-44032)%28?a:b:a);};
function combat(f){
 const selfAttack=f.pov==='attacker',selfTarget=f.pov==='target',a=selfAttack?'당신':f.attacker||'모습을 알 수 없는 상대',t=selfTarget?'당신':f.target||'그 사람',as=particle(a,'이','가'),ts=particle(t,'은','는'),obj=particle(t,'을','를');
 const weapon=f.weaponKnown?f.weapon:null,attack=weapon==='권총'?`${as} ${obj} 향해 방아쇠를 당긴다.`:weapon==='단검'?`${as} 단검을 내질러 ${obj} 노린다.`:weapon==='곤봉'?`${as} 곤봉을 휘둘러 ${obj} 덮친다.`:weapon==='맨손'?`${as} ${obj} 향해 주먹을 뻗는다.`:`누군가의 공격이 ${selfTarget?'당신에게':t+' 쪽으로'} 들이닥친다.`;
 const setup=f.ambush?'미처 대비할 틈을 주지 않고 공격이 시작된다.':f.publicAttack?'주변에 사람들이 있는 자리에서 공격하려는 움직임이 드러난다.':f.dark?'어두운 시야 속에서 두 사람의 움직임이 엇갈린다.':'';
 let response=f.defenseType==='block'?`${ts} ${weapon==='권총'?'총구를 비껴서려고 맞선다':'다가오는 공격을 받아내려고 맞선다'}.`:`${ts} 몸을 틀어 공격을 벗어나려 한다.`;
 let outcome;if(f.damage===0)outcome=f.defenseType==='block'?`맞서 버틴 끝에 ${selfTarget?'당신은':particle(t,'은','는')} 이번 공격에 새로 다치지 않았다.`:`공격이 비껴간다. ${selfTarget?'당신은':particle(t,'은','는')} 이번 공격에 새로 다치지 않았다.`;
 else if(f.reduction>0)outcome=`${f.defenseType==='block'?'맞서 버티며 충격을 흘렸지만':'몸을 비틀어 공격을 조금 벗어났지만'}, 완전히 피하지는 못했다. ${selfTarget?'몸에':t+'의 몸에'} 상처가 남는다.`;
 else outcome=`${f.defenseType==='block'?'막아내려던 움직임이 밀리고':'몸을 피하려던 움직임이 늦어'}, 공격이 ${selfTarget?'당신에게':t+'에게'} 닿는다.`;
 if(f.damage>0){if(f.after===0)outcome+=selfTarget?' 다리에 힘이 풀려 바닥으로 무너진다. 더는 몸을 움직일 수 없다.':` ${particle(t,'이','가')} 바닥으로 무너지고 움직임이 멎는다.`;else if(f.bleeding)outcome+=selfTarget?' 상처에서 피가 멎지 않는다. 아직 움직일 수 있지만 이대로 버티기에는 위태롭다.':` ${t}의 상처에서 피가 멎지 않는다. 쓰러지지는 않았지만 몸을 지탱하기 버거워 보인다.`;else if(f.weapon==='권총'&&f.damage>=5)outcome+=selfTarget?' 총상을 입은 몸이 크게 휘청인다. 중상을 입었지만 아직 대응할 수 있다.':` ${particle(t,'은','는')} 총상을 입고 크게 휘청인다. 중상을 입었지만 아직 움직인다.`;else outcome+=selfTarget?' 몸을 가눌 수는 있다. 눈앞의 위협은 아직 남아 있다.':` ${particle(t,'은','는')} 상처를 입었지만 쓰러지지 않는다.`;}
 const exposed=selfAttack&&f.visibleWitnesses?.length?` ${f.visibleWitnesses.join(', ')}에게도 당신의 공격이 고스란히 드러났다.`:'';
 const setting={hall:'회관 탁자 사이에서',warehouse:'어두운 갱도 입구에서',tavern:'술집의 좁은 통로에서',chapel:'교회 의자 사이에서',clinic:'진료소 처치대 옆에서',home:'주택가에서'}[f.place];
 return [setting?setting+' 갑자기 거리가 좁혀진다.':'',setup,attack,response,outcome+exposed].filter(Boolean).join(' ');
}
function attempt(label){
 const verbs={'확인하기':'확인하려고 살핀다','대조하기':'나란히 놓고 대조한다','비교하기':'비교한다','살피기':'살핀다','읽기':'읽어 나간다','찾기':'찾으려고 뒤진다','묻기':'묻는다','요구하기':'요구한다','맞추기':'맞춰 본다','구분하기':'구분하려고 살핀다','나누기':'나누어 살핀다','복원하기':'복원하려고 살핀다','재현하기':'재현해 본다','좁히기':'좁히려고 기록을 살핀다'};
 const parts=label.split(' '),verb=parts.pop(),subject=parts.join(' ');return verbs[verb]?`당신은 ${/[을를]$/.test(subject)?subject:particle(subject,'을','를')} ${verbs[verb]}.`:`당신은 눈앞의 흔적을 더 자세히 살핀다.`;
}
function investigation(clue,success){const key=clue.key.split(':')[0];
 const opened={keys:'리스의 수첩을 펼칩니다. 번진 이름을 피해 읽자 열쇠 명단이 드러납니다.',payday:'찢긴 장 아래를 비스듬히 비춰 봅니다. 종이를 눌렀던 연필 자국이 이어집니다.',lock:'화약고 걸쇠와 자물쇠를 번갈아 살핍니다. 부순 흔적을 찾으려던 손이 멎습니다.',six:'장부의 수를 짚고 빈 상자에 눌린 자국을 셉니다.',cache:'종탑 밑의 흙을 조심스레 걷어 냅니다. 손끝에 젖은 포장 자국이 닿습니다.',cart:'광차의 무거운 덮개를 들자 안쪽으로 빛이 들어갑니다.',fuse:'버팀목 아래로 늘어진 줄을 따라 눈길을 옮깁니다.',oilpaper:'진료대 옆에 접힌 외투의 주머니를 뒤집습니다. 종이가 바스락거립니다.',footprints:'골목 가장자리의 발자국을 따라 쪼그려 앉습니다. 겹친 자국 사이로 두 크기의 발 모양이 나뉩니다.',knot:'아이에게 받은 끈을 돌려 봅니다. 손에 익은 매듭 모양이 드러납니다.',planted:'집 안의 꾸러미를 조심스럽게 펼칩니다. 가져다 둔 기억이 없는 물건입니다.',ledger:'술집 뒤의 장부를 펼칩니다. 짧은 메모 아래에는 이름이 없습니다.'};
 const missed={keys:'수첩의 젖었다 마른 종이에 글씨가 뭉개져 있습니다. 읽을 수 없는 이름을 억지로 채울 수는 없습니다.',payday:'종이 아래의 눌린 선이 글자인지 흠집인지 갈리지 않습니다.',lock:'그늘 속 녹과 흠집이 겹쳐 보입니다. 문을 어떻게 열었는지는 가리지 못했습니다.',six:'상자 바닥의 자국이 겹쳐 있습니다. 없어진 수를 이번 조사로 확인하지 못했습니다.',cache:'종탑 아래 흙과 낡은 포장 자국이 뒤섞여 있습니다. 이번에는 내용물을 확인하지 못했습니다.',cart:'덮개 아래 어둠에 손이 멈춥니다. 안이 비어 있다고 결론 내릴 수는 없습니다.',fuse:'어둠 속의 줄 끝을 놓쳤습니다. 도화선이 어디로 이어지는지 아직 모릅니다.',oilpaper:'외투 주머니의 안감이 엉켜 내용물을 구별하지 못했습니다.',footprints:'밟힌 흙이 겹쳐 발자국의 모양을 구별하기 어렵습니다.',knot:'헐거워진 끈을 돌려 봐도 매듭의 쓰임을 확신할 수 없습니다.',planted:'어두운 집 안에서 포장만 만져 보았습니다. 무엇인지 단정할 수 없습니다.',ledger:'오래된 잉크가 번져 메모의 문장을 읽지 못했습니다.'};
 return success?(opened[key]||'눈앞의 흔적을 조심스럽게 살핍니다.')+' '+clue.text:(missed[key]||'손 닿는 곳을 살폈지만 흔적의 뜻을 가려내지 못했습니다.');
}
root.NoirNarrative={combat,attempt,particle,investigation};if(typeof module!=='undefined')module.exports=root.NoirNarrative;
})(globalThis);
