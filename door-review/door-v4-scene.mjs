import * as THREE from './vendor/three.module.min.js';
import { CAMERA, MAX_ANGLE } from './door-math.mjs?v=solid2';
import { getUnifiedLayout } from './layout-v4.mjs';

const NOISE = `
float hash(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
  return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<5;i++){v+=a*noise(p);p=p*2.03+vec2(17.1,9.2);a*=.5;}return v;}`;
// Smoked glass: the room behind it stays hidden. Low flames over a bed of embers, seen dimly.
const FIRE_FRAGMENT = `
uniform float uTime,uHeat,uAspect;varying vec2 vUv;${NOISE}
void main(){
  vec2 q=vec2((vUv.x-.5)*uAspect,vUv.y);
  float t=uTime;
  float crest=.1+uHeat*(.07+.46*fbm(vec2(q.x*2.6,t*.55)));
  float lick=fbm(vec2(q.x*5.2+fbm(q*2.4-vec2(0.,t*.6))*1.3,q.y*2.1-t*1.25));
  float flame=(1.-smoothstep(crest*.25,crest+.2,vUv.y+(lick-.5)*.3))*(.42+.86*lick);
  float bed=(1.-smoothstep(.0,.13,vUv.y))*(.32+1.05*smoothstep(.36,.72,fbm(vec2(q.x*11.,q.y*11.+t*.12))+.1*sin(t*2.3+q.x*9.)));
  float f=clamp(max(flame,bed)*(.5+.5*uHeat),0.,1.);
  vec3 c=vec3(f*1.02,pow(f,2.15)*.62,pow(f,4.)*.2);
  float room=(1.-smoothstep(0.,1.,vUv.y))*(.55+.45*fbm(vec2(q.x*1.2,t*.3)));
  c+=vec3(.15,.032,.006)*room*room*uHeat+vec3(.012,.006,.004);
  vec2 e=abs(vUv-.5)*2.;
  c*=1.-.72*pow(max(e.x,e.y*.94),2.6);
  gl_FragColor=vec4(c,1.);
}`;
// Steam leaves through the gap at the top first, fills the opening, then rises away in thinning wisps.
const STEAM_FRAGMENT = `
uniform float uAge,uOpen,uAspect;varying vec2 vUv;${NOISE}
void main(){
  vec2 q=vec2((vUv.x-.5)*uAspect,vUv.y);
  float rise=uAge*.2+uAge*uAge*.018;
  vec2 w=vec2(fbm(q*1.45+vec2(uAge*.07,-rise)),fbm(q*1.45+vec2(5.2,1.3-rise)));
  float n=fbm(vec2(q.x*2.5,q.y*1.75-rise*1.5)+(w-.5)*2.4);
  float fine=fbm(vec2(q.x*7.,q.y*5.-rise*2.8)+w*3.);
  float cloud=n*.78+fine*.22;
  float open=clamp(uOpen*1.8,0.,1.);
  float gate=smoothstep(mix(.52,-.25,open),mix(.9,.28,open),vUv.y);
  float clear=smoothstep(1.25,4.5,uAge);
  float amount=smoothstep(.0,.38,uAge)*smoothstep(.0,.08,uOpen);
  float a=smoothstep(mix(.08,.74,clear),mix(.44,1.,clear),cloud)*gate*amount;
  float side=1.-.2*smoothstep(.3,1.,abs(vUv.x-.5)*2.);
  vec3 c=mix(vec3(.66,.62,.58),vec3(1.,.985,.96),smoothstep(.34,.72,cloud));
  gl_FragColor=vec4(c,clamp(a*side,0.,1.)*.95);
}`;
const STEAM_SECONDS = 4.8;

