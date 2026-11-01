import { getUnifiedLayout, getUnifiedPresentation } from './layout-v4.mjs';
import { MAX_ANGLE,clamp,armAt,progressAt,projectedY } from './door-math.mjs?v=solid2';
const oven=document.getElementById('oven'),canvas=document.getElementById('oven-canvas');
const handle=document.getElementById('handle'),toggle=document.getElementById('toggle-door');
const info=document.getElementById('bread-info'),status=document.getElementById('door-status');
const motion=matchMedia('(prefers-reduced-motion: reduce)'),note=document.getElementById('motion-note');
const help=document.getElementById('gesture-help'),renderNote=document.getElementById('render-note');
let progress=0,width=1,height=1,drag=null,tween=0,lastPointerMove=-1000,motionAllowed=false;
let engine=null,failed=false,gripBounds=null,baseHandleWidth=1;
let view=0,viewTween=0;
// The door stays shut until the bread is done. If nobody pulls the handle, it opens by itself.
const BAKE_MS=3400,SELF_OPEN_MS=5200;
let baked=false,bakeTimer=0,selfOpenTimer=0;
function helpText(){
  if(!baked)return'焼いています';
  return isCalm()||failed?'焼き上がりました。取っ手をタップして、開ける':'焼き上がりました。取っ手を下に引いて、開ける';
}
function bakeFinished(){
  if(baked)return;
  clearTimeout(bakeTimer);baked=true;oven.dataset.bake='done';help.textContent=helpText();
  status.textContent='焼き上がりました。';engine?.setHeat(.56);
  if(isCalm()||failed||progress>0)return;
  selfOpenTimer=setTimeout(()=>{if(progress<.001&&!drag)setProgress(1,true);},SELF_OPEN_MS);
}
// Called when the preheating screen has gone.
export function startBake(){
  if(baked||bakeTimer)return;
  if(isCalm()||failed){bakeFinished();return;}
  engine?.setHeat(1);
  bakeTimer=setTimeout(bakeFinished,BAKE_MS);
}
const isCalm=()=>motion.matches&&!motionAllowed;
function stopViewTween(){cancelAnimationFrame(viewTween);viewTween=0;}
function renderView(value){
  view=clamp(value);
  oven.style.setProperty('--view-zoom',(1+.9*view).toFixed(5));
  updateScene();
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
function updateScene(){
  const {scale,reveal,infoHidden}=getUnifiedPresentation(progress,view);
  oven.style.setProperty('--scene-scale',scale.toFixed(5));
  oven.style.setProperty('--reveal',reveal.toFixed(5));
  info.setAttribute('aria-hidden',String(infoHidden));
}
function positionFallbackHandle(){
  const layout=getUnifiedLayout(width,height);
  const y=projectedY(0,layout.arm,.096,layout.hinge)*height;
  handle.style.width=`${layout.doorWidth*.86*height}px`;
  handle.style.transform=`translate(${width/2}px,${y}px) translate(-50%,-50%)`;
  help.style.transform=`translateY(${y+26}px)`;
}
function positionHandle() {
  if(!engine)return;
  gripBounds=engine.gripBounds();
  handle.style.transform=`translate3d(${gripBounds.x}px,${gripBounds.y}px,0) translate(-50%,-50%) scale(${gripBounds.width/baseHandleWidth},${gripBounds.height/64})`;
  help.style.transform=`translateY(${gripBounds.y+gripBounds.height/2+4}px)`;
}
function render(value) {
  progress=clamp(value);
  const pct=Math.round(progress*100);
  oven.style.setProperty('--opening',progress.toFixed(5));
  oven.style.setProperty('--lit',clamp(progress/.5).toFixed(4));
  updateScene();
  oven.dataset.position=progress<.01?'closed':progress>.99?'open':'ajar';
  handle.setAttribute('aria-valuenow',pct);
  handle.setAttribute('aria-valuetext',pct===0?'閉じています':pct===100?'開いています':`${pct}% 開いています`);
  info.setAttribute('aria-hidden',view<.85?'true':'false');
  toggle.textContent=progress>.5?'扉を閉める':'扉を開ける';
  if(engine){engine.setProgress(progress);positionHandle();}
}
function announce() {status.textContent=progress<.01?'扉を閉めました。':progress>.99?'扉を開けました。':'扉はこの位置で止まっています。';}
function stopTween(){cancelAnimationFrame(tween);tween=0;}
function animateDoor(value,animate=false) {
  stopTween();
  if(!animate||isCalm()||failed){render(value);announce();if(progress>=.999)moveView(1,false);return;}
  const from=progress,to=clamp(value),begin=performance.now(),duration=1250*Math.max(.4,Math.abs(to-from));
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
export function enterBakery(){clearTimeout(bakeTimer);clearTimeout(selfOpenTimer);if(!baked){baked=true;oven.dataset.bake='done';help.textContent=helpText();}engine?.setSteamAllowed(false);setProgress(1,false);engine?.setSteamAllowed(true);}
function endDrag(event) {
  if(!drag||event.pointerId!==drag.id)return;
  // A mouse click rarely stays perfectly still, so a few pixels still count as a tap.
  const released=event.type==='pointerup',tappedHandle=released&&drag.onHandle&&Math.abs(drag.lastY-drag.startY)<8;
  // Past halfway on the way down, letting go finishes the opening. Below that, or pushing back, the door holds.
  const finish=released&&(progress>=.995||(drag.direction>0&&progress>=.5));
  if(drag.moved)lastPointerMove=performance.now();
  const pointerId=drag.id;drag=null;delete oven.dataset.dragging;
  if(oven.hasPointerCapture(pointerId))oven.releasePointerCapture(pointerId);
  if(tappedHandle)setProgress(progress>.5?0:1,true);
  else if(finish)setProgress(1,true);
  else announce();
}
// Without the 3D door there is nothing to drag, so a pull on the handle simply opens or closes it.
let plainPull=null;
oven.addEventListener('pointerup',(event)=>{
  const pull=plainPull;plainPull=null;
  if(pull&&event.pointerId===pull.id&&Math.abs(event.clientY-pull.y)>12){lastPointerMove=performance.now();setProgress(event.clientY>pull.y?1:0,true);}
});
oven.addEventListener('pointerdown',(event)=>{
  oven.dataset.pointer='';
  if(!baked)return;
  clearTimeout(selfOpenTimer);
  if((isCalm()||failed)&&event.button===0&&event.target.closest('#handle'))plainPull={id:event.pointerId,y:event.clientY};
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
  if(direction)drag.direction=direction;
  if((progress>.999&&direction<0)||(progress<.001&&direction>0))drag.arm=armAt(progress,drag.lastY/height,drag.depth,drag.hinge);
  render(progressAt(event.clientY/height,drag.arm,drag.depth,drag.hinge));drag.lastY=event.clientY;
});
oven.addEventListener('pointerup',endDrag);oven.addEventListener('pointercancel',endDrag);oven.addEventListener('lostpointercapture',endDrag);
handle.addEventListener('click',(event)=>{
  if(!baked)return;
  clearTimeout(selfOpenTimer);
  if(engine&&!isCalm()&&event.detail!==0)return;
  if(performance.now()-lastPointerMove<450)return;
  setProgress(progress>.5?0:1,true);
});
handle.addEventListener('keydown',(event)=>{
  delete oven.dataset.pointer;
  if(!baked)return;
  clearTimeout(selfOpenTimer);
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
toggle.addEventListener('click',(event)=>{if(!baked)return;clearTimeout(selfOpenTimer);setProgress(progress>.5?0:1,event.detail!==0);});
function resize() {
  const w=oven.clientWidth,h=oven.clientHeight;
  if(w===width&&h===height)return;
  if(drag)endDrag({pointerId:drag.id});
  width=w;height=h;
  oven.style.setProperty('--viewport-center-y',`${height/2}px`);
  if(!engine)positionFallbackHandle();
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
  help.textContent=helpText();
  engine?.setStill(isCalm());
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
  positionFallbackHandle();motionChanged();render(progress>.5?1:0);renderView(progress>=.999?1:0);
  if(bakeTimer)bakeFinished();
}
oven.dataset.bake='baking';
resize();motionChanged();render(0);
export const doorReady=import('./door-v4-scene.mjs?v=v4e').then(async({createOvenScene})=>{
  engine=await createOvenScene(canvas,renderFailed,(active)=>{if(active)oven.dataset.steam='';else delete oven.dataset.steam;});
  engine.resize(width,height);engine.setProgress(0);baseHandleWidth=engine.gripBounds().width;handle.style.width=`${baseHandleWidth}px`;
  oven.dataset.renderer='webgl';engine.setStill(isCalm());render(progress);renderView(view);
}).catch(renderFailed);
