// 2026-11-25 고침 분신 7: 대화 칸(chat-scroll)도 다시 불러오면 첫 글에 멈췄다(데스크톱 0/621/313, 휴대폰 0/579/74).
// 이야기 칸(story_scroll_test.js)과 같은 방식 — 끝을 따라갈지는 사람이 직접 굴렸을 때만 바꾼다. 사용: node chat_scroll_test.js <저장소 경로>
const fs=require('fs'),path=require('path');const dir=path.join(path.resolve(process.argv[2]||'.'),'game','games','noir-trpg','scripts');
for(const f of ['00World','01Narrative','02Press','04Incidents','05Scenarios','06StoryDirector','07StoryActions','08StoryFlow','09Minds'])require(path.join(dir,f+'.js'));
const classes={};globalThis.WebEngine={room(){},Component:class{},define(n,c){classes[n]=c;}};
for(const f of ['03Visuals','20Interface'])new Function('WebEngine',fs.readFileSync(path.join(dir,f+'.js'),'utf8'))(globalThis.WebEngine);
const UI=classes.TRPGUI;const ok=(c,m)=>{console.log((c?'통과 ':'실패 ')+m);if(!c)process.exitCode=1;};
ok(typeof UI==='function','화면 클래스를 읽음');if(typeof UI?.prototype?.followChat!=='function'||typeof UI.prototype.chatScrolled!=='function'){ok(false,'대화 칸 끝 따라가기 메서드(followChat·chatScrolled)가 없음');process.exit(1);}
const make=box=>{const u=Object.create(UI.prototype);u.chatStick=true;u.chatHeld=false;u.el=id=>id==='chat-scroll'?box:null;return u;};
const at=(st,sh,ch)=>({scrollTop:st,scrollHeight:sh,clientHeight:ch});
{const b=at(0,621,313),u=make(b);u.followChat();ok(b.scrollTop===621,'다시 불러온 뒤 첫 글에 멈춘 대화 칸을 끝으로 내림 ('+b.scrollTop+')');}
{const b=at(0,579,74),u=make(b);u.followChat();ok(b.scrollTop===579,'휴대폰 실측(0/579/74)도 끝으로');}
{const b=at(57,621,264),u=make(b);u.chatUserAt=performance.now();u.chatScrolled(b);ok(u.chatStick===false,'사람이 굴려 위로 올리면 따라가기를 멈춤');u.chatUserAt=performance.now()-5000;u.followChat();ok(b.scrollTop===57,'멈춘 동안에는 끝으로 끌어내리지 않음');}
{const b=at(357,621,264),u=make(b);u.chatStick=false;u.chatUserAt=performance.now();u.chatScrolled(b);ok(u.chatStick===true,'사람이 끝까지 내리면 다시 따라감');}
{const b=at(0,621,313),u=make(b);u.chatScrolled(b);ok(u.chatStick===true,'사람이 굴리지 않은 위치 변화는 따라가기를 바꾸지 않음');}
{const b=at(100,621,264),u=make(b);u.chatUserAt=performance.now();u.followChat();ok(b.scrollTop===100,'굴리는 중에는 끝으로 끌지 않음');const c=at(100,621,264),v=make(c);v.chatHeld=true;v.followChat();ok(c.scrollTop===100,'누르고 끄는 중에는 끝으로 끌지 않음');}
{const b=at(357,621,264),u=make(b);u.followChat();ok(b.scrollTop===357,'이미 끝이면 그대로');}
{const t=fs.readFileSync(path.join(dir,'20Interface.js'),'utf8');
 ok(t.includes('chatEnd=!oldChat||this.chatStick!==false'),'그리기 전 대화 칸 끝 판단이 따라가기 표시를 씀');
 ok(t.includes('const ce=this.chatStick!==false;'),'updateStory의 대화 칸도 같은 판단');
 ok(t.includes('tick(){this.followStory();this.followChat();'),'0.5초마다 대화 칸 끝 맞추기');
 ok(/if\(this\.textRoom!==key\)\{this\.storyStick=true;this\.chatStick=true;/.test(t),'판이 바뀌면 대화 칸도 다시 따라감');
 ok(t.includes('this.chatToBottom=false;this.chatStick=true;'),'내가 말을 보내면 다시 따라감');
 ok(t.includes("else if(e.target?.id==='chat-scroll')this.chatScrolled(e.target);"),'대화 칸 스크롤을 받음');}
