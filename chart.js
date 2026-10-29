// Tiny hand-rolled candlestick chart with entry/stop/target lines, live price tag and trade markers.
window.PosChart=function(canvas){
 const ctx=canvas.getContext('2d');
 function fmt(v){const a=Math.abs(v);const d=a>=1000?1:a>=10?2:a>=1?3:a>=0.1?5:6;return v.toFixed(d)}
 function tagBox(x,y,text,bg,fg,W){ctx.font='600 11px JetBrains Mono, ui-monospace, monospace';const w=ctx.measureText(text).width+10;
  ctx.fillStyle=bg;const bx=Math.min(x,W-w-1);ctx.beginPath();ctx.roundRect?ctx.roundRect(bx,y-9,w,18,4):ctx.rect(bx,y-9,w,18);ctx.fill();
  ctx.fillStyle=fg;ctx.textBaseline='middle';ctx.fillText(text,bx+5,y+0.5);return w}
 return function draw(d){
  const dpr=Math.min(window.devicePixelRatio||1,3), W=canvas.clientWidth, H=canvas.clientHeight; if(!W||!H)return;
  if(canvas.width!==Math.round(W*dpr)||canvas.height!==Math.round(H*dpr)){canvas.width=Math.round(W*dpr);canvas.height=Math.round(H*dpr)}
  ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,W,H);
  let c=(d.candles||[]).map(k=>k.slice()); const res=d.res||300;
  if(!c.length){ctx.fillStyle='#a3adb6';ctx.font='14px Inter, sans-serif';ctx.fillText('Loading chart…',14,H/2);return}
  // live tick: update/append last candle with the current mark
  if(d.mark){const now=Math.floor(Date.now()/1000), b=now-now%res, L=c[c.length-1];
   if(b>L[0]){c.push([b,L[4],Math.max(L[4],d.mark),Math.min(L[4],d.mark),d.mark])} else {L[4]=d.mark;L[2]=Math.max(L[2],d.mark);L[3]=Math.min(L[3],d.mark)}}
  const padR=78,padT=14,padB=22,cw=W-padR;
  const n=Math.max(30,Math.min(c.length,Math.floor(cw/7))); c=c.slice(-n);
  let lo=Math.min(...c.map(k=>k[3])),hi=Math.max(...c.map(k=>k[2]));
  [d.entry,d.stop,d.target,d.mark].forEach(v=>{if(v){lo=Math.min(lo,v);hi=Math.max(hi,v)}});
  const pad=(hi-lo)*0.08||hi*0.001; lo-=pad;hi+=pad;
  const Y=v=>padT+(1-(v-lo)/(hi-lo))*(H-padT-padB), step=cw/n, X=i=>i*step+step/2;
  const t0=c[0][0], XT=t=>X((t-t0)/res);
  // grid
  ctx.strokeStyle='rgba(255,255,255,.06)';ctx.lineWidth=1;
  for(let i=1;i<4;i++){const y=Math.round(padT+i*(H-padT-padB)/4)+.5;ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(cw,y);ctx.stroke()}
  // time labels
  ctx.fillStyle='#8f9aa4';ctx.font='11px Inter, sans-serif';ctx.textBaseline='alphabetic';
  const every=Math.max(1,Math.round(n/4));for(let i=0;i<c.length;i+=every){const t=new Date(c[i][0]*1000).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit',timeZone:'Europe/London'});ctx.fillText(t,Math.max(2,Math.min(cw-30,X(i)-14)),H-6)}
  // entry time marker
  if(d.opened){const ot=Date.parse(d.opened.replace(/(\.\d{3})\d+/,'$1'))/1000;if(ot>=t0){const x=XT(ot);ctx.strokeStyle='rgba(167,139,250,.55)';ctx.setLineDash([3,4]);ctx.beginPath();ctx.moveTo(x,padT);ctx.lineTo(x,H-padB);ctx.stroke();ctx.setLineDash([]);
   tagBox(x+3,padT+8,'IN',"#a78bfa",'#000',cw)}}
  // candles
  const bw=Math.max(1.5,step*0.62);
  c.forEach((k,i)=>{const up=k[4]>=k[1],col=up?'#00ba7c':'#f91880',x=X(i);ctx.strokeStyle=col;ctx.fillStyle=col;ctx.lineWidth=1;
   ctx.beginPath();ctx.moveTo(Math.round(x)+.5,Y(k[2]));ctx.lineTo(Math.round(x)+.5,Y(k[3]));ctx.stroke();
   const y1=Y(Math.max(k[1],k[4])),y2=Y(Math.min(k[1],k[4]));ctx.fillRect(x-bw/2,y1,bw,Math.max(1,y2-y1))});
  // level lines
  const lines=[[d.target,'TARGET','#00ba7c'],[d.entry,'ENTRY','#e7e9ea'],[d.stop,'STOP','#f91880']].filter(l=>l[0]);
  const tags=[];
  lines.forEach(([v,l,col])=>{const y=Math.round(Y(v))+.5;ctx.strokeStyle=col;ctx.globalAlpha=.85;ctx.setLineDash(l==='ENTRY'?[2,3]:[6,4]);ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(cw,y);ctx.stroke();ctx.setLineDash([]);ctx.globalAlpha=1;
   tags.push({y,ty:y,text:fmt(v),bg:col,fg:l==='ENTRY'?'#000':'#fff',label:l})});
  if(d.mark)tags.push({y:Y(d.mark),ty:Y(d.mark),text:fmt(d.mark),bg:'#1d9bf0',fg:'#fff',mark:1});
  // push overlapping tags apart (min 19px)
  tags.sort((a,b)=>a.y-b.y);for(let k=0;k<3;k++){for(let i=1;i<tags.length;i++){const g=tags[i].ty-tags[i-1].ty;if(g<19){const m=(19-g)/2;tags[i-1].ty-=m;tags[i].ty+=m}}}
  tags.forEach(t=>t.ty=Math.max(9,Math.min(H-padB+6,t.ty)));
  // partial exits
  (d.partials||[]).forEach(p=>{const t=Date.parse(p.time.replace(/(\.\d{3})\d+/,'$1'))/1000;if(t<t0)return;const x=XT(t),y=Y(p.price);
   ctx.fillStyle='#ffb020';ctx.beginPath();ctx.moveTo(x,y-3);ctx.lineTo(x-6,y-13);ctx.lineTo(x+6,y-13);ctx.closePath();ctx.fill();
   ctx.font='700 10px JetBrains Mono, monospace';ctx.textBaseline='bottom';ctx.fillText('TP '+p.size.toLocaleString('en-GB'),Math.min(x-18,cw-60),y-15)});
  // live price
  if(d.mark){const y=Math.round(Y(d.mark))+.5;ctx.strokeStyle='#1d9bf0';ctx.setLineDash([1,3]);ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(cw,y);ctx.stroke();ctx.setLineDash([]);
   const x=X(c.length-1);ctx.fillStyle='#1d9bf0';ctx.shadowColor='#1d9bf0';ctx.shadowBlur=12;ctx.beginPath();ctx.arc(x,y,3.5,0,7);ctx.fill();ctx.shadowBlur=0;
  }
  // left-side labels (stacked if close) and right-side price tags
  const lab=tags.filter(t=>t.label);let lastY=-99;
  lab.slice().sort((a,b)=>a.y-b.y).forEach(t=>{let y=t.y-2;if(y-lastY<12)y=lastY+12;lastY=y;ctx.font='700 10px JetBrains Mono, monospace';ctx.fillStyle=t.bg;ctx.textBaseline='bottom';ctx.fillText(t.label,4,y)});
  tags.forEach(t=>{if(Math.abs(t.ty-t.y)>1){ctx.strokeStyle=t.bg;ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(cw,t.y);ctx.lineTo(cw+4,t.ty);ctx.stroke()}tagBox(cw+4,t.ty,t.text,t.bg,t.fg,W)});
 }
};
