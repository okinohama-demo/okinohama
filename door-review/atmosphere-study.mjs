import { enterBakery } from './door-unified.mjs?v=unified1';
import { setupBakeryNavigation } from './bakery-navigation.mjs';
import { PRODUCTS } from './bakery-data.mjs';

const oven=document.getElementById('oven');
const chapters=document.getElementById('chapters');
const heroNext=document.querySelector('.hero-next');
const navigation=document.querySelector('.chapter-nav');
const shelf=document.getElementById('bread-shelf');
const calm=matchMedia('(prefers-reduced-motion: reduce)');
let keyboard=false;
document.addEventListener('keydown',()=>{keyboard=true;});
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
let current=0,frame=0;
function updateShelf() {
 frame=0;
 const start=shelf.getBoundingClientRect().left+parseFloat(getComputedStyle(shelf).paddingLeft);
 let distance=Infinity;
 items.forEach((item,index)=>{const d=Math.abs(item.getBoundingClientRect().left-start);if(d<distance){distance=d;current=index;}});
 document.getElementById('shelf-position').textContent=`${current+1} / ${items.length}`;
 arrows[0].disabled=shelf.scrollLeft<=2;
 arrows[1].disabled=shelf.scrollLeft+shelf.clientWidth>=shelf.scrollWidth-2;
}
function queueShelf(){if(!frame)frame=requestAnimationFrame(updateShelf);}
shelf.addEventListener('scroll',queueShelf,{passive:true});
arrows.forEach(button=>button.addEventListener('click',event=>{
 const target=items[Math.max(0,Math.min(items.length-1,current+Number(button.dataset.step)))];
 const shift=target.getBoundingClientRect().left-shelf.getBoundingClientRect().left-parseFloat(getComputedStyle(shelf).paddingLeft);
 shelf.scrollBy({left:shift,behavior:calm.matches||keyboard||event.detail===0?'instant':'smooth'});
}));
shelf.addEventListener('keydown',event=>{
 if(event.key!=='ArrowLeft'&&event.key!=='ArrowRight')return;
 event.preventDefault();
 const next=Math.max(0,Math.min(items.length-1,current+(event.key==='ArrowRight'?1:-1)));
 const shift=items[next].getBoundingClientRect().left-shelf.getBoundingClientRect().left-parseFloat(getComputedStyle(shelf).paddingLeft);
 shelf.scrollBy({left:shift,behavior:'instant'});
});

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
 const visible=oven.dataset.view==='inside'&&oven.getBoundingClientRect().bottom<80;
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
window.addEventListener('resize',()=>{queueShelf();updateNavigation();updateCounterView();},{passive:true});
calm.addEventListener('change',updateCounterView);
updateChapters();
setupBakeryNavigation({oven,enterBakery});
