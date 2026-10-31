import { PARCEL_PRICE, SHIPPING, parcelTotals, yen } from './bakery-data.mjs?v=polish1';
import { enterBakery } from './door.js?v=quality2';
import { setupBakeryNavigation } from './bakery-navigation.mjs?v=quality2';
const oven = document.getElementById('oven');
const chapters = [...document.querySelectorAll('[data-after-entry]')];
const menuButton = document.getElementById('chapter-button');
const menu = document.getElementById('chapter-dialog');
const parcel = document.getElementById('parcel-dialog');
const dialogs = [menu,parcel];
function updateChapters() {
  const entered = oven.dataset.view === 'inside';
  document.documentElement.classList.toggle('bakery-entered',entered);
  for(const chapter of chapters) {chapter.hidden = !entered; chapter.inert = !entered;}
  menuButton.hidden = !entered;
  if(!entered) for(const dialog of dialogs) if(dialog.open) dialog.close();
}
new MutationObserver(updateChapters).observe(oven,{attributes:true,attributeFilter:['data-view']});
updateChapters();
function openDialog(dialog) {
  dialog.showModal();
  dialog.scrollTop = 0;
  document.documentElement.classList.add('has-review-dialog');
}
dialogs.forEach(dialog=>dialog.addEventListener('close',()=>{
  document.documentElement.classList.toggle('has-review-dialog',dialogs.some(item=>item.open));
}));
menuButton.addEventListener('click',()=>openDialog(menu));
document.getElementById('parcel-total').addEventListener('click',()=>openDialog(parcel));
document.querySelectorAll('[data-close-dialog]').forEach(button=>button.addEventListener('click',()=>button.closest('dialog').close()));
menu.querySelectorAll('a').forEach(link=>link.addEventListener('click',event=>{
  if(!event.defaultPrevented&&!event.metaKey&&!event.ctrlKey&&!event.altKey&&!event.shiftKey&&event.button===0) menu.close();
}));

let quantity = 1;
const minus = document.getElementById('quantity-minus');
const plus = document.getElementById('quantity-plus');
const region = document.getElementById('shipping-region');
document.querySelectorAll('[data-set-price]').forEach(node=>{node.textContent=PARCEL_PRICE.toLocaleString('ja-JP');});
document.querySelectorAll('[data-shipping]').forEach(node=>{node.textContent=yen(SHIPPING[node.dataset.shipping]);});
function updateTotals() {
  const {subtotal,shipping,total} = parcelTotals(quantity,region.value);
  document.getElementById('parcel-quantity').textContent = quantity;
  document.getElementById('cart-subtotal').textContent = yen(subtotal);
  document.getElementById('cart-shipping').textContent = yen(shipping);
  document.getElementById('cart-total').textContent = yen(total);
  minus.disabled = quantity === 1;
  plus.disabled = quantity === 5;
}
minus.addEventListener('click',()=>{quantity = Math.max(1,quantity - 1); updateTotals();});
plus.addEventListener('click',()=>{quantity = Math.min(5,quantity + 1); updateTotals();});
region.addEventListener('change',updateTotals);
updateTotals();

setupBakeryNavigation({oven,enterBakery});
