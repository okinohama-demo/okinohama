const oven = document.getElementById('oven');
const chapters = [...document.querySelectorAll('[data-after-entry]')];
const menuButton = document.getElementById('chapter-button');
const menu = document.getElementById('chapter-dialog');
const parcel = document.getElementById('parcel-dialog');
const dialogs = [menu,parcel];
function updateChapters() {
  const entered = oven.dataset.view === 'inside';
  for(const chapter of chapters) {chapter.hidden = !entered; chapter.inert = !entered;}
  menuButton.hidden = !entered;
  if(!entered) for(const dialog of dialogs) if(dialog.open) dialog.close();
}
new MutationObserver(updateChapters).observe(oven,{attributes:true,attributeFilter:['data-view']});
updateChapters();
function openDialog(dialog) {
  dialog.showModal();
  document.documentElement.classList.add('has-review-dialog');
}
dialogs.forEach(dialog=>dialog.addEventListener('close',()=>{
  document.documentElement.classList.toggle('has-review-dialog',dialogs.some(item=>item.open));
}));
menuButton.addEventListener('click',()=>openDialog(menu));
document.getElementById('parcel-total').addEventListener('click',()=>openDialog(parcel));
document.querySelectorAll('[data-close-dialog]').forEach(button=>button.addEventListener('click',()=>button.closest('dialog').close()));
menu.querySelectorAll('a').forEach(link=>link.addEventListener('click',()=>menu.close()));

let quantity = 1;
const minus = document.getElementById('quantity-minus');
const plus = document.getElementById('quantity-plus');
const region = document.getElementById('shipping-region');
const yen = amount => `${amount.toLocaleString('ja-JP')}円`;
function updateTotals() {
  const shipping = region.value === 'remote' ? 1480 : 980;
  document.getElementById('parcel-quantity').textContent = quantity;
  document.getElementById('cart-subtotal').textContent = yen(3200 * quantity);
  document.getElementById('cart-shipping').textContent = yen(shipping);
  document.getElementById('cart-total').textContent = yen(3200 * quantity + shipping);
  minus.disabled = quantity === 1;
  plus.disabled = quantity === 5;
}
minus.addEventListener('click',()=>{quantity = Math.max(1,quantity - 1); updateTotals();});
plus.addEventListener('click',()=>{quantity = Math.min(5,quantity + 1); updateTotals();});
region.addEventListener('change',updateTotals);
updateTotals();
