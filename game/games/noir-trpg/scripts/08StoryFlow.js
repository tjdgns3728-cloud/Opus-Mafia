(function(root){'use strict';
const S=root.NoirScenarios,D=root.NoirStory,C=root.NoirTRPG,base={...S},q=s=>s.scenario,z=s=>q(s).continuation;
const roleDays={
 sheriff:[['hall','수첩의 열쇠 명단','자신이 가진 수첩의 번진 이름과 눌린 글씨를 살펴볼 수 있습니다.'],['warehouse','말과 현장의 차이','직접 들은 열쇠 소유자의 말과 화약고의 흔적을 비교할 수 있습니다.'],['home','물건이 놓인 순서','누군가의 집에서 물건이 나왔다면, 누가 놓았는지와 소유자를 구분해 물을 수 있습니다.'],['tavern','임금날의 기록','수첩에서 임금날 기록을 확인했다면 술집에서 자금의 출처를 물을 수 있습니다.'],['hall','마지막 고발의 근거','자신이 확인한 기록을 골라 고발하거나, 다른 주민의 근거를 물을 수 있습니다.']],
 doctor:[['clinic','리스의 외투','진료소에 남은 외투와 처치 물자를 살펴볼 수 있습니다.'],['clinic','다친 사람의 말','실제로 다친 사람을 치료하며 그가 본 것과 추측을 구분해 들을 수 있습니다.'],['clinic','남은 치료제','치료제를 쓰면 자신의 소지품에서 줄어듭니다. 누구에게 쓸지 직접 정합니다.'],['home','진료소까지 오는 길','부상자가 있는 장소로 이동하거나, 동료에게 진료소로 부축해 달라고 말할 수 있습니다.'],['clinic','열차 전 마지막 처치','지혈과 체력 회복은 다릅니다. 남은 약과 실제 부상 상태를 보고 결정합니다.']],
 jailor:[['hall','붙잡기 전의 근거','고발과 구금은 별개입니다. 직접 본 행동을 근거로 대상을 고릅니다.'],['warehouse','누구의 행동을 막을지','구금은 하루 한 번입니다. 성공하면 다음 턴 큰 행동을 막지만 진영은 확인하지 못합니다.'],['hall','구금 뒤의 증언','자신이 붙잡은 사람도 설명할 수 있습니다.'],['chapel','같은 장소의 움직임','종이나 촛대의 뜻은 별개입니다. 직접 확인한 사람에게만 행동을 시도할 수 있습니다.'],['hall','마지막 하루의 구금','붙잡는 행동도 오늘의 큰 행동입니다. 재판의 찬반과 혼동하지 않습니다.']],
 guard:[['home','아이가 주운 매듭','군에서 보던 형태인지 살필 수 있지만 매듭 하나로 범인을 알 수는 없습니다.'],['warehouse','어두운 갱도','실제로 함께 있는 NPC 곁을 지키거나 위험한 현장 일을 도울 수 있습니다.'],['clinic','살아남은 부상자','도와줄 사람이 다쳤다면 붕대로 지혈할 수 있습니다. 체력을 돌리려면 의사의 치료제가 필요합니다.'],['chapel','신호와 사람의 차이','종소리만 들었다면 울린 사람은 모릅니다. 자신이 본 장면을 따로 남깁니다.'],['warehouse','타들어 가는 도화선','타들어 가는 도화선을 찾았다면 터지기 전에 끊을 수 있습니다.']],
 detective:[['home','골목에 남은 두 흔적','리스가 쓰러진 곳을 살펴볼 수 있습니다. 발자국 크기는 사람의 이름이 아닙니다.'],['chapel','흙이 움직인 자리','종탑 아래가 비었거나 채워져 있는지 직접 보고 비교할 수 있습니다.'],['home','새로 놓인 물건','자기 집이나 처형 뒤 빈집에 실제로 남은 물건을 살필 수 있습니다.'],['warehouse','남은 광차','발견한 개수와 아직 모르는 위치를 구분해 수첩에 남깁니다.'],['hall','추측을 걷어 낸 기록','직접 본 것과 전해 들은 말을 나누어 마지막 재판에 제출할 수 있습니다.']],
 reporter:[['warehouse','현장을 남길 사진','보이는 사람과 실제 행동만 사진에 남습니다. 찍지 않은 일을 기사로 사실화하지 않습니다.'],['clinic','기사와 당사자의 말','발행은 사진과 글을 공개하는 큰 행동입니다. 질문은 같은 장소에서 대화로 할 수 있습니다.'],['hall','출처가 다른 종이','자신이 발행한 신문은 신문함에 남습니다. 다른 종이는 현장에서 출처를 따로 살펴야 합니다.'],['tavern','돌아온 사람의 증언','인터뷰에서 들은 말은 전언입니다. 사진과 목격의 근거를 구분해 기사에 적습니다.'],['hall','마지막으로 공개할 것','어떤 사진과 기사를 공개할지 직접 고릅니다. 미발행 기록은 자동으로 모두에게 전해지지 않습니다.']],
 godfather:[['chapel','두 개의 행방','당신들 편이 숨긴 폭약의 위치를 압니다. 옮기거나 남겨 둘 수 있습니다.'],['tavern','돈과 익명 쪽지','돈을 넣은 제안도 상대의 자발적 수락이 필요합니다. 돈만으로 진영을 바꾸지 않습니다.'],['hall','정보를 무기로 쓰기','직접 쓴 호외는 회관에 붙여야 퍼집니다. 붙이는 행동을 보면 작성자를 의심할 근거가 됩니다.'],['chapel','같은 편의 신호','세 번의 종과 삼각형 촛대는 직접 행동한 때만 남습니다. 동료 이동을 강제하지 않습니다.'],['home','남은 숫자','마피아 편이 생존자의 절반 이상이면 장악합니다. 죽이기와 자발적 영입 중 무엇을 시도할지 정합니다.']],
 mafioso:[['chapel','권총과 폭약','리스의 권총은 실제 소지품입니다. 탄환을 쓰면 줄고, 숨기면 손에서 빠집니다.'],['home','집에 남길 물건','밤의 습격과 물건을 놓는 행동 중 하나를 고릅니다. 하지 않은 행동의 흔적은 남기지 않습니다.'],['warehouse','폭약의 다음 위치','폭약을 옮겼다면 현재 놓인 수량만 다시 회수하거나 설치할 수 있습니다.'],['chapel','실제 신호','동료에게 보낼 종 신호도 자신의 큰 행동입니다. 다른 주민은 소리만 들을 수 있습니다.'],['warehouse','설치와 대피','갱도에 설치한 폭약은 다음 때가 끝날 때 터집니다. 설치한 사람도 그때 남아 있으면 죽습니다.']],
 consigliere:[['tavern','듣고 싶은 말','동료에게 아는 사실을 전할지는 직접 정합니다. 듣지 않은 사정을 알 수는 없습니다.'],['home','흔적을 읽는 한계','직업 조사는 실제 사건 흔적을 찾습니다.'],['hall','소문의 출처','누가 누구에게 들었는지 대화로 물을 수 있습니다. 물음이 상대의 기록 공개를 강제하지 않습니다.'],['tavern','돈 앞에서 갈리는 말','직접 만난 NPC의 질문에 답하거나 자신이 아는 말을 전할 수 있습니다.'],['hall','오늘 꺼낼 기록','개인 수첩에 남은 근거를 골라 공유할 수 있습니다. 공유하기 전에는 다른 플레이어에게 보이지 않습니다.']],
 kidnapper:[['warehouse','붙잡는 손','같은 장소에서 상대를 구금할 수 있습니다. 몸을 붙잡는 결과는 판정으로 정합니다.'],['home','붙잡힌 사람의 다음 턴','구금으로 막은 큰 행동과 실제로 들은 대화를 구분합니다. 구금이 자백을 만들지는 않습니다.'],['hall','붙잡은 뒤의 고발','직접 행동을 본 사람은 고발할 수 있습니다. 다음 말과 표는 각자의 선택입니다.'],['chapel','만남을 막을 것인가','교회에 가는 사람을 보았더라도 목적까지 아는 것은 아닙니다.'],['warehouse','마지막 행동 한 번','구금한 사람이 위험한 곳에 있더라도 게임에 없는 자동 처형은 하지 않습니다.']],
 lawyer:[['hall','고발과 해명과 표','기존 재판 규칙을 유지합니다. 직업이 있다고 다른 사람의 투표를 대신 정하지 않습니다.'],['tavern','돈과 약속','후원 제안의 조건을 실제 당사자에게 물어볼 수 있습니다. 출처 없는 말은 주장으로 남깁니다.'],['hall','증거의 출처','물건을 누가 언제 발견했는지, 발견 전에 그 자리를 본 사람이 있는지 물을 수 있습니다.'],['home','남은 서류','사망자의 물건을 찾았다고 그 사람의 숨은 진영이 드러나지는 않습니다.'],['hall','마지막 판결의 기록','기존 고발 이유·제출 근거·표결·유언을 다시 읽고 직접 변론할 수 있습니다.']],
 pharmacist:[['clinic','붕대와 치료제의 차이','붕대로는 지혈만 할 수 있습니다. 체력은 치료제가 있어야 돌아옵니다.'],['clinic','지혈할 사람','실제로 피를 흘리는 사람에게 붕대나 즉석 처치를 사용할 수 있습니다.'],['clinic','줄어드는 선반','진료소 재고는 실제 구입과 기부로 바뀝니다. 남은 붕대를 독차지하는 일을 말로 중재할 수 있습니다.'],['home','필요한 사람에게 건네기','같은 장소의 주민에게 자신의 붕대를 전달할 수 있습니다.'],['clinic','남은 밤의 출혈','출혈은 낮·밤 경계마다 체력을 줄입니다. 지혈 성공 여부를 보고 다음 행동을 정합니다.']]
};
// 이야기의 고개와 줄기. 날짜가 아니라 판에서 일어난 일로 정한다(story/story_flow.md).
const ORD=['','첫째','둘째','셋째','넷째','다섯째','여섯째','일곱째','여덟째','아홉째','열째'];
const lastDay=s=>s.cfg?.days||7;
function dayLine(s){const d=s.day,L=lastDay(s);return (ORD[d]||d+'번째')+' 날 아침입니다.'+(d===L?' 오늘 밤만 지나면 열차가 옵니다.':d===L-1?' 열차는 모레 새벽에 옵니다.':'');}
// 진상: 1 리스는 그날 밤 화약고에 갔다 2 리스는 폭약 도둑을 보고 죽었다 3 화약고는 열쇠로 열렸다(마을 안 사람의 짓)
function truthOf(p){const k=p.storyKnown||[],h=p.npcHeard||[];const a=k.includes('butt')||h.includes('minerReese'),b=a&&k.includes('oilpaper'),c=b&&(k.includes('lock')||k.includes('keys'));return c?3:b?2:a?1:0;}
// 마피아 편의 몫: 살아 있는 마피아 + 넘어간 NPC(이기는 조건과 같은 셈)
function mafiaShare(s){const live=C.alive(s),m=live.filter(p=>p.team==='mafia').length;if(!m||!live.length)return 0;const union=Object.values(z(s).npcs).filter(n=>n.hp>0&&(n.recruited&&n.id==='mayor'||n.id==='doyle'&&n.cowed)).length;return (m+union)/live.length;}
function bombState(s){const x=q(s),w=x.bombs.map(b=>String(b.where));if(x.exploded)return 'exploded';if(x.secured)return 'secured';if(w.includes('armed'))return 'armed';if(w.some(v=>!['chapel','cart','hideout','spot:barrel','spot:medbox','secured','spent'].includes(v)))return 'moved';return 'buried';}
// 폭약이 지금 어디에 몇 개 있는지(마피아에게만 쓰는 말)
function bombWhere(s,p){const w=q(s).bombs.map(b=>String(b.where)),n=f=>w.filter(f).length,parts=[],carry={};for(const v of w)if(v.startsWith('carry:'))carry[v.slice(6)]=(carry[v.slice(6)]||0)+1;for(const [id,k] of Object.entries(carry)){const o=C.find(s,id);parts.push((o?.id===p.id?'당신':o?.name||'누군가')+'의 품에 '+k+'개');}const add=(k,label)=>{if(k)parts.push(label+' '+k+'개');};add(n(v=>v==='chapel'),'종탑 아래에');add(n(v=>v==='cart'),'갱도 맨 안쪽 광차에');add(n(v=>v==='spot:barrel'),'술집 뒷마당 술통에');add(n(v=>v==='spot:medbox'),'진료소 창고 약상자에');add(n(v=>v==='hideout'),'본거지에');add(n(v=>v==='armed'),'갱도 안쪽에 설치된 것이');add(n(v=>v.startsWith('home:')),'시민의 집 마루 밑에');add(n(v=>v==='secured'),'회관에 봉인된 것이');add(n(v=>Object.keys(C.places).includes(v)&&!['chapel','hideout'].includes(v)),'쓰러진 사람이 떨어뜨린 것이');return parts.length?parts.join(', ')+' 있습니다':'어디 있는지 알 수 없습니다';}
const PHASES=['start','develop','crisis','climax'];
// 고개는 앞으로만 간다. 발단 → 전개(폭약이 사라진 것이 알려짐) → 고비 → 절정(갱도의 폭약 · 마지막 날)
function updateArc(s){const x=q(s),st=z(s);if(!x||!st)return null;const a=(st.arc??={phase:'start',closedDay:null,threatDay:null,startShare:null});const d=x.doyle;
 if(a.startShare==null)a.startShare=mafiaShare(s);
 if(x.mineClosed){if(a.closedDay==null)a.closedDay=s.day;}else a.closedDay=null;
 if(d.threatened&&a.threatDay==null)a.threatDay=s.day;
 const town=C.alive(s).filter(p=>p.team!=='mafia');let ph='start';
 if(x.discovered||x.announced||x.mineClosed)ph='develop';
 if(ph==='develop'&&(d.cowed||d.hp<=0||x.secured||town.filter(p=>truthOf(p)>=3).length>=2||mafiaShare(s)>Math.max(1/3,a.startShare+0.05)))ph='crisis';
 if(['armed','lit'].includes(x.fuse?.status)||x.exploded||s.day>=lastDay(s))ph='climax';
 if(PHASES.indexOf(ph)>PHASES.indexOf(a.phase))a.phase=ph;return a;}
const phaseAt=(s,ph)=>PHASES.indexOf(z(s)?.arc?.phase||'start')>=PHASES.indexOf(ph);
// 지금 이 사람에게 해당하는 상황. 앞에 있을수록 먼저 이야기한다. 한 번 이야기한 상황은 다시 말하지 않는다.
function arcTags(s,p){const x=q(s),a=z(s).arc||{},d=x.doyle,m=p.team==='mafia',b=bombState(s),t=[];const add=(c,tag)=>{if(c)t.push(tag);};
 add(x.exploded,'exploded');
 add(s.day>=lastDay(s),'final');
 add(m&&b==='armed','armed');
 add(d.hp<=0&&d.deathReported,'doyleDead');
 add(d.hp>0&&d.cowed,'doyleCowed');
 add(x.secured,'secured');
 add(m&&x.bombs.some(o=>String(o.where).startsWith('home:')),'planted');
 add(m&&b==='moved','moved');
 add(phaseAt(s,'crisis'),'crisis');
 add(d.hp>0&&!d.cowed&&d.protected,'doyleHeld');
 add(d.hp>0&&!d.cowed&&d.disclosed,'doyleThreatened');
 if(!m){const tr=truthOf(p);add(tr>=3,'truth3');add(tr>=2,'truth2');}
 add(x.mineClosed&&a.closedDay!=null&&s.day-a.closedDay>=2,'hunger');
 add(x.mineClosed,'closed');
 add(!x.mineClosed&&!x.exploded&&!x.secured&&!d.cowed&&x.discovered,'open');
 return t;}
// 같은 편 모두에게 쓰는 글. 직업 글이 없는 상황에 쓴다.
const teamStories={
 town:{
  exploded:"갱도 입구가 무너졌습니다. 그 자리에 있던 사람은 돌아오지 못했습니다. 그자들은 폭약을 쓸 줄 알고, 쓸 각오도 되어 있습니다. 그때 누가 갱도에 없었는지 떠올려 보십시오.",
  final:"오늘이 마지막 날입니다. 오늘 밤만 버티면 새벽에 열차가 옵니다. 그자들도 그것을 압니다. 오늘 재판이 마지막 재판이고, 오늘 밤 습격은 어느 때보다 거셀 것입니다.",
  doyleDead:"도일이 죽었습니다. 노조는 대표를 잃었고, 광부들은 누구 말을 들어야 할지 모릅니다. 살길이 막힌 광부들은 겁박하는 쪽으로 쉽게 기울 것입니다. 새 대표를 누가 맡는지 지켜보십시오.",
  doyleCowed:s=>q(s).everClosed?"도일이 노조를 넘겼습니다. 갱도는 다시 열렸지만, 왜 마음을 바꿨는지 도일은 말하지 않습니다.":"도일이 노조를 넘겼습니다. 갱도는 닫히지 않았지만, 왜 그렇게 했는지 도일은 말하지 않습니다.",
  secured:"마을에서 찾은 폭약 두 개가 회관에 봉인되었습니다. 도일이 갱도를 다시 엽니다. 폭약을 숨긴 사람은 아직 마을 안에 있습니다.",
  crisis:"마을의 공기가 바뀌었습니다. 그자들은 이제 숨기보다 서두를 것입니다. 누명을 씌우고, 증인을 노리고, 마지막 수를 준비할 때입니다. 혼자 다니지 말고, 본 것은 회관에 내놓으십시오.",
  doyleHeld:"도일 곁을 지키는 사람이 생겼습니다. 곁에 사람이 있는 동안 도일은 돈에도 협박에도 쉽게 넘어가지 않습니다. 도일을 찾아오는 사람이 있다면 그 얼굴을 기억해 두십시오.",
  doyleThreatened:"도일이 협박장을 사람들 앞에 내놓았습니다. 노조를 넘기지 않으면 다른 집들도 해치겠다는 내용입니다. 그자들이 노리는 것은 노조, 그리고 노조가 쥔 갱도입니다. 도일이 혼자 있으면 위험합니다.",
  truth3:"수첩과 화약고 자물쇠가 같은 쪽을 가리킵니다. 화약고는 열쇠로 열렸습니다. 리스를 죽이고 폭약을 가져간 사람은 바깥 떠돌이가 아니라, 열쇠를 가졌거나 훔칠 수 있었던 이 마을 사람입니다.",
  truth2:"흩어져 있던 것이 이어집니다. 리스는 그날 밤 화약고에 갔고, 폭약 꾸러미에 손을 댔습니다. 리스는 폭약을 가져가는 사람을 봤고, 그래서 죽었을 것입니다. 이것을 아는 사람이 늘수록 그자들은 숨기 어려워집니다.",
  hunger:"갱도가 닫힌 지 며칠째입니다. 금을 캐던 손이 놀고, 술집 외상 장부가 길어집니다. 살길이 막힌 사람일수록 겁박에 약합니다. 요즘 누가 겁먹은 얼굴로 입을 닫았는지 보십시오. 그 겁이 어디서 왔는지가 이 일의 뿌리일지 모릅니다.",
  closed:"갱도가 닫혔습니다. 폭약 두 개가 어디 있는지 모르는 채로 광부를 들여보낼 수는 없다는 것이 도일의 말입니다. 품삯이 끊긴 광부들 곁에서 누가 서성이는지 보십시오.",
  open:"갱도가 다시 열렸습니다. 광부들은 일터로 돌아갔지만, 사라진 폭약이 다 돌아온 것은 아닙니다."
 },
 mafia:{
  exploded:"갱도가 무너졌습니다. 그 자리의 사람들은 돌아오지 못했습니다. 마을 사람들은 겁에 질렸습니다. 겁은 표를 움직이지만, 그때 누가 갱도에 없었는지 따지는 사람도 생깁니다.",
  final:"오늘이 마지막 날입니다. 새벽에 열차가 오면 끝입니다. 그 전에 마을의 절반이 당신들 편이어야 합니다.",
  armed:"갱도 안쪽에서 도화선이 타들어 가고 있습니다. 설치한 다음 때가 끝날 무렵 터지고, 그때 갱도에 있는 사람과 NPC는 모두 죽습니다. 그때 누가 갱도에 모일지 지켜보십시오. 당신은 그 자리에 있어서는 안 됩니다.",
  doyleDead:"도일이 죽었습니다. 노조는 머리를 잃었고, 광부들은 기댈 곳을 찾습니다. 새 대표를 누가 맡느냐에 따라 노조가 당신들 손에 들어올 수도 있습니다.",
  doyleCowed:s=>q(s).everClosed?"도일이 노조를 넘겼습니다. 갱도는 다시 열렸고, 도일도 이기는 조건을 셀 때 당신들 편으로 칩니다. 이제 노조를 쥔 쪽은 당신들입니다.":"도일이 노조를 넘겼습니다. 갱도는 닫히지 않았고, 도일도 이기는 조건을 셀 때 당신들 편으로 칩니다. 이제 노조를 쥔 쪽은 당신들입니다.",
  secured:"숨겨 둔 폭약 두 개를 모두 빼앗겼습니다. 갱도는 다시 열립니다. 남은 것은 돈과 쪽지, 그리고 칼입니다.",
  planted:"폭약 하나가 시민의 집 마루 밑에 있습니다. 누군가 그것을 찾아내면 집주인이 의심받고, 그 사람이 회관에서 처형되면 칼을 쓰지 않고도 한 명이 줄어듭니다. 집주인이 먼저 찾아 회관에 맡기면 헛수고가 됩니다.",
  moved:(s,p)=>'숨겨 둔 폭약이 자리를 옮겼습니다. 지금 '+bombWhere(s,p)+'. 숨겼던 자리에는 흔적이 남았을 수 있습니다.',
  crisis:"이제 숨기만 해서는 끝까지 갈 수 없습니다. 의심이 좁혀 오기 전에 서둘러야 합니다. 누명을 씌울 사람, 입을 막을 증인, 갱도의 폭약.",
  doyleHeld:"도일 곁을 지키는 사람이 생겼습니다. 곁에 사람이 있으면 돈도 협박도 잘 먹히지 않습니다. 지키는 사람을 먼저 떼어 놓거나, 다른 길을 찾아야 합니다.",
  doyleThreatened:"도일이 협박장을 사람들 앞에 내놓았습니다. 이제 마을은 누군가 노조를 노린다는 것을 압니다. 도일을 찾아가는 사람은 눈에 띕니다.",
  hunger:"갱도가 닫힌 지 며칠째, 광부들의 외상 장부가 길어졌습니다. 살길이 막힌 사람은 겁을 먹기 쉽습니다. 지금이 그들을 흔들 때입니다.",
  closed:"계획대로 갱도가 닫혔습니다. 품삯이 끊긴 광부들은 곧 살길이 막힙니다. 그때 그들을 쥐고 흔드는 쪽이 노조를 얻고, 노조를 얻는 쪽이 금광을 얻습니다.",
  open:"갱도가 다시 열렸습니다. 광부들이 일터로 돌아가면 살길이 막힌 사람을 흔들기 어려워집니다."
 }
};
// 직업마다 그 상황을 자기 일의 눈으로 보는 글. 선택지를 나열하지 않고 실마리만 둔다.
const roleStories={
 sheriff:{
  closed:"리스는 담배 끝을 비틀어 마는 버릇이 있었습니다. 화약고 문 앞에서 그런 꽁초가 나온다면, 리스는 그날 밤 그 문 앞에 서 있었던 것입니다. 수첩에 적힌 열쇠 주인들과 함께 보면 그날 밤의 모습이 그려질 것입니다.",
  truth3:"수첩의 명단과 부서지지 않은 자물쇠가 맞물립니다. 화약고는 열쇠로 열렸습니다. 해먼드, 도일, 그리고 번진 이름. 리스의 열쇠가 지금 누구 손에 있는지가 범인에게 가는 길입니다. 이것을 회관에 내놓으면 그자들은 서두를 것입니다.",
  crisis:"그자들이 서두르기 시작했습니다. 리스를 쓰러뜨린 것처럼 이번에는 당신을 노릴 수 있습니다. 밤에 불침번을 서면 습격해 오는 얼굴을 볼 수 있지만, 다음 날 피곤해집니다.",
  final:"오늘이 마지막 재판입니다. 이 마을에서 직접 본 것과 조사로 확인한 것만 추려 회관에 내놓으십시오. 들은 말은 근거가 되지 않습니다. 리스의 빚을 갚을 마지막 날입니다."
 },
 doctor:{
  closed:"화난 사람이 많은 날에는 다치는 사람도 늘어납니다. 당신은 어디서든 치료할 수 있고, 진료소 안이라면 붕대 없이도 피를 멈출 수 있습니다. 누가 쓰러지면 서두르십시오. 다음 낮이 끝날 때까지는 살릴 수 있고, 당신 손이면 열에 아홉은 일어납니다.",
  hunger:"칼자국인지, 둔기에 맞은 멍인지, 총상인지. 굶주린 마을에서는 주먹이 먼저 나갑니다. 누가 다쳐서 오고 누가 다치고도 오지 않는지 보십시오.",
  crisis:"당신이 쓰러지면 이 마을에 사람을 제대로 살릴 사람이 없습니다. 그자들도 그것을 압니다. 밤에는 숨거나 불침번을 서는 것도 생각해 보십시오.",
  final:"오늘을 버틴 사람은 내일 열차를 봅니다. 남은 치료제를 지금 쓸지, 오늘 밤 다칠 사람을 위해 남길지 정해야 합니다."
 },
 jailor:{
  closed:"사람이 모이는 곳에서는 누가 앞에 나서고 누가 뒤로 빠지는지 보입니다. 화약고 근처를 서성이는 사람에게는 이유가 있을 것입니다. 죄 없는 사람을 붙든 날에는 그자들이 하루를 법니다.",
  doyleThreatened:"도일을 협박한 사람은 다시 도일을 찾아갈 것입니다. 도일 곁에 머물다 그 사람을 붙들 수 있다면 재판보다 빠릅니다.",
  crisis:"리스의 권총은 아직 누군가의 손에 있습니다. 붙들어야 할 사람은 무기를 가진 사람입니다. 붙들려다 지면 그날 기회는 쓴 것으로 칩니다. 혼자 가면 도와줄 사람이 없습니다.",
  final:"마지막 날입니다. 그자들은 오늘 일을 벌이지 못하면 기회가 없다는 것을 압니다. 당신은 한 곳에만 있을 수 있습니다. 당신은 싸울 줄 압니다."
 },
 guard:{
  closed:"아이가 주운 끈의 매듭은 도화선을 묶던 매듭입니다. 나머지 끈은 어딘가에서 폭약을 묶고 있을 것입니다. 숨길 만한 곳은 갱도의 광차, 교회 종탑 아래, 술집 뒷마당, 진료소 창고, 누군가의 집 마루 밑입니다. 그 근처에서 무언가 본 사람을 찾으십시오.",
  doyleThreatened:"노조가 넘어가면 광부들이 흔들립니다. 도일 곁에서 지켜 주면 그자들이 노조를 쉽게 차지하지 못합니다.",
  crisis:"이제 마을 사람들은 누가 싸울 줄 아는지 압니다. 그자들도 압니다. 그런 사람의 집부터 찾아갈 수 있습니다. 밤에 불침번을 서면 습격해 오는 사람과 맞붙을 수 있지만, 다음 날 피곤해집니다.",
  final:"오늘이 마지막 날입니다. 그자들은 오늘 총알을 아끼지 않을 것입니다. 표를 가진 주민들, 사람을 살리는 의사, 회관의 해먼드."
 },
 detective:{
  closed:"흔적 하나로는 알 수 있는 것이 없습니다. 서로 다른 곳의 흔적 두 개가 이어질 때 단서가 됩니다. 화약고의 꽁초, 진료소의 외투, 골목의 발자국. 리스가 그날 밤 걸은 길이 그 안에 있습니다.",
  truth2:"꽁초와 기름종이가 이어졌습니다. 리스는 화약고에 갔고, 폭약 꾸러미에 손을 댔습니다. 리스는 폭약 도둑을 봤기 때문에 죽었습니다. 다음은 화약고가 어떻게 열렸는지입니다.",
  truth3:"화약고는 열쇠로 열렸습니다. 범인은 마을 안에 있고, 열쇠에 손이 닿는 사람입니다. 골목의 두 발자국, 크고 무거운 것과 작고 가벼운 것을 떠올리십시오. 둘이 함께 움직였습니다.",
  hunger:"노조 사무실에는 노조의 장부가 있습니다. 노조에 누가 손을 뻗었는지 적혀 있다고 합니다. 굶는 광부들 곁에 겁이 돈다면, 그 겁이 어디서 왔는지가 이 일의 뿌리일 수 있습니다.",
  final:"오늘 틀리면 바로잡을 내일이 없습니다. 마지막 재판에서 힘을 얻는 것은 직접 본 것과 조사로 확인한 것뿐입니다. 아직 가 보지 않은 곳이 있다면 아침에 행동을 쓰지 않고 옮겨 가 보십시오."
 },
 reporter:{
  closed:"회관 쪽에서 종이 울렸습니다. 들은 이야기는 기사가 되고, 찍은 장면은 증거가 됩니다. 사람들은 둘을 다르게 받아들입니다. 사진 한 장에 큰 행동 한 번, 신문을 내는 데 또 한 번이 듭니다.",
  hunger:"닫힌 갱도 앞, 외상에 기대는 광부들, 새 지폐를 내는 손. 찍을 것이 늘어납니다. 사진에 없는 것을 쓰면 당신의 기사도 벽에 붙은 출처 모를 종이와 다를 것이 없습니다.",
  crisis:"찍어 둔 사진을 늘어놓아 봅니다. 자주 함께 찍힌 얼굴이 있는지 봅니다. 그자들이 서두르는 지금, 결정적인 장면이 나올 수 있습니다. 대신 찍힌 사람이 당신을 그냥 두지 않을 것입니다.",
  final:"내일 열차가 오면 이 마을의 일이 당신의 사진으로 바깥에 알려집니다. 아직 내지 않은 사진이 있다면 재판 전에 내십시오. 신문은 재판 전에 사람들 손에 들어가야 표를 움직입니다."
 },
 lawyer:{
  closed:"놀란 사람들은 누구든 탓하고 싶어 합니다. 회관에서는 직접 보지 않은 사람의 목소리가 더 큽니다. 고발당한 사람을 감싸면 한패로 보이고, 가만히 있으면 죄 없는 사람이 처형될 수 있습니다.",
  doyleCowed:"도일이 노조를 넘겼습니다. 누가 그 거래를 했는지는 아직 어느 장부에도 적혀 있지 않습니다.",
  crisis:"재판은 하루에 한 번입니다. 누구의 집에서 폭약이 나왔다는 말이 돌면, 누가 언제 찾았는지부터 물어야 합니다. 찾은 사람과 놓은 사람이 같을 때가 있습니다.",
  final:"오늘이 마지막 재판입니다. 죄 없는 사람이 처형되면 그 한 명 차이로 마을이 넘어갈 수 있고, 아무도 고발하지 않으면 그자들은 하루를 그냥 얻습니다. 재판 중에는 한 사람이 한 번 30초를 늘릴 수 있습니다."
 },
 pharmacist:{
  closed:"광부들의 목소리가 높아졌습니다. 당신의 붕대는 진료소 밖에서도 피를 멎게 합니다. 쓰러진 사람은 다음 낮이 끝날 때까지 숨이 붙어 있고, 당신 손이라면 열에 일곱은 살려 냅니다.",
  hunger:"진료소 선반의 붕대가 줄고 있습니다. 붕대를 많이 사 가는 사람은 누가 다칠지 아는 사람일 수 있습니다. 다치고도 진료소에 오지 않는 사람에게는 숨기는 이유가 있을 것입니다.",
  crisis:"의사 곁에 있으면 둘이서 더 많은 사람을 살립니다. 대신 둘이 한꺼번에 당할 수도 있습니다. 가방 속 붕대는 다칠 사람 손에 있을 때 더 쓸모 있을지도 모릅니다.",
  final:"오늘 피를 멎게 한 사람은 내일 열차를 볼 수 있습니다. 밤에 다친 사람에게 당신은 갈 수 없습니다. 아침이 오면 쓰러진 사람부터 찾아가십시오."
 },
 godfather:{
  closed:"계획대로 갱도가 닫혔습니다. 해먼드를 끌어들이면 이기는 조건을 셀 때 그 사람을 당신 편 한 명으로 칩니다. 돈을 얹으면 설득이 쉬워지지만, 곁에서 지키는 사람이 있으면 어렵습니다.",
  hunger:"외상 장부가 길어졌습니다. 도일에게 손을 뻗을 때입니다. 협박에는 돈이 들지 않습니다. 도일이 넘어오면 갱도가 다시 열리고, 노조도 금광도 당신들 쪽으로 기웁니다.",
  doyleHeld:"도일 곁을 지키는 사람이 생겼습니다. 곁에 사람이 있으면 돈도 협박도 먹히지 않습니다. 지키는 사람을 먼저 떼어 놓거나, 해먼드와 젊은 광부 쪽으로 눈을 돌리십시오.",
  secured:"폭약 두 개를 모두 빼앗겼습니다. 갱도를 닫아 둘 열쇠를 잃었고, 광부들이 일터로 돌아가면 살길이 막힌 사람을 흔들기 어려워집니다. 이제는 표를 세는 싸움입니다. 죄 없는 사람이 처형되면 당신이 손을 쓰지 않아도 상대 편이 한 명 줄어듭니다.",
  crisis:"살아 있는 사람 가운데 당신 편을 세어 봅니다. 불침번을 서는 집은 습격하기 어렵고, 잠든 집이 가장 쉽습니다. 낮에 누가 피곤해 보이는지 보면 누가 밤을 새웠는지 압니다.",
  final:"새벽에 열차가 오면 끝입니다. 그 전에 절반이 되어야 합니다. 갱도에 폭약을 설치하면 다음 때가 끝날 때 터집니다. 쓸 수 있는 날은 오늘뿐입니다. 한 명이면 되는지, 두 명이 모자란지 세어 봅니다."
 },
 mafioso:{
  closed:"사람들 앞에서 대놓고 칼을 꺼내면, 둘 이상만 봐도 그 자리에서 붙잡힙니다. 숨은 자리에서 권총을 쏘면 쏜 사람의 모습은 들키지 않습니다. 총성은 바로 옆 장소까지만 들립니다.",
  hunger:"마을 사람들이 사라진 폭약을 찾고 있습니다. 그 의심을 다른 사람에게 돌릴 수 있습니다. 폭약 하나를 밤에 시민의 집에 몰래 놓으면, 다음 날 그 집주인이 의심받습니다.",
  crisis:"흔적을 조사하는 사람들이 모은 것이 당신을 가리키기 시작했을지도 모릅니다. 불침번에게 얼굴을 들켰다면 회관에서 그 이름이 나옵니다. 쓰러뜨린 사람도 다음 낮이 끝날 때까지는 누가 살려 낼 수 있습니다.",
  final:"이제는 숨기는 것보다 끝내는 것이 중요합니다. 사람 수만 맞으면 들켜도 이깁니다. 오늘 밤이 마지막 밤입니다. 탄환을 아낄 이유가 없습니다."
 },
 consigliere:{
  closed:"폭약 이야기가 나올 때 누가 가장 덜 놀랐는지 기억해 두십시오. 술집 뒤의 노조 장부에는 도일이 누구의 돈을 거절했는지 적혀 있습니다. 그 장부를 누가 들여다보는지 지켜보십시오.",
  hunger:"소문이 돌기 시작했습니다. 회관에서 당신 편이 고발당하면 말로 막아야 합니다. 너무 열심히 감싸면 그것만으로 의심받습니다.",
  crisis:"이제 누가 무엇을 아는지 대강 보입니다. 내일 회관에서 고발될 이름은 오늘 정해집니다.",
  final:"오늘은 말 한마디가 표 하나입니다. 절반까지 한 명이 모자랄 때는 해먼드 한 사람을 끌어들이는 것이 가장 확실합니다. 당신 편이 갱도에서 일을 벌인다면 그 자리에 당신이 있어서는 안 됩니다."
 },
 kidnapper:{
  closed:"화약고를 보러 오는 사람은 대개 혼자입니다. 폭약을 찾아 나선 사람을 막아야 합니다. 다만 막는 것만으로도 그곳에 무언가 있다고 알려 주는 셈입니다.",
  doyleHeld:"도일 곁에 지키는 사람이 서 있습니다. 그 사람을 먼저 붙들어 두면 같은 편이 도일에게 손을 뻗을 틈이 생깁니다.",
  crisis:"이 마을에는 사람을 붙드는 사람이 또 있습니다. 구금실 열쇠를 가진 간수입니다. 간수가 당신을 먼저 붙들면 그 턴에는 큰 행동을 할 수 없습니다. 증거를 들고 회관으로 가는 사람이 있다면 도착하기 전에 붙들 수 있습니다.",
  final:"마지막 재판을 이끄는 사람이 회관에 오지 못하면 재판의 흐름이 달라집니다. 의사가 붙들리면 쓰러진 사람은 일어나지 못합니다. 당신은 그 가운데 한 사람만 고를 수 있습니다."
 }
};
// 그 판의 상황에 따라 달라지는 첫 줄. 마피아 편과 시민 편이 아는 범위가 다르다.
function situation(s,p){const x=q(s),d=x.doyle,m=p.team==='mafia',a=z(s).arc||{};
 if(x.exploded)return '갱도 입구가 무너졌습니다. 그 소리는 마을 어디서나 들렸습니다.';
 if(d.hp<=0&&d.deathReported)return '도일이 죽었다는 말이 마을에 퍼졌습니다. 노조는 대표를 잃었습니다.';
 if(x.secured)return '마을에서 찾은 폭약 두 개가 회관에 봉인되었다는 말이 돕니다. 갱도는 다시 열렸습니다.';
 if(d.cowed)return x.everClosed?(m?'도일이 노조를 넘기기로 했습니다. 갱도의 폐쇄 팻말은 내려갔습니다.':'갱도의 폐쇄 팻말이 내려갔습니다. 도일은 이유를 말하지 않습니다.'):(m?'도일이 노조를 넘기기로 했습니다. 갱도는 닫히지 않았습니다.':'도일은 화약고를 끝내 열어 보이지 않았고, 갱도는 그대로 돌아갑니다.');
 if(x.mineClosed&&a.closedDay!=null&&s.day-a.closedDay>=2)return '갱도가 닫힌 지 며칠째입니다. 품삯이 끊긴 광부들의 외상이 늘어 갑니다.';
 if(x.mineClosed)return m?'도일이 화약고의 빈 칸을 보았고 갱도는 닫혔습니다. 마을이 폭약을 찾기 시작했습니다.':'도일이 화약고에서 폭약 두 개가 사라진 것을 알고 갱도를 닫았습니다. 일을 못 하는 광부들의 품삯이 끊겼습니다.';
 return '갱도는 열려 있고 광부들은 일터로 갑니다.';
}
// 아침마다 아직 이야기하지 않은 상황 하나를 골라 직업의 눈으로 들려준다. 새로 할 이야기가 없으면 아무것도 보내지 않는다.
const URGENT=['exploded','final','armed','doyleDead','doyleCowed','secured'],FLOW=['closed','hunger','open','moved','planted','doyleThreatened','doyleHeld','truth2','truth3','crisis'];
function roleStory(s,p){const told=(p.toldTags??=[]),first=(p.tagFirst??={}),R=roleStories[p.role]||{},T=teamStories[p.team==='mafia'?'mafia':'town'];let tags=arcTags(s,p);if(tags.includes('truth3'))tags=tags.filter(t=>t!=='truth2');for(const t of tags)if(first[t]==null)first[t]=s.epoch;
 const key=t=>URGENT.includes(t)?[0,URGENT.indexOf(t),0]:[1,first[t],FLOW.indexOf(t)];tags.sort((a,b)=>{const A=key(a),B=key(b);return A[0]-B[0]||A[1]-B[1]||A[2]-B[2];});
 for(const tag of tags){if(told.includes(tag))continue;const raw=R[tag]||T[tag];if(!raw)continue;const t=typeof raw==='function'?raw(s,p):raw;told.push(tag);if(tag==='truth3')told.push('truth2');const sit=situation(s,p),fresh=p.lastSituation!==sit;p.lastSituation=sit;return dayLine(s)+(fresh?' '+sit:'')+'\n'+t;}
 return null;}
function roleLead(s,p){const h=roleDays[p.role]?.[Math.min(4,s.day-1)];if(!h)return;const key=p.id+':'+s.day;if(z(s).roleSeen[key])return;z(s).roleSeen[key]=true;p.personalLead={place:h[0],title:h[1],action:h[2],done:false,day:s.day,source:'story/scenes/jobs_expanded.md',isGuidance:true};const t=s.day>=2?roleStory(s,p):null;if(t)D.emit(s,[p.id],t,{private:true,source:'story/story_jobs.md'});}
// 장소 글 끝에 지금 이 자리에 있는 NPC를 알려 준다(밤 주택가 제외).
function environmentText(s,p){const base=placeText(s,p),x=q(s);let extra='';if(p.location==='hall'&&x.announcedDay===s.day&&s.turn===0&&x.doyle.hp>0&&x.doyle.location==='hall')extra+=' 도일 공지: '+(x.secured?'폭약 2개 모두 회수. 가져간 사람은 아직 마을에 있음.':'화약고 폭약 2개가 없어짐. 찾기 전까지 갱도 폐쇄.');const out=((base||'')+extra).trim();return out||null;}
/* 2026-11-23 사용자 새 방향: 장소 글은 분위기 대신 지금 상태만 짧게. 알릴 것이 없으면 null */function placeText(s,p){const x=q(s),n=x.doyle;
 if(s.turn===2&&!(p.location==='warehouse'&&(x.exploded||x.fuse?.status==='armed')))return null;
 if(p.location==='warehouse'){if(x.fuse?.status==='armed'&&!x.exploded)return '갱도 안쪽에서 타는 냄새와 연기.';if(x.exploded)return '갱도 입구가 무너져 막힘.';if(n.location==='warehouse'&&n.hp===0)return '갱도 입구에 도일의 시신.';if(x.mineClosed)return '갱도 폐쇄 중.';return x.discovered&&x.everClosed?'갱도 폐쇄가 풀림.':null;}
 if(p.location==='chapel')return z(s).signals.some(e=>e.kind==='candles')?'제단 위 촛대 셋이 삼각형으로 놓여 있음.':z(s).flags.cacheDisturbed?'종탑 아래 흙이 파헤쳐져 있음.':null;
 if(p.location==='tavern')return D.npc(s,'barkeep')?.hp<=0?'술집 주인 사망.':n.hp===0&&n.deathReported?'도일 사망 · 새 노조 대표 이야기가 돎.':n.cowed?'도일이 노조를 넘겼다는 소문.':null;
 if(p.location==='clinic'){const ns=Object.values(z(s).npcs).filter(n=>n.location==='clinic'&&n.hp>0&&n.hp<10);return (ns.length?'치료 대기: '+ns.map(n=>n.name).join(', ')+' · ':'')+'붕대 '+z(s).stock+'개 남음.';}
 if(p.location==='hall'){if(x.mayor.hp===0&&x.mayor.deathReported)return '해먼드 사망.';if(x.mayor.hp>0&&x.mayor.location!=='hall')return '해먼드가 회관에 없음.';return null;}
 if(p.location==='rail')return D.npc(s,'merchant')?.hp>0?'암거래 상인이 있음.':'암거래 상인이 없음.';
 if(p.location==='union')return n.cowed?'광부 이름표 몇 개가 떼어져 있음.':null;
 return null;
}
// 장소에 도착하면 그곳의 NPC가 쓸모 있는 말을 한 번 한다(예전 말 걸기 메뉴에 있던 말).
/* 2026-11-23 사용자: NPC 말은 그 NPC에게 묻는 작은 행동 때만, 수첩 사실 문장으로 짧게. only = 물은 NPC */function npcRemark(s,p,only=null){const x=q(s),st0=z(s),said=(p.npcHeard??=[]);let told=0;const owner=key=>key==='mayorKey'||key==='lead:office'?'mayor':key==='doyleKey'?'doyle':key==='minerReese'||key==='lead:cart'||key==='lead:bridge'?'miner':key==='lead:barrel'?'barkeep':key==='lead:medbox'?'nurse':key==='lead:chapel'?'bellringer':key.startsWith('masked:')?'landlady':key.endsWith(':child')?'child':null;const tell=(key,line,fact)=>{if(only&&owner(key)!==only)return;if(said.includes(key))return;said.push(key);told++;D.emit(s,[p.id],fact.replace(/^[^:]{1,12}의 말: /,''),{tag:D.npc(s,owner(key))?.name||(owner(key)==='child'?'아이':'들은 말')});D.observed(s,p,fact,null,'claim','npc:'+key);};
 if(s.turn===2)return 0;
 if(p.location==='hall'&&x.mayor?.hp>0&&x.mayor.location==='hall'&&!(s.day===1&&s.turn===0))tell('mayorKey','해먼드가 조끼 주머니에서 열쇠를 꺼내 보입니다. "내 화약고 열쇠는 여기 있소. 리스가 갖고 있던 열쇠는 아직 아무도 못 찾았소."','해먼드의 말: 해먼드의 화약고 열쇠는 그가 갖고 있다. 리스가 갖고 있던 열쇠는 행방을 모른다. 화약고가 부서지지 않았으니 누군가 리스의 열쇠를 가져갔을 수 있다.');
 if(p.location==='warehouse'&&x.doyle?.hp>0&&x.doyle.location==='warehouse'&&(x.mineClosed||x.announced))tell('doyleKey','도일이 허리춤의 열쇠 꾸러미를 손으로 누릅니다. "화약고 열쇠는 셋뿐이오. 나, 시장, 리스. 내 것은 손에서 놓은 적이 없소."','도일의 말: 화약고 열쇠는 도일, 해먼드, 리스 셋이 갖고 있었다. 도일은 자기 열쇠를 놓은 적이 없다고 한다.');
 {const mn=D.npc(s,'miner');if(mn?.hp>0&&mn.location===p.location&&p.location!=='home')tell('minerReese',mn.name+(p.location==='warehouse'&&!q(s).mineClosed?'이 일손을 멈추고 말합니다. ':'이 목소리를 낮춥니다. ')+'"자정쯤 리스가 화약고 쪽으로 가는 걸 봤소. 그 뒤엔 자기 집으로 들어갔지. 누구를 만났는지는 못 봤소."','광부의 말: 리스는 습격 전날 자정쯤 화약고 쪽에 갔다가 자기 집으로 돌아갔다.');}
 {const sp=x.spots||['chapel'],lead={cart:'"간밤에 누가 맨 안쪽 광차를 옮겨 놨소. 바퀴 자국이 새것이오."',barrel:'술집 주인이 목소리를 낮춥니다. "어젯밤 뒷마당 빈 술통 뚜껑이 열려 있었소. 나는 연 적이 없소."',medbox:'간호사가 창고 쪽을 봅니다. "약상자 하나가 어제보다 무거워요. 아무도 새 약을 들여놓지 않았는데요."'},fact={cart:'광부의 말: 간밤에 누군가 갱도 맨 안쪽 광차를 옮겼다.',barrel:'술집 주인의 말: 어젯밤 뒷마당 빈 술통 뚜껑이 열려 있었다.',medbox:'간호사의 말: 진료소 창고의 약상자 하나가 무거워졌다.'};
  const mnr=D.npc(s,'miner'),honest=id=>{const n=D.npc(s,id);return n&&n.hp>0&&n.location===p.location&&!n.recruited;};if((x.rumor?x.rumor.cart:sp.includes('cart'))&&honest('miner')&&p.location!=='home'&&said.includes('minerReese'))tell('lead:cart',mnr.name+'이 덧붙입니다. '+lead.cart,fact.cart);
  /* 소문은 판마다 다르다(있을 수도 없을 수도) */const rum=k=>x.rumor?!!x.rumor[k]:sp.includes(k);
  if(rum('barrel')&&p.location==='tavern'&&honest('barkeep'))tell('lead:barrel',lead.barrel,fact.barrel);if(rum('medbox')&&p.location==='clinic'&&honest('nurse'))tell('lead:medbox',lead.medbox,fact.medbox);
  if(rum('chapel')&&p.location==='chapel'&&x.discovered&&honest('bellringer'))tell('lead:chapel','종지기가 종탑 쪽을 봅니다. "보안관이 죽던 밤 뒤로 종탑 밑 흙이 새로 덮여 있었소. 나는 판 적이 없소."','종지기의 말: 리스가 죽던 밤 뒤로 종탑 밑 흙이 새로 덮여 있었다.');
  if(p.location==='home'&&honest('landlady')&&st0.actions.some(a=>['combat','attackNpc'].includes(a.type)&&a.turn===2&&a.day===s.day-1&&C.find(s,a.who)?.masked))tell('masked:'+s.day,'하숙집 주인이 목소리를 낮춥니다. "간밤 자정 넘어 얼굴을 천으로 가린 사내가 골목을 지나갔소. 마을 사람 걸음이 아니었소."','하숙집 주인의 말: 간밤에 얼굴을 천으로 가린 낯선 사내가 주택가 골목을 지나갔다.');
  /* 새 장소로 이어지는 말(판마다 있을 수도 없을 수도) */if(p.location==='hall'&&x.rumor?.officeLead&&x.mayor.hp>0&&x.mayor.location==='hall'&&!x.mayor.recruited)tell('lead:office','해먼드가 사무소 쪽을 봅니다. "리스는 중요한 건 사무소 책상 서랍에 넣어 두곤 했소."','해먼드의 말: 리스는 중요한 것을 보안관 사무소 책상 서랍에 넣어 두곤 했다.');
  if(x.rumor?.bridgeLead&&honest('miner')&&p.location!=='home'&&said.includes('minerReese'))tell('lead:bridge',mnr.name+'이 말합니다. "선로를 따라 협곡까지 걸어가 봤소. 다리 앞에서 선로가 끊겨 있었소. 무너진 게 아니었소."','광부의 말: 선로는 협곡 다리 앞에서 끊겨 있었다. 무너진 것이 아니었다고 한다.');
  /* 아이가 본 곳은 판마다 다르다(대개는 처음 숨긴 곳이지만, 잘못 봤을 수도 있다) */const cw=x.rumor?.child||sp[0],where={cart:'갱도 쪽으로',barrel:'술집 뒷마당으로',medbox:'진료소 뒤 창고 쪽으로'};if((!only||only==='child')&&p.location==='home'&&!z(s).flags.childSilenced&&cw!=='chapel'&&!z(s).incidents.childWitness?.seen?.includes(p.id)&&(((z(s).incidents.childWitness??={seen:[]}).seen??=[]).push(p.id),true))tell('lead:'+cw+':child','골목에서 놀던 아이가 당신 소매를 잡아당깁니다. "보안관 아저씨가 죽던 밤에, 큰 사람이 무거운 꾸러미를 안고 '+where[cw]+' 가는 걸 봤어. 얼굴은 못 봤어."','아이의 말: 습격 무렵 누군가 무거운 꾸러미를 안고 '+where[cw]+' 갔다.');}
 if((!only||only==='child')&&p.location==='home'&&!z(s).flags.childSilenced&&(x.rumor?.child||(x.spots||['chapel'])[0])==='chapel'&&!z(s).incidents.childWitness?.seen?.includes(p.id)&&(((z(s).incidents.childWitness??={seen:[]}).seen??=[]).push(p.id),true))tell('lead:chapel:child','골목에서 놀던 아이가 당신 소매를 잡아당깁니다. "보안관 아저씨가 죽던 밤에, 큰 사람이 무거운 꾸러미를 안고 교회 쪽으로 가는 걸 봤어. 얼굴은 못 봤어."','아이의 말: 습격 무렵 누군가 무거운 꾸러미를 안고 교회 쪽으로 갔다.');/* 2026-11-19: 아이는 방향만 안다(종탑 밑이라고 집어 말하지 않음) */
 return told;
}
/* 2026-11-23 사용자: 작은 행동 "○○에게 묻기". 새로 할 말이 없으면 그렇다고만 */S.askNpc=function(s,p,id){if(!npcRemark(s,p,id))D.emit(s,[p.id],'새로 들은 것 없음.',{tag:D.npc(s,id)?.name||(id==='child'?'아이':'들은 말')});return null;};
// 아침처럼 모두 집에 있을 때 생긴 장면은, 그 턴에 그 장소로 오는 사람에게 한 번 보여 준다.
function placeScene(s,place,text,skip=[]){(z(s).placeScenes??=[]).push({place,text,day:s.day,turn:s.turn,seen:[...skip]});for(const p of D.audience(s,place))showPlaceScenes(s,p);}
function showPlaceScenes(s,p){for(const e of z(s).placeScenes||[]){if(e.day!==s.day||e.turn!==s.turn||e.place!==p.location||e.seen.includes(p.id))continue;e.seen.push(p.id);D.emit(s,[p.id],e.text,{tag:'사건'});}}
// 숨진 사람을 처음 본 사람에게 시체를 보여 준다(유언이 남아 있으면 품의 종이까지)
function seeBody(s,o,d){if(!o||o.hp<=0||o.id===d.id||!q(s)||!d.deathCause||d.downed)return;const k='body:'+d.id;if((o.directorKnown??=[]).includes(k))return;o.directorKnown.push(k);const left=d.will&&!q(s).wills?.[d.id];D.emit(s,[o.id],(d.deathCause==='재판 처형'?'처형된 '+d.name+'의 시신':d.name+'의 시신')+(left?' · 품에 유언으로 보이는 종이':''),{tag:'본 것'});}
function arrival(s,p){if(!z(s)||p.hp<=0)return false;for(const d of s.players)if(d.hp<=0&&!d.downed&&d.deathCause&&d.id!==p.id&&C.sameSpace(s,p,d))seeBody(s,p,d);D.refreshIncidents(s);const key=p.id+':'+p.location,plain=environmentText(s,p),fresh=z(s).arrivals[key]!==plain;z(s).arrivals[key]=plain;/* 2026-11-21: 기다리는 사건이 여럿이면 도입 글을 모두 */const pendingAll=D.active(s,p).filter(e=>!z(s).incidents[e.id].seen.includes(p.id));for(const pending of pendingAll.slice(1)){z(s).incidents[pending.id].seen.push(p.id);(z(s).incidents[pending.id].intros??={})[p.id]=D.text(s,p,pending.intro);}const pending=pendingAll[0];if(pending){z(s).incidents[pending.id].seen.push(p.id);(z(s).incidents[pending.id].intros??={})[p.id]=D.text(s,p,pending.intro);D.emit(s,[p.id],D.text(s,p,pending.intro),{tag:'사건',incident:pending.id,source:pending.source+':'+pending.sourceLine});}else if(fresh&&plain)D.emit(s,[p.id],plain,{tag:'상황',source:'story/scenes/places_encounters.md'});
 for(const n of Object.values(z(s).npcs).filter(n=>n.location===p.location&&n.hp<10&&s.turn!==2)){const nk='npc-seen:'+n.id+':'+n.hp;if(p.directorKnown.includes(nk))continue;D.observed(s,p,C.pp(n.name,'을','를')+' 이곳에서 보았다. '+(n.hp===0?'움직이지 않는 시신이다.':n.bleeding?'상처에서 피가 계속 흐른다.':'상처를 입었지만 살아 있다.'),null,'observed',nk);D.emit(s,[p.id],n.name+(n.hp===0?' — 쓰러져 움직이지 않음':n.bleeding?' — 출혈 중':' — 다침'),{tag:'본 것'});}
 showPlaceScenes(s,p);/* 2026-11-23 사용자: NPC 말은 묻는 작은 행동(askNpc) 때만 */
 return true;
}
function nextChapter(s){D.merchant?.flush?.(s);const x=q(s),st=z(s);if(s.day>lastDay(s))return false;/* 첫날 낮 2에 도일이 화약고를 연다(발단) */if(!(s.day===1&&s.turn===0))x.discovered=true;updateArc(s);
 if(s.turn===2){D.callMasked(s);for(const p of C.alive(s)){/* 밤에 집으로 들어가는 것은 시민뿐이다. 마피아는 있던 곳에 남아 밤에도 움직인다. */if(p.team!=='mafia'){p.location='home';p.houseId=p.id;p.hidden=false;}else{p.location='hideout';p.houseId=null;p.hidden=false;}const pending=s.offers.some(o=>o.to===p.id&&!o.done),hurt=p.bleeding?' 상처에서 피가 멎지 않습니다. 밤의 경계가 지나기 전에 준비했는지가 중요해졌습니다.':'';/* 2026-11-23 사용자 새 방향: 밤 안내는 마피아의 첫 밤 의논 안내와 출혈·제안 알림만 짧게 */{const alone=p.team==='mafia'&&!C.alive(s).some(o=>o.team==='mafia'&&o.id!==p.id),nk=p.team==='mafia'?(alone?'alone':'mafia'):'town',firstNight=!(p.nightTold??={})[nk];p.nightTold[nk]=true;const lines=[];if(nk==='alone'&&firstNight)lines.push('본거지 · 같은 편 없음.');if(p.bleeding)lines.push('출혈 중: 지혈하지 않으면 체력이 계속 줄어듦.');if(pending)lines.push('답하지 않은 이름 없는 제안이 있음.');if(lines.length)D.emit(s,[p.id],lines.join(' '),{tag:nk==='town'?'상태':'밤'});}}
  for(const n of Object.values(st.npcs).filter(n=>n.hp>0)){if(n.location==='clinic'&&n.hp<10)n.houseId=null;else if(n.nightPost){n.location=n.nightPost;n.houseId=null;}else{n.location='home';n.houseId='npc:'+n.id;}n.escort=null;}return true;}
 if(s.turn===0){informantNews(s);if(st.maskArrived===s.day-1)C.emit(s,C.alive(s).filter(p=>!p.masked).map(p=>p.id),'environment','간밤 마을 밖 길에서 낯선 말발굽 소리가 났다고 함.',{tag:'소문'});for(const m of s.players.filter(m=>m.masked&&m.hp<=0&&m.deathCause&&!m.bodyReported)){m.bodyReported=true;placeScene(s,m.location,'얼굴을 가린 낯선 사내의 시신 발견 — 마을 사람이 아님. 누군가 밖에서 사람을 불러들이고 있음.');}
  for(const p of C.alive(s)){if(p.masked){p.location='hideout';p.houseId=null;p.hidden=false;continue;}if(p.team!=='mafia'||p.houseId||p.location==='hideout'){p.location='home';p.hidden=false;}p.houseId=null;const hits=st.actions.filter(a=>a.type==='combat'&&a.target===p.id&&a.day===s.day-1&&a.turn===2);if(hits.length)D.emit(s,[p.id],p.bleeding?'간밤 습격에서 살아남음 · 출혈 계속(지혈하거나 진료소로).':'간밤 습격에서 살아남음.',{tag:'상태'});roleLead(s,p);}
  if(st.flags.reopenTomorrow&&s.day>=st.flags.reopenTomorrow)x.mineClosed=false;
 }
 /* 도일의 하루: 날짜가 아니라 갱도 상태를 따른다 */const doyleSpot=()=>s.day===1?['hall','warehouse'][s.turn]:s.day>=lastDay(s)?['warehouse','hall'][s.turn]:(!x.announced||x.announcedDay===s.day)?['hall','warehouse'][s.turn]:x.mineClosed?['tavern','warehouse'][s.turn]:['warehouse','tavern'][s.turn];
 for(const n of Object.values(st.npcs)){n.houseId=null;if(n.hp<=0){if(s.turn===0&&!n.deathReported){n.deathReported=true;placeScene(s,n.location,n.deathCause==='explosion'?'무너진 갱도에서 '+n.name+'의 시신 발견(폭발).':n.name+'의 시신 발견.',s.players.filter(p=>p.directorKnown?.includes('npc-seen:'+n.id+':0')).map(p=>p.id));}continue;}if(n.escort&&C.find(s,n.escort)?.hp>0){n.location=C.find(s,n.escort).location;}else if(n.needsClinic&&s.turn===0){n.location='clinic';n.needsClinic=false;}else if(n.location==='clinic'&&n.hp<10){}else if(n.id==='doyle')n.location=doyleSpot();else if(n.id==='mayor')n.location=n.escort?C.find(s,n.escort)?.location||'hall':'hall';else if(n.post)n.location=n.post;else if(!st.flags.minerEntered)n.location=x.mineClosed&&!x.exploded?'tavern':'warehouse';}
 if(x.secured||x.doyle.cowed||st.flags.unionFunded)x.mineClosed=false;
 if(s.day===1&&s.turn===1&&!x.secured&&!x.doyle.cowed){x.mineClosed=true;x.everClosed=true;/* 2026-11-21: 이 자리에서 화약고 안을 본 사람은 도일 설득으로 다시 보지 않는다 */for(const o of D.audience(s,'warehouse'))(x.doyle.magazineShown??={})[o.id]=s.day;D.emit(s,D.audience(s,'warehouse').map(p=>p.id),(x.doyle.hp>0&&x.doyle.location==='warehouse'?'도일이':'광부가')+' 화약고를 엶: 폭약 2개가 없어짐 → 갱도 폐쇄.',{tag:'사건'});}
 if(x.mineClosed)x.everClosed=true;
 if(s.day>=2&&s.turn===0&&!x.announced){x.announced=true;x.announcedDay=s.day;/* 2026-11-23: 회관 종소리 글은 뺌(둘째 날 아침 글이 같은 일을 알림) */}
 /* 협박받은 다음 날 아침에 털어놓는다 */if(x.doyle.threatened&&st.arc?.threatDay!=null&&st.arc.threatDay<s.day&&!x.doyle.cowed&&x.doyle.hp>0&&!x.doyle.disclosed&&s.turn===0){x.doyle.disclosed=true;placeScene(s,x.doyle.location,'도일이 협박장 공개: 노조를 넘기지 않으면 다른 집들도 해치겠다는 내용.');}
 if(x.mayor.threatened&&x.mayor.hp>0&&!x.mayor.disclosed&&s.turn===0){x.mayor.disclosed=true;placeScene(s,x.mayor.location,'해먼드가 이름 없는 협박 쪽지 공개: 회관 문을 닫으라는 내용. 해먼드는 재판을 막지 않음.');for(const a of st.artifacts.filter(a=>a.kind==='threat'&&a.npc==='mayor')){a.public=true;a.where='hall';}}
 if(s.day===lastDay(s)&&s.turn===0)C.emit(s,C.alive(s).map(p=>p.id),'environment','외부 지원이 내일 아침 도착.',{tag:'사건'});D.refreshIncidents(s);for(const p of C.alive(s))arrival(s,p);return true;
}
/* 끌어들인 사람들이 아침마다 마피아에게 전하는 말(어제 낮에 자기 자리에서 본 사람, 간밤의 불침번) */
function informantNews(s){const st=z(s),d=s.day-1;if(d<1)return;const gang=C.alive(s).filter(p=>p.team==='mafia');if(!gang.length)return;const names=ids=>[...new Set(ids)].map(id=>C.find(s,id)?.name).filter(Boolean),at=place=>(st.sightings||[]).filter(e=>e.day===d&&e.place===place),lines=[];
 for(const n of Object.values(st.npcs).filter(n=>n.recruited&&n.hp>0&&n.recruitedDay<=d)){
  const place={barkeep:'tavern',bellringer:'chapel',miner:'warehouse',nurse:'clinic'}[n.id];
  if(n.id==='nurse'){const last={};for(const e of at('clinic'))last[e.id]=e;const list=Object.values(last).map(e=>C.find(s,e.id).name+(e.hp<=2?'(크게 다침)':e.hp<=5?'(다침)':'')+(e.bleeding?'(피를 흘림)':''));lines.push('간호사: '+(list.length?'어제 진료소에 온 사람은 '+list.join(', ')+'입니다.':'어제 진료소에는 아무도 오지 않았습니다.'));}
  else if(place){const who=names(at(place).map(e=>e.id)),pl=C.places[place].short||C.places[place].name;lines.push(n.name+': '+(who.length?'어제 '+pl+'에 온 사람은 '+who.join(', ')+'입니다.':'어제 '+pl+'에는 아무도 오지 않았습니다.'));}
  else if(n.id==='landlady'&&st.watchNight?.day===d){const who=names(st.watchNight.ids);lines.push('하숙집 주인: '+(who.length?'간밤 늦게까지 창에 불이 켜져 있던 집은 '+who.map(x=>x+'의 집').join(', ')+'입니다.':'간밤에는 모든 집의 불이 일찍 꺼졌습니다.'));}
 }
 if(lines.length)D.emit(s,gang.map(p=>p.id),'끌어들인 사람들이 전한 말입니다. '+lines.join(' '));}
function beforeAdvance(s){if(!z(s)||z(s).lastAdvance===s.epoch)return;z(s).lastAdvance=s.epoch;/* 설치한 폭약은 다음 때가 끝날 때 터진다 */{const fz=q(s).fuse;if(fz?.status==='armed'&&fz.armedEpoch!=null&&s.epoch>fz.armedEpoch&&!q(s).hazardPending){fz.status='lit';S.resolveHazard(s);}}for(const n of Object.values(z(s).npcs)){if(n.hp>0&&n.bleeding&&n.injuredEpoch<s.epoch){n.hp=Math.max(0,n.hp-s.cfg.bleedLoss);if(!n.hp){n.bleeding=false;n.diedEpoch=s.epoch;}if(!n.hp)for(const o of D.audience(s,n.location)){(o.directorKnown??=[]);if(!o.directorKnown.includes('npc-seen:'+n.id+':0'))o.directorKnown.push('npc-seen:'+n.id+':0');}D.emit(s,D.audience(s,n.location).map(p=>p.id),n.hp?n.name+'의 상처에서 피가 계속 흐릅니다. 몸을 지탱하기 힘들어 보입니다.':n.name+'이 출혈 끝에 쓰러집니다. 움직임이 멎습니다.');}}D.aftermath(s);}
function afterActions(s,acts,attacks){if(!z(s))return;{const st=z(s);if(s.turn!==2){for(const p of C.alive(s).filter(p=>!p.hidden&&!p.masked&&p.team!=='mafia'))(st.sightings??=[]).push({day:s.day,turn:s.turn,place:p.location,id:p.id,hp:p.hp,bleeding:!!p.bleeding});}else st.watchNight={day:s.day,ids:acts.filter(([id,a])=>a.type==='watch'&&C.find(s,id)?.hp>0).map(([id])=>id)};}for(const p of C.alive(s)){if(!p.storyTravel)continue;p.location=p.storyTravel;p.houseId=null;p.hidden=false;delete p.storyTravel;for(const n of Object.values(z(s).npcs).filter(n=>n.hp>0&&n.escort===p.id)){n.location=p.location;n.houseId=null;}D.localAct(s,p,p.name+'이 '+C.places[p.location].name+'에 도착합니다.');}for(const {p,t,r,event,present} of attacks){const plan=(acts.find(([id])=>id===p.id)||[])[1]||{},house=s.turn===2&&event.location==='home';z(s).actions.push({type:'combat',who:p.id,target:t.id,damage:r.damage,weapon:r.weapon,day:s.day,turn:s.turn,epoch:s.epoch,place:event.location});if(r.damage>0||r.leftTrace)D.artifact(s,{kind:'trace',title:'남은 공격 흔적',where:s.turn===2&&event.location==='home'?'home:'+(t.houseId||t.id):event.location,text:event.time+', '+C.pp(t.name,'이','가')+' 이곳에서 '+({'맨손':'주먹에 맞아','곤봉':'곤봉에 맞아','단검':'단검에 찔려','권총':'총에 맞아'}[r.weapon]||r.weapon+'에')+' 다쳤다.'+(r.leftTrace?' 현장에 떨어진 물건이 '+p.name+'의 것으로 보인다.':'')+(!house&&present?.length?' 그때 이곳에 보이던 사람: '+present.join(', ')+'. 공격한 사람은 이 가운데 있었거나 숨어 있던 사람이다.':'')+(plan.fled?' 공격한 사람의 발자국이 '+C.places[plan.flee].name+' 쪽으로 이어진다.':house?' 공격한 사람은 이 집에서 나간 흔적이 없다. 문 밖 발자국은 주택가 안에서 끊긴다.':'')+(p.reesePistol&&r.weapon===C.weapons.pistol.name?' 박힌 탄환은 보안관이 차던 권총의 것과 같은 구경이다.':'')});}
 for(const [id,a] of acts){const p=C.find(s,id);if(a.type==='move'&&p.hp>0){for(const n of Object.values(z(s).npcs).filter(n=>n.hp>0&&n.escort===id)){n.location=p.location;n.houseId=null;}arrival(s,p);}}
 for(const p of C.alive(s))if(!acts.some(([id,a])=>id===p.id&&a.type==='move'))arrival(s,p);
 D.refreshIncidents(s);
}
function onDeath(s,p){if(!z(s)||p.storyBodyDropped)return;p.storyBodyDropped=true;const where=s.turn===2&&p.location==='home'?'home:'+(p.houseId||p.id):p.location;if(p.items.pistol){D.artifact(s,{kind:'gun',reese:!!p.reesePistol,title:p.name+'이 남긴 권총',where,ammo:p.items.ammo||0,text:p.reesePistol?'리스의 이니셜이 있는 권총':'남겨진 권총'});p.items.pistol=0;p.items.ammo=0;}
 if(p.items.notebook){D.artifact(s,{kind:'notebook',title:'리스의 수첩',where,text:'리스의 수첩. 열쇠 명단과 눌린 연필 글씨가 남아 있다.'});p.items.notebook=0;}
 if(p.items.camera)D.artifact(s,{kind:'camera',title:p.name+'이 남긴 사진기',where,text:'사진기와 촬영된 필름. 사진에 기록된 장면만 볼 수 있다.',photos:JSON.parse(JSON.stringify(p.photos||[]))});
 p.items.camera=0;for(const a of z(s).artifacts.filter(a=>a.owner===p.id&&!a.destroyed&&!a.taken)){a.owner=null;a.where=where;}
 for(const o of s.offers.filter(o=>o.from===p.id&&!o.done)){o.done=true;if(o.amount)p.money+=o.amount;}
}
const topics={hall:[['mayor','reese','해먼드 · 리스와 습격'],['mayor','keys','해먼드 · 열쇠와 근거'],['mayor','rations','해먼드 · 배급과 재판']],warehouse:[['miner','mine','광부 · 갱도와 폭약'],['miner','where','광부 · 직접 본 사람']],tavern:[['barkeep','who','술집 주인 · 오늘 들른 사람'],['barkeep','reese','술집 주인 · 리스의 그날 밤'],['barkeep','rumor','술집 주인 · 요즘 도는 말'],['miner','wages','광부 · 임금과 후원금'],['miner','reese','광부 · 리스의 행적']],clinic:[['nurse','supply','간호사 · 남은 물자'],['nurse','injuries','간호사 · 직접 본 부상']],chapel:[['bellringer','who','종지기 · 오늘 들른 사람'],['bellringer','reese','종지기 · 리스의 장례']],home:[['landlady','night','하숙집 주인 · 간밤의 골목'],['resident','where','이웃 · 밤에 들은 소리'],['child','witness','아이 · 본 것과 못 본 것']],rail:[['merchant','who','암거래 상인 · 다녀간 사람'],['merchant','goods','암거래 상인 · 파는 것']]};
// 장소마다 정해진 질문을 고르는 말 걸기 메뉴는 쓰지 않는다. 사건 속의 물음은 작은 행동으로 고른다(06StoryDirector의 incidentChoices).
function options(s,p){return [];}
function optionsUnused(s,p){if(!z(s)||p.hp<=0||s.turn===2)return [];const opts=[];for(const [person,topic,label] of topics[p.location]||[]){{const nn=D.npc(s,person);if(nn&&!(nn.hp>0&&nn.location===p.location))continue;}opts.push({topic:'npc:'+person+':'+topic,label});}if(q(s).doyle.hp>0&&q(s).doyle.location===p.location){opts.push({topic:'npc:doyle:mine',label:'도일 · 갱도와 협박'});opts.push({topic:'npc:doyle:keys',label:'도일 · 화약고 열쇠'});}
 for(const def of D.active(s,p))for(const o of def.options.filter(o=>o.slot==='free'))if(!z(s).incidents[def.id].answered?.includes(p.id+':'+o.key))opts.push({topic:'incident:'+def.id+':'+o.key,label:o.label});return opts;
}
function talk(s,p,topic){if(!optionsUnused(s,p).some(o=>o.topic===topic))return '지금 이 장소에서 물을 수 없는 내용입니다.';const [kind,who,what]=topic.split(':');if(kind==='incident')return D.resolveIncident(s,p,{incident:who,branch:what},()=>0.5);const x=q(s),st=z(s);let name={mayor:'해먼드',doyle:'도일',miner:'광부',nurse:'간호사',resident:'주민',child:'아이',barkeep:'술집 주인',bellringer:'종지기',landlady:'하숙집 주인',merchant:'암거래 상인'}[who],line='';const bought=D.npc(s,who)?.recruited,visitors=place=>[...new Set(s.events.filter(e=>e.type==='move'&&e.day===s.day&&e.location===place&&e.actor!==p.id&&!(bought&&C.find(s,e.actor)?.team==='mafia')).map(e=>C.find(s,e.actor)?.name).filter(Boolean))],saidVisitors=(seen,place)=>seen.length?'"오늘 '+seen.slice(0,-1).map(x=>x+', ').join('')+C.pp(seen.at(-1),'이','가')+' 다녀갔소. 뭘 하러 왔는지는 묻지 않았소."':'"오늘은 아직 들른 사람이 없소."';
 /* 암거래 상인(2026-11-16): 신용이 가장 앞이라 손님 정보는 말하지 않는다. 물건 이야기는 신용에 따라 다르고, 신용 0이면 판마다 다른 부탁을 한다(물은 사람에게만 그 일이 생긴다) */if(who==='merchant'){const M=D.merchant,m=M?.state(s);if(what==='who')line='"손님 이야기는 하지 않소. 그게 이 장사의 규칙이오."';else if(!M||!m)line='"물건은 있소. 다만 아무에게나 팔지는 않소."';else if(p.team==='mafia'&&m.hostileMafia)line='"당신네 사람들과는 거래하지 않소."';else if(m.locked[p.id])line='"당신에게 팔 물건은 없소."';else if(M.credit(s,p)>=1||m.pending[p.id]>0)line='"물건은 화물칸 안에 있소. 값만 맞으면 되오."';else{line=M.JOBS[m.job].ask;(p.npcHeard??=[]).includes('lead:merchantJob')||p.npcHeard.push('lead:merchantJob');}}
 if(who==='bellringer')line=what==='who'?saidVisitors(visitors('chapel')):'"리스는 교회 뒤뜰에 묻힐 거요. 마지막으로 그 사람을 씻긴 건 간호사요. 몸에 남은 것은 그쪽에 물으시오."';
 if(who==='landlady'){const lastNight=st.actions.filter(a=>['combat','attackNpc'].includes(a.type)&&a.turn===2&&a.day===s.day-1),masked=lastNight.some(a=>C.find(s,a.who)?.masked);line=bought?'"조용한 밤이었소. 다들 문을 일찍 걸었지."':masked?'"자정 넘어 얼굴을 천으로 가린 사내가 골목을 지나갔소. 마을 사람 걸음이 아니었소."':lastNight.length?'"자정 넘어 골목에서 발소리가 났소. 어느 집 쪽인지는 모르겠소."':'"조용한 밤이었소. 다들 문을 일찍 걸었지."';}
 if(who==='barkeep'){if(what==='who'){line=saidVisitors(visitors('tavern'));}else if(bought&&what==='rumor')line='"요즘은 아무 말도 안 듣고 삽니다." 술집 주인이 장부를 서둘러 덮습니다.';else if(what==='reese')line='"리스는 그날 자정 무렵 여기서 한 잔 하고 화약고 쪽으로 갔소. 누구를 만난다는 말은 없었소."';else if(what==='rumor')line=x.doyle.cowed||st.flags.unionFunded?'"노조에 새 돈이 들어왔다는 말이 도오. 도일은 누구 돈인지 말을 안 하오."':x.doyle.threatened?'"도일이 누구한테 협박을 받는다는 말이 있소. 요즘 도일 곁에 누가 드나드는지 보시오."':'"외상 장부가 길어졌소. 돈 걱정하는 광부가 많으니, 누가 그들에게 돈을 쥐여 주는지 보시오."';}
 if(who==='mayor')line=what==='reese'?'"고함과 부서지는 소리를 들었소. 창을 열었을 때는 조용했소. 얼굴을 가렸다는 말은 날이 밝고 들었지, 내가 본 건 아니오."':what==='keys'?'"내 열쇠는 가지고 있소. 리스의 것은 어디 갔는지 모르오. 이름이 명단에 있다고 그날 문을 연 사람이라는 뜻은 아니오."':'"배급은 갱도가 멈춘 동안 버틸 몫이오. 재판은 공개된 고발과 해명 뒤에 표로 정합시다."';
 if(who==='doyle'&&what==='keys')line=D.npc(s,'doyle')?.magazineShown?.[p.id]?'"이미 같이 열어 보지 않았소. 본 그대로요. 리스의 열쇠가 지금 어디 있는지는 나도 모르오."':'"열쇠는 내 손을 떠나지 않소. 정 못 믿겠거든 나를 설득해 보시오. 그럴 만하다 싶으면 같이 화약고를 열어 안을 보여 주겠소."';
 else if(who==='doyle')line=x.doyle.cowed?'"노조 일은 이제 내 손을 떠났소. 더는 묻지 마시오."':s.day===1&&s.turn===0?'"지금 화약고로 가서 문을 열어 보겠소. 아직 잃어버린 수를 확인한 것은 아니오."':x.doyle.threatened?x.doyle.disclosed?'"노조를 넘기라는 협박을 공개했소. 누구를 믿을지는 말이 아니라 곁에서 하는 일을 보겠소."':'"노조를 넘기라는 협박이 왔소. 다른 집들 이름도 적혀 있소. 아직 누구에게까지 말할지 정하지 못했소."':x.secured?'"폭약은 회수했소. 가져간 사람까지 밝혀진 것은 아니오."':'"폭약 두 개가 없어졌소. 열쇠는 나와 시장, 리스가 갖고 있었소. 내 말과 실제 기록이 다르면 직접 비교해 보시오."';
 if(who==='miner'){if(what==='reese')line='"자정쯤 리스가 화약고 쪽으로 가는 걸 봤소. 그 뒤엔 집에 갔지. 누구를 만났는지는 못 봤소."';else if(what==='wages')line=x.doyle.cowed||st.flags.unionFunded?'"노조 쪽에서 새 돈이 들어왔소. 돈을 받았다는 이유만으로 내가 누굴 따르는지 정하지는 마시오."':'"갱도는 닫혔고 임금은 밀렸소. 다른 돈을 받으라지만 누가 주는지부터 알고 싶소."';else if(what==='where')line='"여기서 직접 본 것은 이곳에 들어온 사람뿐이오. 다른 집 안에서 무슨 일이 있었는지는 모르오."';else line=x.exploded?'"갱도 입구가 무너진 걸 봤소. 누가 점화했는지는 그때 곁에 있던 사람에게 물으시오."':'"화약고 문은 부서지지 않았소. 그게 누가 열었는지까지 말해 주지는 않지."';}
 if(who==='nurse')line=what==='supply'?'"붕대는 '+st.stock+'개 남았어요. 지혈할 천과 체력을 회복시키는 치료제는 달라요."':'"직접 이곳에 들어온 부상자만 봤어요. 상처만 보고 어느 편인지 알 수는 없어요."';
 if(who==='child')line=st.flags.childSilenced?'"꿈이었어. 아무것도 못 봤어." 아이가 눈을 내립니다.':(()=>{/* 2026-11-21: 아이가 본 방향 */const dir=({cart:'갱도 쪽으로',barrel:'술집 뒷마당으로',medbox:'진료소 뒤 창고 쪽으로'})[x.rumor?.child||(x.spots||['chapel'])[0]]||'교회 쪽으로';return st.flags.childSpoke?'"긴 외투 입은 사람이 무거운 꾸러미를 안고 '+dir+' 갔어. 얼굴은 못 봤다니까."':'"큰 사람이 무거운 꾸러미를 안고 '+dir+' 가는 걸 봤어. 얼굴은 못 봤어."';})();
 if(who==='resident')line=what==='bell'?st.signals.length?'"종소리를 들었거나 촛대를 봤을 뿐이에요. 누가 무슨 뜻으로 한 건지는 직접 묻지 않았어요."':'"새로 울린 종이나 달라진 촛대를 아직 확인하지 못했어요."':what==='reese'?'"리스를 위해 촛불을 켤 사람은 있겠지요. 그 밤의 얼굴을 직접 봤다는 말은 저는 못 하겠어요."':'"밤의 소리와 얼굴을 본 것은 다르지요. 제가 못 본 사람 이름을 대지는 않을 거예요."';
 /* 2026-11-21 사용자 결정(같은 말은 한 번만): 같은 사람이 같은 대답을 다시 들으면 짧게 */const heard=(p.npcLineHeard??={}),hk=who+'|'+line,again=!!heard[hk];heard[hk]=true;if(again)line=who==='child'?'"전에 말했잖아."':['nurse','resident'].includes(who)?'"전에 말씀드린 그대로예요."':'"전에 한 말 그대로요."';
 /* 같은 턴, 같은 자리에서 같은 NPC가 같은 말을 두 번 하지 않는다 */const npcSaid=(st.npcSaid??={}),sayKey=who+'|'+p.location+'|'+s.epoch+'|'+line;if(npcSaid[sayKey])return null;npcSaid[sayKey]=true;const ids=D.local(s,p).map(p=>p.id);C.emit(s,ids,'speech',line,{name:name+' · NPC',npc:true,authored:true});if(!again)for(const o of D.local(s,p))D.observed(s,o,name+': '+line,null,'claim','npc:'+topic+':'+line);/* 2026-11-21: 옆에서 들은 사람도 들은 것으로 */for(const o of D.local(s,p))(o.npcLineHeard??={})[hk]=true;return null;
}
function speakTopic(s,p,t){/* 말 걸기 메뉴는 숨겨도, 대화 칸에서 이름을 부르면 대답한다. 여기서는 무엇을 물었는지만 정한다 */const available=optionsUnused(s,p);const person=/상인|암거래/.test(t)?'merchant':/하숙/.test(t)?'landlady':/종지기|종 치는/.test(t)?'bellringer':/술집 ?주인|주인장|주인/.test(t)?'barkeep':/도일/.test(t)?'doyle':/해먼드|시장/.test(t)?'mayor':/간호사/.test(t)?'nurse':/아이/.test(t)?'child':/광부/.test(t)?'miner':/주민|이웃/.test(t)?'resident':null;if(!person)return false;const subject=person==='merchant'?(/물건|팔|값|총|칼|사고|사려/.test(t)?'goods':'who'):person==='landlady'?'night':['barkeep','bellringer'].includes(person)&&/누가|누구|들른|왔|손님/.test(t)?'who':person==='barkeep'&&/소문|요즘|도는/.test(t)?'rumor':/리스|보안관|습격/.test(t)?'reese':/열쇠/.test(t)?'keys':/돈|임금|임금/.test(t)?'wages':/붕대|약|물자/.test(t)?'supply':/종|촛/.test(t)?'bell':/어디|봤|보았/.test(t)?'where':null;const candidate=available.find(o=>o.topic==='npc:'+person+':'+subject)||available.find(o=>o.topic.startsWith('npc:'+person+':'));return candidate?.topic||null;}
function speak(s,p,t){const topic=speakTopic(s,p,t);if(!topic)return false;talk(s,p,topic);return true;}
function projection(s,p){const here=n=>n.location===p.location&&!(s.turn===2&&p.location==='home'&&p.houseId!=='npc:'+n.id);p.npcSeen??={};const cast=Object.values(z(s).npcs).map(n=>{const h=here(n);if(h)p.npcSeen[n.id]={place:n.location,time:C.label(s)};const seen=p.npcSeen[n.id];return {id:n.id,name:n.name,title:n.title||'',here:h,hp:h?n.hp:null,bleeding:h&&n.bleeding,dead:n.hp<=0&&(h||!!n.deathReported),lastSeen:!h&&seen?seen:null};});
 return {cast,journal:D.journal(s,p),npcs:Object.values(z(s).npcs).filter(n=>n.location===p.location&&!(s.turn===2&&p.location==='home'&&p.houseId!=='npc:'+n.id)).map(n=>({id:n.id,name:n.name,hp:n.hp,bleeding:n.bleeding})),stock:p.location==='clinic'?z(s).stock:null,artifacts:D.ownArtifacts(s,p).map(a=>({id:a.id,title:a.title||'보관한 종이',text:a.text})),papers:p.location==='hall'?z(s).printed.filter(e=>e.posted&&!e.removed).map(e=>({id:e.id,headline:e.headline})):[]};}
/* 장소 안내(2026-11-16 사용자 요청): 도착하면 가운데 창으로, 이동할 곳을 고를 때는 고른 곳의 정보로 보여 준다(나중에 지도에서 누르면 나올 창).
   플레이어가 화면에서 볼 수 있는 것만 담는다. 다른 장소는 지금 누가 있는지 알려 주지 않고 "주로 만나는 사람"만 적는다. */
const GUIDE_WHY={hall:'고발장을 내고 재판을 여는 곳입니다. 해먼드 시장이 마을 일을 맡고 있습니다.',warehouse:'입구 옆에 화약고가 있습니다.',tavern:'광부들이 모이는 술집입니다. 손님과 소문이 드나듭니다.',clinic:'붕대를 사고 상처를 치료하는 곳입니다.',chapel:'종지기가 지키는 작은 교회입니다.',home:'내 집과 이웃집이 있는 주택가입니다. 리스의 빈집도 이곳에 있습니다.',rail:'끊긴 선로 끝, 화물칸이 서 있는 곳입니다.',office:'리스가 쓰던 보안관 사무소입니다.',union:'도일과 광부들의 노조 사무실입니다.',bridge:'선로가 끊긴 협곡입니다.'},
 GUIDE_USUAL={hall:['mayor'],warehouse:['doyle','miner'],tavern:['barkeep','miner'],clinic:['nurse'],chapel:['bellringer'],home:['landlady','resident','child'],rail:['merchant']},
 GUIDE_NAME={mayor:'해먼드 시장',doyle:'도일',miner:'젊은 광부',barkeep:'술집 주인',nurse:'간호사',bellringer:'종지기',landlady:'하숙집 주인',resident:'이웃',child:'아이',merchant:'암거래 상인'},
 GUIDE_COMMON=['observe','evidence','hide','unhide','investigate','attack','track','jail','give','wait','move','disguise','bandage'];
function placeGuide(s,p){if(!z(s)||!p||p.hp<=0)return null;const heard=s.feed.some(e=>e.to.includes(p.id)&&/폭약/.test(String(e.text))&&/두 개/.test(String(e.text))),places={};
 const asksAt=k=>{const m={};for(const [who,,label] of topics[k]||[])(m[who]??=[]).push(label.split(' · ')[1]);if(k==='warehouse')m.doyle=['갱도와 협박','화약고 열쇠'];return m;};
 for(const [k,pl] of Object.entries(C.places)){if(pl.secret)continue;const asks=asksAt(k);
  places[k]={name:pl.name,here:false,why:GUIDE_WHY[k]+(k==='warehouse'&&heard?' 폭약 두 개가 없어졌다는 그 화약고입니다.':''),
   feature:[pl.light<0?'어두워서 주변을 살피기 어렵습니다(살피기 −2).':pl.light>0?'밝아서 숨기 어렵습니다(숨기 −2).':'',pl.cover?`숨을 곳이 있어 숨기 쉽습니다(숨기 +${pl.cover}).`:''].filter(Boolean).join(' '),
   people:(GUIDE_USUAL[k]||[]).map(id=>({name:GUIDE_NAME[id],asks:asks[id]||[]})),only:[],now:''};}
 const cur=places[p.location];if(cur&&s.turn!==2){cur.here=true;const m={};for(const o of optionsUnused(s,p)){const who=o.topic.split(':')[1];(m[who]??=[]).push(o.label.split(' · ')[1]);}
  cur.people=Object.entries(m).map(([id,asks])=>({name:GUIDE_NAME[id]||id,asks:[...new Set(asks)]}));
  const seen=new Set();for(const a of [...C.choices(s,p.id,'big'),...C.choices(s,p.id,'small'),...(S.choices(s,p,'big')||[]),...(S.choices(s,p,'small')||[])]){if(a.target||a.type==='wait'||a.verb==='attackNpc'||a.type!=='scene'&&GUIDE_COMMON.includes(a.type)||!a.label||seen.has(a.label))continue;seen.add(a.label);cur.only.push({label:a.label,hint:a.hint||''});}
  const ev=s.feed.filter(e=>e.to.includes(p.id)&&e.epoch===s.epoch&&(e.localEvent||e.kind==='environment')).at(-1);cur.now=ev?C.korean(s,ev.localSummary||ev.text):'';}
 return {here:p.location,places};}
S.placeGuide=placeGuide;
S.nextChapter=nextChapter;S.arrival=arrival;S.npcOptions=options;S.talk=talk;S.speak=speak;S.speakTopic=speakTopic;
S.fallen=function(s,p){base.fallen(s,p);onDeath(s,p);};
/* 결말: 승패 한 줄 + 광산 · 도일 · 진상 한 줄씩 */const baseEnding=S.ending;S.ending=function(s,r){const head=baseEnding(s,r);if(!q(s)||!['town','mafia'].includes(r.team))return head;const x=q(s),d=x.doyle,won=r.team==='mafia',tr=Math.max(0,...s.players.filter(p=>p.team!=='mafia').map(truthOf));return [head,x.exploded?'무너진 갱도 입구 앞에서 광부들이 삽을 듭니다. 다시 파려면 몇 해가 걸릴 것입니다.':won?'갱도 입구에는 처음 보는 회사 간판이 걸립니다. 회관의 표결 기록은 깨끗합니다. 바깥의 법도 손댈 수 없습니다.':'갱도 입구 팻말에는 여전히 블랙 리지의 이름이 적혀 있습니다.',d.hp<=0?'도일의 열쇠는 주인을 잃었습니다.':d.cowed?'도일은 갱도 앞에서 남의 장부를 들고 서 있습니다. 광부들과 눈을 맞추지 않습니다.':won?'도일은 끝까지 노조를 넘기지 않았지만, 표는 그의 편이 아니었습니다.':'도일이 목에 건 열쇠로 갱도 문을 엽니다.',won||tr<2?'리스의 죽음은 "떠돌이 무리의 짓"으로 기록됩니다. 수첩은 증거품 상자에서 다시 나오지 않습니다.':tr>=3?'주 경찰이 리스의 수첩을 받아 듭니다. 화약고를 연 것이 마을 안의 열쇠였다는 것까지 밝혀졌습니다.':'주 경찰이 리스의 수첩을 받아 듭니다. 리스가 폭약 도둑을 보고 죽었다는 것까지 밝혀졌습니다.'].join('\n');};
const originalAccept=C.accept;C.accept=function(s,id,offerId,yes,fact){const offer=s.offers.find(o=>o.id===offerId),money=offer?.amount||0,wasDone=offer?.done,err=originalAccept(s,id,offerId,yes,fact);if(!err&&!wasDone&&offer?.done){if(money){const recipient=C.find(s,yes?id:offer.from);if(recipient)recipient.money+=money;}z(s).actions.push({type:'recruit-answer',who:id,accepted:yes,epoch:s.epoch,day:s.day,turn:s.turn});const me=C.find(s,id),mates=s.players.filter(o=>o.team==='mafia'&&o.id!==id&&o.hp>0);D.emit(s,[id],yes?'쪽지에 답했습니다. 이제 당신은 마피아 편입니다. 같은 편: '+(mates.map(o=>o.name+'('+C.roles[o.role].name+')').join(', ')||'없음')+'. 직업과 이미 알던 사실은 그대로이고, 이제 마피아의 승리 조건을 따릅니다.':'이름 없는 제안을 거절했습니다. 받은 내용은 수첩에 남아 있으며 공개할지는 직접 정합니다.');if(yes){(C.learn(s,id,'같은 편: '+(mates.map(o=>o.name).join(', ')||'없음'),null,'영입되며 안 사실','observed')||{}).teamOnly=true;for(const o of mates){(C.learn(s,o.id,me.name+'이 영입되어 같은 편이 되었다.',id,'같은 편 소식','observed')||{}).teamOnly=true;}}}return err;};
const originalJudge=C.judge;C.judge=function(s){const trial=s.trial?JSON.parse(JSON.stringify(s.trial)):null,result=originalJudge(s);if(trial&&s.verdict){const rec={id:trial.id,target:trial.target,day:s.day,epoch:s.epoch,guilty:s.verdict.guilty,evidence:trial.evidence||[],reason:trial.reason};z(s).trials.push(rec);if(rec.guilty)z(s).executions.push(rec);const target=C.find(s,rec.target);/* 2026-11-23: 판결은 [재판] 한 줄로 이미 알린다 */}return result;};
const originalHazard=S.hazardAction;S.hazardAction=function(s,p,a,rng){const err=originalHazard(s,p,a,rng);if(!err&&a==='extinguish'&&q(s).fuse?.status==='extinguished'){z(s).flags.extinguishedBy=p.id;D.localAct(s,p,p.name+'이 도화선의 불꽃을 밟아 끕니다. 장화 밑창에 그을음이 남았습니다.');}return err;};
const originalExplosion=S.resolveHazard;S.resolveHazard=function(s){const ids=q(s).fuse?.status==='lit'?C.alive(s).filter(p=>p.location==='warehouse').map(p=>p.id):[];if(ids.length)z(s).blastVictims=ids;originalExplosion(s);if(q(s).exploded)for(const n of Object.values(z(s).npcs).filter(n=>n.location==='warehouse')){n.hp=0;n.bleeding=false;n.diedEpoch=s.epoch;}D.refreshIncidents(s);};
const oldPublish=root.NoirPress.publish;root.NoirPress.publish=function(s,p,a){const before=s.newspapers.length;oldPublish(s,p,a);if(s.newspapers.length>before){const paper=s.newspapers.at(-1);z(s).actions.push({type:'newspaper',who:p.id,paper:paper.id,day:s.day,epoch:s.epoch});D.emit(s,D.local(s,p).map(o=>o.id),'신문을 펼친 주민이 사진과 글을 번갈아 봅니다. "찍힌 장면과 기사가 주장하는 것이 같은지는 따로 봐야겠군요." 신문은 오른쪽 신문함에 남습니다.',{newspaper:paper.id,source:'story/scenes/actions_social.md'});}};
Object.assign(D,{seeBody,updateArc,truthOf,bombState,arcTags,roleStory,arcPhase:s=>z(s)?.arc?.phase||'start',arrival,nextChapter,beforeAdvance,afterActions,onDeath,roleLead,projection,options,talk,speak});
})(globalThis);
