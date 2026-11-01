import * as THREE from './vendor/three.module.min.js';
import { CAMERA, MAX_ANGLE } from './door-math.mjs?v=solid2';
import { getUnifiedLayout } from './layout-v4.mjs';

// A stationary cabinet and a solid, bevelled door. Only the door rotates.
export async function createOvenScene(canvas, onFailure) {
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

  const steelTexture = await new THREE.TextureLoader().loadAsync('assets/open/steel.webp');
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
  const glassMaterial = new THREE.MeshPhongMaterial({ color: 0x87a4a1, specular: 0xd8e8e3, shininess: 90, transparent: true, opacity: .075, side: THREE.DoubleSide, depthWrite: false });
  const shadowMaterial = new THREE.ShadowMaterial({opacity:.25});
  const raycaster = new THREE.Raycaster(), pointer = new THREE.Vector2();
  const point = new THREE.Vector3();
  const thickness = .052, gripDepth = thickness + .044;
  let width = 1, height = 1, doorWidth = 1, doorHeight = 1, hinge = 1, arm = .7, progress = 0;
  let scheduled = 0, broken = false;

  const invalidate = () => {
    if (scheduled || broken) return;
    scheduled = requestAnimationFrame(() => {
      scheduled = 0;
      if (!broken) renderer.render(scene, camera);
    });
  };
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
    // Interior warm light is confined to the oven; there are no added visual effects.
    door.rotation.x = progress*MAX_ANGLE;
    scene.updateMatrixWorld(true);
    invalidate();
  }
  function setProgress(value) {
    progress = value;
    door.rotation.x = progress*MAX_ANGLE;
    scene.updateMatrixWorld(true);
    invalidate();
  }
  function setViewProgress(value) {
    // The physical door finishes first; the casing then passes outside the viewport.
    camera.zoom = 1 + .9 * value;
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
  canvas.addEventListener('webglcontextlost',(event)=>{event.preventDefault();broken=true;cancelAnimationFrame(scheduled);onFailure();});
  function dispose() {
    broken=true; cancelAnimationFrame(scheduled);
    clearGeometry(fixed); clearGeometry(door);
    [face,edge,interior,rubber,grip,screw,glassMaterial,shadowMaterial].forEach(material=>material.dispose());
    steelTexture.dispose(); renderer.dispose();
  }
  return { resize,setProgress,setViewProgress,gripBounds,pick,dispose };
}
