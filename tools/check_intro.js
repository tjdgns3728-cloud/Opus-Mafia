const path=require('path');const dir=process.argv[2]||path.join(__dirname,'..','game','games','noir-trpg','scripts');
for(const f of ['00World.js','01Narrative.js','02Press.js','03Visuals.js','04Incidents.js','05Scenarios.js','06StoryDirector.js','07StoryActions.js','08StoryFlow.js'])require(dir+'/'+f);
const C=globalThis.NoirTRPG;let seed=7;const rng=()=>{seed=(seed*1103515245+12345)%2147483648;return seed/2147483648;};
for(const n of [8,12]){
 const seats=Array.from({length:n},(_,i)=>({id:'p'+i,name:'주민'+i,bot:i>0}));
 const s=C.create(seats,rng,{});
 if(!s.scenario)globalThis.NoirScenarios.start(s);
 console.log('=== players',n,'roles:',s.players.map(p=>p.role).join(','));
 for(const p of s.players){const lines=s.feed.filter(e=>e.to.includes(p.id)&&e.kind==='story').map(e=>e.text);console.log('\n['+p.role+'] lines:',lines.length);if(n===8&&(p.role==='mafioso'||p.role==='sheriff'))console.log(lines[lines.length-1]);}
}
{const seats=Array.from({length:8},(_,i)=>({id:'p'+i,name:'주민'+i,bot:i>0}));const s=C.create(seats,rng,{});const sh=s.players.find(p=>p.role==='sheriff');console.log('sheriff notebook:',sh.items.notebook||0,'| sheriff hall small choices:',globalThis.NoirScenarios.choices(s,sh,'small').map(a=>a.label).join(','));const st=globalThis.NoirStory;if(st&&st.start)console.log('NoirStory.start exists');}
