(function(){
'use strict';
class NoirSound {
 constructor(){this.enabled=localStorage.getItem('trpg:music-enabled')==='on';this.volume=Number(localStorage.getItem('testimony:volume')||.25);this.track=new Audio('/project/assets/music/background.mp3');this.track.hidden=true;this.track.setAttribute('aria-label','사용자 제공 배경음악');document.body.appendChild(this.track);this.track.loop=true;this.track.preload='auto';this.track.volume=this.volume;this.stage='';}
 async unlock(){if(this.enabled&&this.track.paused)this.track.play().catch(()=>{});try{if(!this.ctx)this.ctx=new (window.AudioContext||window.webkitAudioContext)();await this.ctx.resume();}catch{}}
 async toggle(){this.enabled=!this.enabled;localStorage.setItem('trpg:music-enabled',this.enabled?'on':'off');if(this.enabled)await this.unlock();else this.track.pause();}
 setVolume(v){this.volume=Math.max(0,Math.min(.7,Number(v)));this.track.volume=this.volume;localStorage.setItem('testimony:volume',this.volume);}
 update(stage,key){this.key=key;this.stage=stage;}
 typeClick(){if(!this.ctx||this.ctx.state!=='running')return;const now=this.ctx.currentTime;if(now-(this.lastType||0)<.06)return;this.lastType=now;const o=this.ctx.createOscillator(),g=this.ctx.createGain();o.type='triangle';o.frequency.setValueAtTime(760,now);o.frequency.exponentialRampToValueAtTime(230,now+.022);g.gain.setValueAtTime(.024,now);g.gain.exponentialRampToValueAtTime(.0001,now+.028);o.connect(g);g.connect(this.ctx.destination);o.start(now);o.stop(now+.03);o.onended=()=>{o.disconnect();g.disconnect();};}

 impact(kind){if(!this.enabled||!this.ctx||this.ctx.state!=='running')return;const c=this.ctx,t=c.currentTime,len=kind==='gun'?.38:kind==='blade'?.22:.3,buffer=c.createBuffer(1,Math.ceil(c.sampleRate*len),c.sampleRate),data=buffer.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=(Math.random()*2-1)*Math.pow(1-i/data.length,kind==='gun'?3:1.5);const source=c.createBufferSource(),filter=c.createBiquadFilter(),gain=c.createGain();source.buffer=buffer;filter.type=kind==='blade'?'highpass':'lowpass';filter.frequency.value=kind==='gun'?2800:kind==='blade'?1500:450;gain.gain.setValueAtTime(Math.min(.4,this.volume)*(kind==='gun'?.9:.65),t);gain.gain.exponentialRampToValueAtTime(.0001,t+len);source.connect(filter);filter.connect(gain);gain.connect(c.destination);source.start(t);source.onended=()=>{source.disconnect();filter.disconnect();gain.disconnect();};if(kind!=='blade'){const o=c.createOscillator(),g=c.createGain();o.frequency.setValueAtTime(kind==='gun'?95:145,t);o.frequency.exponentialRampToValueAtTime(35,t+len);g.gain.setValueAtTime(this.volume*.45,t);g.gain.exponentialRampToValueAtTime(.0001,t+len);o.connect(g);g.connect(c.destination);o.start(t);o.stop(t+len);o.onended=()=>{o.disconnect();g.disconnect();};}}
 destroy(){this.track.pause();this.track.src='';this.track.remove();this.ctx?.close();}
}
globalThis.NoirSound=NoirSound;
})();
