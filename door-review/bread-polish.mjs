import { PRODUCTS as products } from './bakery-data.mjs?v=polish1';
const oven = document.getElementById('oven');
const section = document.getElementById('today');
const next = document.querySelector('.hero-next');
const buttons = [...document.querySelectorAll('[data-bread]')];
const picture = document.getElementById('selected-picture');
const description = document.querySelector('.bread-description');
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
let selected = 0;

function updateEntry() {
  const entered = oven.dataset.view === 'inside';
  document.body.classList.toggle('has-entered',entered);
  section.hidden = !entered;
  section.inert = !entered;
  next.inert = !entered;
  next.tabIndex = entered ? 0 : -1;
}
new MutationObserver(updateEntry).observe(oven,{attributes:true,attributeFilter:['data-view']});
updateEntry();

function multiline(element,value) {
  element.replaceChildren(...value.split('\n').flatMap((line,index) => index ? [document.createElement('br'),document.createTextNode(line)] : [document.createTextNode(line)]));
}
function selectBread(index,animate = true) {
  if(index === selected) return;
  selected = index;
  const item = products[index];
  buttons.forEach((button,i) => button.setAttribute('aria-pressed',String(i === index)));
  picture.setAttribute('viewBox',item.view);
  picture.setAttribute('aria-label',item.alt);
  const crop = document.getElementById('bread-crop-window');
  item.view.split(' ').forEach((value,i) => crop.setAttribute(['x','y','width','height'][i],value));
  document.getElementById('selected-time').textContent = item.time;
  multiline(document.getElementById('selected-name'),item.name);
  multiline(document.getElementById('selected-description'),item.description);
  document.getElementById('selected-unit').textContent = item.unit;
  document.getElementById('selected-price').textContent = item.price;
  // Only a brief opacity change for pointer selection. No automatic cycling.
  if(animate && !reduced.matches) {
    for(const element of [picture,description]) {
      element.getAnimations().forEach(animation => animation.cancel());
      element.animate([{opacity:.25},{opacity:1}],{duration:180,easing:'ease-out'});
    }
  }
}
buttons.forEach((button,index) => button.addEventListener('click',event => selectBread(index,event.detail !== 0)));
