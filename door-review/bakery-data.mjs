// Shared product and parcel data for this review, so displayed prices stay in sync.
export const PRODUCTS = Object.freeze([
  {id:'loaf',time:'7:00',name:'沖浜の朝・\n山型食パン',description:'湯種でもっちり。\n毎朝のトーストに。',unit:'1斤',price:420,view:'0 0 544 512',alt:'丸い山が三つ連なる、山型食パン'},
  {id:'anpan',time:'8:30',name:'自家炊き\nあんパン',description:'北海道小豆の粒あんを、\n薄い生地で包みます。',unit:'1個',price:230,view:'544 0 480 512',alt:'黒ごまをのせたあんパンと、粒あんが見える断面'},
  {id:'sweet-potato',time:'9:30',name:'鳴門金時の\n小さな山',description:'角切りの鳴門金時と白ごま。\n手のひらサイズ。',unit:'1個',price:260,view:'1024 0 512 512',alt:'角切りのさつまいもと白ごまをのせた小さな丸パン'},
  {id:'salt',time:'11:00',name:'沖浜\n塩パン',description:'底はかりっと、中はふわり。\nバターの香りと塩の味。',unit:'1個',price:180,view:'0 512 512 512',alt:'粗塩を散らした、こんがり焼けた塩パン'},
  {id:'curry',time:'11:30',name:'れんこん\n焼きカレー',description:'徳島れんこんの歯ざわりを残した、\n中辛の焼きカレー。',unit:'1個',price:290,view:'512 512 512 512',alt:'れんこんの輪切りをのせた、焼きカレーパン'},
  {id:'tea-walnut',time:'14:00',name:'阿波晩茶と\nくるみ',description:'茶葉の香りと、\nくるみのやさしい渋み。',unit:'1個',price:280,view:'1024 512 512 512',alt:'くるみを焼き込んだ茶色いパンと、くるみが見える断面'}
].map(Object.freeze));
export const PARCEL_CONTENTS = Object.freeze([
  {id:'loaf',quantity:1}, {id:'salt',quantity:2}, {id:'anpan',quantity:2},
  {id:'sweet-potato',quantity:2}, {id:'tea-walnut',quantity:1}
].map(Object.freeze));
export const PARCEL_ITEMS = PARCEL_CONTENTS.reduce((count,item)=>count+item.quantity,0);
export const PARCEL_PRICE = PARCEL_CONTENTS.reduce((price,item)=>price+PRODUCTS.find(product=>product.id===item.id).price*item.quantity,0);
export const SHIPPING = Object.freeze({standard:980,remote:1480});
export const yen = amount => `${amount.toLocaleString('ja-JP')}円`;
export function parcelTotals(quantity,region) {
  if(!Number.isInteger(quantity)||quantity<1||quantity>5) throw new RangeError('Quantity must be from 1 to 5.');
  if(!Object.hasOwn(SHIPPING,region)) throw new RangeError('Unknown shipping region.');
  const subtotal = PARCEL_PRICE*quantity, shipping = SHIPPING[region];
  return {quantity,itemCount:PARCEL_ITEMS*quantity,subtotal,shipping,total:subtotal+shipping};
}
