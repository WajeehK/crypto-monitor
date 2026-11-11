(()=>{
// GitHub Pages build: bot data comes AES-256-GCM encrypted from the repo's `data` branch; prices come live from Kraken.
const REPO='WajeehK/crypto-monitor',RAW='https://raw.githubusercontent.com/'+REPO+'/';
(()=>{const m=location.hash.match(/(?:^#|&)k=([A-Za-z0-9_-]{43})/);if(m){localStorage.setItem('ct_k',m[1]);localStorage.setItem('ct_kexp',Date.now()+7*864e5);history.replaceState(null,'',location.pathname+location.search)}})();
const $=s=>document.querySelector(s), $$=s=>document.querySelectorAll(s), REFRESH=5000, TZ='Europe/London';
const RM=matchMedia('(prefers-reduced-motion: reduce)').matches;
const TABS=['home','trades','markets','activity','stats'];
let S=null, tab='home', filt='all', failed=0, tf={}, charts={}, posData={}, ICONS=new Set();
const ENABLE_MODIFY_PARTIAL=false; // v23 flag. Keep false until Crypto Trader handles type=modify/partial (today any close-requests file is a full close). Flip to true and republish together with ENABLE_MODIFY_PARTIAL in gh/closesrv.py.
fetch('coins/index.json',{credentials:'same-origin'}).then(r=>r.json()).then(a=>{ICONS=new Set(a);if(S)render()}).catch(()=>{});
const ci=(c,sz)=>{c=String(c||'?');const l=c.toLowerCase(),st=sz?` style="--s:${sz}px"`:'',fb=`<span class="ci lt"${st}>${esc(c.slice(0,1))}</span>`;
 // local pack first; else CoinMarketCap via markets data (covers new listings like ASTER until we ship a local file); else letter
 if(ICONS.has(l))return `<img class="ci" src="coins/${l}.svg" alt=""${st} onerror="this.replaceWith(Object.assign(document.createElement('span'),{className:'ci lt',style:this.style.cssText,textContent:'${esc(c.slice(0,1))}'}))">`;
 const m=typeof MK!=='undefined'&&MK&&MK.coins&&MK.coins.find(x=>String(x[2]).toLowerCase()===l);
 if(m)return `<img class="ci" src="https://s2.coinmarketcap.com/static/img/coins/64x64/${m[0]}.png" alt=""${st} referrerpolicy="no-referrer" onerror="this.replaceWith(Object.assign(document.createElement('span'),{className:'ci lt',style:this.style.cssText,textContent:'${esc(c.slice(0,1))}'}))">`;
 return fb};
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
 scrollTo({top:0});requestAnimationFrame(()=>sec.querySelectorAll('.seg').forEach(segMove));if(t==='home')drawCharts();if(t==='markets')mkLoad();}
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
   <div class="pchart"><canvas></canvas></div><div class="pos-b"></div><div class="sellrow">
   <div class="actg"><button class="actb press" data-edit="${esc(p.symbol)}"${ENABLE_MODIFY_PARTIAL?'':' disabled aria-disabled="true"'}>Edit TP/SL</button>${ENABLE_MODIFY_PARTIAL?'':'<span class="soon">Coming soon</span>'}</div>
   <div class="actg"><button class="actb press" data-partial="${esc(p.symbol)}"${ENABLE_MODIFY_PARTIAL?'':' disabled aria-disabled="true"'}>Partial TP</button>${ENABLE_MODIFY_PARTIAL?'':'<span class="soon">Coming soon</span>'}</div>
   <button class="sellb press" data-sell="${esc(p.symbol)}">Sell</button></div></article>`).join('');
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
function ldnMidnight(){const n=new Date(),p=Object.fromEntries(new Intl.DateTimeFormat('en-GB',{timeZone:TZ,year:'numeric',month:'numeric',day:'numeric',hour:'numeric',minute:'numeric',second:'numeric',hourCycle:'h23'}).formatToParts(n).map(x=>[x.type,x.value]));
 const wall=Date.UTC(+p.year,+p.month-1,+p.day,+p.hour,+p.minute,+p.second),off=wall-Math.floor(n/1000)*1000;return Date.UTC(+p.year,+p.month-1,+p.day)-off}
let TODAY=null;function todayHTML(a){const m0=ldnMidnight(),tt=x=>Date.parse(String(x||'').replace(/(\.\d{3})\d+/,'$1'));
 const tr=(S.trades||[]).filter(t=>tt(t.time)>=m0),real=tr.reduce((s,t)=>s+(t.pnl||0),0);
 let eq0=a.start;for(const e of S.equity_curve||[]){if(!e.live&&tt(e.t)<m0)eq0=e.eq}
 const eq=a.equity??eq0,d=eq-eq0,u=d-real,pc=eq0?d/eq0*100:0,c=d>=0?'#00ba7c':'#f91880';TODAY={d,pc,n:tr.length};
 return `<div class="st wide" style="--c:${c}"><div class="k">Today's return</div><div class="v ${cls(d)}">${usd(d,1)} <span class="tp">${pct(pc)}</span></div><div class="s">realised ${usd(real,1)} · unrealised ${usd(u,1)} · ${tr.length} trade${tr.length==1?'':'s'} today</div></div>`}
let FNG=null;try{FNG=JSON.parse(localStorage.getItem('ct-fng')||'null')}catch(e){}
function fngCol(v){return v<25?'#f91880':v<45?'#ff7a45':v<55?'#ffd400':v<75?'#7ed957':'#00ba7c'}
function fngHTML(){if(!FNG)return `<div class="st fng" id="fng" style="--c:#71767b"><div class="k">Fear &amp; Greed</div><div class="v mut">—</div><div class="s">loading…</div></div>`;
 const v=FNG.v,c=fngCol(v),d=FNG.p==null?null:v-FNG.p,ang=-90+v*1.8;
 return `<div class="st fng" id="fng" style="--c:${c}"><div class="k">Fear &amp; Greed</div>
 <svg class="gauge" viewBox="0 0 100 56"><defs><linearGradient id="fg" x1="0" x2="1"><stop offset="0" stop-color="#f91880"/><stop offset=".3" stop-color="#ff7a45"/><stop offset=".5" stop-color="#ffd400"/><stop offset=".7" stop-color="#7ed957"/><stop offset="1" stop-color="#00ba7c"/></linearGradient></defs>
 <path d="M8 50 A42 42 0 0 1 92 50" fill="none" stroke="url(#fg)" stroke-width="7" stroke-linecap="round" opacity=".9"/>
 <g class="needle" style="--a:${ang}deg"><line x1="50" y1="50" x2="50" y2="14" stroke="#e7e9ea" stroke-width="2.5" stroke-linecap="round"/></g><circle cx="50" cy="50" r="4" fill="#e7e9ea"/></svg>
 <div class="v" style="color:${c}">${v} <span class="tp">${esc(FNG.c)}</span></div><div class="s">${d==null?'':(d>0?'+':d<0?'−':'±')+Math.abs(d)+' vs yesterday'}</div></div>`}
async function loadFng(){if(FNG&&Date.now()-FNG.at<6e5)return;try{const r=await fetch('https://api.alternative.me/fng/?limit=2',{cache:'no-store'}),j=await r.json(),d=j.data;
 FNG={v:+d[0].value,c:d[0].value_classification,p:d[1]?+d[1].value:null,at:Date.now()};localStorage.setItem('ct-fng',JSON.stringify(FNG));const el=$('#fng');if(el)el.outerHTML=fngHTML()}catch(e){}}
loadFng();setInterval(loadFng,6e5);
function mood(el,m){if(el)el.className=el.className.replace(/\bm-(happy|worried|sleepy|calm)\b/g,'').trim()+' m-'+m}
function hero(a,h){const t=TODAY||{d:0,pc:0,n:0},m=h.stale?'sleepy':t.d>0.005?'happy':t.d<-0.005?'worried':'calm';window.__ctMood=m;mood($('#hmas'),m);mood($('#mhead'),m);
 $('#heq').textContent=usd(a.equity);const p=$('#hpill');p.className='hpill '+(t.d>=0?'up':'dn');p.textContent=(t.d>=0?'▲ ':'▼ ')+usd(Math.abs(t.d))+' ('+pct(t.pc)+') today';
 $('#hsub').textContent=h.stale?'bot is napping · heartbeat stale':`${S.positions.length} open · ${t.n} closed today`}
document.addEventListener('click',e=>{const b=e.target.closest('[data-jump]');if(b){const el=$('#'+b.dataset.jump);el&&el.scrollIntoView({behavior:RM?'auto':'smooth',block:'start'})}});
function render(){
 if(!S)return;fixHealth();const a=S.account,h=S.health;if(window.__splEq)__splEq(a.equity);try{X15.on()}catch(e){console.warn(e)}try{hero(a,h)}catch(e){console.warn(e)}
 const age=h.age_s==null?'?':h.age_s<90?Math.round(h.age_s)+'s':Math.round(h.age_s/60)+'m';
 $('#meta').innerHTML=`<span>Heartbeat <b class="${h.stale?'bad':''}">${age} ago${h.stale?' · STALE':''}</b></span><span>Cycle <b>${h.cycle_ms??'—'} ms</b></span><span>Mode <b>${esc(h.mode||'—')}</b></span><span>Errors <b class="${h.errors?'bad':''}">${h.errors??'—'}</b></span><span>PID <b>${h.pid??'—'}</b></span>`;
 $('#stats').innerHTML=[['Equity (est)',usd(a.equity),'started at '+usd(a.start),'#1d9bf0',''],['Total P&L',usd(a.total_pnl,1),pct(a.total_pct),a.total_pnl>=0?'#00ba7c':'#f91880',cls(a.total_pnl)],
  ['Win rate',a.win_rate==null?'—':a.win_rate.toFixed(1)+'%',`${a.wins} wins · ${a.trades-a.wins} losses`,'#a78bfa',''],]
  .map(([k,v,s,c,cl])=>`<div class="st" style="--c:${c}"><div class="k">${k}</div><div class="v ${cl}">${v}</div><div class="s">${s}</div></div>`).join('')+'<div class="st fng" id="fng"></div>'+todayHTML(a);$('#fng').outerHTML=fngHTML();
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
const WEEK=7*864e5;function lockDevice(){['ct_k','ct_kexp','ct_cache'].forEach(x=>localStorage.removeItem(x));location.reload()}
async function loadKey(){const k=localStorage.getItem('ct_k');if(!k)return false;const ex=+localStorage.getItem('ct_kexp')||0;
 if(!ex)localStorage.setItem('ct_kexp',Date.now()+WEEK);else if(Date.now()>ex){['ct_k','ct_kexp','ct_cache'].forEach(x=>localStorage.removeItem(x));return false}try{KEY=await crypto.subtle.importKey('raw',b64u(k),'AES-GCM',false,['decrypt']);return true}catch(e){return false}}
async function dec(buf){const u=new Uint8Array(buf);if(u[0]!==67||u[1]!==84||u[2]!==49)throw new Error('bad format');
 const pt=await crypto.subtle.decrypt({name:'AES-GCM',iv:u.slice(3,15),additionalData:new TextEncoder().encode('ctmon')},KEY,u.slice(15));
 return JSON.parse(await new Response(new Blob([pt]).stream().pipeThrough(new DecompressionStream('gzip'))).text())}
async function getBlob(path){const r=await fetch(RAW+path,{cache:'no-store'});if(r.status===404)return null;if(!r.ok)throw new Error('http '+r.status);return dec(await r.arrayBuffer())}
let FRESH_AT=0,VIS_AT=Date.now(),ticking=false;
function accept(b,fromCache){if(!b||!b.state)return;if(!fromCache&&(b.live||Date.now()/1000-b.pushed_at<90))FRESH_AT=Date.now();if(BLOB&&b.pushed_at<=BLOB.pushed_at)return;BLOB=b;
 if(!fromCache)try{localStorage.setItem('ct_cache',JSON.stringify(b))}catch(_){}
 S=JSON.parse(JSON.stringify(b.state));S.push=b.push;S.box=b.box;S.tmap=b.tmap||{};S.pushed_at=b.pushed_at;wsEnsure();applyLive();
 // v22: stash a pos deep-link so detect() does not also queue the open animation; play anim after render, then land on the position
 let deepNow=null;if(deep&&!fromCache){deepNow=deep;deep=null;history.replaceState(null,'',location.pathname+location.search);if(deepNow[1]==='pos')window.__deepPos=decodeURIComponent(deepNow[2])}
 render();
 if(V&&V.kind==='pos'&&V.wait)renderPosView(V.arg);
 if(deepNow){const arg=deepNow[1]==='pos'?decodeURIComponent(deepNow[2]):decodeURIComponent(deepNow[2]);window.__deepPos=null;
  if(deepNow[1]==='pos'&&window.__x15&&__x15.maybeOpenAnim(arg))return;
  openView(deepNow[1],arg)}}
function badKey(){localStorage.removeItem('ct_k');localStorage.removeItem('ct_cache');showNoKey('Saved key no longer works. Enter your password again.')}
function showNoKey(err){const nk=$('#nokey');nk.hidden=false;$('#nkerr').textContent=err||'';const inp=$('#nkin'),btn=$('#nkgo');setTimeout(()=>inp.focus(),50);
 const go=async()=>{const pw=inp.value;if(!pw||btn.disabled)return;btn.disabled=true;btn.textContent='Unlocking…';$('#nkerr').textContent='';
  try{const w=await (await fetch('keywrap.json',{cache:'no-store'})).json();
   const base=await crypto.subtle.importKey('raw',new TextEncoder().encode(pw),'PBKDF2',false,['deriveKey']);
   const kek=await crypto.subtle.deriveKey({name:'PBKDF2',hash:'SHA-256',salt:b64u(w.salt),iterations:w.iter},base,{name:'AES-GCM',length:256},false,['decrypt']);
   const raw=new Uint8Array(await crypto.subtle.decrypt({name:'AES-GCM',iv:b64u(w.iv),additionalData:new TextEncoder().encode('ctmon-keywrap')},kek,b64u(w.ct)));
   localStorage.setItem('ct_k',btoa(String.fromCharCode(...raw)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,''));localStorage.setItem('ct_kexp',Date.now()+WEEK);$('.nkc').classList.add('ok');setTimeout(()=>location.reload(),RM?0:650)}
  catch(e){inp.value='';inp.classList.remove('shake');void inp.offsetWidth;inp.classList.add('shake');$('#nkerr').textContent=e&&e.name==='OperationError'?'Wrong password':"Couldn't check the password — are you online?";btn.textContent='Wait…';
   setTimeout(()=>{btn.disabled=false;btn.textContent='Unlock';inp.focus()},2000)}};
 btn.onclick=go;inp.onkeydown=e=>{if(e.key==='Enter')go()}}
async function tick(){if(!KEY||(document.hidden&&BLOB)||ticking)return;ticking=true;try{await tick2()}finally{ticking=false}}
// v21: fresh data straight from the box (encrypted, written every 2s) every 5s while the app is open; GitHub is the fallback
async function boxData(){try{const r=await tfetch(boxURL()+'/state?t='+Date.now(),{},4500);if(!r.ok)return false;const b=await dec(await r.arrayBuffer());accept(b);return true}
 catch(e){if(e&&e.name==='OperationError')throw e;return false}}
async function tick2(){const now=Date.now()/1000,slot=Math.floor((now-15)/60);
 try{
  if(await boxData()){netFail=0;status();return}
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
 else if(age>180){const mi=Math.round(age/60);html=`<i></i>Last bot update ${at} <small>${mi<90?mi+' min':Math.round(mi/60)+' h'} ago${wsOK?' · prices live':''}</small>`}
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
let lastR=0;setInterval(()=>{if(!S||document.hidden)return;status();if(!liveDirty&&Date.now()-lastR<15000)return;liveDirty=false;lastR=Date.now();applyLive();render()},3000);

/* ---------- position candles (card charts) ---------- */
const getJSON=u=>fetch(u,{cache:'no-store'}).then(r=>{if(!r.ok)throw r.status;return r.json()});
const OHLC={'1d':[1440,720*86400],'4h':[240,120*86400],'1m':[1,5*3600],'5m':[5,24*3600],'15m':[15,3*86400],'1h':[60,12*86400]};
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
 if(kind==='trade')renderTrade(arg);else if(kind==='coin')renderCoin(arg);else renderPosView(arg)}
function closeViewNow(){if(V&&V.cleanup)V.cleanup();V=null}
function dismiss(fromHistory){if(!V)return;const H=innerHeight;closeViewNow();
 const done=()=>{if(!V){view.hidden=true;vbody.innerHTML='';document.body.classList.remove('vopen')}};
 if(RM){vs.set(H,true);done()}else{vs.set(H);setTimeout(done,420)}
 if(!fromHistory&&location.hash)history.back()}
$('#vback').onclick=()=>dismiss();
addEventListener('popstate',()=>{const m=location.hash.match(/^#(trade|pos|coin)\/(.+)$/);if(m)openView(m[1],decodeURIComponent(m[2]),true);else dismiss(true)});
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
 chartExtras(el,c,s,ref);return {c,s}}
function chartExtras(el,c,s,ref){el.querySelectorAll('.lwfs,.lwtip').forEach(x=>x.remove());
 const tip=document.createElement('div');tip.className='lwtip';tip.hidden=true;el.appendChild(tip);
 const fb=document.createElement('button');fb.className='lwfs press';fb.setAttribute('aria-label','Fullscreen');
 const ico=on=>fb.innerHTML=on?'<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>':'<svg viewBox="0 0 24 24"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>';ico(0);el.appendChild(fb);
 let home=null;const exit=()=>{if(!home)return;home[0].insertBefore(el,home[1]);home=null;el.classList.remove('fs');document.body.classList.remove('lwfsopen');ico(0);removeEventListener('popstate',pop)};
 const pop=()=>exit();
 fb.onclick=e=>{e.stopPropagation();if(home){exit();return}home=[el.parentNode,el.nextSibling];document.body.appendChild(el);el.classList.add('fs');document.body.classList.add('lwfsopen');ico(1);
  try{screen.orientation&&screen.orientation.lock&&screen.orientation.lock('landscape').catch(()=>{})}catch(_){};addEventListener('popstate',pop)};
 el._exitFs=exit;
 c.subscribeCrosshairMove(p=>{const d=p&&p.time&&p.seriesData&&p.seriesData.get(s);if(!d||d.open==null){tip.hidden=true;return}
  const f=v=>v.toFixed(prec(ref||d.close)),ch=(d.close-d.open)/d.open*100;tip.hidden=false;
  tip.innerHTML=`<span class="mut">${UKfull.format(new Date(p.time*1000))}</span> O <b>${f(d.open)}</b> H <b>${f(d.high)}</b> L <b>${f(d.low)}</b> C <b>${f(d.close)}</b> <b class="${cls(ch)}">${pct(ch)}</b>`})}
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

function renderPosView(arg){
 // arg = SYM or SYM@<opened unix s> (from a trade-opened notification)
 const [sym,atS]=String(arg).split('@'),at=+atS||0;
 const P=()=>S&&S.positions.find(p=>p.symbol===sym);let p=P();
 if(V)V.wait=false;
 if(!p){const fresh=Date.now()-FRESH_AT<15000,waited=Date.now()-VIS_AT>15000;
  const tms=x=>(Date.parse(x||'')||0)/1000;
  const ct=S&&(S.trades||[]).filter(t=>t.symbol===sym&&t.reason!=='partial_take_profit'&&(at?(tms(t.time)>=at-60):fresh)).sort((a,b)=>tms(b.time)-tms(a.time))[0];
  if(ct&&(fresh||at)){vtitle.textContent='Position closed';
   vbody.innerHTML=`<div class="empty">${esc(ct.coin||sym)} ${esc(ct.side||'')} closed ${when(ct.time)}<br>Exit <b>$${px(ct.exit)}</b> · P&amp;L <b class="${cls(ct.pnl)}">${usd(ct.pnl,1)}</b><br><button class="pill ghost press" id="pcgo" style="margin-top:14px">Trade details</button></div>`;
   $('#pcgo').onclick=()=>openView('trade',ct.id);return}
  if(!fresh&&!waited){if(V)V.wait=true;vtitle.textContent=sym.replace(/^PF_|USD$/g,'');vbody.innerHTML='<div class="empty">Loading the latest data…</div>';
   setTimeout(()=>{if(V&&V.kind==='pos'&&V.arg===arg&&V.wait)renderPosView(arg)},15500-(Date.now()-VIS_AT));return}
  vtitle.textContent=fresh?'Position closed':'Position not found';
  vbody.innerHTML=`<div class="empty">${fresh?'This position is no longer open.':'Not in the latest data I could load ('+(BLOB?hm(new Date(BLOB.pushed_at*1000).toISOString()):'none')+'). The box may be offline; pull down or reopen in a moment.'}</div>`;if(!fresh&&V)V.wait=true;return}
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
let deep=location.hash.match(/^#(trade|pos|coin)\/(.+)$/);

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
 if('serviceWorker' in navigator)navigator.serviceWorker.addEventListener('message',e=>{if(e.data&&e.data.type==='open'){const h=new URL(e.data.url).hash;if(h&&h!==location.hash){VIS_AT=Date.now();location.hash=h;tick()}}});
 refresh().catch(()=>{});window.__push={refresh,enable,sub};
})();

addEventListener('resize',()=>{sizeBubble();$$('.seg').forEach(segMove);drawCharts()});
(document.fonts?document.fonts.ready:Promise.resolve()).then(()=>{sizeBubble();$$('.seg').forEach(segMove)});sizeBubble();
document.addEventListener('visibilitychange',()=>{if(!document.hidden){VIS_AT=Date.now();lastSlot=Math.min(lastSlot,Math.floor(Date.now()/60000)-2);tick();wsEnsure()}});
addEventListener('online',()=>{netFail=0;tick()});addEventListener('offline',status);
(async()=>{if(!await loadKey()){showNoKey();return}
 const c=localStorage.getItem('ct_cache');if(c)try{accept(JSON.parse(c),true)}catch(_){}
 status();tick();setInterval(tick,REFRESH);setTimeout(()=>{if(deep&&S){const m=deep;deep=null;openView(m[1],decodeURIComponent(m[2]),true)}},15000)})();
/* ---------- Markets tab (CoinMarketCap data, refreshed on the box every 10 min -> data/markets.json) ---------- */
let MK=null,mkSort='rank',mkQ='',mkAt=0;
try{MK=JSON.parse(localStorage.getItem('ct_mk')||'null')}catch(_){}
const big=v=>v==null?'—':'$'+(v>=1e12?(v/1e12).toFixed(2)+'T':v>=1e9?(v/1e9).toFixed(2)+'B':v>=1e6?(v/1e6).toFixed(2)+'M':v.toLocaleString('en-GB'));
const sup=v=>v==null?'—':v>=1e9?(v/1e9).toFixed(2)+'B':v>=1e6?(v/1e6).toFixed(2)+'M':v.toLocaleString('en-GB');
const mpx=v=>v==null?'—':'$'+(v>=1?v.toLocaleString('en-GB',{minimumFractionDigits:2,maximumFractionDigits:2}):v.toPrecision(4));
const ICO=id=>`https://s2.coinmarketcap.com/static/img/coins/64x64/${id}.png`;
async function mkLoad(force){if(!force&&Date.now()-mkAt<110000){mkRender();return}mkAt=Date.now();
 try{const r=await fetch(RAW+'data/markets.json?t='+Math.floor(Date.now()/120000),{cache:'no-store'});if(r.ok){const j=await r.json();if(j&&j.coins&&(!MK||j.at>=MK.at)){MK=j;localStorage.setItem('ct_mk',JSON.stringify(j))}}}catch(_){}
 mkRender()}
setInterval(()=>{if(tab==='markets'&&!document.hidden)mkLoad()},30000);
function mkRender(){const g=$('#mkglob'),L=$('#mklist');if(!MK||!MK.coins){L.innerHTML='<div class="empty">Loading markets…</div>';return}
 const G=MK.global||{},F=MK.fng;
 g.innerHTML=`<div><span>Market cap</span><b>${big(G.mcap)}</b><small class="${cls(G.mcap24)}">${pct(G.mcap24)}</small></div><div><span>24h volume</span><b>${big(G.vol)}</b><small class="${cls(G.vol24)}">${pct(G.vol24)}</small></div><div><span>BTC dom.</span><b>${G.btc??'—'}%</b><small>ETH ${G.eth??'—'}%</small></div>`+(F?`<div><span>Fear &amp; Greed</span><b style="color:hsl(${F.v*1.2},80%,55%)">${F.v}</b><small>${esc(F.c)}</small></div>`:'');
 $('#mkupd').textContent='Updated '+new Date(MK.at*1000).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit',timeZone:TZ});
 const q=mkQ.toLowerCase();let a=MK.coins.filter(c=>!q||c[2].toLowerCase().includes(q)||c[3].toLowerCase().includes(q));
 const si={rank:1,price:4,ch:6,vol:9}[mkSort];a=a.slice().sort((x,y)=>mkSort==='rank'?x[1]-y[1]:(y[si]??-1e18)-(x[si]??-1e18));
 L.innerHTML=a.map(c=>`<div class="mkr press" data-cid="${c[0]}"><span class="mkn mut">${c[1]}</span><img class="mki" loading="lazy" src="${ICO(c[0])}" alt=""><div class="mkc"><b>${esc(c[2])}</b><small>${big(c[8])}</small></div>
  <img class="mks" loading="lazy" src="https://s3.coinmarketcap.com/generated/sparklines/web/7d/2781/${c[0]}.svg" alt="" onerror="this.style.visibility='hidden'" style="filter:${(c[7]||0)>=0?'hue-rotate(0)':'none'}">
  <div class="mkp"><b class="num">${mpx(c[4])}</b><small class="${cls(c[6])}">${pct(c[6])}</small></div></div>`).join('')||'<div class="empty">No coins match.</div>'}
$('#mkq').addEventListener('input',e=>{mkQ=e.target.value.trim();mkRender()});
segInit($('#mksort'),b=>{mkSort=b.dataset.s;mkRender()});
$('#mklist').addEventListener('click',e=>{const r=e.target.closest('[data-cid]');if(r)openView('coin',r.dataset.cid)});
function renderCoin(id){const c=MK&&MK.coins.find(x=>String(x[0])===String(id));if(!c){vtitle.textContent='Coin';vbody.innerHTML='<div class="empty">Coin not found.</div>';return}
 vtitle.innerHTML=`${esc(c[3])} <span class="mut">${esc(c[2])}</span>`;$('#vlive').hidden=true;
 vbody.innerHTML=`<div class="mkh"><img src="${ICO(c[0])}" alt=""><div><b class="num">${mpx(c[4])}</b><small class="${cls(c[6])}">${pct(c[6])} 24h</small></div><span class="mut">#${c[1]}</span></div>
  <div class="tfrow"><div class="seg sm" id="ctf"><span class="sb"></span>${['15m','1h','4h','1d'].map((x,i)=>`<button class="press ${i!==1?'':'on'}" data-tf="${x}">${x}</button>`).join('')}</div><span class="mut" style="font-size:13px">Kraken · USD</span></div>
  <div class="lwbox" id="cchart"><div class="ld">Loading chart…</div></div>
  <div class="panel" style="margin-top:14px"><div class="lbl"><span>Price alerts</span><button class="lnk press" id="aladd">+ Set alert</button></div>
   <div class="alf" id="alf" hidden><input id="alin" type="number" inputmode="decimal" step="any" placeholder="Alert price (USD)"><button class="pill press" id="alok">Save</button></div>
   <div id="allist"></div><div class="info">Alerts fire while the app is open.</div></div>
  <div class="panel" style="margin-top:14px"><div class="kvg">${cell('1h',pct(c[5]),'',cls(c[5]))}${cell('24h',pct(c[6]),'',cls(c[6]))}${cell('7d',pct(c[7]),'',cls(c[7]))}
  ${cell('Market cap',big(c[8]))}${cell('Volume 24h',big(c[9]))}${cell('Vol/MCap',c[8]?(c[9]/c[8]*100).toFixed(1)+'%':'—')}
  ${cell('Circulating',sup(c[10]))}${cell('Max supply',c[11]?sup(c[11]):'∞')}${cell('Rank','#'+c[1])}</div></div>
  <p class="foot">Market data: CoinMarketCap · updated ${new Date(MK.at*1000).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit',timeZone:TZ})}</p>`;
 let ch=null;const load=async k=>{const el=$('#cchart');try{const d=await ohlc(c[2],k);if(!V||V.arg!==id)return;if(!d.length)throw 0;
   if(ch){el._exitFs&&el._exitFs();ch.c.remove()}el.innerHTML='';ch=mkChart(el,c[4],()=>ALR.filter(a=>a.cid==id&&!a.hit).map(a=>a.price));ch.s.setData(toBars(d));ch.c.timeScale().fitContent();lines=[];drawAl()}
  catch(_){if(V&&V.arg===id){$('#ctf').parentNode.hidden=true;el.outerHTML='<div class="empty">Not traded on Kraken — stats only.</div>'}}};
 let lines=[];const drawAl=()=>{const mine=ALR.filter(a=>a.cid==id);
  $('#allist').innerHTML=mine.map(a=>`<div class="kv"><span>${a.dir==='above'?'▲ Above':'▼ Below'} <b class="num">${mpx(a.price)}</b>${a.hit?' <small class="up">triggered</small>':''}</span><button class="lnk press" data-ald="${a.id}">Delete</button></div>`).join('')||'<div class="empty" style="padding:12px">No alerts for this coin.</div>';
  if(ch){lines.forEach(l=>{try{ch.s.removePriceLine(l)}catch(_){}});lines=mine.filter(a=>!a.hit).map(a=>ch.s.createPriceLine({price:a.price,color:'#ffb020',lineWidth:1,lineStyle:2,axisLabelVisible:true,title:'🔔'}))}};
 $('#aladd').onclick=()=>{$('#alf').hidden=!$('#alf').hidden;$('#alin').focus()};
 $('#alok').onclick=()=>{const v=parseFloat($('#alin').value);if(!(v>0))return;const cur=alPrice[id]||c[4];
  ALR.push({id:Date.now().toString(36),cid:c[0],sym:c[2],price:v,dir:v>=cur?'above':'below'});alSave();$('#alin').value='';$('#alf').hidden=true;drawAl();
  if('Notification' in window&&Notification.permission==='default')Notification.requestPermission()};
 $('#allist').onclick=e=>{const b=e.target.closest('[data-ald]');if(b){ALR=ALR.filter(a=>a.id!==b.dataset.ald);alSave();drawAl()}};
 drawAl();V.redrawAl=drawAl;
 segInit($('#ctf'),b=>load(b.dataset.tf));load('1h');V.cleanup=()=>{const e=$('#cchart');e&&e._exitFs&&e._exitFs();if(ch)ch.c.remove();$('#vlive').hidden=false}}
/* price alerts: checked every 30s while the app is open (Kraken ticker, else markets.json price) */
let ALR=[];try{ALR=JSON.parse(localStorage.getItem('ct_alerts')||'[]')}catch(_){}
const alPrice={};const alSave=()=>localStorage.setItem('ct_alerts',JSON.stringify(ALR));
function toast(t){let el=$('#toast');if(!el){el=document.createElement('div');el.id='toast';el.className='toast';document.body.appendChild(el)}el.textContent=t;el.classList.add('on');clearTimeout(el._t);el._t=setTimeout(()=>el.classList.remove('on'),6000)}
async function alCheck(){const act=ALR.filter(a=>!a.hit);if(!act.length)return;
 for(const cid of new Set(act.map(a=>a.cid))){const a0=act.find(a=>a.cid===cid);let p=null;
  try{const j=await (await fetch('https://api.kraken.com/0/public/Ticker?pair='+spotPair(a0.sym))).json();const k=j.result&&Object.keys(j.result)[0];if(k)p=+j.result[k].c[0]}catch(_){}
  if(!(p>0)){const m=MK&&MK.coins.find(x=>x[0]===cid);if(m)p=m[4]}
  if(!(p>0))continue;alPrice[cid]=p;
  for(const a of act.filter(a=>a.cid===cid))if(a.dir==='above'?p>=a.price:p<=a.price){a.hit=Date.now();try{window.__x15&&__x15.SFX.alert()}catch(_){}
   const msg=`${a.sym} ${a.dir==='above'?'rose above':'fell below'} ${mpx(a.price)} — now ${mpx(p)}`;toast('🔔 '+msg);
   try{if(Notification.permission==='granted')(await navigator.serviceWorker.ready).showNotification('Price alert: '+a.sym,{body:msg,tag:'alert-'+a.id,icon:'icon-192.png',badge:'badge-96.png'})}catch(_){}}}
 alSave();if(V&&V.redrawAl)V.redrawAl()}
setInterval(()=>{if(!document.hidden)alCheck()},30000);setTimeout(alCheck,3000);
/* ---------- Sell button: signed close request -> box (Tailscale Funnel /cm) -> close-requests/<id>.json -> Crypto Trader ---------- */
const BOX0='https://crypto-box.tailc9dc5b.ts.net/cm';  // also hard-coded in boxURL() (hoisted, used before this line runs)
// v20: endpoint comes from the encrypted payload (S.box) so a changed URL is followed; last known kept on device
function boxURL(){const u=S&&S.box;if(u&&/^https:\/\//.test(u)){if(localStorage.getItem('ct_box')!==u)localStorage.setItem('ct_box',u);return u}return localStorage.getItem('ct_box')||'https://crypto-box.tailc9dc5b.ts.net/cm'}
function tfetch(u,o,ms){const c=new AbortController(),t=setTimeout(()=>c.abort(),ms);return fetch(u,Object.assign({cache:'no-store',signal:c.signal},o)).finally(()=>clearTimeout(t))}
async function aesEnc(obj){const raw=Uint8Array.from(atob(localStorage.getItem('ct_k').replace(/-/g,'+').replace(/_/g,'/')+'='),c=>c.charCodeAt(0));
 const k=await crypto.subtle.importKey('raw',raw,'AES-GCM',false,['encrypt']),iv=crypto.getRandomValues(new Uint8Array(12));
 const ct=new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:new TextEncoder().encode('ctmon')},k,new TextEncoder().encode(JSON.stringify(obj))));
 const u=new Uint8Array(15+ct.length);u.set([67,84,49]);u.set(iv,3);u.set(ct,15);let b='';u.forEach(x=>b+=String.fromCharCode(x));return btoa(b)}
const uuid4=()=>crypto.randomUUID?crypto.randomUUID():'10000000-1000-4000-8000-100000000000'.replace(/[018]/g,c=>(c^crypto.getRandomValues(new Uint8Array(1))[0]&15>>c/4).toString(16));
async function hsig(msg){const raw=Uint8Array.from(atob(localStorage.getItem('ct_k').replace(/-/g,'+').replace(/_/g,'/')+'='),c=>c.charCodeAt(0));
 const k=await crypto.subtle.importKey('raw',raw,{name:'HMAC',hash:'SHA-256'},false,['sign']);
 return [...new Uint8Array(await crypto.subtle.sign('HMAC',k,new TextEncoder().encode(msg)))].map(b=>b.toString(16).padStart(2,'0')).join('')}
function sellDlg(p){const d=document.createElement('div');d.className='sheet sellsh';
 d.innerHTML=`<div class="sh-card"><b>Close ${esc(p.symbol)} ${esc(p.side)} at market?</b><p>Stop/TP will be cancelled.<br><span class="mut">Entry ${px(p.entry)} · size ${qty(p.size)}</span></p><p class="sellst" id="sellst"></p>
  <div class="sellbtns"><button class="pill ghost press" id="sellno">Cancel</button><button class="pill sellgo press" id="sellok">Sell</button></div></div>`;
 document.body.appendChild(d);const st=d.querySelector('#sellst'),ok=d.querySelector('#sellok'),no=d.querySelector('#sellno');let busy=false;
 no.onclick=()=>{if(!busy)d.remove();else{d.remove()}};
 ok.onclick=async()=>{if(busy)return;busy=true;ok.disabled=true;ok.textContent='Sending…';no.textContent='Close';
  const id=uuid4();let j=null,queued=false,lastErr='';
  try{const pl=JSON.stringify({pair:p.symbol,side:p.side,entry_price:p.entry,ts:Date.now()/1000,nonce:crypto.getRandomValues(new Uint32Array(2)).join('-'),id});
   const body=JSON.stringify({p:pl,s:await hsig(pl)});
   // 1) direct to the box, 4 tries over ~25s (box may be waking up)
   for(let a=1;a<=4&&!j;a++){
    try{const r=await tfetch(boxURL()+'/close',{method:'POST',headers:{'Content-Type':'text/plain'},body},9000);const x=await r.json();
     if(r.ok&&x.id){j=x;break}if(r.status>=400&&r.status<500)throw Object.assign(new Error(x.error||('HTTP '+r.status)),{fatal:true});lastErr='HTTP '+r.status}
    catch(e){if(e.fatal)throw e;lastErr=e.name==='AbortError'?'timed out':'no connection'}
    if(a<4){st.textContent=`Box not answering (${lastErr}), retrying ${a+1}/4…`;await new Promise(x=>setTimeout(x,2000*a))}}
   // 2) backup queue: same signed request, encrypted, via ntfy.sh; the box picks it up when reachable (valid 10 min)
   if(!j){const r=await tfetch('https://ntfy.sh/ctq'+(await hsig('ct-close-q')).slice(0,32),{method:'POST',body:await aesEnc(JSON.parse(body))},10000);
    if(!r.ok)throw new Error('box unreachable and backup queue failed (HTTP '+r.status+')');queued=true;j={id}}
   st.textContent=queued?'Box unreachable, sent via backup queue. It will close as soon as the box answers (request valid 10 min)…':'Sent. Waiting for Crypto Trader…';ok.textContent='Pending…';
   const t0=Date.now(),lim=queued?600000:60000;while(Date.now()-t0<lim){await new Promise(x=>setTimeout(x,2500));if(!d.isConnected)return;
    try{const q=await (await tfetch(boxURL()+'/close/'+j.id,{},8000)).json();
     if(q.status==='closed'){st.innerHTML=`<b class="up">Closed at $${px(q.exit_price)}, P&amp;L <span class="${cls(q.pnl)}">${usd(q.pnl,1)}</span></b>`;ok.textContent='Done';return}
     if(q.status==='rejected'){st.innerHTML=`<b class="dn">Rejected: ${esc(q.reason||'no reason given')}</b>`;ok.textContent='Rejected';return}
     if(queued&&q.status==='pending')st.textContent='Box received it. Waiting for Crypto Trader…'}catch(_){}}
   st.innerHTML=queued?'<b class="warn">Box still not answering after 10 min. The request has expired and will not run. Check the position and try again.</b>':'<b class="warn">No response yet, Crypto Trader may be offline.</b>';ok.textContent='No response'}
  catch(e){st.innerHTML=`<b class="dn">Couldn't send: ${esc(e.message||e)}. Nothing was closed. Tap Retry.</b>`;ok.disabled=false;ok.textContent='Retry';busy=false}}}

/* ---------- v23: Edit TP/SL + Partial TP (feature-flagged; send path mirrors Sell, never omits type on these requests) ---------- */
function rawpx(v){if(v==null||v==='')return '';const a=Math.abs(v),d=a>=1000?1:a>=10?2:a>=1?3:a>=0.1?5:8;return String(Number(Number(v).toFixed(d)))}
function liveMark(p){const L=LIVE[p.symbol];return(L&&L.mark&&Date.now()-L.t<20000)?L.mark:p.mark}
function parseLvl(s){if(s==null)return null;const t=String(s).trim();if(!t)return null;const n=Number(t.replace(/,/g,''));return Number.isFinite(n)&&n>0?n:NaN}
function tpslValid(p,stop,tgt,mark){const lo=p.side==='long';if(stop==null||tgt==null||!mark)return{ok:false,msg:'Enter both a stop and a take profit'};if(!Number.isFinite(stop)||!Number.isFinite(tgt))return{ok:false,msg:'Enter a valid price'};
 if(lo){if(!(stop<mark&&mark<tgt))return{ok:false,msg:'For a long, stop must be below the mark and take profit above it'}}
 else{if(!(tgt<mark&&mark<stop))return{ok:false,msg:'For a short, take profit must be below the mark and stop above it'}}
 return{ok:true,msg:''}}
function previewHTML(p,stop,tgt,mark){const sg=p.side==='long'?1:-1,sz=p.size||0;
 const toS=(stop&&mark)?(stop-mark)*sz*sg:null,toT=(tgt&&mark)?(tgt-mark)*sz*sg:null;
 const pcS=(stop&&mark)?(stop/mark-1)*100:null,pcT=(tgt&&mark)?(tgt/mark-1)*100:null;
 return `<div class="tpsl-prev"><div><span class="k">To stop</span><b class="dn">${pct(pcS)}</b><span class="mut">${toS==null?'—':usd(toS,1)+' at risk'}</span></div>
  <div><span class="k">To target</span><b class="up">${pct(pcT)}</b><span class="mut">${toT==null?'—':usd(toT,1)+' reward'}</span></div></div>`}
function tpslChart(cv,p,getV,setV){
 let drag=null;
 const draw=()=>{const v=getV(),dpr=Math.max(1,window.devicePixelRatio||1),cssW=cv.clientWidth||320,cssH=cv.clientHeight||160;
  cv.width=Math.round(cssW*dpr);cv.height=Math.round(cssH*dpr);const g=cv.getContext('2d');g.setTransform(dpr,0,0,dpr,0,0);g.clearRect(0,0,cssW,cssH);
  const levels=[{k:'entry',px:p.entry,c:'#e7e9ea',lab:'ENTRY',drag:false},{k:'mark',px:v.mark,c:'#1d9bf0',lab:'MARK',drag:false},{k:'stop',px:v.stop,c:'#f91880',lab:'STOP',drag:true},{k:'target',px:v.target,c:'#00ba7c',lab:'TARGET',drag:true}].filter(x=>Number.isFinite(x.px));
  const xs=levels.map(x=>x.px);const pad=Math.max((Math.max(...xs)-Math.min(...xs))*0.18, (v.mark||p.entry||1)*0.008);
  let mn=Math.min(...xs)-pad,mx=Math.max(...xs)+pad;if(mx<=mn){mn-=1;mx+=1}
  const L=10,R=cssW-56,T=12,B=cssH-12,Y=pr=>T+(1-(pr-mn)/(mx-mn))*(B-T);
  const bars=((posData[p.symbol]||{}).tf||{})['5m']||((posData[p.symbol]||{}).tf||{})['1m']||[];
  if(bars.length>2){const n=bars.slice(-60),w=(R-L)/Math.max(1,n.length-1);g.beginPath();n.forEach((c,i)=>{const y=Y(c[4]??c.close??c[1]);g[i?'lineTo':'moveTo'](L+i*w,y)});g.strokeStyle='rgba(255,255,255,.22)';g.lineWidth=1.2;g.stroke()}
  levels.forEach(x=>{const y=Y(x.px);g.beginPath();g.moveTo(L,y);g.lineTo(R,y);g.strokeStyle=x.c;g.lineWidth=x.drag?2:1;g.setLineDash(x.drag?[]:[4,4]);g.stroke();g.setLineDash([]);
   g.fillStyle=x.c;g.font='700 10px ui-monospace,monospace';g.textBaseline='middle';g.fillText(x.lab+' '+rawpx(x.px),R+4,y);
   if(x.drag){g.beginPath();g.arc(L+8,y,5,0,Math.PI*2);g.fill()}})}
 const hit=y=>{const v=getV(),dpr=Math.max(1,window.devicePixelRatio||1),cssH=cv.clientHeight||160,cssW=cv.clientWidth||320;
  const xs=[v.stop,v.target,v.mark,p.entry].filter(Number.isFinite);const pad=Math.max((Math.max(...xs)-Math.min(...xs))*0.18,(v.mark||p.entry||1)*0.008);
  let mn=Math.min(...xs)-pad,mx=Math.max(...xs)+pad;if(mx<=mn){mn-=1;mx+=1}
  const T=12,B=cssH-12,price=mn+(1-(y-T)/(B-T))*(mx-mn);
  const Y=pr=>T+(1-(pr-mn)/(mx-mn))*(B-T);const cand=[['stop',v.stop],['target',v.target]].filter(x=>Number.isFinite(x[1]));
  let best=null,bd=1e9;cand.forEach(([k,pr])=>{const d=Math.abs(Y(pr)-y);if(d<bd){bd=d;best=k}});return{which:bd<=16?best:null,price}}
 cv.onpointerdown=e=>{const r=cv.getBoundingClientRect(),h=hit(e.clientY-r.top);if(!h.which)return;cv.setPointerCapture(e.pointerId);drag=h.which;cv.classList.add('dragging')};
 cv.onpointermove=e=>{if(!drag)return;const r=cv.getBoundingClientRect(),h=hit(e.clientY-r.top);if(Number.isFinite(h.price))setV(drag,h.price)};
 const end=()=>{drag=null;cv.classList.remove('dragging')};cv.onpointerup=end;cv.onpointercancel=end;
 draw();return draw}

async function sendTyped(p, extra, st, okBtn){
  const id=uuid4();let j=null,queued=false,lastErr='';
  const pl=JSON.stringify(Object.assign({pair:p.symbol,side:p.side,entry_price:p.entry,ts:Date.now()/1000,nonce:crypto.getRandomValues(new Uint32Array(2)).join('-'),id},extra));
  const body=JSON.stringify({p:pl,s:await hsig(pl)});
  for(let a=1;a<=4&&!j;a++){
   try{const r=await tfetch(boxURL()+'/close',{method:'POST',headers:{'Content-Type':'text/plain'},body},9000);const x=await r.json();
    if(r.ok&&x.id){j=x;break}if(r.status>=400&&r.status<500)throw Object.assign(new Error(x.error||('HTTP '+r.status)),{fatal:true});lastErr='HTTP '+r.status}
   catch(e){if(e.fatal)throw e;lastErr=e.name==='AbortError'?'timed out':'no connection'}
   if(a<4){st.textContent=`Box not answering (${lastErr}), retrying ${a+1}/4…`;await new Promise(x=>setTimeout(x,2000*a))}}
  if(!j){const r=await tfetch('https://ntfy.sh/ctq'+(await hsig('ct-close-q')).slice(0,32),{method:'POST',body:await aesEnc(JSON.parse(body))},10000);
   if(!r.ok)throw new Error('box unreachable and backup queue failed (HTTP '+r.status+')');queued=true;j={id}}
  return {j,queued,id}
}
async function waitResult(j,queued,st,okBtn,d,fmt){
  st.textContent=queued?'Box unreachable, sent via backup queue. Waiting for Crypto Trader (request valid 10 min)…':'Sent. Waiting for Crypto Trader…';okBtn.textContent='Pending…';
  const t0=Date.now(),lim=queued?600000:60000;while(Date.now()-t0<lim){await new Promise(x=>setTimeout(x,2500));if(!d.isConnected)return;
   try{const q=await (await tfetch(boxURL()+'/close/'+j.id,{},8000)).json();
    if(q.status==='applied'||q.status==='closed'){const msg=fmt(q);st.innerHTML=`<b class="up">${msg}</b>`;okBtn.textContent='Done';toast(msg.replace(/<[^>]+>/g,' '));return}
    if(q.status==='rejected'){const msg='Rejected: '+(q.reason||'no reason given');st.innerHTML=`<b class="dn">${esc(msg)}</b>`;okBtn.textContent='Rejected';toast(msg);return}
    if(queued&&q.status==='pending')st.textContent='Box received it. Waiting for Crypto Trader…'}catch(_){}}
  const warn=queued?'Box still not answering after 10 min. The request has expired and will not run. Check the position and try again.':'No response yet, Crypto Trader may be offline.';
  st.innerHTML=`<b class="warn">${warn}</b>`;okBtn.textContent='No response';toast(warn)
}

function modifyDlg(p){const d=document.createElement('div');d.className='sheet sellsh tpslsh';
 const mark0=liveMark(p);
 d.innerHTML=`<div class="sh-card tpsl-card"><b>Edit take profit / stop</b>
  <p>${esc(p.symbol)} <span class="${p.side==='long'?'up':'dn'}">${esc(p.side)}</span> · mark <span id="tpslmk">${px(mark0)}</span> · entry ${px(p.entry)}</p>
  <canvas class="tpsl-cv" id="tpslcv" height="160"></canvas>
  <label class="tpsl-in">Take profit<input id="tpin" type="text" inputmode="decimal" autocomplete="off" value="${esc(rawpx(p.target))}"></label>
  <label class="tpsl-in">Stop loss<input id="slin" type="text" inputmode="decimal" autocomplete="off" value="${esc(rawpx(p.stop))}"></label>
  <div id="tpslprev"></div><p class="err" id="tpslerr"></p><p class="sellst" id="editst"></p>
  <div class="sellbtns"><button class="pill ghost press" id="editno">Cancel</button><button class="pill tpslgo press" id="editok">Update</button></div></div>`;
 document.body.appendChild(d);
 const st=d.querySelector('#editst'),ok=d.querySelector('#editok'),no=d.querySelector('#editno'),tin=d.querySelector('#tpin'),sin=d.querySelector('#slin'),err=d.querySelector('#tpslerr'),prev=d.querySelector('#tpslprev'),mk=d.querySelector('#tpslmk');
 let busy=false,draw=null;
 const near=(a,b)=>a==null||b==null?a==b:Math.abs(a-b)<=Math.max(1e-8,Math.abs(b)*1e-8);
 const cur=()=>{const mark=liveMark(p);return{stop:parseLvl(sin.value),target:parseLvl(tin.value),mark}};
 const paint=()=>{const v=cur(),effS=Number.isFinite(v.stop)?v.stop:p.stop,effT=Number.isFinite(v.target)?v.target:p.target;
  if(mk)mk.textContent=px(v.mark);prev.innerHTML=previewHTML(p,effS,effT,v.mark);
  const chS=v.stop!=null&&Number.isFinite(v.stop)&&!near(v.stop,p.stop),chT=v.target!=null&&Number.isFinite(v.target)&&!near(v.target,p.target);
  const val=tpslValid(p,effS,effT,v.mark);err.textContent=val.ok?'':val.msg;ok.disabled=busy||!val.ok||!(chS||chT);
  if(draw)draw()};
 const setV=(k,price)=>{if(k==='stop')sin.value=rawpx(price);else tin.value=rawpx(price);paint()};
 draw=tpslChart(d.querySelector('#tpslcv'),p,()=>{const v=cur();return{stop:Number.isFinite(v.stop)?v.stop:p.stop,target:Number.isFinite(v.target)?v.target:p.target,mark:v.mark}},setV);
 tin.addEventListener('input',paint);sin.addEventListener('input',paint);paint();
 const tick=setInterval(paint,1000);
 const close=()=>{clearInterval(tick);d.remove()};
 no.onclick=()=>close();d.addEventListener('click',e=>{if(e.target===d&&!busy)close()});
 const onEsc=e=>{if(e.key==='Escape'&&!busy){close();removeEventListener('keydown',onEsc)}};addEventListener('keydown',onEsc);
 ok.onclick=async()=>{if(busy||ok.disabled)return;const v=cur(),effS=Number.isFinite(v.stop)?v.stop:p.stop,effT=Number.isFinite(v.target)?v.target:p.target;
  const val=tpslValid(p,effS,effT,v.mark);if(!val.ok){err.textContent=val.msg;return}
  busy=true;ok.disabled=true;ok.textContent='Sending…';no.textContent='Close';
  const stop=v.stop==null||near(v.stop,p.stop)?null:v.stop,target=v.target==null||near(v.target,p.target)?null:v.target;
  try{const {j,queued}=await sendTyped(p,{type:'modify',stop,target},st,ok);await waitResult(j,queued,st,ok,d,q=>{
    const ns=q.stop??effS,nt=q.target??effT;return `Updated stop ${px(ns)} · target ${px(nt)}`})}
   catch(e){st.innerHTML=`<b class="dn">Couldn't send: ${esc(e.message||e)}. Nothing was changed. Tap Retry.</b>`;ok.disabled=false;ok.textContent='Retry';busy=false;toast("Couldn't send: "+(e.message||e))}}}

function partialDlg(p){const d=document.createElement('div');d.className='sheet sellsh partsh';
 const mark0=liveMark(p),sg=p.side==='long'?1:-1,fracs=[0.25,0.5,0.75];
 const row=f=>{const sz=(p.size||0)*f,pnl=(mark0-p.entry)*sz*sg;return `<button type="button" class="fracb press" data-frac="${f}"><b>${Math.round(f*100)}%</b><span>${qty(sz)} ${esc(p.coin)}</span><span class="${cls(pnl)}">${usd(pnl,1)} est.</span></button>`};
 d.innerHTML=`<div class="sh-card tpsl-card"><b>Partial take profit</b>
  <p>Sell a slice of ${esc(p.symbol)} <span class="${p.side==='long'?'up':'dn'}">${esc(p.side)}</span> at market.<br><span class="mut">Size ${qty(p.size)} · mark ${px(mark0)} · entry ${px(p.entry)}</span></p>
  <div class="fracs" id="fracs">${fracs.map(row).join('')}</div>
  <p class="partcf" id="partcf" hidden></p>
  <p class="sellst" id="partst"></p>
  <div class="sellbtns"><button class="pill ghost press" id="partno">Cancel</button><button class="pill tpslgo press" id="partok" disabled>Confirm</button></div></div>`;
 document.body.appendChild(d);
 const st=d.querySelector('#partst'),ok=d.querySelector('#partok'),no=d.querySelector('#partno'),cf=d.querySelector('#partcf');
 let busy=false,frac=null;
 const pick=f=>{frac=f;d.querySelectorAll('.fracb').forEach(b=>b.classList.toggle('on',Number(b.dataset.frac)===f));
  const mark=liveMark(p),sz=(p.size||0)*f,pnl=(mark-p.entry)*sz*sg;
  cf.hidden=false;cf.innerHTML=`Sell <b>${Math.round(f*100)}%</b> (${qty(sz)} ${esc(p.coin)}) of ${esc(p.symbol)} at market? Est. P&amp;L <b class="${cls(pnl)}">${usd(pnl,1)}</b>`;
  if(!busy){ok.disabled=false;ok.textContent='Confirm '+Math.round(f*100)+'%'}};
 d.querySelector('#fracs').addEventListener('click',e=>{const b=e.target.closest('[data-frac]');if(b&&!busy)pick(Number(b.dataset.frac))});
 const close=()=>d.remove();no.onclick=()=>close();d.addEventListener('click',e=>{if(e.target===d&&!busy)close()});
 const onEsc=e=>{if(e.key==='Escape'&&!busy){close();removeEventListener('keydown',onEsc)}};addEventListener('keydown',onEsc);
 ok.onclick=async()=>{if(busy||frac==null)return;busy=true;ok.disabled=true;ok.textContent='Sending…';no.textContent='Close';
  try{const {j,queued}=await sendTyped(p,{type:'partial',fraction:frac},st,ok);const f=frac;await waitResult(j,queued,st,ok,d,q=>{
    const px_=q.exit_price!=null?px(q.exit_price):px(liveMark(p));const pnl=q.pnl!=null?usd(q.pnl,1):'';return `Sold ${Math.round(f*100)}% at $${px_}${pnl?`, P&amp;L <span class="${cls(q.pnl)}">${pnl}</span>`:''}`})}
   catch(e){st.innerHTML=`<b class="dn">Couldn't send: ${esc(e.message||e)}. Nothing was sold. Tap Retry.</b>`;ok.disabled=false;ok.textContent='Retry';busy=false;toast("Couldn't send: "+(e.message||e))}}}

(()=>{const ex=+localStorage.getItem('ct_kexp');if(ex)$('#lkuntil').textContent='Remembered until '+new Date(ex).toLocaleDateString('en-GB',{day:'numeric',month:'short'});$('#lockbtn').onclick=()=>{if(confirm('Lock this device? You will need the password again.'))lockDevice()}})();
$('#positions').addEventListener('click',e=>{if(e.target.closest('.sellrow'))e.stopPropagation();const b=e.target.closest('[data-sell]'),ed=e.target.closest('[data-edit]'),pt=e.target.closest('[data-partial]');if(!b&&!ed&&!pt)return;const sym=(b&&b.dataset.sell)||(ed&&ed.dataset.edit)||(pt&&pt.dataset.partial);const p=S&&S.positions.find(x=>x.symbol===sym);if(!p)return;if(b)sellDlg(p);else if(ENABLE_MODIFY_PARTIAL&&ed)modifyDlg(p);else if(ENABLE_MODIFY_PARTIAL&&pt)partialDlg(p)});
/* ---------- v11 motion: staggered entrances, price flash, count-up, chart draw-in (presentation only) ---------- */
(()=>{if(RM)return;const seen=new WeakSet(),prev=new Map(),busy=new WeakSet();
 const ROWS='.pos,.tr,.lr,.mkr,.st,.kv,.mkg>div',NUMS='.hv,.pos b,.st .v,.mkp b,.foot2 b,.kvg b,.wtrack b';
 const parse=t=>{const m=String(t).match(/([−-])?\$?([\d,]*\.?\d+)/);return m?{v:(m[1]?-1:1)*parseFloat(m[2].replace(/,/g,'')),s:m[0],d:(m[2].split('.')[1]||'').length}:null};
 function countUp(el,n){busy.add(el);const tpl=el.textContent,t0=performance.now(),D=700;
  const step=t=>{const k=Math.min(1,(t-t0)/D),e=1-Math.pow(1-k,3),v=Math.abs(n.v)*e;
   el.textContent=tpl.replace(n.s,n.s.replace(/[\d,]*\.?\d+/,v.toLocaleString('en-GB',{minimumFractionDigits:n.d,maximumFractionDigits:n.d})));
   if(k<1)requestAnimationFrame(step);else{el.textContent=tpl;busy.delete(el)}};requestAnimationFrame(step)}
 function scan(){document.querySelectorAll(NUMS).forEach(el=>{if(busy.has(el))return;const n=parse(el.textContent);if(!n)return;const r=el.closest('[data-cid],[data-sym],[data-tid]'),st=el.closest('.st'),key=(r?JSON.stringify(r.dataset):'')+'|'+(st?st.querySelector('.k').textContent:(el.previousElementSibling||el.parentNode.firstElementChild||el).textContent)+'|'+[...el.parentNode.children].indexOf(el);const p=prev.get(key);prev.set(key,n.v);
   if(p===undefined){if(el.matches('.st .v')&&n.v)countUp(el,n);return}
   if(n.v!==p){el.classList.remove('fxup','fxdn');void el.offsetWidth;el.classList.add(n.v>p?'fxup':'fxdn')}});
  document.querySelectorAll('[data-view]:not([hidden]) :is(#positions,#stats,#feed,#latest,#minilog,#act,#mklist,#mkglob,#statsMain), #vbody').forEach(c=>{
   if(seen.has(c)||!c.children.length||c.querySelector('.empty:only-child'))return;seen.add(c);let i=0;
   c.querySelectorAll(ROWS).forEach(r=>{if(i<14){r.style.setProperty('--i',i++);r.classList.add('fxin');r.addEventListener('animationend',()=>r.classList.remove('fxin'),{once:true})}})});
  const ch=$('#chart path');if(ch&&!seen.has(ch)&&ch.getTotalLength){seen.add(ch);const L=ch.getTotalLength();ch.style.strokeDasharray=L;ch.style.strokeDashoffset=L;ch.getBoundingClientRect();ch.style.transition='stroke-dashoffset 1.4s cubic-bezier(.4,0,.2,1)';ch.style.strokeDashoffset=0;setTimeout(()=>{ch.style.strokeDasharray='';ch.style.transition=''},1500)}}
 let q=0;new MutationObserver(()=>{if(!q)q=requestAnimationFrame(()=>{q=0;scan()})}).observe(document.body,{subtree:true,childList:true,characterData:true});
 document.addEventListener('click',e=>{if(e.target.closest('.tb,[data-goto]'))setTimeout(()=>{document.querySelectorAll('[data-view]:not([hidden]) *').forEach(x=>seen.delete(x));scan()},20)});
 view.addEventListener('transitionstart',()=>seen.delete(vbody));new MutationObserver(()=>{if(view.hidden)seen.delete(vbody)}).observe(view,{attributes:true,attributeFilter:['hidden']})})();
/* ---------- v15: trade-closed overlay, bot terminal, stats curve, sound/haptics, streaks/badges, recap ---------- */
const X15=(()=>{const LS=(k,d)=>{try{return JSON.parse(localStorage.getItem(k))??d}catch(_){return d}},SV=(k,v)=>localStorage.setItem(k,JSON.stringify(v));
 let snd=LS('ct_sound',true),AC=null,lastPos=null,termSeen=null,x15html='',ath=null;
 const unlock=()=>{if(!AC){try{AC=new (window.AudioContext||window.webkitAudioContext)()}catch(_){}}if(AC&&AC.state==='suspended')AC.resume()};
 addEventListener('pointerdown',unlock,{passive:true});
 function tone(seq){if(!snd||!AC)return;let t=AC.currentTime;seq.forEach(([f,d,ty])=>{const o=AC.createOscillator(),g=AC.createGain();o.type=ty||'sine';o.frequency.value=f;g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.15,t+.01);g.gain.exponentialRampToValueAtTime(.001,t+d);o.connect(g).connect(AC.destination);o.start(t);o.stop(t+d+.02);t+=d*.8})}
 const buzz=p=>{try{navigator.vibrate&&navigator.vibrate(p)}catch(_){}};
 const SFX={open:()=>{tone([[660,.09],[880,.12]]);buzz(30)},win:()=>{tone([[523,.1],[659,.1],[784,.1],[1047,.25,'triangle']]);buzz([40,40,80])},loss:()=>{tone([[330,.15,'sawtooth'],[220,.3,'sawtooth']]);buzz([120])},alert:()=>{tone([[988,.08],[988,.08],[1319,.18]]);buzz([50,50,50])}};
 function confetti(){if(RM)return;const c=document.createElement('canvas');c.className='confetti';const d=devicePixelRatio||1;c.width=innerWidth*d;c.height=innerHeight*d;document.body.appendChild(c);const g=c.getContext('2d');g.scale(d,d);
  const P=[...Array(110)].map(()=>({x:innerWidth/2,y:innerHeight*.42,vx:(Math.random()-.5)*12,vy:-Math.random()*13-3,r:Math.random()*6.28,s:4+Math.random()*5,c:['#00ba7c','#7dffc4','#ffd400','#1d9bf0','#a78bfa'][Math.random()*5|0]}));const t0=performance.now();
  (function f(t){g.clearRect(0,0,innerWidth,innerHeight);P.forEach(p=>{p.vy+=.35;p.vx*=.99;p.x+=p.vx;p.y+=p.vy;p.r+=.2;g.save();g.translate(p.x,p.y);g.rotate(p.r);g.fillStyle=p.c;g.fillRect(-p.s/2,-p.s/4,p.s,p.s/2);g.restore()});if(t-t0<1800)requestAnimationFrame(f);else c.remove()})(t0)}
 function openFx(p,then){const o=document.createElement('div');o.className='tco open';
  const lo=p.side==='long',sz=p.original_size||p.size;
  o.innerHTML=`<div class="tcc"><div class="tcm mwrap m-happy cheer">${document.querySelector('#mhead').innerHTML}</div><div class="tck">Trade opened</div><div class="tcn">${ci(p.coin,40)} ${esc(p.coin)} <span class="tside ${lo?'up':'dn'}">${lo?'LONG':'SHORT'}</span></div><div class="tcp openp">${px(p.entry)}</div><div class="tcx">${qty(sz)}${p.leverage?' · '+p.leverage+'×':''} · ${when(p.opened)}</div></div>`;
  document.body.appendChild(o);SFX.open();let gone=0;
  const fly=()=>{if(gone)return;gone=1;const tb=tbs[TABS.indexOf('home')],cr=o.querySelector('.tcc').getBoundingClientRect(),br=tb.getBoundingClientRect();
   o.querySelector('.tcc').style.transform=`translate(${br.left+br.width/2-(cr.left+cr.width/2)}px,${br.top+br.height/2-(cr.top+cr.height/2)}px) scale(.08)`;o.classList.add('fly');
   setTimeout(()=>{o.remove();tb.classList.add('tbping');setTimeout(()=>tb.classList.remove('tbping'),700);if(typeof then==='function')then()},RM?50:550)};
  o.addEventListener('click',fly);setTimeout(fly,RM?1200:2400)}
 function queueOpen(p,then){openQ.push([p,then]);if(openQ.length===1)runOpenQ()}
 function runOpenQ(){if(!openQ.length)return;const[p,then]=openQ[0];openFx(p,()=>{openQ.shift();if(typeof then==='function')then();runOpenQ()})}
 function openKey(p){return p.symbol+'|'+(p.opened||'')}
 function maybeOpenAnim(arg){const[sym]=String(arg).split('@');const p=S&&S.positions.find(x=>x.symbol===sym);if(!p)return false;
  const k=openKey(p);let seen=LS('ct_seen_open',[]);
  // already shown this open before → just open the position screen
  if(seen.includes(k))return false;
  SV('ct_seen_open',[k,...seen].slice(0,100));
  queueOpen(p,()=>openView('pos',arg));return true}
 function closedFx(t){const win=(t.pnl||0)>0,o=document.createElement('div');o.className='tco '+(win?'win':'loss');
  o.innerHTML=`<div class="tcc"><div class="tcm mwrap m-${win?'happy cheer':'worried'}">${document.querySelector('#mhead').innerHTML}</div><div class="tck">Trade closed</div><div class="tcn">${ci(t.coin,40)} ${esc(t.coin)} <span class="tside ${t.side==='long'?'up':'dn'}">${esc(String(t.side||'').toUpperCase())}</span></div><div class="tcp ${win?'up':'dn'}">${usd(0,1)}</div><div class="tcx">exit ${px(t.exit)} · ${esc(reasons[t.reason]||human(t.reason))}</div></div>`;
  document.body.appendChild(o);(win?SFX.win:SFX.loss)();if(win)confetti();const pe=o.querySelector('.tcp'),t0=performance.now(),D=RM?1:900;
  (function f(n){const k=Math.min(1,(n-t0)/D),e=1-Math.pow(1-k,3);pe.textContent=usd((t.pnl||0)*e,1);if(k<1)requestAnimationFrame(f)})(t0);
  let gone=0;const fly=()=>{if(gone)return;gone=1;const tb=tbs[TABS.indexOf('trades')],cr=o.querySelector('.tcc').getBoundingClientRect(),br=tb.getBoundingClientRect();
   o.querySelector('.tcc').style.transform=`translate(${br.left+br.width/2-(cr.left+cr.width/2)}px,${br.top+br.height/2-(cr.top+cr.height/2)}px) scale(.08)`;o.classList.add('fly');setTimeout(()=>{o.remove();tb.classList.add('tbping');setTimeout(()=>tb.classList.remove('tbping'),700)},RM?50:650)};
  o.addEventListener('click',fly);setTimeout(fly,RM?1500:2800)}
 function detect(){const ids=S.trades.map(t=>t.id);let seen=LS('ct_seen',null);
  if(!seen){SV('ct_seen',ids.slice(0,200));}else{const nw=S.trades.filter(t=>!seen.includes(t.id)&&Date.now()-pd(t.time)<6*3600e3);nw.slice(0,3).reverse().forEach((t,i)=>setTimeout(()=>closedFx(t),i*3200));if(S.trades.some(t=>!seen.includes(t.id)))SV('ct_seen',[...new Set([...ids,...seen])].slice(0,200))}
  // v22: trade-opened overlay (once per open). Seed on first run so old positions don't all animate.
  let seenO=LS('ct_seen_open',null);const keys=S.positions.map(openKey);
  if(seenO==null){const skip=window.__deepPos&&String(window.__deepPos).split('@')[0];
   const seed=keys.filter(k=>!skip||!k.startsWith(skip+'|'));SV('ct_seen_open',seed.slice(0,100));seenO=seed}
  else{const skip=window.__deepPos&&String(window.__deepPos).split('@')[0];
   const nw=S.positions.filter(p=>!seenO.includes(openKey(p))&&Date.now()-pd(p.opened)<6*3600e3&&p.symbol!==skip);
   nw.slice(0,3).reverse().forEach((p,i)=>setTimeout(()=>queueOpen(p,nw.length===1?()=>openView('pos',p.symbol):undefined),i*2800));
   if(S.positions.some(p=>!seenO.includes(openKey(p))))SV('ct_seen_open',[...new Set([...keys,...seenO])].slice(0,100))}
  const ps=S.positions.map(p=>p.symbol+p.opened).join();lastPos=ps}
 function term(){const T=$('#term');if(!T)return;if(T.offsetParent&&!T.dataset.s){T.dataset.s=1;requestAnimationFrame(()=>T.scrollTop=T.scrollHeight)}let el=T.firstElementChild;if(!el){el=document.createElement('div');T.appendChild(el)}const L=S.activity.slice(0,50).slice().reverse(),key=x=>x.time+x.text;
  const line=x=>{const d=pd(x.time),tm=ok(d)?d.toLocaleTimeString('en-GB',{timeZone:TZ}):'';return `<div class="tl ${x.tone||''}"><span class="tt">${tm}</span> <span class="tkk">${esc(KN[x.kind]||x.kind||'')}</span> <span class="tx">${esc(x.text)}</span></div>`};
  if(!termSeen){el.innerHTML=L.map(line).join('')+'<div class="tl cur">▍</div>';termSeen=new Set(L.map(key));T.scrollTop=T.scrollHeight;return}
  L.filter(x=>!termSeen.has(key(x))).forEach(x=>{termSeen.add(key(x));const w=document.createElement('div');w.innerHTML=line(x);const n=w.firstChild,tx=n.querySelector('.tx'),full=tx.textContent;el.insertBefore(n,el.lastChild);
   if(!RM){tx.textContent='';let i=0;const iv=setInterval(()=>{tx.textContent=full.slice(0,i+=2);if(i>=full.length)clearInterval(iv)},18)}while(el.children.length>51)el.firstChild.remove();T.scrollTop=T.scrollHeight})}
 function streaks(){const tr=S.trades.slice().reverse();let cur=0,best=0,c=0;tr.forEach(t=>{if((t.pnl||0)>0){c++;best=Math.max(best,c)}else c=0});for(const t of S.trades){if((t.pnl||0)>0)cur++;else break}
  const days={};tr.forEach(t=>{const d=pd(t.time);if(ok(d)){const k=d.toLocaleDateString('en-GB',{timeZone:TZ});days[k]=(days[k]||0)+(t.pnl||0)}});return {cur,best,bestDay:Math.max(0,...Object.values(days))}}
 function eqSvg(){const a=S.account,pts=S.equity_curve.map(e=>({t:pd(e.t),v:e.eq})).filter(p=>ok(p.t));pts.push({t:new Date(),v:a.equity});if(pts.length<2)return '';
  const W=600,H=200,vs=pts.map(p=>p.v),mn=Math.min(...vs),mx=Math.max(...vs),rg=mx-mn||1,X=i=>i/(pts.length-1)*W,Y=v=>12+(1-(v-mn)/rg)*(H-24);
  const d=pts.map((p,i)=>(i?'L':'M')+X(i).toFixed(1)+' '+Y(p.v).toFixed(1)).join(' '),lx=X(pts.length-1),ly=Y(a.equity),hi=a.equity>=mx-1e-9,col=a.equity>=a.start?'#00ba7c':'#f91880';
  return `<svg class="eqc" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none"><defs><linearGradient id="eg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${col}" stop-opacity=".3"/><stop offset="1" stop-color="${col}" stop-opacity="0"/></linearGradient></defs><path d="${d} L${W} ${H} L0 ${H}Z" fill="url(#eg)" class="eqf"/><path d="${d}" pathLength="1" class="eql" stroke="${col}"/></svg><div class="eqdot ${hi?'ath':''}" style="left:calc(${lx/W*100}% - 6px);top:calc(${ly/H*100}% - 6px);--c:${col}"></div>`}
 function badges(st){const tr=S.trades,a=S.account;return [['🥇','First win',tr.some(t=>t.pnl>0)],['🔥','3-win streak',st.best>=3],['📅','+$10 day',st.bestDay>=10],['💰','+$50 total',a.total_pnl>=50],['🔟','10 trades',tr.length>=10],['🚀','5-win streak',st.best>=5]]}
 function stats(){const el=$('#x15');if(!el)return;const st=streaks(),bs=badges(st),got=LS('ct_badges',[]);const fresh=bs.filter(b=>b[2]&&!got.includes(b[1])).map(b=>b[1]);
  const html=`<div class="panel" style="margin-top:14px"><div class="lbl"><span>Equity curve</span><span class="mut">since 29 Oct</span></div><div class="eqw">${eqSvg()}</div></div>
  <div class="panel" style="margin-top:14px"><div class="lbl"><span>Streaks</span></div><div class="stk"><div><span>Current win streak</span><b class="${st.cur?'up':''}">${st.cur}${st.cur>=2?' 🔥':''}</b></div><div><span>Best win streak</span><b>${st.best}</b></div></div>
  <div class="lbl" style="margin-top:12px"><span>Badges</span><span class="mut">${bs.filter(b=>b[2]).length}/${bs.length}</span></div><div class="bdg">${bs.map(b=>`<div class="bd ${b[2]?'on':''} ${fresh.includes(b[1])?'new':''}"><i>${b[0]}</i><span>${b[1]}</span></div>`).join('')}</div></div>
  <div class="panel" style="margin-top:14px"><div class="kv sw"><span>Sound &amp; haptics<small>Trade open/close and price alerts${/iphone|ipad/i.test(navigator.userAgent)?' · vibration not supported on iOS':''}</small></span><button class="tgl press ${snd?'on':''}" id="sndT" role="switch" aria-checked="${snd}"><i></i></button></div>
  <div class="npbtns"><button class="pill press" id="recapB">Share daily recap</button></div></div>`;
  const key=html.replace(/left:calc[^"]*|top:calc[^"]*/g,'');if(key===x15html)return;const first=!x15html;x15html=key;el.innerHTML=html;
  if(fresh.length)SV('ct_badges',[...got,...fresh]);$('#sndT').onclick=()=>{snd=!snd;SV('ct_sound',snd);$('#sndT').setAttribute('aria-checked',snd);$('#sndT').classList.toggle('on',snd);unlock();if(snd)SFX.open()};$('#recapB').onclick=recap;
  if(!first)el.querySelector('.eqw').classList.add('nodraw')}
 function recap(){const a=S.account,m0=ldnMidnight(),tr=S.trades.filter(t=>pd(t.time)>=m0),w=tr.filter(t=>t.pnl>0).length,real=tr.reduce((s,t)=>s+(t.pnl||0),0),best=tr.reduce((b,t)=>!b||t.pnl>b.pnl?t:b,null);
  let eq0=a.start;for(const e of S.equity_curve)if(!e.live&&pd(e.t)<m0)eq0=e.eq;const d=a.equity-eq0;
  const c=document.createElement('canvas');c.width=1080;c.height=1080;const g=c.getContext('2d'),col=d>=0?'#00ba7c':'#f91880';
  const bg=g.createRadialGradient(540,380,50,540,540,800);bg.addColorStop(0,'#0b2219');bg.addColorStop(1,'#000');g.fillStyle=bg;g.fillRect(0,0,1080,1080);
  g.strokeStyle=col;g.globalAlpha=.6;g.lineWidth=4;g.strokeRect(40,40,1000,1000);g.globalAlpha=1;g.textAlign='center';g.fillStyle='#71767b';g.font='600 34px ui-monospace,monospace';
  g.fillText('CRYPTO TRADER · DAILY RECAP',540,140);g.fillText(new Date().toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long',timeZone:TZ}),540,195);
  g.shadowColor=col;g.shadowBlur=40;g.fillStyle=col;g.font='800 150px system-ui,sans-serif';g.fillText(usd(d,1),540,400);g.shadowBlur=0;g.font='700 52px system-ui,sans-serif';g.fillText(pct(eq0?d/eq0*100:0)+' today',540,480);
  const rows=[['Trades today',String(tr.length)],['Win rate today',tr.length?Math.round(w/tr.length*100)+'%':'—'],['Realised',usd(real,1)],['Best trade',best?`${best.coin} ${usd(best.pnl,1)}`:'—'],['Equity',usd(a.equity)]];
  g.font='500 44px system-ui,sans-serif';rows.forEach(([k,v],i)=>{const y=600+i*80;g.textAlign='left';g.fillStyle='#8b98a5';g.fillText(k,140,y);g.textAlign='right';g.fillStyle='#e7e9ea';g.fillText(v,940,y)});
  g.textAlign='center';g.fillStyle='#3a3f44';g.font='500 28px ui-monospace,monospace';g.fillText('paper account · Kraken Futures',540,1010);
  c.toBlob(async b=>{const f=new File([b],'crypto-trader-recap.png',{type:'image/png'});window.__recap=c.toDataURL('image/png');
   try{if(navigator.canShare&&navigator.canShare({files:[f]})){await navigator.share({files:[f],title:'Crypto Trader daily recap'});return}}catch(e){if(e.name==='AbortError')return}
   const u=URL.createObjectURL(b),l=document.createElement('a');l.href=u;l.download=f.name;l.click();setTimeout(()=>URL.revokeObjectURL(u),2000)},'image/png')}
 return {on(){if(!S)return;detect();term();stats()},closedFx,openFx,maybeOpenAnim,SFX,recap}})();
window.__x15=X15;document.addEventListener('click',e=>{if(e.target.closest('.tb,[data-goto]'))setTimeout(()=>{const T=$('#term');if(T&&T.offsetParent)T.scrollTop=T.scrollHeight},60)});
if('serviceWorker' in navigator)navigator.serviceWorker.register('sw.js').catch(()=>{});
window.__dock={bs,go,sizeBubble,slotX};
window.__ct={get S(){return S},get BLOB(){return BLOB},LIVE,wsEnsure,applyLive,render,status,get wsOK(){return wsOK},get ENABLE_MODIFY_PARTIAL(){return ENABLE_MODIFY_PARTIAL},modifyDlg,partialDlg};// read-only test/debug hook
})();
