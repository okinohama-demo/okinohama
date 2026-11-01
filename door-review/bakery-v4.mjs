import { enterBakery, doorReady, startBake } from './door-v4.mjs?v=v4e';
import { setupBakeryNavigation } from './bakery-navigation.mjs';
import { PRODUCTS, PARCEL_PRICE, SHIPPING, parcelTotals } from './bakery-data-v4.mjs';

const oven=document.getElementById('oven');
const chapters=document.getElementById('chapters');
const heroNext=document.querySelector('.hero-next');
const navigation=document.querySelector('.chapter-nav');
const calm=matchMedia('(prefers-reduced-motion: reduce)');
const $=id=>document.getElementById(id);
document.documentElement.classList.add('js-reveal');

// Loading is the oven heating up: the needle follows real progress, then the bake starts behind the door.
const loader=$('bake-loader');
function buildDial() {
 const ticks=$('dial-ticks');let html='';
 for(let i=0;i<=12;i++) {
  const angle=(-120+i*20)*Math.PI/180,major=i%3===0,inner=major?72:78;
  const point=r=>[(100+Math.sin(angle)*r).toFixed(1),(100-Math.cos(angle)*r).toFixed(1)];
  const [x1,y1]=point(inner),[x2,y2]=point(86);
  html+=`<line class="dial-tick${major?' major':''}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>`;
  if(major){const [lx,ly]=point(58);html+=`<text class="dial-label" x="${lx}" y="${ly}">${i*20}</text>`;}
 }
 ticks.innerHTML=html;
}
buildDial();
function setHeat(share) {
 const temp=Math.round(20+share*200);
 $('bake-temp').textContent=temp;
 $('dial-needle').style.setProperty('--needle',`${-120+temp/240*240}deg`);
 oven.style.setProperty('--baked',share.toFixed(3));
}
function runLoader() {
 const skip=calm.matches||(location.hash&&location.hash!=='#oven');
 let done=0,shown=0,finished=false;
 const tasks=[doorReady,document.fonts?.ready??Promise.resolve(),document.querySelector('.bread').decode().catch(()=>{})];
 tasks.forEach(task=>Promise.resolve(task).then(()=>{done++;}));
 const begin=performance.now(),minimum=skip?0:1700,limit=begin+7000;
 function finish() {
  if(finished)return;finished=true;
  setHeat(1);$('bake-caption').textContent='窯が温まりました';
  setTimeout(()=>{
   loader.classList.add('is-done');
   startBake();
   setTimeout(()=>loader.remove(),700);
  },skip?0:360);
 }
 function tick(now) {
  if(finished)return;
  const real=done/tasks.length,time=Math.min(1,(now-begin)/Math.max(1,minimum));
  shown+=(Math.min(real,time)-shown)*.09;
  setHeat(Math.min(.995,shown));
  if((done===tasks.length&&time>=1&&shown>.93)||now>limit||skip&&done===tasks.length){finish();return;}
  requestAnimationFrame(tick);
 }
 setHeat(0);
 if(skip)Promise.allSettled(tasks).then(finish);
 requestAnimationFrame(tick);
}
runLoader();

