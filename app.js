(()=>{
// GitHub Pages build: bot data comes AES-256-GCM encrypted from the repo's `data` branch; prices come live from Kraken.
const REPO='WajeehK/crypto-monitor',RAW='https://raw.githubusercontent.com/'+REPO+'/';
(()=>{const m=location.hash.match(/(?:^#|&)k=([A-Za-z0-9_-]{43})/);if(m){localStorage.setItem('ct_k',m[1]);history.replaceState(null,'',location.pathname+location.search)}})();
const $=s=>document.querySelector(s), $$=s=>document.querySelectorAll(s), REFRESH=5000, TZ='Europe/London';
const RM=matchMedia('(prefers-reduced-motion: reduce)').matches;
const TABS=['home','trades','activity','stats'];
let S=null, tab='home', filt='all', failed=0, tf={}, charts={}, posData={}, ICONS=new Set();
fetch('coins/index.json',{credentials:'same-origin'}).then(r=>r.json()).then(a=>{ICONS=new Set(a);if(S)render()}).catch(()=>{});
const ci=(c,sz)=>{c=String(c||'?');const l=c.toLowerCase(),st=sz?` style="--s:${sz}px"`:'';return ICONS.has(l)?`<img class="ci" src="coins/${l}.svg" alt=""${st}>`:`<span class="ci lt"${st}>${esc(c.slice(0,1))}</span>`};
const usd=(v,sign)=>v==null?'—':(sign&&v>0?'+':v<0?'−':'')+'$'+Math.abs(v).toLocaleString('en-GB',{minimumFractionDigits:2,maximumFractionDigits:2});
const pct=v=>v==null?'—':(v>0?'+':v<0?'−':'')+Math.abs(v).toFixed(2)+'%';
const px=v=>{if(v==null)return '—';const a=Math.abs(v);const d=a>=1000?1:a>=10?2:a>=1?3:a>=0.1?5:6;return v.toLocaleString('en-GB',{minimumFractionDigits:d,maximumFractionDigits:d})};
const qty=v=>v==null?'—':v.toLocaleString('en-GB',{maximumFractionDigits:4});
const cls=v=>v>0?'up':v<0?'dn':'mut';
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const pd=t=>t?new Date(String(t).replace(' GMT','Z').replace(' UTC','Z').replace(' BST','+01:00').replace(/^(\d{4}-\d\d-\d\d) /,'$1T').replace(/(\.\d{3})\d+/,'$1')):null;
const ok=d=>d&&!isNaN(d);
const when=t=>{const d=pd(t);return ok(d)?d.toLocaleString('en-GB',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit',timeZone:TZ}):''};
const hm=t=>{const d=pd(t);if(!ok(d))return '';const today=new Date().toDateString()===d.toDateString();return today?d.toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit',timeZone:TZ}):d.toLocaleString('en-GB',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit',timeZone:TZ})};
const dur=(a,b)=>{const x=pd(a),y=b?pd(b):new Date();if(!ok(x))return null;let m=Math.round((y-x)/60000);return m<60?m+'m':(m/60|0)+'h '+(m%60)+'m'};
const reasons={stop:'Stop hit',target:'Target hit',take_profit:'Target hit',time_stop:'Time stop',manual:'Manual close',partial_take_profit:'Partial take profit'};
const KN={CLOSE:'CLOSE',CANCEL:'CANCEL',WARN:'WARN',CROSS:'ALERT',ENFORCE:'FORCE',ERROR:'ERROR',OPEN:'OPEN',watcher:'SYSTEM'};

/* ---------- spring + press ---------- */
function spring(o){const s={x:o.x||0,v:0,target:o.x||0,k:o.k||420,c:o.c||30,on:o.on,raf:0,
 set(t,instant){s.target=t;if(instant||RM){s.x=t;s.v=0;s.on(s.x,0);return}if(!s.raf){let last=performance.now();const f=now=>{const dt=Math.min(.032,(now-last)/1000);last=now;
  const a=-s.k*(s.x-s.target)-s.c*s.v;s.v+=a*dt;s.x+=s.v*dt;s.on(s.x,s.v);
  if(Math.abs(s.v)<2&&Math.abs(s.x-s.target)<.3){s.x=s.target;s.v=0;s.on(s.x,0);s.raf=0;return}s.raf=requestAnimationFrame(f)};s.raf=requestAnimationFrame(f)}}};return s}
document.addEventListener('pointerdown',e=>{const b=e.target.closest('.press');if(!b)return;b.classList.add('down');const up=()=>{b.classList.remove('down');removeEventListener('pointerup',up);removeEventListener('pointercancel',up)};addEventListener('pointerup',up);addEventListener('pointercancel',up)});

/* ---------- liquid dock ---------- */
const dock=$('#dock'),bub=$('#bubble'),tbs=[...$$('.tb')];
let bw=0, sx=0, sy=1, press=1;
function slotX(i){const b=tbs[i];return b.offsetLeft}
function paint(x,v){const st=RM?0:Math.min(.32,Math.abs(v)/2600);sx=1+st;sy=1-st*.45;
 bub.style.transform=`translate3d(${x}px,0,0) scale(${(sx*press).toFixed(3)},${(sy*press).toFixed(3)})`;
 const c=x+bw/2;tbs.forEach(b=>b.classList.toggle('on',c>=b.offsetLeft&&c<b.offsetLeft+b.offsetWidth))}
const bs=spring({k:520,c:34,on:paint});
function sizeBubble(){bw=tbs[0].offsetWidth;bub.style.width=bw+'px';bs.set(slotX(TABS.indexOf(tab)),true)}
function rubber(x){const min=slotX(0),max=slotX(tbs.length-1);if(x<min)return min-Math.pow(min-x,.7);if(x>max)return max+Math.pow(x-max,.7);return x}
function nearest(x){let best=0,d=1e9;tbs.forEach((b,i)=>{const dd=Math.abs(b.offsetLeft-x);if(dd<d){d=dd;best=i}});return best}
let drag=null;
dock.addEventListener('pointerdown',e=>{dock.setPointerCapture(e.pointerId);const r=dock.getBoundingClientRect();drag={x0:e.clientX,moved:false,left:r.left};
 press=1.06;dock.classList.add('drag');bs.set(rubber(e.clientX-r.left-bw/2));if(navigator.vibrate)try{navigator.vibrate(5)}catch(_){}} );
dock.addEventListener('pointermove',e=>{if(!drag)return;if(Math.abs(e.clientX-drag.x0)>4)drag.moved=true;bs.set(rubber(e.clientX-drag.left-bw/2))});
const endDrag=e=>{if(!drag)return;const i=nearest(bs.target);drag=null;press=1;dock.classList.remove('drag');go(TABS[i]);};
dock.addEventListener('pointerup',endDrag);dock.addEventListener('pointercancel',endDrag);
tbs.forEach((b,i)=>b.addEventListener('click',()=>go(TABS[i])));// keyboard

/* ---------- page swipe ---------- */
const main=$('#main');let sw=null;
main.addEventListener('touchstart',e=>{if(e.touches.length!==1||e.target.closest('.pchart,.seg,.wt'))return;const t=e.touches[0];sw={x:t.clientX,y:t.clientY,t:performance.now(),dir:0}},{passive:true});
main.addEventListener('touchmove',e=>{if(!sw)return;const t=e.touches[0],dx=t.clientX-sw.x,dy=t.clientY-sw.y;
 if(!sw.dir){if(Math.abs(dx)>10&&Math.abs(dx)>Math.abs(dy)*1.3)sw.dir=1;else if(Math.abs(dy)>10){sw=null;return}else return}
 const i=TABS.indexOf(tab),ratio=(slotX(1)-slotX(0))/innerWidth;let off=-dx*ratio*1.4;
 bs.set(rubber(slotX(i)+off));const sec=$(`[data-view="${tab}"]`);if(!RM)sec.style.transform=`translate3d(${dx*.35}px,0,0)`;sec.style.opacity=1-Math.min(.35,Math.abs(dx)/900)},{passive:true});
main.addEventListener('touchend',e=>{if(!sw)return;const s=sw;sw=null;const sec=$(`[data-view="${tab}"]`);if(!s.dir)return;
 const dx=(e.changedTouches[0].clientX-s.x),v=dx/(performance.now()-s.t);let i=TABS.indexOf(tab);
 if(dx<-60||v<-.45)i=Math.min(TABS.length-1,i+1);else if(dx>60||v>.45)i=Math.max(0,i-1);
 sec.style.transform='';sec.style.opacity='';go(TABS[i],dx<0?1:-1)},{passive:true});

function go(t,dirHint){const from=TABS.indexOf(tab),to=TABS.indexOf(t);const dir=dirHint||(to>from?1:-1);
 bs.set(slotX(to));if(t===tab){return}tab=t;
 $$('[data-view]').forEach(s=>{s.hidden=s.dataset.view!==t});
 const sec=$(`[data-view="${t}"]`);if(!RM&&sec.animate)sec.animate([{transform:`translate3d(${dir*28}px,0,0)`,opacity:0},{transform:'none',opacity:1}],{duration:380,easing:'cubic-bezier(.2,.9,.25,1)'});
 scrollTo({top:0});requestAnimationFrame(()=>sec.querySelectorAll('.seg').forEach(segMove));if(t==='home')drawCharts();}
$$('[data-goto]').forEach(b=>b.onclick=()=>go(b.dataset.goto));

/* ---------- segmented controls ---------- */
function segMove(seg){const on=seg.querySelector('button.on'),sb=seg.querySelector('.sb');if(!on||!sb)return;sb.style.width=on.offsetWidth+'px';sb.style.transform=`translateX(${on.offsetLeft}px)`}
function segInit(seg,cb){seg.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{seg.querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));segMove(seg);cb(b)}));segMove(seg)}
segInit($('#tfilter'),b=>{filt=b.dataset.f;renderFeed()});

/* ---------- renderers ---------- */
function tradeHTML(t){
 const lo=t.side==='long',w=(t.pnl||0)>0;
 return `<div class="tr" data-tid="${esc(t.id)}"><span class="tg ${w?'w':'l'}">${w?'WIN':'LOSS'}</span>
 <span class="ds">${ci(t.coin,20)}<b>${esc(t.coin)}</b> <span class="${lo?'up':'dn'}">${lo?'Long':'Short'}</span>${t.partial?'<span class="ptag">PARTIAL</span>':''} <span class="mut">${qty(t.size)}</span></span>
 <span class="pv ${cls(t.pnl)}">${usd(t.pnl,1)}</span>
 <span class="sub"><span>${px(t.entry)} → ${px(t.exit)} · ${reasons[t.reason]||esc(t.reason||'Closed')} </span><span>Fees ${usd(t.fees)}${t.opened?' · held '+dur(t.opened,t.time):''}</span><span>${when(t.time)} · equity ${usd(t.equity)}</span></span></div>`}
function logHTML(x){const tm=x.kind==='CLOSE'&&S?S.trades.find(t=>Math.abs((pd(t.time)-pd(x.time))/1000)<20&&x.text.includes(' '+t.coin+' ')):null;
 const cm=(x.text.match(/ ([A-Z]{2,6}) (long|short)/)||x.text.match(/ on ([A-Z]{2,6}) /)||x.text.match(/^([A-Z]{2,6})[ :]/)||[])[1];
 const txt=(cm?ci(cm,18)+' ':'')+esc(x.text).replace(/([+−]\$[\d,.]+)/g,m=>`<span class="${m[0]==='+'?'up':'dn'}">${m}</span>`);
 return `<div class="lr${tm?' lk':''}"${tm?` data-tid="${esc(tm.id)}"`:''}><span class="ic k-${esc(x.kind)}">${KN[x.kind]||esc(x.kind)}</span><span class="tx">${txt}</span><span class="tm">${esc(hm(x.time))}</span></div>`}
function posInfo(p){
 const lo=p.side==='long',sold=(p.original_size||p.size)-p.size;
 let parts='';
 if(p.partials&&p.partials.length){const pr=sold/(p.original_size||1)*100;
  parts=`<div class="parts"><div class="ph"><span><b>Partial exits</b> <span class="mut">· ${qty(sold)} of ${qty(p.original_size)} sold</span></span><b class="${cls(p.partial_pnl)}">${usd(p.partial_pnl,1)} realised</b></div>
  <div class="szbar"><i style="width:${pr}%;background:#ffb020"></i><i style="width:${100-pr}%;background:#1d9bf0"></i></div>
  <div class="szl"><span>Sold ${qty(sold)}</span><span>Remaining ${qty(p.size)}</span></div>
  ${p.partials.map(f=>`<div class="pf"><span class="tg">TP</span><span>${qty(f.size)} @ ${px(f.price)} <span class="mut">· ${hm(f.time)}</span></span><b class="${cls(f.pnl)}">${usd(f.pnl,1)}</b></div>`).join('')}</div>`}
 return {head:`<div class="pt">${ci(p.coin,30)}<span class="cn">${esc(p.coin)}</span><span class="sd ${lo?'long':'short'}">${lo?'LONG':'SHORT'}</span><span class="mut">${p.leverage?p.leverage+'× · ':''}open ${dur(p.opened)||'—'}</span></div>
  <div class="pnlrow"><span class="pnl ${cls(p.upnl)}">${usd(p.upnl,1)}</span><span class="pc ${cls(p.upnl)}">${pct(p.upnl_pct)}</span><span class="mut">unrealised</span></div>`,
 body:`<div class="kvg"><div><span>Entry</span><b>${px(p.entry)}</b></div><div><span>Price</span><b>${px(p.mark)}</b></div><div><span>Size</span><b>${qty(p.size)}${sold>0?`<span class="mut" style="font-weight:500"> / ${qty(p.original_size)}</span>`:''}</b></div>
  <div><span>Stop</span><b class="dn">${px(p.stop)}</b></div><div><span>Target</span><b class="up">${px(p.target)}</b></div><div><span>Notional</span><b>${usd(p.notional)}</b></div></div>${parts}
  <div class="foot2"><span>Entry fee <b>${usd(p.entry_fee)}</b></span><span>To stop <b class="dn">${p.stop&&p.mark?pct((p.stop/p.mark-1)*100):'—'}</b></span><span>To target <b class="up">${p.target&&p.mark?pct((p.target/p.mark-1)*100):'—'}</b></span></div>`}}
function renderPositions(){
 const box=$('#positions'),keys=S.positions.map(p=>p.symbol).join();
 if(!S.positions.length){box.innerHTML='<div class="panel"><div class="empty">Flat — no open positions. Crypto Trader is watching.</div></div>';box.dataset.k='';charts={};return}
 if(box.dataset.k!==keys){box.dataset.k=keys;charts={};
  box.innerHTML=S.positions.map(p=>`<article class="pos" data-sym="${esc(p.symbol)}"><div class="pos-h"></div>
   <div class="seg sm tfseg"><span class="sb"></span><button class="press ${tf[p.symbol]!=='1m'?'on':''}" data-tf="5m">5m</button><button class="press ${tf[p.symbol]==='1m'?'on':''}" data-tf="1m">1m</button></div>
   <div class="pchart"><canvas></canvas></div><div class="pos-b"></div></article>`).join('');
  box.querySelectorAll('.pos').forEach(el=>{const sym=el.dataset.sym;charts[sym]=PosChart(el.querySelector('canvas'));segInit(el.querySelector('.seg'),b=>{tf[sym]=b.dataset.tf;drawCharts()})})}
 S.positions.forEach(p=>{const el=box.querySelector(`.pos[data-sym="${p.symbol}"]`);if(!el)return;const h=posInfo(p);el.querySelector('.pos-h').innerHTML=h.head;el.querySelector('.pos-b').innerHTML=h.body});
 drawCharts()}
function drawCharts(){if(!S)return;S.positions.forEach(p=>{const f=charts[p.symbol];if(!f)return;const one=tf[p.symbol]==='1m';
 const pdx=posData[p.symbol]||{};f({candles:(pdx.tf||{})[one?'1m':'5m']||[],res:one?60:300,mark:p.mark,entry:p.entry,stop:p.stop,target:p.target,opened:p.opened,partials:p.partials})})}
function renderFeed(){const ft=S.trades.filter(t=>filt==='all'||(filt==='win'?(t.pnl||0)>0:(t.pnl||0)<=0));$('#feed').innerHTML=ft.map(tradeHTML).join('')||'<div class="empty">Nothing here.</div>'}
function chart(pts,start){
 const svg=$('#chart');if(!pts.length){svg.innerHTML='';return}
 const p=[{eq:start},...pts],W=600,H=220,pt=18,pb=14,ys=p.map(x=>x.eq),mn=Math.min(...ys,start),mx=Math.max(...ys,start),rg=(mx-mn)||1;
 const X=i=>i/(p.length-1)*W,Y=v=>pt+(1-(v-mn)/rg)*(H-pt-pb),d=p.map((x,i)=>(i?'L':'M')+X(i).toFixed(1)+' '+Y(x.eq).toFixed(1)).join(' ');
 const last=p[p.length-1].eq,col=last>=start?'#00ba7c':'#f91880';
 svg.innerHTML=`<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${col}" stop-opacity=".22"/><stop offset="1" stop-color="${col}" stop-opacity="0"/></linearGradient></defs>
 <line x1="0" x2="${W}" y1="${Y(start)}" y2="${Y(start)}" stroke="#3a3f44" stroke-dasharray="3 5" stroke-width="1" vector-effect="non-scaling-stroke"/>
 <path d="${d} L${W} ${H} L0 ${H}Z" fill="url(#g)" stroke="none"/><path d="${d}" stroke="${col}" stroke-width="2" vector-effect="non-scaling-stroke" style="filter:drop-shadow(0 0 5px ${col})"/>`;
 const tag=$('#ctag');tag.style.left='calc(100% - 4px)';tag.style.top=(Y(last)/H*100)+'%';tag.style.color=col;
 tag.innerHTML=`${usd(last)} <span style="display:inline-block;width:10px;height:10px;border-radius:50%;border:2px solid ${col};background:#000;box-shadow:0 0 14px ${col};position:absolute;right:-1px;top:50%;transform:translate(50%,-50%)"></span>`;
 $('#axhi').textContent=usd(mx);$('#axlo').textContent=usd(mn);$('#chartmeta').textContent=`${pts.length-1} closes`}
function render(){
 if(!S)return;fixHealth();const a=S.account,h=S.health;
 const age=h.age_s==null?'?':h.age_s<90?Math.round(h.age_s)+'s':Math.round(h.age_s/60)+'m';
 $('#meta').innerHTML=`<span>Heartbeat <b class="${h.stale?'bad':''}">${age} ago${h.stale?' · STALE':''}</b></span><span>Cycle <b>${h.cycle_ms??'—'} ms</b></span><span>Mode <b>${esc(h.mode||'—')}</b></span><span>Errors <b class="${h.errors?'bad':''}">${h.errors??'—'}</b></span><span>PID <b>${h.pid??'—'}</b></span>`;
 $('#stats').innerHTML=[['Equity (est)',usd(a.equity),'started at '+usd(a.start),'#1d9bf0',''],['Total P&L',usd(a.total_pnl,1),pct(a.total_pct),a.total_pnl>=0?'#00ba7c':'#f91880',cls(a.total_pnl)],
  ['Win rate',a.win_rate==null?'—':a.win_rate.toFixed(1)+'%',`${a.wins} wins · ${a.trades-a.wins} losses`,'#a78bfa',''],['Unrealised',usd(a.upnl,1),`realised ${usd(a.realised,1)}`,a.upnl>=0?'#00ba7c':'#f91880',cls(a.upnl)]]
  .map(([k,v,s,c,cl])=>`<div class="st" style="--c:${c}"><div class="k">${k}</div><div class="v ${cl}">${v}</div><div class="s">${s}</div></div>`).join('');
 $('#npos').textContent=S.positions.length;loadPosData();renderPositions();chart(S.equity_curve,a.start);
 $('#minilog').innerHTML=S.activity.slice(0,8).map(logHTML).join('')||'<div class="empty">No events.</div>';
 $('#latest').innerHTML=S.trades.slice(0,4).map(tradeHTML).join('')||'<div class="empty">No closed trades yet.</div>';
 renderFeed();$('#tcount').textContent=S.trades.length+' closed';
 $('#act').innerHTML=S.activity.map(logHTML).join('')||'<div class="empty">No notable watcher events.</div>';
 const items=[`<span>Equity <b>${usd(a.equity)}</b></span>`,`<span>P&L <b class="${cls(a.total_pnl)}">${usd(a.total_pnl,1)}</b></span>`,`<span>Win rate <b>${a.win_rate==null?'—':a.win_rate.toFixed(0)+'%'}</b></span>`,
  ...S.positions.map(p=>`<span>${ci(p.coin)}${esc(p.coin)} <b>${px(p.mark)}</b> <b class="${cls(p.upnl)}">${usd(p.upnl,1)}</b></span>`),
  ...S.trades.slice(0,3).map(t=>`<span>Last ${ci(t.coin)}${esc(t.coin)} <b class="${cls(t.pnl)}">${usd(t.pnl,1)}</b></span>`),`<span>Watcher <b class="${h.stale?'dn':'up'}">${h.stale?'stale':'online'}</b></span>`].join('');
 $('#wire').innerHTML=items+items;
 const healthHTML=`<div class="kv"><span>Status</span><b><span class="dot ${h.stale?'bad':''}"></span>${h.stale?'Stale':'Healthy'}</b></div><div class="kv"><span>Last heartbeat</span><b>${age} ago</b></div>
 <div class="kv"><span>Mode</span><b>${esc(h.mode||'—')}</b></div><div class="kv"><span>Cycle time</span><b>${h.cycle_ms??'—'} ms</b></div><div class="kv"><span>Errors in a row</span><b class="${h.errors?'dn':''}">${h.errors??'—'}</b></div><div class="kv"><span>Watcher PID</span><b>${h.pid??'—'}</b></div>`;
 const scoreHTML=`<div class="kv"><span>Closed trades</span><b>${a.trades}</b></div><div class="kv"><span>Wins / losses</span><b>${a.wins} / ${a.trades-a.wins}</b></div><div class="kv"><span>Win rate</span><b>${a.win_rate==null?'—':a.win_rate.toFixed(1)+'%'}</b></div>
 <div class="kv"><span>Best trade</span><b class="up">${usd(a.best,1)}</b></div><div class="kv"><span>Worst trade</span><b class="dn">${usd(a.worst,1)}</b></div><div class="kv"><span>Realised P&amp;L</span><b class="${cls(a.realised)}">${usd(a.realised,1)}</b></div><div class="kv"><span>Last closed equity</span><b>${usd(a.last_closed_equity)}</b></div>`;
 $('#statsMain').innerHTML=`<div class="panel"><div class="lbl"><span>Watcher health</span></div>${healthHTML}<div class="info">${esc(h.info||'')}</div></div>
 <div class="panel"><div class="lbl"><span>Scoreboard</span></div>${scoreHTML}<div class="info">Equity estimate = last closed equity − open entry fees + live unrealised P&amp;L. Partial exits count as separate closed trades. Bot data from ${when(S.server_time)} UK time (end-to-end encrypted via GitHub); prices live from Kraken.</div></div>`;
}
/* ---------- encrypted bot data from GitHub ---------- */
let KEY=null,BLOB=null,lastSlot=0,lastApi=0,lastSha='',netFail=0;const tried=new Set(),tradeMem={};
const b64u=x=>Uint8Array.from(atob(x.replace(/-/g,'+').replace(/_/g,'/')+'='.repeat((4-x.length%4)%4)),c=>c.charCodeAt(0));
async function loadKey(){const k=localStorage.getItem('ct_k');if(!k)return false;try{KEY=await crypto.subtle.importKey('raw',b64u(k),'AES-GCM',false,['decrypt']);return true}catch(e){return false}}
async function dec(buf){const u=new Uint8Array(buf);if(u[0]!==67||u[1]!==84||u[2]!==49)throw new Error('bad format');
 const pt=await crypto.subtle.decrypt({name:'AES-GCM',iv:u.slice(3,15),additionalData:new TextEncoder().encode('ctmon')},KEY,u.slice(15));
 return JSON.parse(await new Response(new Blob([pt]).stream().pipeThrough(new DecompressionStream('gzip'))).text())}
async function getBlob(path){const r=await fetch(RAW+path,{cache:'no-store'});if(r.status===404)return null;if(!r.ok)throw new Error('http '+r.status);return dec(await r.arrayBuffer())}
function accept(b,fromCache){if(!b||!b.state)return;if(BLOB&&b.pushed_at<=BLOB.pushed_at)return;BLOB=b;
 if(!fromCache)try{localStorage.setItem('ct_cache',JSON.stringify(b))}catch(_){}
 S=JSON.parse(JSON.stringify(b.state));S.push=b.push;S.tmap=b.tmap||{};S.pushed_at=b.pushed_at;wsEnsure();applyLive();render();
 if(deep){const m=deep;deep=null;history.replaceState(null,'',location.pathname+location.search);openView(m[1],decodeURIComponent(m[2]))}}
function badKey(){localStorage.removeItem('ct_k');localStorage.removeItem('ct_cache');showNoKey('That key does not unlock this data. Paste your personal link again.')}
function showNoKey(err){const nk=$('#nokey');nk.hidden=false;$('#nkerr').textContent=err||'';
 $('#nkgo').onclick=()=>{const m=$('#nkin').value.match(/k=([A-Za-z0-9_-]{43})/)||$('#nkin').value.trim().match(/^([A-Za-z0-9_-]{43})$/);if(!m){$('#nkerr').textContent='That does not look like your personal link.';return}
  localStorage.setItem('ct_k',m[1]);location.reload()}}
async function tick(){if(document.hidden||!KEY)return;const now=Date.now()/1000,slot=Math.floor((now-12)/60);
 try{
  // a new file path every minute (s/<unix-minute>.bin) -> GitHub's raw CDN serves it fresh
  if(slot>lastSlot){lastSlot=slot;for(const x of (BLOB?[slot,slot-1]:[slot,slot-1,slot-2,slot-3])){if(BLOB&&BLOB.slot>=x)break;if(tried.has(x))continue;tried.add(x);const b=await getBlob('data/s/'+x+'.bin');if(b){accept(b);break}}}
  // fallback (first open, or the minute files were missed): resolve the branch head once every 3 min via the API (60/h limit)
  const age=BLOB?now-BLOB.pushed_at:1e9;
  if(age>150&&now-lastApi>(BLOB?180:20)){lastApi=now;const r=await fetch('https://api.github.com/repos/'+REPO+'/commits/data',{headers:{Accept:'application/vnd.github.sha'},cache:'no-store'});
   if(r.ok){const sha=(await r.text()).trim();if(/^[0-9a-f]{40}$/.test(sha)&&sha!==lastSha){accept(await getBlob(sha+'/latest.bin'));lastSha=sha}}
   else if(r.status!==403&&r.status!==429)throw new Error('api '+r.status)}
  netFail=0}
 catch(e){if(e&&e.name==='OperationError'){badKey();return}netFail++;console.debug('data fetch failed',e)}
 status()}
function fixHealth(){const h=S.health,t=Date.parse(h.utc||'');if(!isNaN(t)){h.age_s=Math.max(0,Date.now()/1000-t/1000);h.stale=h.age_s>180}}
function status(){const el=$('#stale');if(!KEY||!S){el.hidden=true;return}
 const hb=Date.parse(S.health.utc||'')||S.pushed_at*1000,age=(Date.now()-hb)/1000,at=hm(new Date(hb).toISOString());let html='',net=false;
 if(netFail>=2||!navigator.onLine){net=true;html=`<i></i>Reconnecting… <small>showing data from ${at}</small>`}
 else if(age>180)html=`<i></i>Last bot update ${at} <small>${wsOK?'prices still live':'bot offline'}</small>`;
 el.hidden=!html;if(html)el.innerHTML=html;el.classList.toggle('net',net);$('#live').classList.toggle('off',!!html)}

/* ---------- live prices straight from Kraken (no box involved) ---------- */
const LIVE={};let ws=null,wsSyms='',wsOK=false,wsBack=1000,liveDirty=false;
const spotPair=c=>(c==='BTC'?'XBT':c)+'USD';
function wsEnsure(){const want=S?[...new Set(S.positions.map(p=>p.symbol))].sort().join(','):'';
 if(!want){if(ws){ws.onclose=null;ws.close();ws=null}wsSyms='';return}
 if(ws&&wsSyms===want&&ws.readyState<2)return;
 if(ws){ws.onclose=null;try{ws.close()}catch(_){}}
 wsSyms=want;const w=ws=new WebSocket('wss://futures.kraken.com/ws/v1');
 w.onopen=()=>{wsBack=1000;w.send(JSON.stringify({event:'subscribe',feed:'ticker',product_ids:want.split(',')}))};
 w.onmessage=e=>{let m;try{m=JSON.parse(e.data)}catch(_){return}if(m.feed!=='ticker'||!m.product_id||!m.markPrice)return;
  LIVE[m.product_id]={mark:m.markPrice,bid:m.bid,ask:m.ask,funding_rate:m.relative_funding_rate,high24h:m.high,low24h:m.low,t:Date.now(),src:'futures'};wsOK=true;liveDirty=true};
 w.onclose=()=>{if(ws!==w)return;wsOK=false;ws=null;setTimeout(wsEnsure,wsBack);wsBack=Math.min(30000,wsBack*2)};w.onerror=()=>{}}
// fallback if the futures socket is down: Kraken spot ticker (CORS-enabled REST)
setInterval(async()=>{if(!S||document.hidden)return;for(const p of S.positions){const L=LIVE[p.symbol];if(L&&Date.now()-L.t<15000)continue;
 try{const j=await (await fetch('https://api.kraken.com/0/public/Ticker?pair='+spotPair(p.coin))).json();const t=Object.values(j.result||{})[0];if(!t)continue;
  LIVE[p.symbol]={mark:+t.c[0],bid:+t.b[0],ask:+t.a[0],funding_rate:L&&L.funding_rate,high24h:+t.h[1],low24h:+t.l[1],t:Date.now(),src:'spot'};liveDirty=true}catch(_){}}},10000);
function applyLive(){if(!S)return;let up=0,fees=0;fixHealth();
 S.positions.forEach(p=>{const L=LIVE[p.symbol],sg=p.side==='long'?1:-1;
  if(L&&L.mark&&p.entry){p.mark=L.mark;p.upnl=(L.mark-p.entry)*p.size*sg;p.upnl_pct=(L.mark/p.entry-1)*100*sg;p.notional=L.mark*p.size;p.high24h=L.high24h;p.low24h=L.low24h}
  up+=p.upnl||0;fees+=p.entry_fee||0});
 const a=S.account;a.upnl=up;a.equity=a.last_closed_equity-fees+up;a.total_pnl=a.equity-a.start;a.total_pct=(a.equity/a.start-1)*100;
 const ec=S.equity_curve,l=ec[ec.length-1];if(l&&l.live){l.eq=a.equity;l.t=new Date().toISOString()}}
setInterval(()=>{if(!S||document.hidden)return;status();if(!liveDirty)return;liveDirty=false;applyLive();if(!V||tab==='home')render()},3000);

/* ---------- position candles (card charts) ---------- */
const getJSON=u=>fetch(u,{cache:'no-store'}).then(r=>{if(!r.ok)throw r.status;return r.json()});
const OHLC={'1m':[1,5*3600],'5m':[5,24*3600],'15m':[15,3*86400],'1h':[60,12*86400]};
async function ohlc(coin,k){const [iv,span]=OHLC[k];const j=await (await fetch(`https://api.kraken.com/0/public/OHLC?pair=${spotPair(coin)}&interval=${iv}&since=${Math.floor(Date.now()/1000)-span}`)).json();
 if(j.error&&j.error.length)throw new Error(j.error[0]);const key=Object.keys(j.result||{}).find(x=>x!=='last');return (j.result[key]||[]).map(c=>[c[0],+c[1],+c[2],+c[3],+c[4]])}
function loadPosData(force,only){if(!S)return;S.positions.forEach(p=>{if(only&&p.symbol!==only)return;const d=posData[p.symbol]||(posData[p.symbol]={tf:{},_at:0});
 if(!force&&(Date.now()-d._at<60000||d._loading))return;d._loading=true;d._at=Date.now();
 const want=new Set(['5m','1m']);if(V&&V.kind==='pos'&&V.sym===p.symbol&&V.tfv)want.add(V.tfv);
 Promise.all([...want].map(k=>ohlc(p.coin,k).then(c=>{if(c.length)d.tf[k]=c}).catch(()=>{}))).then(()=>{d._loading=false;drawCharts();if(V&&V.kind==='pos'&&V.sym===p.symbol&&V.refreshCandles)V.refreshCandles()})})}

/* ---------- full-screen views (trade detail / position) ---------- */
const view=$('#view'),vbody=$('#vbody'),vtitle=$('#vtitle');let V=null;
const vs=spring({k:380,c:34,on:(y)=>{view.style.transform=`translate3d(0,${y}px,0)`;}});
function openView(kind,arg,fromHistory){
 closeViewNow();V={kind,arg};document.body.classList.add('vopen');view.hidden=false;
 const H=innerHeight;vs.x=H;vs.v=0;view.style.transform=`translate3d(0,${H}px,0)`;requestAnimationFrame(()=>vs.set(0));
 if(!fromHistory)history.pushState({v:kind,a:arg},'',`#${kind}/${encodeURIComponent(arg)}`);
 if(kind==='trade')renderTrade(arg);else renderPosView(arg)}
function closeViewNow(){if(V&&V.cleanup)V.cleanup();V=null}
function dismiss(fromHistory){if(!V)return;const H=innerHeight;closeViewNow();
 const done=()=>{if(!V){view.hidden=true;vbody.innerHTML='';document.body.classList.remove('vopen')}};
 if(RM){vs.set(H,true);done()}else{vs.set(H);setTimeout(done,420)}
 if(!fromHistory&&location.hash)history.back()}
$('#vback').onclick=()=>dismiss();
addEventListener('popstate',()=>{const m=location.hash.match(/^#(trade|pos)\/(.+)$/);if(m)openView(m[1],decodeURIComponent(m[2]),true);else dismiss(true)});
addEventListener('keydown',e=>{if(e.key==='Escape')dismiss()});
// drag the top bar down to close (follows the finger, springs back or dismisses)
(()=>{const bar=$('#vbar');let d=null;
 bar.addEventListener('pointerdown',e=>{if(e.target.closest('button'))return;bar.setPointerCapture(e.pointerId);d={y:e.clientY,t:performance.now(),last:e.clientY,lt:performance.now(),v:0}});
 bar.addEventListener('pointermove',e=>{if(!d)return;const dy=e.clientY-d.y,now=performance.now();d.v=(e.clientY-d.last)/Math.max(1,now-d.lt);d.last=e.clientY;d.lt=now;
  vs.set(dy>0?dy:-Math.pow(-dy,.6),true)});
 const up=e=>{if(!d)return;const dy=e.clientY-d.y,v=d.v;d=null;if(dy>130||v>.6)dismiss();else vs.set(0)};
 bar.addEventListener('pointerup',up);bar.addEventListener('pointercancel',up)})();
// swipe down from the top of the scrolled content also closes
(()=>{let t=null;vbody.addEventListener('touchstart',e=>{if(vbody.scrollTop>0||e.target.closest('.lwbox'))return;t={y:e.touches[0].clientY,s:performance.now()}},{passive:true});
 vbody.addEventListener('touchmove',e=>{if(!t)return;const dy=e.touches[0].clientY-t.y;if(dy>0&&vbody.scrollTop<=0)vs.set(dy*.85,true);else if(dy<0){t=null;vs.set(0)}},{passive:true});
 vbody.addEventListener('touchend',e=>{if(!t)return;const dy=e.changedTouches[0].clientY-t.y,v=dy/(performance.now()-t.s);t=null;if(dy>140||v>.7)dismiss();else vs.set(0)},{passive:true})})();
document.addEventListener('click',e=>{const tr=e.target.closest('[data-tid]');if(tr&&!view.contains(tr)){openView('trade',tr.dataset.tid);return}
 const pc=e.target.closest('.pos');if(pc&&!e.target.closest('.seg')){openView('pos',pc.dataset.sym)}});

/* lightweight-charts helper */
const UKfmt=new Intl.DateTimeFormat('en-GB',{hour:'2-digit',minute:'2-digit',timeZone:TZ}),UKday=new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'short',timeZone:TZ}),UKfull=new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit',timeZone:TZ});
function prec(v){const a=Math.abs(v||1);return a>=1000?1:a>=10?2:a>=1?3:a>=0.1?5:6}
function mkChart(el,ref,levels){const c=LightweightCharts.createChart(el,{autoSize:true,layout:{background:{type:'solid',color:'#000'},textColor:'#a3adb6',fontFamily:'Inter, sans-serif',fontSize:12},
 grid:{vertLines:{color:'rgba(255,255,255,.04)'},horzLines:{color:'rgba(255,255,255,.05)'}},rightPriceScale:{borderColor:'#2f3336'},
 timeScale:{borderColor:'#2f3336',timeVisible:true,secondsVisible:false,rightOffset:4,tickMarkFormatter:(t,type)=>type<3?UKday.format(new Date(t*1000)):UKfmt.format(new Date(t*1000))},
 localization:{timeFormatter:t=>UKfull.format(new Date(t*1000)),priceFormatter:p=>p.toFixed(prec(ref))},crosshair:{mode:0},
 handleScroll:{vertTouchDrag:false},kineticScroll:{touch:true,mouse:false}});
 const s=c.addCandlestickSeries({upColor:'#00ba7c',downColor:'#f91880',borderVisible:false,wickUpColor:'#00ba7c',wickDownColor:'#f91880',priceFormat:{type:'price',precision:prec(ref),minMove:Math.pow(10,-prec(ref))},
  autoscaleInfoProvider:orig=>{const r=orig();const lv=(typeof levels==='function'?levels():levels||[]).filter(Boolean);if(!r||!lv.length)return r;return {priceRange:{minValue:Math.min(r.priceRange.minValue,...lv),maxValue:Math.max(r.priceRange.maxValue,...lv)},margins:{above:8,below:8}}}});
 return {c,s}}
const toBars=a=>(a||[]).map(k=>({time:k[0],open:k[1],high:k[2],low:k[3],close:k[4]}));
const line=(s,price,title,color,style)=>price&&s.createPriceLine({price,color,lineWidth:1,lineStyle:style??2,axisLabelVisible:true,title});
const tsec=t=>{const d=pd(t);return ok(d)?Math.floor(d/1000):null};
const snap=(t,res)=>t-t%res;
const RESS={'1m':60,'5m':300,'15m':900,'30m':1800,'1h':3600,'4h':14400,'12h':43200,'1d':86400};
const durS=s=>s==null?'—':s<3600?Math.round(s/60)+'m':s<86400?Math.floor(s/3600)+'h '+Math.round(s%3600/60)+'m':Math.floor(s/86400)+'d '+Math.round(s%86400/3600)+'h';
const cell=(k,v,sub,c)=>`<div><span>${k}</span><b class="${c||''}">${v}</b>${sub?`<small>${sub}</small>`:''}</div>`;
const human=s=>s?String(s).replace(/_/g,' ').replace(/^./,c=>c.toUpperCase()):'—';

async function renderTrade(id){
 const t=(S&&S.trades.find(x=>x.id===id))||{coin:'',id};
 vtitle.innerHTML=`${ci(t.coin,28)}<span>${esc(t.coin)} trade</span>`;$('#vlive').hidden=true;
 const head=x=>{const lo=x.side==='long';return `<div class="v-hero"><span class="pnl ${cls(x.pnl)}">${usd(x.pnl,1)}</span><span class="pc ${cls(x.pnl)}" style="font-size:17px;font-weight:700">${x.pnl_pct_margin!=null?pct(x.pnl_pct_margin)+' on margin':''}</span></div>
  <div class="v-sub"><span class="sd ${lo?'long':'short'}">${lo?'LONG':'SHORT'}</span> ${x.leverage?x.leverage+'× · ':''}${reasons[x.reason]||human(x.reason)}${x.partial?' · <span class="ptag">PARTIAL</span>':''} · ${when(x.exit_time||x.time)}</div>`};
 vbody.innerHTML=`<div id="thead">${head(t)}</div><div class="lwbox" id="tchart"><div class="ld">Loading chart…</div></div><div id="tdet"></div>`;
 let d;try{const n=S&&S.tmap&&S.tmap[id];if(!n)throw 0;d=tradeMem[n]||(tradeMem[n]=await getBlob('data/t/'+n+'.bin'))}catch(e){d=null}
 if(!V||V.arg!==id)return;
 if(!d){$('#tchart').innerHTML='<div class="ld">Trade details are not available offline — showing the summary.</div>';d=Object.assign({},t,{exit_time:t.time,entry_time:t.opened,gross:t.gross})}
 $('#thead').innerHTML=head(d);
 const lo=d.side==='long';
 if(d.candles&&d.candles.length){const el=$('#tchart');el.innerHTML='';const {c,s}=mkChart(el,d.entry,[d.entry,d.exit,d.stop_at_entry,d.target_at_entry]);s.setData(toBars(d.candles));
  line(s,d.entry,'ENTRY','#e7e9ea',2);line(s,d.exit,'EXIT','#1d9bf0',0);line(s,d.stop_at_entry,d.stop_moved?'STOP (moved)':'STOP','#f91880',2);line(s,d.target_at_entry,'TARGET','#00ba7c',2);
  const res=RESS[d.res]||300,mk=[];const et=tsec(d.entry_time),xt=tsec(d.exit_time);
  if(et)mk.push({time:snap(et,res),position:lo?'belowBar':'aboveBar',color:'#a78bfa',shape:lo?'arrowUp':'arrowDown',text:'IN '+px(d.entry)});
  (d.linked_exits||[]).forEach(f=>{const ft=tsec(f.time);if(ft)mk.push({time:snap(ft,res),position:lo?'aboveBar':'belowBar',color:'#ffb020',shape:'circle',text:'TP '+qty(f.size)})});
  if(xt)mk.push({time:snap(xt,res),position:lo?'aboveBar':'belowBar',color:(d.pnl||0)>0?'#00ba7c':'#f91880',shape:lo?'arrowDown':'arrowUp',text:'OUT '+px(d.exit)});
  mk.sort((a,b)=>a.time-b.time);s.setMarkers(mk);c.timeScale().fitContent();V.cleanup=()=>c.remove()}
 else if(d.candles)$('#tchart').innerHTML='<div class="ld">No chart data for this window.</div>';
 const pnlS=d.pnl!=null?usd(d.pnl,1):'—';
 $('#tdet').innerHTML=`<div class="legend"><span><i style="color:#e7e9ea"></i>Entry</span><span><i style="color:#1d9bf0;border-top-style:solid"></i>Exit</span><span><i style="color:#f91880"></i>Stop at entry</span><span><i style="color:#00ba7c"></i>Target at entry</span><span>Pinch / drag to zoom & pan</span></div>
 <div class="dsec"><h3>Trade</h3><div class="dgrid">${cell('Entry price',px(d.entry),hm(d.entry_time)?when(d.entry_time):'')}${cell('Exit price',px(d.exit),when(d.exit_time))}
  ${cell('Held',durS(d.hold_s))}${cell('Size',qty(d.size)+' '+esc(d.coin),d.partial?`of ${qty(d.entry_size)} entered`:'')}${cell('Notional',usd(d.notional),d.margin?'margin '+usd(d.margin):'')}${cell('Leverage',d.leverage?d.leverage+'×':'—')}</div></div>
 <div class="dsec"><h3>Profit &amp; loss</h3><div class="dgrid">${cell('Net P&L',pnlS,d.pnl_pct_notional!=null?pct(d.pnl_pct_notional)+' of notional':'',cls(d.pnl))}${cell('Gross P&L',usd(d.gross,1),'before fees',cls(d.gross))}
  ${cell('Fees',usd(d.fees),d.entry_fee!=null?`entry ${usd(d.entry_fee)} · exit ${usd(d.exit_fee)}`:'')}${cell('Return on margin',d.pnl_pct_margin!=null?pct(d.pnl_pct_margin):'—','',cls(d.pnl))}
  ${cell('R-multiple',d.r_multiple!=null?(d.r_multiple>0?'+':'')+d.r_multiple.toFixed(2)+'R':'—',d.R?'1R = '+usd(d.R)+' incl. fees':d.stop_moved?'initial stop unknown (moved)':'',cls(d.r_multiple))}${cell('Account impact',d.pnl_pct_equity!=null?pct(d.pnl_pct_equity):'—','of equity')}</div></div>
 <div class="dsec"><h3>Risk &amp; exit</h3><div class="dgrid">${cell('Stop at entry',px(d.stop_at_entry),d.stop_moved?'order was later moved':'',`dn`)}${cell('Target at entry',px(d.target_at_entry),'','up')}
  ${cell('Close reason',reasons[d.reason]||human(d.reason))}${cell('Triggered by',human(d.closed_by),d.trigger_type?`${d.trigger_type} price @ ${px(d.trigger_level)}`:human(d.fill_type))}
  ${cell('Slippage',d.slippage!=null?px(d.slippage):'—',d.slippage_usd!=null?usd(d.slippage_usd):'')}${cell('Order type',human(d.fill_type))}</div></div>
 <div class="dsec"><h3>Account</h3><div class="dgrid">${cell('Equity before',usd(d.equity_before))}${cell('Equity after',usd(d.equity_after),'',cls(d.pnl))}</div></div>
 <div class="dsec"><h3>Fills</h3><div class="panel flist">
  ${d.entry_fill?`<div class="pf"><span class="tg" style="color:var(--vi)">IN</span><span>${qty(d.entry_size)} @ ${px(d.entry)} <span class="mut">· ${esc(d.entry_fill.id)} · ${human(d.entry_fill.type)}${d.entry_fill.client_id?' · '+esc(d.entry_fill.client_id):''}</span></span><b>${usd(d.entry_fill.fee)}</b></div>`:''}
  ${(d.linked_exits||[]).map(f=>`<div class="pf" data-tid="${esc(f.id)}" style="cursor:pointer"><span class="tg">TP</span><span>${qty(f.size)} @ ${px(f.price)} <span class="mut">· ${esc(f.id)} · ${when(f.time)} (other exit)</span></span><b class="${cls(f.pnl)}">${usd(f.pnl,1)}</b></div>`).join('')}
  <div class="pf"><span class="tg" style="color:${(d.pnl||0)>0?'var(--up)':'var(--dn)'}">OUT</span><span>${qty(d.size)} @ ${px(d.exit)} <span class="mut">· ${esc(d.exit_fill?d.exit_fill.id:d.id)}${d.exit_fill&&d.exit_fill.client_id?' · '+esc(d.exit_fill.client_id):''}</span></span><b class="${cls(d.pnl)}">${pnlS}</b></div></div></div>`;
 $('#tdet').querySelectorAll('[data-tid]').forEach(el=>el.onclick=()=>openView('trade',el.dataset.tid));
}

function renderPosView(sym){
 const P=()=>S&&S.positions.find(p=>p.symbol===sym);let p=P();
 if(!p){vtitle.textContent='Position closed';vbody.innerHTML='<div class="empty">This position is no longer open.</div>';return}
 $('#vlive').hidden=false;vtitle.innerHTML=`${ci(p.coin,28)}<span>${esc(p.coin)} ${p.side==='long'?'long':'short'}</span>`;
 let tfv=tf[sym+'_v']||'5m';
 vbody.innerHTML=`<div id="phero"></div><div class="tfrow"><div class="seg sm" id="vtf"><span class="sb"></span>${['1m','5m','15m','1h'].map(x=>`<button class="press ${x===tfv?'on':''}" data-tf="${x}">${x}</button>`).join('')}</div><span class="mut" style="font-size:13px" id="vtick"></span></div>
 <div class="lwbox" id="pchart"><div class="ld">Loading chart…</div></div>
 <div class="legend"><span><i style="color:#e7e9ea"></i>Entry</span><span><i style="color:#f91880"></i>Stop</span><span><i style="color:#00ba7c"></i>Target</span><span><i style="color:#ffb020;border-top-style:dotted"></i>Partial exit</span><span>Pinch / drag to zoom & pan</span></div><div class="srcnote">Candles: Kraken spot ${esc(spotPair(p.coin).replace('USD','/USD'))} · price, P&amp;L: Kraken Futures mark, live in your browser</div><div id="pdet"></div>`;
 let ch=null,lines=[],lastBar=null,res=RESS[tfv],live=null;
 function build(){const d=posData[sym];const bars=d&&d.tf&&d.tf[tfv];if(!bars||!bars.length)return;
  if(!ch){const el=$('#pchart');el.innerHTML='';ch=mkChart(el,p.entry,()=>[p.entry,p.stop,p.target])}
  const b=toBars(bars);ch.s.setData(b);lastBar=Object.assign({},b[b.length-1]);res=RESS[tfv];setLines();setMarks();ch.c.timeScale().scrollToRealTime()}
 function setLines(){lines.forEach(l=>ch.s.removePriceLine(l));lines=[line(ch.s,p.entry,'ENTRY','#e7e9ea',2),line(ch.s,p.stop,'STOP','#f91880',2),line(ch.s,p.target,'TARGET','#00ba7c',2)].filter(Boolean)}
 function setMarks(){const lo=p.side==='long',mk=[];const ot=tsec(p.opened);if(ot)mk.push({time:snap(ot,res),position:lo?'belowBar':'aboveBar',color:'#a78bfa',shape:lo?'arrowUp':'arrowDown',text:'IN '+px(p.entry)});
  (p.partials||[]).forEach(f=>{const t=tsec(f.time);if(t)mk.push({time:snap(t,res),position:lo?'aboveBar':'belowBar',color:'#ffb020',shape:'circle',text:'TP '+qty(f.size)+' @ '+px(f.price)})});
  const first=ch.s.data()[0];ch.s.setMarkers(mk.filter(m=>!first||m.time>=first.time).sort((a,b)=>a.time-b.time))}
 function tickBar(mark){if(!ch||!lastBar||!mark)return;const now=Math.floor(Date.now()/1000),bt=snap(now,res);
  if(bt>lastBar.time)lastBar={time:bt,open:lastBar.close,high:mark,low:mark,close:mark};else{lastBar.close=mark;lastBar.high=Math.max(lastBar.high,mark);lastBar.low=Math.min(lastBar.low,mark)}
  ch.s.update(lastBar)}
 function details(){p=P()||p;const L=live||{};const mark=L.mark||p.mark,upnl=L.upnl??p.upnl,upct=L.upnl_pct??p.upnl_pct,lo=p.side==='long',sg=lo?1:-1;
  const toStop=p.stop&&mark?(p.stop-mark)*p.size*sg:null,toTgt=p.target&&mark?(p.target-mark)*p.size*sg:null,sold=(p.original_size||p.size)-p.size;
  $('#phero').innerHTML=`<div class="v-hero"><span class="pnl ${cls(upnl)}">${usd(upnl,1)}</span><span class="${cls(upnl)}" style="font-size:17px;font-weight:700">${pct(upct)}</span><span class="mut">unrealised</span></div>
   <div class="v-sub">Price <b style="color:var(--tx)">${px(mark)}</b>${L.bid?` · bid ${px(L.bid)} / ask ${px(L.ask)}`:''} · open ${dur(p.opened)||'—'}</div>`;
  const parts=(p.partials||[]).map(f=>`<div class="pf"><span class="tg">TP</span><span>${qty(f.size)} @ ${px(f.price)} <span class="mut">· ${when(f.time)}</span></span><b class="${cls(f.pnl)}">${usd(f.pnl,1)}</b></div>`).join('');
  $('#pdet').innerHTML=`<div class="dsec"><h3>Position</h3><div class="dgrid">${cell('Entry',px(p.entry),when(p.opened))}${cell('Current price',px(mark),'mark · live')}
   ${cell('Size',qty(p.size)+' '+esc(p.coin),sold>0?`of ${qty(p.original_size)} (${qty(sold)} sold)`:'')}${cell('Notional',usd(mark*p.size),p.leverage?'margin ~'+usd(p.entry*p.size/p.leverage):'')}
   ${cell('Leverage',p.leverage?p.leverage+'×':'—')}${cell('Time open',dur(p.opened)||'—')}</div></div>
   <div class="dsec"><h3>Stop &amp; target</h3><div class="dgrid">${cell('Stop',px(p.stop),p.stop&&mark?`${pct((p.stop/mark-1)*100)} away · ${usd(toStop,1)} at stop`:'','dn')}
   ${cell('Target',px(p.target),p.target&&mark?`${pct((p.target/mark-1)*100)} away · ${usd(toTgt,1)} more at target`:'','up')}
   ${cell('If stopped (total)',p.stop?usd((p.stop-p.entry)*p.size*sg,1):'—','vs entry, before exit fee',cls(p.stop?(p.stop-p.entry)*sg:0))}${cell('If target (total)',p.target?usd((p.target-p.entry)*p.size*sg,1):'—','vs entry, before exit fee','up')}</div></div>
   <div class="dsec"><h3>Fees &amp; funding</h3><div class="dgrid">${cell('Entry fee',usd(p.entry_fee),'remaining size')}${cell('Funding (unrealised)',p.funding!=null?usd(p.funding,1):'—',L.funding_rate!=null?'rate '+(L.funding_rate*100).toFixed(4)+'%':'')}
   ${cell('Realised from partials',usd(p.partial_pnl,1),'',cls(p.partial_pnl))}${cell('24h range',L.low24h?`${px(L.low24h)} – ${px(L.high24h)}`:'—')}</div></div>
   ${parts?`<div class="dsec"><h3>Partial exits</h3><div class="panel flist">${parts}</div></div>`:''}`}
 segInit($('#vtf'),b=>{tfv=b.dataset.tf;tf[sym+'_v']=tfv;if(V)V.tfv=tfv;if(!(posData[sym]&&posData[sym].tf[tfv]))loadPosData(true,sym);if(ch){ch.c.remove();ch=null}$('#pchart').innerHTML='<div class="ld">Loading…</div>';build()});
 V.sym=sym;V.tfv=tfv;details();build();loadPosData(true,sym);
 V.refreshCandles=()=>{if(!ch)build();else{const d=posData[sym];const bars=d&&d.tf&&d.tf[tfv];if(bars&&bars.length){const b=toBars(bars);ch.s.setData(b);lastBar=Object.assign({},b[b.length-1]);if(live)tickBar(live.mark);setMarks()}}};
 const poll=()=>{if(document.hidden||!V)return;const L=LIVE[sym];p=P()||p;
  if(L&&L.mark&&Date.now()-L.t<20000){const sg=p.side==='long'?1:-1;live={mark:L.mark,bid:L.bid,ask:L.ask,funding_rate:L.funding_rate,high24h:L.high24h,low24h:L.low24h,upnl:(L.mark-p.entry)*p.size*sg,upnl_pct:(L.mark/p.entry-1)*100*sg};
   tickBar(L.mark);details();$('#vtick').textContent=(L.src==='spot'?'spot ':'live ')+new Date(L.t).toLocaleTimeString('en-GB',{timeZone:TZ});$('#vlive').classList.remove('off')}
  else{details();$('#vlive').classList.add('off')}};
 poll();const iv=setInterval(poll,1000),iv2=setInterval(()=>loadPosData(true,sym),30000);
 V.cleanup=()=>{clearInterval(iv);clearInterval(iv2);if(ch)ch.c.remove()};
}
// open from a deep link (#trade/ID or #pos/SYM) once data has arrived
let deep=location.hash.match(/^#(trade|pos)\/(.+)$/);

/* ---------- install ---------- */
let deferred=null;const inst=$('#install');
const standalone=matchMedia('(display-mode: standalone)').matches||navigator.standalone;
const ios=/iphone|ipad|ipod/i.test(navigator.userAgent)&&!window.MSStream;
addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferred=e;if(!standalone)inst.hidden=false});
if(ios&&!standalone)inst.hidden=false;
inst.onclick=async()=>{if(deferred){deferred.prompt();const r=await deferred.userChoice;deferred=null;if(r.outcome==='accepted')inst.hidden=true}else $('#iosSheet').hidden=false};
$('#sheetClose').onclick=()=>$('#iosSheet').hidden=true;$('#iosSheet').onclick=e=>{if(e.target.id==='iosSheet')e.currentTarget.hidden=true};
addEventListener('appinstalled',()=>inst.hidden=true);

/* ---------- push notifications (Web Push; subscription relayed to the publisher via a private ntfy topic) ---------- */
(()=>{const st=$('#npStatus'),main=$('#npMain'),types=$('#npTypes'),test=$('#npTest'),info=$('#npInfo');
 const supported='serviceWorker' in navigator&&'PushManager' in window&&'Notification' in window;
 let cfg=null;const PK='ct_push_prefs';let prefs=Object.assign({open:true,partial:true,close:true},JSON.parse(localStorage.getItem(PK)||'{}'));
 const b64=s=>{const p='='.repeat((4-s.length%4)%4),r=atob((s+p).replace(/-/g,'+').replace(/_/g,'/'));return Uint8Array.from([...r].map(c=>c.charCodeAt(0)))};
 const relay=async m=>{cfg=cfg||(S&&S.push);if(!cfg)throw new Error('waiting for bot data');const r=await fetch('https://ntfy.sh/'+cfg.topic,{method:'POST',body:JSON.stringify(Object.assign({k:cfg.k,ua:navigator.userAgent.slice(0,80),origin:location.origin+location.pathname.replace(/[^/]*$/,'')},m))});if(!r.ok)throw new Error('relay '+r.status)};
 const setT=(b,on)=>{b.classList.toggle('on',!!on);b.setAttribute('aria-checked',on?'true':'false')};
 async function sub(){const reg=await navigator.serviceWorker.ready;return reg.pushManager.getSubscription()}
 async function refresh(){if(!supported){st.textContent='not supported';main.disabled=true;test.disabled=true;info.textContent=ios?'On iPhone, add the app to your Home Screen first, then open it from there to enable notifications.':'This browser does not support push notifications.';types.classList.add('off');return}
  const s=await sub(),perm=Notification.permission,on=!!s&&perm==='granted';setT(main,on);types.classList.toggle('off',!on);test.disabled=!on;
  $$('#npTypes [data-pref]').forEach(b=>setT(b,prefs[b.dataset.pref]));
  st.textContent=perm==='denied'?'blocked':on?'on':'off';
  info.textContent=perm==='denied'?'Notifications are blocked for this app. Allow them in your phone settings (App info → Notifications), then come back.':on?'You will get a notification when Crypto Trader opens a trade, takes a partial, or closes a trade. Tap it to jump to that trade.':'Turn on to get notified about trades, even when the app is closed.';
  // re-share the subscription at most once a day so the publisher always has the current endpoint
  if(on&&Date.now()-(+localStorage.getItem('ct_push_relay')||0)>864e5){relay({op:'sub',sub:s.toJSON(),prefs}).then(()=>localStorage.setItem('ct_push_relay',Date.now())).catch(()=>{})}}
 async function enable(){st.textContent='asking…';const p=await Notification.requestPermission();if(p!=='granted'){refresh();return}
  st.textContent='subscribing…';cfg=cfg||(S&&S.push);if(!cfg)throw new Error('bot data has not loaded yet');const reg=await navigator.serviceWorker.ready;
  let s=await reg.pushManager.getSubscription();if(!s)s=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:b64(cfg.vapid)});
  await relay({op:'sub',sub:s.toJSON(),prefs});localStorage.setItem('ct_push_relay',Date.now());st.textContent='on';refresh()}
 async function disable(){const s=await sub();if(s){try{await relay({op:'unsub',endpoint:s.endpoint,sub:{endpoint:s.endpoint}})}catch(_){ }await s.unsubscribe()}refresh()}
 main.onclick=async()=>{main.disabled=true;try{main.classList.contains('on')?await disable():await enable()}catch(e){st.textContent='error';info.textContent='Could not enable notifications: '+(e.message||e)}main.disabled=false};
 $$('#npTypes [data-pref]').forEach(b=>b.onclick=async()=>{prefs[b.dataset.pref]=!prefs[b.dataset.pref];localStorage.setItem(PK,JSON.stringify(prefs));setT(b,prefs[b.dataset.pref]);const s=await sub();if(s)relay({op:'prefs',sub:s.toJSON(),prefs}).catch(()=>{})});
 test.onclick=async()=>{const s=await sub();if(!s)return;test.disabled=true;test.textContent='Sending…';try{await relay({op:'test',sub:s.toJSON(),prefs});test.textContent='Sent — should arrive in a few seconds'}catch(e){test.textContent='Failed: '+e.message}setTimeout(()=>{test.textContent='Send test notification';test.disabled=false},6000)};
 if('serviceWorker' in navigator)navigator.serviceWorker.addEventListener('message',e=>{if(e.data&&e.data.type==='open'){const h=new URL(e.data.url).hash;if(h&&h!==location.hash)location.hash=h}});
 refresh().catch(()=>{});window.__push={refresh,enable,sub};
})();

addEventListener('resize',()=>{sizeBubble();$$('.seg').forEach(segMove);drawCharts()});
(document.fonts?document.fonts.ready:Promise.resolve()).then(()=>{sizeBubble();$$('.seg').forEach(segMove)});sizeBubble();
document.addEventListener('visibilitychange',()=>{if(!document.hidden){lastSlot=Math.min(lastSlot,Math.floor(Date.now()/60000)-2);tick();wsEnsure()}});
addEventListener('online',()=>{netFail=0;tick()});addEventListener('offline',status);
(async()=>{if(!await loadKey()){showNoKey();return}
 const c=localStorage.getItem('ct_cache');if(c)try{accept(JSON.parse(c),true)}catch(_){}
 status();tick();setInterval(tick,REFRESH)})();
if('serviceWorker' in navigator)navigator.serviceWorker.register('sw.js').catch(()=>{});
window.__dock={bs,go,sizeBubble,slotX};
window.__ct={get S(){return S},get BLOB(){return BLOB},LIVE,wsEnsure,applyLive,render,status,get wsOK(){return wsOK}};// read-only test/debug hook
})();
