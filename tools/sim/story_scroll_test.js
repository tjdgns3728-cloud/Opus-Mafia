// 2026-11-25 휴대폰 점검 5번: 다시 불러온 뒤 이야기 칸이 첫 글에 멈춤(trpg.css가 늦게 읽혀 첫 그리기의 끝으로 내리기가 먹지 않고,
// 그 뒤 위치만 보는 판단이 "사람이 위로 올림"으로 봄). 끝을 따라갈지는 사람이 직접 굴렸을 때만 바꾼다. 사용: node story_scroll_test.js <저장소 경로>
const fs=require('fs'),path=require('path');const dir=path.join(path.resolve(process.argv[2]||'.'),'game','games','noir-trpg','scripts');
for(const f of ['00World','01Narrative','02Press','04Incidents','05Scenarios','06StoryDirector','07StoryActions','08StoryFlow','09Minds'])require(path.join(dir,f+'.js'));
const classes={};globalThis.WebEngine={room(){},Component:class{},define(n,c){classes[n]=c;}};
for(const f of ['03Visuals','20Interface'])new Function('WebEngine',fs.readFileSync(path.join(dir,f+'.js'),'utf8'))(globalThis.WebEngine);
const UI=classes.TRPGUI;const ok=(c,m)=>{console.log((c?'통과 ':'실패 ')+m);if(!c)process.exitCode=1;};
ok(typeof UI==='function','화면 클래스를 읽음');if(typeof UI?.prototype?.followStory!=='function'||typeof UI.prototype.storyScrolled!=='function'){ok(false,'끝 따라가기 메서드(followStory·storyScrolled)가 없음');process.exit(1);}
const make=(box,tab='story')=>{const u=Object.create(UI.prototype);u.feedTab=tab;u.storyStick=true;u.storyHeld=false;u.el=id=>id==='story-scroll'?box:null;return u;};
const at=(st,sh,ch)=>({scrollTop:st,scrollHeight:sh,clientHeight:ch});
// 다시 불러온 뒤(휴대폰 실측 0/432/226): 끝을 따라가는 중이면 끝으로
{const b=at(0,432,226),u=make(b);u.followStory();ok(b.scrollTop===432,'다시 불러온 뒤 첫 글에 멈춘 칸을 끝으로 내림 ('+b.scrollTop+')');}
// 사람이 위로 올려 읽는 중이면 그대로
{const b=at(100,1400,226),u=make(b);u.storyUserAt=performance.now();u.storyScrolled(b);ok(u.storyStick===false,'사람이 굴려 위로 올리면 따라가기를 멈춤');u.storyUserAt=performance.now()-5000;u.followStory();ok(b.scrollTop===100,'멈춘 동안에는 끝으로 끌어내리지 않음');}
// 사람이 다시 끝까지 내리면 다시 따라감
{const b=at(1174,1400,226),u=make(b);u.storyStick=false;u.storyUserAt=performance.now();u.storyScrolled(b);ok(u.storyStick===true,'사람이 끝까지 내리면 다시 따라감');}
// 칸 크기·CSS 때문에 바뀐 위치(사람 입력 없음)는 무시
{const b=at(0,432,226),u=make(b);u.storyScrolled(b);ok(u.storyStick===true,'사람이 굴리지 않은 위치 변화는 따라가기를 바꾸지 않음');}
// 사람이 굴리는 중(1초 안, 누르고 있음)에는 끝으로 끌지 않음
{const b=at(200,1400,226),u=make(b);u.storyUserAt=performance.now();u.followStory();ok(b.scrollTop===200,'굴리는 중에는 끝으로 끌지 않음');const c=at(200,1400,226),v=make(c);v.storyHeld=true;v.followStory();ok(c.scrollTop===200,'누르고 끄는 중에는 끝으로 끌지 않음');}
// 인물 정보 칸은 위에서 보여 주는 것이 맞음(269줄)
{const b=at(0,1400,226),u=make(b,'person');u.followStory();ok(b.scrollTop===0,'인물 정보 칸은 끌어내리지 않음');u.storyUserAt=performance.now();u.storyScrolled(b);ok(u.storyStick===true,'인물 정보 칸의 스크롤은 따라가기를 바꾸지 않음');}
// 이미 끝이면 건드리지 않음
{const b=at(1180,1400,226),u=make(b);u.followStory();ok(b.scrollTop===1180,'이미 끝이면 그대로');}
// 그리기·글자 찍기·updateStory가 같은 판단(storyStick)을 쓰는지
{const t=fs.readFileSync(path.join(dir,'20Interface.js'),'utf8');ok(t.includes("atEnd=!oldScroll||(this.feedTab!=='person'?this.storyStick!==false:"),'그리기 전 끝 판단이 따라가기 표시를 씀');ok(t.includes('end=this.storyStick!==false;box.innerHTML=this.feedHtml'),'updateStory도 같은 판단');ok(t.includes('follow=box&&this.storyStick!==false;'),'글자 찍기 따라가기도 같은 판단');ok(t.includes('tick(){this.followStory();'),'0.5초마다 끝 맞추기');ok(/if\(this\.textRoom!==key\)\{this\.storyStick=true;/.test(t),'판이 바뀌면 다시 따라감');}
