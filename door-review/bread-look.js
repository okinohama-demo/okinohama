const products = [
  {time:'7:00',name:'沖浜の朝・\n山型食パン',description:'湯種でもっちり。\n毎朝のトーストに。',unit:'1斤',price:420,view:'0 0 544 512',alt:'丸い山が三つ連なる、山型食パン'},
  {time:'8:30',name:'自家炊き\nあんパン',description:'北海道小豆の粒あんを、\n薄い生地で包みます。',unit:'1個',price:230,view:'544 0 480 512',alt:'黒ごまをのせたあんパンと、粒あんが見える断面'},
  {time:'9:30',name:'鳴門金時の\n小さな山',description:'角切りの鳴門金時と白ごま。\n手のひらサイズ。',unit:'1個',price:260,view:'1024 0 512 512',alt:'角切りのさつまいもと白ごまをのせた小さな丸パン'},
  {time:'11:00',name:'沖浜塩パン',description:'底はかりっと、中はふわり。\nバターの香りと塩の味。',unit:'1個',price:180,view:'0 512 512 512',alt:'粗塩を散らした、こんがり焼けた塩パン'},
  {time:'11:30',name:'れんこん\n焼きカレー',description:'徳島れんこんの歯ざわりを残した、\n中辛の焼きカレー。',unit:'1個',price:290,view:'512 512 512 512',alt:'れんこんの輪切りをのせた、焼きカレーパン'},
  {time:'14:00',name:'阿波晩茶と\nくるみ',description:'茶葉の香りと、\nくるみのやさしい渋み。',unit:'1個',price:280,view:'1024 512 512 512',alt:'くるみを焼き込んだ茶色いパンと、くるみが見える断面'}
];
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
