import { enterBakery } from './door-unified.mjs?v=unified1';
import { setupBakeryNavigation } from './bakery-navigation.mjs';
import { PRODUCTS } from './bakery-data.mjs';
import { shelfLayout, nextShelfStop } from './shelf-layout.mjs';

const oven=document.getElementById('oven');
const chapters=document.getElementById('chapters');
const heroNext=document.querySelector('.hero-next');
const navigation=document.querySelector('.chapter-nav');
const shelf=document.getElementById('bread-shelf');
const calm=matchMedia('(prefers-reduced-motion: reduce)');
let keyboard=false;
document.addEventListener('keydown',()=>{keyboard=true;updateCounterView();});
document.addEventListener('pointerdown',()=>{keyboard=false;},{passive:true});

// Data remain the same as the previous full prototype. Product crops use a
// real clipPath so neighbouring atlas cells cannot leak into the picture.
for(const [index,product] of PRODUCTS.entries()) {
 const item=document.createElement('article');
 item.className='shelf-item';
 const name=product.name.replace('\n','<br>');
 const description=product.description.replace('\n','<br>');
 const [x,y,w,h]=product.view.split(' ');
 item.innerHTML=`<svg viewBox="${product.view}" role="img" aria-label="${product.alt}"><defs><clipPath id="shelf-crop-${index}"><rect x="${x}" y="${y}" width="${w}" height="${h}"/></clipPath></defs><image href="assets/open/bread-lineup-v1.webp" width="1536" height="1024" clip-path="url(#shelf-crop-${index})"/></svg><p class="shelf-time">${product.time}<span>ごろ 焼き上がり</span></p><h3>${name}</h3><p class="shelf-description">${description}</p><p class="shelf-price"><small>${product.unit}</small>${product.price}<small>円（税込）</small></p>`;
 shelf.append(item);
}
const items=[...shelf.children];
const arrows=[...document.querySelectorAll('[data-step]')];
let frame=0,pending=null,layout=null,realign=false;
function measureShelf() {
 const box=shelf.getBoundingClientRect();
 return shelfLayout({
  items:items.map(item=>{const rect=item.getBoundingClientRect();return {left:rect.left-box.left-shelf.clientLeft+shelf.scrollLeft,width:rect.width};}),
  width:shelf.clientWidth,scrollWidth:shelf.scrollWidth,scrollLeft:shelf.scrollLeft,
  padding:parseFloat(getComputedStyle(shelf).paddingLeft)||0,
 });
}
function updateShelf() {
 frame=0;
 if(!shelf.clientWidth||chapters.hidden)return;
 let next=measureShelf();
 if(realign&&layout) {
  const anchor=nextShelfStop(layout,0,pending)?.index;
  const destination=next.stops.find(stop=>stop.index===anchor)?.left??next.max;
  pending=null;
  shelf.scrollTo({left:destination,behavior:'instant'});
  next=measureShelf();
 }
 realign=false;layout=next;
 if(pending!==null&&Math.abs(shelf.scrollLeft-pending)<=2)pending=null;
 const range=layout.first===layout.last?`${layout.first+1}`:`${layout.first+1}–${layout.last+1}`;
 const position=document.getElementById('shelf-position');
 const label=`${range} / ${items.length}`;
 if(position.textContent!==label)position.textContent=label;
 arrows.find(button=>Number(button.dataset.step)<0).disabled=layout.position<=2;
 arrows.find(button=>Number(button.dataset.step)>0).disabled=layout.position>=layout.max-2;
}
function queueShelf(align=false){realign=realign||align;if(!frame)frame=requestAnimationFrame(updateShelf);}
shelf.addEventListener('scroll',()=>queueShelf(),{passive:true});
function stepShelf(step,behavior) {
 const target=nextShelfStop(measureShelf(),step,pending);
 if(!target)return;
 pending=target.left;
 shelf.scrollTo({left:pending,behavior});
 queueShelf();
}
for(const type of ['pointerdown','wheel','touchstart'])shelf.addEventListener(type,()=>{pending=null;},{passive:true});
shelf.addEventListener('scrollend',()=>{pending=null;queueShelf();});
arrows.forEach(button=>button.addEventListener('click',event=>{
 stepShelf(Number(button.dataset.step),calm.matches||keyboard||event.detail===0?'instant':'smooth');
}));
shelf.addEventListener('keydown',event=>{
 if(event.key!=='ArrowLeft'&&event.key!=='ArrowRight')return;
 event.preventDefault();
 stepShelf(event.key==='ArrowRight'?1:-1,'instant');
});
const shelfResize=new ResizeObserver(()=>queueShelf(true));
shelfResize.observe(shelf);items.forEach(item=>shelfResize.observe(item));
shelf.addEventListener('load',()=>{queueShelf(true);updateCounterView();},true);
document.fonts?.ready.then(()=>{queueShelf(true);updateNavigation();updateCounterView();});

function updateChapters(){
 const inside=oven.dataset.view==='inside';
 document.body.classList.toggle('has-entered',inside);
 chapters.hidden=!inside;chapters.inert=!inside;
 heroNext.inert=!inside;heroNext.tabIndex=inside?0:-1;
 if(!inside){navigation.hidden=true;navigation.inert=true;}
 if(inside){queueShelf();updateNavigation();}
}
new MutationObserver(updateChapters).observe(oven,{attributes:true,attributeFilter:['data-view']});
function updateNavigation(){
 const visible=oven.dataset.view==='inside';
 navigation.hidden=!visible;navigation.inert=!visible;
 if(!visible)return;
 let id='today';
 chapters.querySelectorAll('section').forEach(section=>{if(section.getBoundingClientRect().top<innerHeight*.4)id=section.id;});
 navigation.querySelectorAll('a').forEach(link=>{if(link.hash===`#${id}`)link.setAttribute('aria-current','location');else link.removeAttribute('aria-current');});
}
const counterPhoto=document.querySelector('.counter-photo');
function updateCounterView(){
 // A small view shift across the counter follows the reader's own scroll.
 // No autonomous loop, no text reveal delays, and no movement for keyboard
 // navigation or the OS reduced-motion preference.
 if(calm.matches||keyboard){counterPhoto.style.setProperty('--photo-shift','0px');return;}
 const box=counterPhoto.getBoundingClientRect();
 if(box.bottom<0||box.top>innerHeight)return;
 const ratio=Math.max(-1,Math.min(1,(box.top+box.height/2-innerHeight/2)/(innerHeight/2+box.height/2)));
 counterPhoto.style.setProperty('--photo-shift',`${(ratio*16).toFixed(2)}px`);
}
let navFrame=0;
window.addEventListener('scroll',()=>{if(!navFrame)navFrame=requestAnimationFrame(()=>{navFrame=0;updateNavigation();updateCounterView();});},{passive:true});
window.addEventListener('resize',()=>{queueShelf(true);updateNavigation();updateCounterView();},{passive:true});
calm.addEventListener('change',()=>{
 if(calm.matches&&pending!==null){shelf.scrollTo({left:pending,behavior:'instant'});queueShelf();}
 updateCounterView();
});
updateChapters();
setupBakeryNavigation({oven,enterBakery});