// Bake stage: runs through the day by itself and stops when touched.
const DWELL_RESUME=15000;
const TONES={loaf:'#f4e9d2',anpan:'#f1e6dd','sweet-potato':'#f5eacb',salt:'#f7f0dc',curry:'#f3e8c8','tea-walnut':'#e9e8d3'};
const stage=$('bake-stage'),breadBox=$('stage-bread'),clock=$('stage-clock');
const copyParts=[stage.querySelector('.stage-time'),$('stage-name'),$('stage-description'),stage.querySelector('.stage-price')];
let current=-1,running=false,visible=false,resume=0,held=false;
const items=PRODUCTS.map((product,index)=>{
 const item=document.createElement('div');
 item.className='stage-item';
 const [x,y,w,h]=product.view.split(' ');
 item.innerHTML=`<svg viewBox="${product.view}" role="img" aria-label="${product.alt}"><defs><clipPath id="stage-crop-${index}"><rect x="${x}" y="${y}" width="${w}" height="${h}"/></clipPath></defs><image href="assets/open/bread-lineup-v1.webp" width="1536" height="1024" clip-path="url(#stage-crop-${index})"/></svg>`;
 breadBox.append(item);
 const button=document.createElement('button');
 button.type='button';button.textContent=product.time;button.setAttribute('aria-pressed','false');
 button.setAttribute('aria-label',`${product.time}ごろ、${product.name.replace('\n','')}`);
 button.addEventListener('click',()=>{show(index,Math.sign(index-current)||1);hold();});
 button.addEventListener('animationend',event=>{if(event.animationName==='clock-fill'&&index===current&&running)show((index+1)%PRODUCTS.length,1);});
 clock.append(button);
 return {item,button};
});
function animate(element,frames,options){if(!calm.matches)element.animate(frames,options);}
function show(index,direction=1) {
 if(index===current)return;
 const previous=current;current=index;
 const product=PRODUCTS[index];
 stage.style.setProperty('--tone',TONES[product.id]);
 $('stage-time').textContent=product.time;
 $('stage-name').innerHTML=product.name.replace('\n','<br>');
 $('stage-description').innerHTML=product.description.replace('\n','<br>');
 $('stage-unit').textContent=product.unit;
 $('stage-price').textContent=product.price;
 items.forEach(({item,button},i)=>{item.classList.toggle('is-current',i===index);button.setAttribute('aria-pressed',String(i===index));});
 const entering=items[index].item;
 animate(entering,[{transform:`translateX(${direction*16}%) rotate(${direction*3}deg) scale(.93)`,opacity:0},{transform:'none',opacity:1}],{duration:820,easing:'cubic-bezier(.22,1,.36,1)'});
 if(previous>=0) {
  const leaving=items[previous].item;
  leaving.style.visibility='visible';
  const end=()=>{leaving.style.visibility='';};
  if(calm.matches)end();
  else leaving.animate([{transform:'none',opacity:1},{transform:`translateX(${-direction*18}%) rotate(${-direction*3}deg) scale(.95)`,opacity:0}],{duration:560,easing:'cubic-bezier(.4,0,.6,1)'}).onfinish=end;
 }
 copyParts.forEach((part,i)=>animate(part,[{transform:'translateY(14px)',opacity:0},{transform:'none',opacity:1}],{duration:640,delay:80+i*70,fill:'backwards',easing:'cubic-bezier(.22,1,.36,1)'}));
}
function sync(){
 running=visible&&!held&&!calm.matches;
 stage.dataset.running=String(running);
}
function hold(){held=true;sync();clearTimeout(resume);resume=setTimeout(()=>{held=false;sync();},DWELL_RESUME);}
function startingBread() {
 // Opens on what has just come out of the oven in Tokushima right now.
 const parts=new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Tokyo',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date()).split(':').map(Number);
 const minutes=parts[0]*60+parts[1];
 let found=0;
 PRODUCTS.forEach((product,index)=>{const [h,m]=product.time.split(':').map(Number);if(h*60+m<=minutes)found=index;});
 return found;
}
show(startingBread(),1);
new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;sync();},{threshold:.3}).observe(stage);
calm.addEventListener('change',sync);
let swipe=null;
breadBox.addEventListener('pointerdown',event=>{swipe={x:event.clientX,y:event.clientY,id:event.pointerId};});
breadBox.addEventListener('pointerup',event=>{
 if(!swipe||event.pointerId!==swipe.id)return;
 const dx=event.clientX-swipe.x,dy=event.clientY-swipe.y;swipe=null;
 if(Math.abs(dx)<36||Math.abs(dx)<Math.abs(dy))return;
 const step=dx<0?1:-1;
 show((current+step+PRODUCTS.length)%PRODUCTS.length,step);hold();
});
breadBox.addEventListener('pointercancel',()=>{swipe=null;});
clock.addEventListener('keydown',event=>{
 if(event.key!=='ArrowLeft'&&event.key!=='ArrowRight')return;
 event.preventDefault();
 const step=event.key==='ArrowRight'?1:-1,next=(current+step+PRODUCTS.length)%PRODUCTS.length;
 show(next,step);hold();items[next].button.focus();
});

// Parcel total
const parcel=$('parcel-calc');let quantity=1;
function updateParcel() {
 const region=parcel.elements.region.value,total=parcelTotals(quantity,region);
 $('qty-value').textContent=quantity;
 $('qty-minus').disabled=quantity<=1;$('qty-plus').disabled=quantity>=5;
 $('calc-total').textContent=total.total.toLocaleString('ja-JP');
 $('calc-breakdown').textContent=`パン便 ${PARCEL_PRICE.toLocaleString('ja-JP')}円（税込）×${quantity}＋送料 ${SHIPPING[region].toLocaleString('ja-JP')}円`;
}
parcel.addEventListener('change',updateParcel);
parcel.addEventListener('submit',event=>event.preventDefault());
$('qty-minus').addEventListener('click',()=>{quantity=Math.max(1,quantity-1);updateParcel();});
$('qty-plus').addEventListener('click',()=>{quantity=Math.min(5,quantity+1);updateParcel();});
updateParcel();

// Shop lamp: the sign tells whether the sample shop is open right now.
function updateStatus() {
 const parts=new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Tokyo',weekday:'short',hour:'2-digit',minute:'2-digit',hour12:false}).formatToParts(new Date());
 const value=type=>parts.find(part=>part.type===type).value;
 const day=value('weekday'),minutes=Number(value('hour'))*60+Number(value('minute'));
 const off=day==='Sun'||day==='Mon',open=!off&&minutes>=420&&minutes<1080;
 const status=$('shop-status');
 status.hidden=false;status.dataset.open=String(open);
 status.textContent=open?'いま開いています':off?'今日は定休日です':minutes<420?'今朝は7:00に開きます':'今日の営業は終わりました';
}
updateStatus();setInterval(updateStatus,60000);

