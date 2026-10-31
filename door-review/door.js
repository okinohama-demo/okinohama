import { MAX_ANGLE, CAMERA, clamp, localYAt, progressAt } from './door-math.mjs';
const oven = document.getElementById('oven'), leaf = document.getElementById('door-leaf');
const handle = document.getElementById('handle'), toggle = document.getElementById('toggle-door');
const info = document.getElementById('bread-info'), status = document.getElementById('door-status');
const motion = matchMedia('(prefers-reduced-motion: reduce)'), note = document.getElementById('motion-note');
let progress = 0, height = 1, drag = null, tween = 0, lastPointerMove = 0, motionAllowed = false;
const isCalm = () => motion.matches && !motionAllowed;
function render(value) {
  progress = clamp(value);
  const pct = Math.round(progress * 100);
  oven.style.setProperty('--opening', progress.toFixed(5));
  oven.style.setProperty('--door-angle', `${-progress * MAX_ANGLE * 180 / Math.PI}deg`);
  oven.style.setProperty('--reveal', clamp((progress - .86) / .12).toFixed(4));
  oven.dataset.position = progress < .01 ? 'closed' : progress > .99 ? 'open' : 'ajar';
  handle.setAttribute('aria-valuenow', pct);
  handle.setAttribute('aria-valuetext', pct === 0 ? '閉じています' : pct === 100 ? '開いています' : `${pct}% 開いています`);
  info.setAttribute('aria-hidden', progress < .9 ? 'true' : 'false');
  toggle.textContent = progress > .5 ? 'タップで閉める' : 'タップで開ける';
}
function announce() { status.textContent = progress < .01 ? '扉を閉めました。' : progress > .99 ? '扉を開けました。' : '扉はこの位置で止まっています。'; }
function stopTween() { cancelAnimationFrame(tween); tween = 0; }
function setProgress(value, animate = false) {
  stopTween();
  if (!animate || isCalm()) { render(value); announce(); return; }
  const from = progress, to = clamp(value), begin = performance.now();
  const duration = 620 * Math.max(.45, Math.abs(to - from));
  const frame = (now) => {
    const t = clamp((now - begin) / duration);
    render(from + (to - from) * (1 - Math.pow(1 - t, 3)));
    if (t < 1) tween = requestAnimationFrame(frame); else { tween = 0; announce(); }
  };
  tween = requestAnimationFrame(frame);
}
function endDrag(event) {
  if (!drag || event.pointerId !== drag.id) return;
  const tappedHandle = !drag.moved && drag.onHandle && event.type === 'pointerup';
  if (drag.moved) lastPointerMove = performance.now();
  drag = null; delete oven.dataset.dragging; leaf.style.willChange = '';
  if (leaf.hasPointerCapture(event.pointerId)) leaf.releasePointerCapture(event.pointerId);
  if (tappedHandle) setProgress(progress > .5 ? 0 : 1, true); else announce();
}
leaf.addEventListener('pointerdown', (event) => {
  if (event.button !== 0 || !event.isPrimary || isCalm() || drag) return;
  stopTween();
  const onHandle = !!event.target.closest('.handle'), depth = onHandle ? 8 / height : 0;
  if (onHandle) handle.focus({ preventScroll: true });
  drag = { id: event.pointerId, startY: event.clientY, lastY: event.clientY, localY: localYAt(progress,event.clientY/height,CAMERA,depth), moved: false, onHandle, depth };
  leaf.setPointerCapture(event.pointerId); leaf.style.willChange = 'transform'; oven.dataset.dragging = '';
  event.preventDefault();
});
leaf.addEventListener('pointermove', (event) => {
  if (!drag || event.pointerId !== drag.id) return;
  if (Math.abs(event.clientY-drag.startY)>3) drag.moved = true;
  if (!drag.moved) return;
  const direction = Math.sign(event.clientY-drag.lastY);
  if ((progress>.999 && direction<0)||(progress<.001 && direction>0)) drag.localY = localYAt(progress,drag.lastY/height,CAMERA,drag.depth);
  render(progressAt(event.clientY/height,drag.localY,CAMERA,drag.depth)); drag.lastY = event.clientY;
});
leaf.addEventListener('pointerup',endDrag); leaf.addEventListener('pointercancel',endDrag); leaf.addEventListener('lostpointercapture',endDrag);
handle.addEventListener('click', (event) => { if (!isCalm() && event.detail !== 0) return; if (performance.now()-lastPointerMove<450) return; setProgress(progress>.5?0:1,true); });
handle.addEventListener('keydown', (event) => {
  let next;
  switch(event.key) {
    case 'ArrowDown': case 'ArrowRight': next=progress+.1; break;
    case 'ArrowUp': case 'ArrowLeft': next=progress-.1; break;
    case 'PageDown': next=progress+.25; break; case 'PageUp': next=progress-.25; break;
    case 'Home': case 'Escape': next=0; break; case 'End': next=1; break;
    case 'Enter': case ' ': next=progress>.5?0:1; break; default: return;
  }
  if (isCalm()) next = ['ArrowDown','ArrowRight','PageDown','End'].includes(event.key) ? 1 : ['ArrowUp','ArrowLeft','PageUp','Home','Escape'].includes(event.key) ? 0 : next;
  event.preventDefault(); setProgress(next);
});
toggle.addEventListener('click',(event)=>setProgress(progress>.5?0:1,event.detail!==0));
function resize() {
  height=oven.clientHeight; oven.style.setProperty('--perspective',`${height*CAMERA}px`);
  if(drag) endDrag({pointerId:drag.id});
}
function motionChanged() {
  stopTween(); if(drag) endDrag({pointerId:drag.id});
  if(isCalm()) render(progress>.5?1:0);
  oven.dataset.motion = isCalm() ? 'reduced' : 'full';
  document.getElementById('gesture-help').textContent = isCalm() ? '取っ手をタップして、開ける' : '取っ手を下に引いて、開ける';
  document.getElementById('motion-message').textContent = motionAllowed ? '扉の動きを表示しています。' : '動きを減らす設定になっています。';
  document.getElementById('motion-toggle').textContent = motionAllowed ? '動きを減らす' : '扉の動きを試す';
  note.hidden=!motion.matches;
}
new ResizeObserver(resize).observe(oven); motion.addEventListener('change',()=>{motionAllowed=false;motionChanged();});
document.getElementById('motion-toggle').addEventListener('click',()=>{motionAllowed=!motionAllowed;motionChanged();});
const ticks=document.getElementById('ticks');
for(let i=0;i<=30;i++) {
  const a=(-135+i*9)*Math.PI/180, line=document.createElementNS('http://www.w3.org/2000/svg','line'), r=i%5===0?30:34;
  line.setAttribute('x1',50+Math.sin(a)*r); line.setAttribute('y1',50-Math.cos(a)*r);
  line.setAttribute('x2',50+Math.sin(a)*38); line.setAttribute('y2',50-Math.cos(a)*38); ticks.append(line);
}
resize(); motionChanged(); render(0);
