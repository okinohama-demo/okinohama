import { MAX_ANGLE,clamp,armAt,progressAt } from './door-math.mjs?v=solid2';
const oven=document.getElementById('oven'),canvas=document.getElementById('oven-canvas');
const handle=document.getElementById('handle'),toggle=document.getElementById('toggle-door');
const info=document.getElementById('bread-info'),status=document.getElementById('door-status');
const motion=matchMedia('(prefers-reduced-motion: reduce)'),note=document.getElementById('motion-note');
const help=document.getElementById('gesture-help'),renderNote=document.getElementById('render-note');
let progress=0,width=1,height=1,drag=null,tween=0,lastPointerMove=-1000,motionAllowed=false;
let engine=null,failed=false,gripBounds=null,baseHandleWidth=1;
let view=0,viewTween=0;
const isCalm=()=>motion.matches&&!motionAllowed;
function stopViewTween(){cancelAnimationFrame(viewTween);viewTween=0;}
function renderView(value){
  view=clamp(value);
  oven.style.setProperty('--view-zoom',(1+.9*view).toFixed(5));
  oven.dataset.view=view>=.999999?'inside':view<=.000001?'framed':'passage';
  if(view>0&&document.activeElement===handle)toggle.focus({preventScroll:true});
  handle.inert=view>0;
  handle.tabIndex=view>0?-1:0;
  handle.setAttribute('aria-hidden',view>0?'true':'false');
  if(engine){engine.setViewProgress(view);positionHandle();}
}
function moveView(target,animate=true,done){
  stopViewTween();
  if(!animate||isCalm()||failed||Math.abs(target-view)<.00001){renderView(target);done?.();return;}
  const from=view,begin=performance.now(),duration=(target===1?480:340)*Math.max(.25,Math.abs(target-from));
  const frame=(now)=>{
    const t=clamp((now-begin)/duration);
    renderView(from+(target-from)*(t*t*(3-2*t)));
    if(t<1)viewTween=requestAnimationFrame(frame);else{viewTween=0;done?.();}
  };
  viewTween=requestAnimationFrame(frame);
}
function positionHandle() {
  if(!engine)return;
  gripBounds=engine.gripBounds();
  handle.style.transform=`translate3d(${gripBounds.x}px,${gripBounds.y}px,0) translate(-50%,-50%) scale(${gripBounds.width/baseHandleWidth},${gripBounds.height/64})`;
  help.style.transform=`translateY(${gripBounds.y+gripBounds.height/2+16}px)`;
}
function render(value) {
  progress=clamp(value);
  const pct=Math.round(progress*100);
  oven.style.setProperty('--opening',progress.toFixed(5));
  oven.style.setProperty('--reveal',clamp((progress-.84)/.14).toFixed(4));
  oven.dataset.position=progress<.01?'closed':progress>.99?'open':'ajar';
  handle.setAttribute('aria-valuenow',pct);
  handle.setAttribute('aria-valuetext',pct===0?'閉じています':pct===100?'開いています':`${pct}% 開いています`);
  info.setAttribute('aria-hidden',progress<.9?'true':'false');
  toggle.textContent=progress>.5?'タップで閉める':'タップで開ける';
  if(engine){engine.setProgress(progress);positionHandle();}
}
function announce() {status.textContent=progress<.01?'扉を閉めました。':progress>.99?'扉を開けました。':'扉はこの位置で止まっています。';}
function stopTween(){cancelAnimationFrame(tween);tween=0;}
function animateDoor(value,animate=false) {
  stopTween();
  if(!animate||isCalm()||failed){render(value);announce();if(progress>=.999)moveView(1,false);return;}
  const from=progress,to=clamp(value),begin=performance.now(),duration=800*Math.max(.4,Math.abs(to-from));
  const frame=(now)=>{
    const t=clamp((now-begin)/duration);
    render(from+(to-from)*(t*t*(3-2*t)));
    if(t<1)tween=requestAnimationFrame(frame);else{tween=0;announce();if(progress>=.999)moveView(1,true);}
  };
  tween=requestAnimationFrame(frame);
}
function setProgress(value,animate=false){
  stopTween();stopViewTween();
  const target=clamp(value);
  if(view>0&&target<.999){moveView(0,animate,()=>animateDoor(target,animate));return;}
  if(progress>=.999&&target>=.999){moveView(1,animate);return;}
  animateDoor(target,animate);
}
// Direct chapter links and the skip link enter without replaying the door motion.
export function enterBakery(){setProgress(1,false);}
function endDrag(event) {
  if(!drag||event.pointerId!==drag.id)return;
  const tappedHandle=!drag.moved&&drag.onHandle&&event.type==='pointerup';
  if(drag.moved)lastPointerMove=performance.now();
  const pointerId=drag.id;drag=null;delete oven.dataset.dragging;
  if(oven.hasPointerCapture(pointerId))oven.releasePointerCapture(pointerId);
  if(tappedHandle)setProgress(progress>.5?0:1,true);
  else{announce();if(event.type==='pointerup'&&progress>=.995){render(1);moveView(1,true);}}
}
oven.addEventListener('pointerdown',(event)=>{
  if(event.button!==0||!event.isPrimary||isCalm()||drag||!engine||view>0||viewTween||event.target.closest('button,a'))return;
  const onHandle=!!event.target.closest('#handle');
  const hit=onHandle?{depth:gripBounds.depth,hinge:gripBounds.hinge,onHandle:true}:engine.pick(event.clientX,event.clientY);
  if(!hit)return;
  stopTween();oven.dataset.pointer='';
  if(onHandle)handle.focus({preventScroll:true});
  drag={id:event.pointerId,startY:event.clientY,lastY:event.clientY,arm:armAt(progress,event.clientY/height,hit.depth,hit.hinge),depth:hit.depth,hinge:hit.hinge,onHandle:onHandle||hit.onHandle,moved:false};
  oven.setPointerCapture(event.pointerId);oven.dataset.dragging='';event.preventDefault();
});
oven.addEventListener('pointermove',(event)=>{
  if(!drag||event.pointerId!==drag.id)return;
  if(Math.abs(event.clientY-drag.startY)>3)drag.moved=true;
  if(!drag.moved)return;
  const direction=Math.sign(event.clientY-drag.lastY);
  if((progress>.999&&direction<0)||(progress<.001&&direction>0))drag.arm=armAt(progress,drag.lastY/height,drag.depth,drag.hinge);
  render(progressAt(event.clientY/height,drag.arm,drag.depth,drag.hinge));drag.lastY=event.clientY;
});
oven.addEventListener('pointerup',endDrag);oven.addEventListener('pointercancel',endDrag);oven.addEventListener('lostpointercapture',endDrag);
handle.addEventListener('click',(event)=>{
  if(engine&&!isCalm()&&event.detail!==0)return;
  if(performance.now()-lastPointerMove<450)return;
  setProgress(progress>.5?0:1,true);
});
handle.addEventListener('keydown',(event)=>{
  delete oven.dataset.pointer;
  let next;
  switch(event.key) {
    case'ArrowDown':case'ArrowRight':next=progress+.1;break;
    case'ArrowUp':case'ArrowLeft':next=progress-.1;break;
    case'PageDown':next=progress+.25;break;case'PageUp':next=progress-.25;break;
    case'Home':case'Escape':next=0;break;case'End':next=1;break;
    case'Enter':case' ':next=progress>.5?0:1;break;default:return;
  }
  if(isCalm()||failed)next=['ArrowDown','ArrowRight','PageDown','End'].includes(event.key)?1:['ArrowUp','ArrowLeft','PageUp','Home','Escape'].includes(event.key)?0:next;
  event.preventDefault();setProgress(next);
});
toggle.addEventListener('click',(event)=>setProgress(progress>.5?0:1,event.detail!==0));
function resize() {
  const w=oven.clientWidth,h=oven.clientHeight;
  if(w===width&&h===height)return;
  if(drag)endDrag({pointerId:drag.id});
  width=w;height=h;
  oven.style.setProperty('--viewport-center-y',`${height/2}px`);
  if(engine){
    engine.resize(width,height);
    const old=progress;engine.setViewProgress(0);engine.setProgress(0);baseHandleWidth=engine.gripBounds().width;handle.style.width=`${baseHandleWidth}px`;engine.setProgress(old);engine.setViewProgress(view);positionHandle();
  }
}
function motionChanged() {
  stopTween();stopViewTween();if(drag)endDrag({pointerId:drag.id});
  if(isCalm())render(progress>.5?1:0);
  if(isCalm()||view>0||failed)renderView(progress>=.999?1:0);
  oven.dataset.motion=isCalm()?'reduced':'full';
  help.textContent=isCalm()||failed?'取っ手をタップして、開ける':'取っ手を下に引いて、開ける';
  document.getElementById('motion-message').textContent=motionAllowed?'扉の動きを表示しています。':'動きを減らす設定になっています。';
  document.getElementById('motion-toggle').textContent=motionAllowed?'動きを減らす':'扉の動きを試す';
  note.hidden=!motion.matches||failed;
}
new ResizeObserver(resize).observe(oven);
motion.addEventListener('change',()=>{motionAllowed=false;motionChanged();});
document.getElementById('motion-toggle').addEventListener('click',()=>{motionAllowed=!motionAllowed;motionChanged();});
function renderFailed(){
  stopTween();stopViewTween();if(drag)endDrag({pointerId:drag.id});
  engine=null;failed=true;oven.dataset.renderer='fallback';renderNote.hidden=false;
  handle.style.width='84%';handle.style.transform='translate(50vw,30vh) translate(-50%,-50%)';
  help.style.transform='translateY(35vh)';motionChanged();render(progress>.5?1:0);renderView(progress>=.999?1:0);
}
const ticks=document.getElementById('ticks');
for(let i=0;i<=30;i++){
  const a=(-135+i*9)*Math.PI/180,line=document.createElementNS('http://www.w3.org/2000/svg','line'),r=i%5===0?30:34;
  line.setAttribute('x1',50+Math.sin(a)*r);line.setAttribute('y1',50-Math.cos(a)*r);line.setAttribute('x2',50+Math.sin(a)*38);line.setAttribute('y2',50-Math.cos(a)*38);ticks.append(line);
}
resize();motionChanged();render(0);
import('./door-scene.mjs?v=solid3').then(async({createOvenScene})=>{
  engine=await createOvenScene(canvas,renderFailed);
  engine.resize(width,height);engine.setProgress(0);baseHandleWidth=engine.gripBounds().width;handle.style.width=`${baseHandleWidth}px`;
  oven.dataset.renderer='webgl';render(progress);renderView(view);
}).catch(renderFailed);