// The letter is read by scrolling: its columns travel right and each character bakes as it reaches the front.
const roll=$('letter-roll');
if(!calm.matches) {
 const track=$('roll-track'),stage=roll.querySelector('.roll-stage');
 const RAW=[220,211,187],GOLD=[185,119,42],CRUST=[75,46,22];
 const mix=(a,b,t)=>a.map((v,i)=>Math.round(v+(b[i]-v)*t));
 const shade=t=>`rgb(${(t<.5?mix(RAW,GOLD,t*2):mix(GOLD,CRUST,t*2-1)).join()})`;
 const glyphs=[];
 track.querySelectorAll('.roll-col').forEach(col=>{
  const chars=[...col.textContent];col.textContent='';
  chars.forEach((char,index)=>{
   const span=document.createElement('span');span.textContent=char;col.append(span);
   glyphs.push({span,col,along:index/chars.length,step:-1,at:0});
  });
 });
 $('story').classList.add('is-rolling');roll.hidden=false;
 let startX=0,endX=0,pitch=60,width=0,queued=false;
 const paint=()=>{
  queued=false;
  const span=roll.offsetHeight-stage.offsetHeight;
  const progress=span>0?Math.min(1,Math.max(0,-roll.getBoundingClientRect().top/span)):0;
  const x=startX+(endX-startX)*progress;
  track.style.transform=`translate3d(${x.toFixed(1)}px,0,0)`;
  // The front sits on screen, so the character turning brown is always the one being read.
  const edge=width*.62+(endX-startX>0?(endX+width-track.offsetWidth-pitch*3-width*.62)*progress:0);
  const front=width+x-edge,soft=pitch*2.5;
  glyphs.forEach(glyph=>{
   const step=Math.round(Math.min(1,Math.max(0,(front-glyph.at)/soft))*20);
   if(step!==glyph.step){glyph.step=step;glyph.span.style.color=shade(step/20);}
  });
 };
 const queue=()=>{if(!queued){queued=true;requestAnimationFrame(paint);}};
 const measure=()=>{
  width=stage.clientWidth;
  if(!width)return;
  track.style.transform='none';
  const trackRight=track.getBoundingClientRect().right,trackWidth=track.offsetWidth;
  const first=track.querySelector('.roll-col');
  pitch=first.getBoundingClientRect().width;
  glyphs.forEach(glyph=>{glyph.at=trackRight-glyph.col.getBoundingClientRect().right+glyph.along*pitch;});
  const gutter=Math.max(20,width*.05);
  endX=Math.max(gutter,(width-trackWidth)/2)+trackWidth-width;
  startX=endX-Math.max(trackWidth+gutter*2-width,width*.35);
  roll.style.height=`calc(100svh + ${Math.round(Math.max((endX-startX)*1.6,stage.clientHeight*1.7))}px)`;
  paint();
 };
 new ResizeObserver(measure).observe(stage);
 document.fonts?.ready.then(measure);
 addEventListener('scroll',queue,{passive:true});
}

// One-shot reveals. They trigger once and do not follow the scroll position.
const seen=new IntersectionObserver(entries=>{entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('is-seen');seen.unobserve(entry.target);}});},{threshold:.12});
document.querySelectorAll('[data-reveal],.letter').forEach(element=>seen.observe(element));

function updateChapters(){
 const inside=oven.dataset.view==='inside';
 document.body.classList.toggle('has-entered',inside);
 chapters.hidden=!inside;chapters.inert=!inside;
 heroNext.inert=!inside;heroNext.tabIndex=inside?0:-1;
 if(!inside){navigation.hidden=true;navigation.inert=true;}
 if(inside)updateNavigation();
}
new MutationObserver(updateChapters).observe(oven,{attributes:true,attributeFilter:['data-view']});
function updateNavigation(){
 const visibleNav=oven.dataset.view==='inside';
 navigation.hidden=!visibleNav;navigation.inert=!visibleNav;
 if(!visibleNav)return;
 let id='today';
 chapters.querySelectorAll('section').forEach(section=>{if(section.getBoundingClientRect().top<innerHeight*.4)id=section.id;});
 navigation.querySelectorAll('.nav-links a').forEach(link=>{if(link.hash===`#${id}`)link.setAttribute('aria-current','location');else link.removeAttribute('aria-current');});
}
let navFrame=0;
window.addEventListener('scroll',()=>{if(!navFrame)navFrame=requestAnimationFrame(()=>{navFrame=0;updateNavigation();});},{passive:true});
window.addEventListener('resize',updateNavigation,{passive:true});
updateChapters();
setupBakeryNavigation({oven,enterBakery});