// A stationary cabinet and a solid, bevelled door. Only the door rotates.
export async function createOvenScene(canvas, onFailure, onSteam = () => {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'low-power' });
  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.6));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.24;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(2 * Math.atan(.5 / CAMERA) * 180 / Math.PI, 1, .1, 30);
  camera.position.z = CAMERA;
  camera.updateMatrixWorld(true);
  const fixed = new THREE.Group(), door = new THREE.Group();
  scene.add(fixed, door);
  scene.add(new THREE.HemisphereLight(0xe2e0da, 0x201c18, 1.6));
  const key = new THREE.DirectionalLight(0xffefdb, 3.1);
  key.position.set(-1.7, 2.2, 4);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  Object.assign(key.shadow.camera, { left: -2, right: 2, top: 1.8, bottom: -1.6, near: .1, far: 8 });
  key.shadow.bias = -.00015;
  key.shadow.normalBias = .008;
  scene.add(key);
  const rimLight = new THREE.DirectionalLight(0xf0dcc0, 1.5);
  rimLight.position.set(2.5, .15, 1.2);
  scene.add(rimLight);

  const steelTexture = await new THREE.TextureLoader().loadAsync(new URL('assets/open/steel.webp', import.meta.url).href);
  steelTexture.colorSpace = THREE.SRGBColorSpace;
  steelTexture.wrapS = steelTexture.wrapT = THREE.RepeatWrapping;
  steelTexture.repeat.set(.9, 3.5);
  steelTexture.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
  const face = new THREE.MeshStandardMaterial({ bumpMap: steelTexture, bumpScale: .00035, color: 0x201f1e, roughness: .62, metalness: .55 });
  const edge = new THREE.MeshStandardMaterial({ bumpMap: steelTexture, bumpScale: .00035, color: 0x2d2c2a, roughness: .46, metalness: .62 });
  const interior = new THREE.MeshStandardMaterial({ color: 0x14110e, roughness: .9, metalness: .22 });
  const rubber = new THREE.MeshStandardMaterial({ color: 0x070b0c, roughness: .98, metalness: 0 });
  const grip = new THREE.MeshStandardMaterial({ color: 0xb4935c, roughness: .34, metalness: .85 });
  const screw = new THREE.MeshStandardMaterial({ color: 0x6d5c3f, roughness: .46, metalness: .65 });
  const glassMaterial = new THREE.ShaderMaterial({ uniforms: { uTime:{value:0}, uHeat:{value:.8}, uAspect:{value:1} }, side: THREE.DoubleSide,
    vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}', fragmentShader: FIRE_FRAGMENT });
  const steamMaterial = new THREE.ShaderMaterial({ uniforms: { uAge:{value:0}, uOpen:{value:0}, uAspect:{value:1} }, transparent: true, depthTest: false, depthWrite: false,
    vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}', fragmentShader: STEAM_FRAGMENT });
  const steam = new THREE.Mesh(new THREE.PlaneGeometry(2,2), steamMaterial);
  steam.frustumCulled = false; steam.renderOrder = 10; steam.visible = false;
  scene.add(steam);
  const fireLight = new THREE.PointLight(0xff6a1e, 0, 1.15, 1.6);
  const shadowMaterial = new THREE.ShadowMaterial({opacity:.25});
  const raycaster = new THREE.Raycaster(), pointer = new THREE.Vector2();
  const point = new THREE.Vector3();
  const thickness = .052, gripDepth = thickness + .044;
  let width = 1, height = 1, doorWidth = 1, doorHeight = 1, hinge = 1, arm = .7, progress = 0;
  let scheduled = 0, broken = false;
  let looping = 0, lastFrame = 0, fireTime = 6, heat = .78, heatTarget = .78, still = false, steamAge = -1, steamUsed = false;

  const invalidate = () => {
    if (scheduled || broken) return;
    scheduled = requestAnimationFrame(() => {
      scheduled = 0;
      if (!broken) renderer.render(scene, camera);
    });
  };
  // Heat falls with the opening door: once it tilts, the glass is just dark glass.
  function applyFire() {
    const level = Math.max(0, 1 - progress * 5), flicker = .78 + .22 * Math.sin(fireTime * 9.1) * Math.sin(fireTime * 3.7 + 1.3);
    glassMaterial.uniforms.uTime.value = fireTime;
    glassMaterial.uniforms.uHeat.value = heat * level;
    fireLight.intensity = .95 * heat * level * flicker;
  }
  function needsLoop() { return !broken && !still && (steamAge >= 0 || progress < .999); }
  function frame(now) {
    looping = 0;
    if (broken) return;
    const dt = Math.min(.05, (now - lastFrame) / 1000 || 0);
    lastFrame = now;
    fireTime += dt;
    heat += (heatTarget - heat) * Math.min(1, dt * 1.4);
    if (steamAge >= 0) {
      steamAge += dt * Math.min(1, .22 + progress * 2.2);
      if (steamAge > STEAM_SECONDS) { steamAge = -1; steam.visible = false; onSteam(false); }
      else steamMaterial.uniforms.uAge.value = steamAge;
    }
    applyFire();
    renderer.render(scene, camera);
    if (needsLoop()) looping = requestAnimationFrame(frame);
  }
  function runLoop() {
    if (looping || !needsLoop()) { invalidate(); return; }
    lastFrame = performance.now();
    looping = requestAnimationFrame(frame);
  }
  function addMesh(parent, geometry, material, x = 0, y = 0, z = 0, casts = true) {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y, z);
    mesh.castShadow = casts; mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }
  function rectangle(x1, y1, x2, y2) {
    const shape = new THREE.Shape();
    shape.moveTo(x1, y1); shape.lineTo(x2, y1); shape.lineTo(x2, y2); shape.lineTo(x1, y2); shape.closePath();
    return shape;
  }
  function cutout(shape, x1, y1, x2, y2) {
    const hole = new THREE.Path();
    hole.moveTo(x1,y1); hole.lineTo(x1,y2); hole.lineTo(x2,y2); hole.lineTo(x2,y1); hole.closePath();
    shape.holes.push(hole);
    return shape;
  }
  function extrude(shape, depth, bevel = .003) {
    return new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 2, steps: 1, curveSegments: 1 });
  }
  function clearGeometry(parent) {
    parent.traverse((object) => object.geometry?.dispose());
    parent.clear();
  }
  function resize(w, h) {
    const layout = getUnifiedLayout(w, h);
    width = w; height = h;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    const { span, jamb, top, bottom, openingWidth, openingHeight, wx, wy1, wy2 } = layout;
    ({ doorWidth, doorHeight, hinge, arm } = layout);
    clearGeometry(fixed); clearGeometry(door);
    door.position.set(0, .5 - hinge, 0);

    // The fixed casing has its own depth and remains anchored to the viewport.
    const casing = cutout(rectangle(-span/2,-.5,span/2,.5),-openingWidth/2,bottom,openingWidth/2,top);
    addMesh(fixed, extrude(casing,.065), [face,edge]);
    const gasket = cutout(rectangle(-openingWidth/2,bottom,openingWidth/2,top),-openingWidth/2+.007,bottom+.006,openingWidth/2-.007,top-.006);
    addMesh(fixed, extrude(gasket,.018,.001),rubber,0,0,.001,false);

    // Deep internal reveals create a stable reference behind the moving door.
    addMesh(fixed,new THREE.BoxGeometry(.028,openingHeight,.26),interior,-openingWidth/2+.008,(top+bottom)/2,-.12,false);
    addMesh(fixed,new THREE.BoxGeometry(.028,openingHeight,.26),interior,openingWidth/2-.008,(top+bottom)/2,-.12,false);
    addMesh(fixed,new THREE.BoxGeometry(openingWidth,.025,.26),interior,0,top-.008,-.12,false);
    addMesh(fixed,new THREE.BoxGeometry(openingWidth,.025,.26),interior,0,bottom+.008,-.12,false);
    const receiver = addMesh(fixed,new THREE.PlaneGeometry(openingWidth,openingHeight),shadowMaterial,0,(top+bottom)/2,-.24,false);
    receiver.receiveShadow = true;

    const leafShape = cutout(rectangle(-doorWidth/2,0,doorWidth/2,doorHeight),-wx,wy1,wx,wy2);
    addMesh(door,extrude(leafShape,thickness,.004),[face,edge]);
    const seal = cutout(rectangle(-wx-.009,wy1-.009,wx+.009,wy2+.009),-wx+.005,wy1+.005,wx-.005,wy2-.005);
    addMesh(door,extrude(seal,.009,.0015),rubber,0,0,thickness-.005);
    addMesh(door,new THREE.PlaneGeometry(wx*2-.01,wy2-wy1-.01),glassMaterial,0,(wy1+wy2)/2,thickness-.016,false);
    glassMaterial.uniforms.uAspect.value = (wx*2)/(wy2-wy1);
    steamMaterial.uniforms.uAspect.value = width/height;
    // The fire lights the iron around the window, as if it were coming through the glass.
    fireLight.position.set(0,wy1+(wy2-wy1)*.3,thickness+.24);
    door.add(fireLight);

    // Raised solid handle: two feet, two projecting posts and a cylindrical grip.
    for (const x of [-doorWidth*.405,doorWidth*.405]) {
      const foot = addMesh(door,new THREE.CylinderGeometry(.022,.025,.009,24),edge,x,arm,thickness+.004);
      foot.rotation.x = Math.PI/2;
      const post = addMesh(door,new THREE.CylinderGeometry(.009,.011,.036,20),grip,x,arm,thickness+.025);
      post.rotation.x = Math.PI/2;
    }
    const bar = addMesh(door,new THREE.CylinderGeometry(.011,.011,doorWidth*.81,32),grip,0,arm,gripDepth);
    bar.rotation.z = Math.PI/2;
    bar.userData.grip = true;
    for (const x of [-doorWidth*.405,doorWidth*.405]) {
      const end = addMesh(door,new THREE.SphereGeometry(.011,16,10),grip,x,arm,gripDepth);
      end.userData.grip = true;
    }
    // The hinge axis is fixed. Door rotation and the visible pins share it.
    for (const x of [-doorWidth*.32,doorWidth*.32]) {
      const pin = addMesh(fixed,new THREE.CylinderGeometry(.013,.013,doorWidth*.15,24),grip,x,.5-hinge,0);
      pin.rotation.z = Math.PI/2;
      addMesh(fixed,new THREE.BoxGeometry(doorWidth*.18,.027,.022),edge,x,bottom-.014,-.001);
    }
    for (const x of [-span/2+jamb*.5,span/2-jamb*.5]) {
      for (const y of [-.46,.46]) {
        const bolt = addMesh(fixed,new THREE.CylinderGeometry(.005,.006,.003,12),screw,x,y,.069);
        bolt.rotation.x = Math.PI/2;
      }
    }
    door.rotation.x = progress*MAX_ANGLE;
    scene.updateMatrixWorld(true);
    applyFire();
    runLoop();
  }
  let steamAllowed = true;
  function setSteamAllowed(value) { steamAllowed = value; }
  function setProgress(value) {
    progress = value;
    door.rotation.x = progress*MAX_ANGLE;
    scene.updateMatrixWorld(true);
    steamMaterial.uniforms.uOpen.value = progress;
    if (progress > .015 && !steamUsed && steamAllowed && !still) {
      steamUsed = true; steamAge = 0; steamMaterial.uniforms.uAge.value = 0; steam.visible = true; onSteam(true);
    }
    if (progress < .005) steamUsed = false;
    applyFire();
    runLoop();
  }
  // The fire surges near the end of the bake, then settles once the bread is done.
  function setHeat(value) { heatTarget = value; runLoop(); }
  // Reduced motion: one still frame of the fire, no steam.
  function setStill(value) {
    still = value;
    if (still) { if (steamAge >= 0) onSteam(false); steamAge = -1; steam.visible = false; applyFire(); invalidate(); } else runLoop();
  }
  function setViewProgress(value) {
    // The physical door finishes first; the casing then passes outside the viewport.
    camera.zoom = 1 + .9 * value;
    // Inside the oven only the last of the steam stays on this canvas.
    fixed.visible = door.visible = value < .999;
    camera.updateProjectionMatrix();
    shadowMaterial.opacity = .25 * (1 - value);
    invalidate();
  }
  function gripBounds() {
    let minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity;
    for (const x of [-doorWidth*.43,doorWidth*.43]) for (const y of [arm-.025,arm+.025]) for (const z of [gripDepth-.012,gripDepth+.012]) {
      point.set(x,y,z); door.localToWorld(point); point.project(camera);
      const sx=(point.x+1)*width/2, sy=(1-point.y)*height/2;
      minX=Math.min(minX,sx); maxX=Math.max(maxX,sx); minY=Math.min(minY,sy); maxY=Math.max(maxY,sy);
    }
    return { x:(minX+maxX)/2, y:(minY+maxY)/2, width:maxX-minX, height:Math.max(44,maxY-minY), hinge, arm, depth:gripDepth };
  }
  function pick(x,y) {
    pointer.set(x/width*2-1,1-y/height*2);
    raycaster.setFromCamera(pointer,camera);
    const hit=raycaster.intersectObjects([fixed,door],true)[0];
    if (!hit) return null;
    let parent=hit.object;
    while(parent && parent!==door && parent!==fixed) parent=parent.parent;
    if(parent!==door) return null;
    const local=door.worldToLocal(hit.point.clone());
    return { arm:local.y,depth:local.z,onHandle:!!hit.object.userData.grip,hinge };
  }
  canvas.addEventListener('webglcontextlost',(event)=>{event.preventDefault();broken=true;cancelAnimationFrame(scheduled);cancelAnimationFrame(looping);onFailure();});
  function dispose() {
    broken=true; cancelAnimationFrame(scheduled); cancelAnimationFrame(looping);
    clearGeometry(fixed); clearGeometry(door);
    [face,edge,interior,rubber,grip,screw,glassMaterial,steamMaterial,shadowMaterial].forEach(material=>material.dispose());
    steelTexture.dispose(); renderer.dispose();
  }
  return { resize,setProgress,setViewProgress,setHeat,setStill,setSteamAllowed,gripBounds,pick,dispose };
}
