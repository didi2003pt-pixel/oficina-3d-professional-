
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { LAYOUT, TOUR, ZONES, ZONE_BY_ID } from './config.js';
import { createWorkshop } from './scene.js';

const $ = id => document.getElementById(id);
const host=$('scene');
const { scene, structure, roof, flow, truck, groups, elements } = createWorkshop();
const renderer = new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.65));
renderer.shadowMap.enabled=true;
renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=1.34;
host.appendChild(renderer.domElement);
const camera = new THREE.PerspectiveCamera(43,1,.09,260);
const overviewOffset=new THREE.Vector3(...TOUR[0].position)
  .sub(new THREE.Vector3(...TOUR[0].target)).normalize();
const overviewBounds=new THREE.Box3();
const meshBounds=new THREE.Box3();
scene.updateMatrixWorld(true);
for(const group of [structure,roof,...elements]){
  group.traverse(object=>{
    if(object.isMesh)overviewBounds.union(meshBounds.setFromObject(object));
  });
}
const overviewDiagonal=overviewBounds.getSize(new THREE.Vector3()).length();
const overviewTarget=overviewBounds.getCenter(new THREE.Vector3());
const overviewCorners=[];
for(const x of [overviewBounds.min.x,overviewBounds.max.x]){
  for(const y of [overviewBounds.min.y,overviewBounds.max.y]){
    for(const z of [overviewBounds.min.z,overviewBounds.max.z]){
      overviewCorners.push(new THREE.Vector3(x,y,z).sub(overviewTarget));
    }
  }
}
const overviewRight=new THREE.Vector3().crossVectors(camera.up,overviewOffset).normalize();
const overviewUp=new THREE.Vector3().crossVectors(overviewOffset,overviewRight);
const overviewPosition=new THREE.Vector3();

const mapCamera=new THREE.OrthographicCamera(-27,27,18,-18,.05,170);
mapCamera.position.set(0,78,.01);
const walkCamera=new THREE.PerspectiveCamera(52,1,.09,260);
const walkEyeHeight=1.70;
const walkRadius=.28;
const walkKeys=new Set(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','ShiftLeft','ShiftRight']);
const obstacles=[];
for(const group of elements){
  if(group===groups.get('office'))continue; // O vidro delimita o bloco administrativo.
  group.traverse(object=>{
    if(!object.isMesh)return;
    const bounds=new THREE.Box3().setFromObject(object);
    if(bounds.max.y>.12 && bounds.min.y<walkEyeHeight+.15){
      obstacles.push({bounds,group});
    }
  });
}

let activeCamera=camera;
const controls=new OrbitControls(camera,renderer.domElement);
controls.enableDamping=true;
controls.dampingFactor=.072;
controls.minDistance=4.5;
controls.maxPolarAngle=Math.PI*.49;
controls.screenSpacePanning=true;
const mapControls=new OrbitControls(mapCamera,renderer.domElement);
mapControls.enableRotate=false;
mapControls.mouseButtons.LEFT=THREE.MOUSE.PAN;
mapControls.touches.ONE=THREE.TOUCH.PAN;
mapControls.minZoom=.6;
mapControls.maxZoom=4;
mapControls.enabled=false;

let mode='orbit', index=0, tween=null, followOverview=true;
let selectedZone=null, boxHelper=null, noticeTimer=0;
const raycaster=new THREE.Raycaster();
const mouse=new THREE.Vector2();
let lastPointer=null,walkYaw=0,walkPitch=0;
const pressed=new Set();
const clock=new THREE.Clock();
const reduceMotion=window.matchMedia('(prefers-reduced-motion: reduce)');
const labelItems=[];
const labelLayer=$('labels-layer');
const labelOccluders=[...host.parentElement.querySelectorAll('.mode-switch, .tools, .viewport-hint, .scale-note, .compass, .detail-card')];
const projectedLabel=new THREE.Vector3();

function toast(message){
  const notice=$('notice');
  notice.textContent=message;notice.classList.add('visible');
  window.clearTimeout(noticeTimer);
  noticeTimer=window.setTimeout(()=>notice.classList.remove('visible'),3200);
}

function makeLabels(){
  for(const z of ZONES){
    if(z.id==='flow'||z.id==='truck'||z.id==='lift')continue;
    const element=document.createElement('div');
    const priority=z.id==='entrance'||z.id==='exit';
    element.className='world-label'+(priority?' important':'');
    element.textContent=z.name.toUpperCase();
    labelLayer.appendChild(element);
    labelItems.push({
      element, priority, position:new THREE.Vector3(...z.position),
      width:element.offsetWidth, height:element.offsetHeight
    });
  }
}
function updateLabels(){
  if(!labelLayer.classList.contains('shown'))return;
  const viewport=host.getBoundingClientRect();
  const occupied=labelOccluders.filter(element=>!element.hidden).map(element=>{
    const rect=element.getBoundingClientRect();
    return {left:rect.left-viewport.left,right:rect.right-viewport.left,
      top:rect.top-viewport.top,bottom:rect.bottom-viewport.top};
  });
  const ordered=labelItems.map(item=>({
    item, distance:item.position.distanceToSquared(activeCamera.position)
  })).sort((a,b)=>Number(b.item.priority)-Number(a.item.priority)||a.distance-b.distance);
  for(const {item:{element,position,width,height},distance} of ordered){
    const p=projectedLabel.copy(position).project(activeCamera);
    const x=(p.x*.5+.5)*viewport.width,y=(-p.y*.5+.5)*viewport.height;
    const rect={left:x-width/2-4,right:x+width/2+4,top:y-height-4,bottom:y+12};
    const visible=p.z>-1 && p.z<1 && (mode!=='walk'||distance<24**2)
      && rect.left>=0 && rect.right<=viewport.width && rect.top>=0 && rect.bottom<=viewport.height
      && !occupied.some(other=>rect.left<other.right && rect.right>other.left
        && rect.top<other.bottom && rect.bottom>other.top);
    element.style.visibility=visible?'visible':'hidden';
    if(visible){
      element.style.left=x+'px';
      element.style.top=y+'px';
      occupied.push(rect);
    }
  }
}
labelLayer.classList.add('shown');
makeLabels();
function buildTourList(){
  const nav=$('tour-list');
  for(let i=0;i<TOUR.length;i++){
    const btn=document.createElement('button');
    btn.className='tour-item';btn.type='button';
    btn.innerHTML='<span class="tour-number">'+String(i+1).padStart(2,'0')+'</span><span class="tour-name"></span>';
    btn.querySelector('.tour-name').textContent=TOUR[i].title;
    btn.addEventListener('click',()=>goTo(i));
    nav.appendChild(btn);
  }
}
buildTourList();

function updateTourUI(){
  const item=TOUR[index],n=TOUR.length;
  $('current-title').textContent=item.title;
  $('step-title').textContent=item.title;
  $('step-description').textContent=item.description;
  $('step-total').textContent=String(index+1).padStart(2,'0')+' / '+String(n).padStart(2,'0');
  $('step-label').textContent='ETAPA '+String(index+1).padStart(2,'0')+' / '+String(n).padStart(2,'0');
  $('tour-progress').style.width=((index+1)/n*100)+'%';
  $('previous').disabled=index===0;
  $('next').disabled=index===n-1;
  for(const [i,button] of [...$('tour-list').children].entries()){
    button.classList.toggle('active',i===index);
    if(i===index && window.innerWidth<680)button.scrollIntoView({block:'nearest',inline:'nearest',behavior:'smooth'});
  }
}
function setModeButtons(){
  document.querySelectorAll('[data-mode]').forEach(el=>{
    const active=el.dataset.mode===mode;
    el.classList.toggle('active',active);
    el.setAttribute('aria-pressed',String(active));
  });
  const text={
    orbit:'Arrasta para rodar · Roda do rato para aproximar · Botão direito para deslocar',
    walk:'WASD/setas para andar · Shift para acelerar · Clica no 3D para olhar · Esc para libertar',
    top:'Planta ortográfica · Arrasta para mover · Roda do rato para zoom'
  };
  $('mode-help').textContent=text[mode];
}
function moveOrbit(position,target,immediate=false){
  // Consumir a inércia da interação anterior antes de iniciar uma vista programada.
  controls.enableDamping=false;
  controls.update();
  controls.enableDamping=true;
  if(immediate||reduceMotion.matches){
    tween=null;
    camera.position.copy(position);
    controls.target.copy(target);
    controls.update();
  }else{
    tween={p:position,t:target};
  }
}
function goTo(i,immediate=false){
  const fromOtherMode=mode!=='orbit';
  index=Math.max(0,Math.min(TOUR.length-1,i));
  switchMode('orbit');
  followOverview=index===0;
  const entry=TOUR[index];
  const position=followOverview?overviewPosition:new THREE.Vector3(...entry.position);
  const target=followOverview?overviewTarget:new THREE.Vector3(...entry.target);
  moveOrbit(position,target,immediate||fromOtherMode);
  updateTourUI();
  hideDetail();
}
function switchMode(next){
  if(next===mode)return;
  if(mode==='walk' && document.pointerLockElement===renderer.domElement)document.exitPointerLock();
  lastPointer=null;
  pressed.clear();
  mode=next;
  controls.enabled=mode==='orbit';
  mapControls.enabled=mode==='top';
  activeCamera={orbit:camera,top:mapCamera,walk:walkCamera}[mode];
  if(mode==='walk'){
    // Começar no corredor da entrada e olhar para o interior.
    walkCamera.position.set(LAYOUT.route[1][0],walkEyeHeight,LAYOUT.entrance.z);
    walkYaw=-Math.PI/2;
    walkPitch=-.025;
    walkCamera.rotation.set(walkPitch,walkYaw,0,'YXZ');
    toast('Clica no visualizador para controlar o olhar com o rato.');
  }
  setModeButtons();
}
controls.addEventListener('start',()=>{
  followOverview=false;
  tween=null;
});
document.querySelectorAll('[data-mode]').forEach(btn=>btn.addEventListener('click',()=>switchMode(btn.dataset.mode)));
$('previous').addEventListener('click',()=>goTo(index-1));
$('next').addEventListener('click',()=>goTo(index+1));
$('reset').addEventListener('click',()=>goTo(0));

function toggle(name,button){
  if(name==='roof'){roof.visible=!roof.visible;button.classList.toggle('active',roof.visible);button.setAttribute('aria-pressed',String(roof.visible));}
  if(name==='flow'){flow.visible=!flow.visible;button.classList.toggle('active',flow.visible);button.setAttribute('aria-pressed',String(flow.visible));}
  if(name==='labels'){
    const visible=labelLayer.classList.toggle('shown');
    button.classList.toggle('active',visible);button.setAttribute('aria-pressed',String(visible));
  }
  if(name==='truck'){
    if(!truck.visible && mode==='walk' && obstacles.some(({bounds,group})=>
      group===truck && touchesObstacle(bounds,walkCamera.position.x,walkCamera.position.z))){
      toast('Afasta-te da posição do camião para o voltar a mostrar.');
      return;
    }
    truck.visible=!truck.visible;button.classList.toggle('active',!truck.visible);
    button.setAttribute('aria-pressed',String(!truck.visible));
    button.querySelector('span').textContent=truck.visible?'Ocultar camião':'Mostrar camião';
  }
}
document.querySelectorAll('[data-toggle]').forEach(btn=>btn.addEventListener('click',()=>toggle(btn.dataset.toggle,btn)));

function hideDetail(){
  selectedZone=null;$('detail-card').hidden=true;
  if(boxHelper){scene.remove(boxHelper);boxHelper.geometry.dispose();boxHelper.material.dispose();boxHelper=null;}
}
function selectZone(zone){
  const info=ZONE_BY_ID[zone];if(!info)return;
  hideDetail();selectedZone=zone;
  $('detail-title').textContent=info.name;
  $('detail-text').textContent=info.description;
  $('detail-card').hidden=false;
  const grp=groups.get(zone);
  if(grp && zone!=='flow'){
    boxHelper=new THREE.BoxHelper(grp,0xe7b65e);
    if(!boxHelper.geometry.boundingSphere)boxHelper.geometry.computeBoundingSphere();
    scene.add(boxHelper);
  }
}
$('close-detail').addEventListener('click',hideDetail);
$('focus-selection').addEventListener('click',()=>{
  if(!selectedZone)return;
  const z=ZONE_BY_ID[selectedZone];
  if(!z)return;
  const fromOtherMode=mode!=='orbit';
  switchMode('orbit');
  followOverview=false;
  const target=new THREE.Vector3(...z.position);
  moveOrbit(target.clone().add(new THREE.Vector3(12,10,13)),target,fromOtherMode);
});

renderer.domElement.addEventListener('pointerdown',e=>{
  lastPointer=e.button===0?{x:e.clientX,y:e.clientY}:null;
});
renderer.domElement.addEventListener('pointerup',e=>{
  if(mode!=='orbit'||!lastPointer)return;
  if(Math.hypot(e.clientX-lastPointer.x,e.clientY-lastPointer.y)>5)return;
  const rect=renderer.domElement.getBoundingClientRect();
  mouse.set((e.clientX-rect.left)/rect.width*2-1,-((e.clientY-rect.top)/rect.height*2-1));
  raycaster.setFromCamera(mouse,activeCamera);
  const hits=raycaster.intersectObjects([...groups.values()],true);
  for(const hit of hits){
    let node=hit.object;
    while(node && !node.userData.zoneId)node=node.parent;
    if(node?.userData.zoneId){selectZone(node.userData.zoneId);return;}
  }
  hideDetail();
});
renderer.domElement.addEventListener('click',async ()=>{
  if(mode!=='walk'||document.pointerLockElement||!renderer.domElement.requestPointerLock)return;
  try{
    await renderer.domElement.requestPointerLock();
    if(mode!=='walk' && document.pointerLockElement===renderer.domElement)document.exitPointerLock();
  }catch{
    if(mode==='walk')toast('Não foi possível capturar o rato. Podes continuar a andar com WASD ou as setas.');
  }
});
document.addEventListener('pointerlockchange',()=>{
  if(document.pointerLockElement===renderer.domElement && mode!=='walk')document.exitPointerLock();
  pressed.clear();
});
document.addEventListener('mousemove',e=>{
  if(mode!=='walk'||document.pointerLockElement!==renderer.domElement)return;
  walkYaw-=e.movementX*.0023;
  walkPitch=THREE.MathUtils.clamp(walkPitch-e.movementY*.0023,-Math.PI/3,Math.PI/3);
});
document.addEventListener('keydown',e=>{
  if(e.code==='Escape'){hideDetail();return;}
  if(mode==='walk' && walkKeys.has(e.code) && !e.altKey && !e.ctrlKey && !e.metaKey){
    e.preventDefault();
    pressed.add(e.code);
  }
  if(e.code==='Space' && mode==='orbit' && e.target.tagName!=='BUTTON'){
    e.preventDefault();goTo((index+1)%TOUR.length);
  }
});
document.addEventListener('keyup',e=>pressed.delete(e.code));
window.addEventListener('blur',()=>pressed.clear());
document.addEventListener('visibilitychange',()=>pressed.clear());

function touchesObstacle(bounds,x,z){
  return x>bounds.min.x-walkRadius && x<bounds.max.x+walkRadius
    && z>bounds.min.z-walkRadius && z<bounds.max.z+walkRadius;
}
function walkCollides(x,z){
  // Contenção conceptual no interior da nave e à frente do vidro administrativo.
  if(x<-LAYOUT.width/2+.55 || x>LAYOUT.officeX-walkRadius || Math.abs(z)>LAYOUT.depth/2-.6)return true;
  return obstacles.some(({bounds,group})=>group.visible && touchesObstacle(bounds,x,z));
}
function walkStep(dt){
  walkCamera.rotation.set(walkPitch,walkYaw,0,'YXZ');
  const forward=Number(pressed.has('KeyW')||pressed.has('ArrowUp'))-Number(pressed.has('KeyS')||pressed.has('ArrowDown'));
  const sideways=Number(pressed.has('KeyD')||pressed.has('ArrowRight'))-Number(pressed.has('KeyA')||pressed.has('ArrowLeft'));
  if(!forward&&!sideways)return;
  const sprint=pressed.has('ShiftLeft')||pressed.has('ShiftRight');
  const step=(sprint?4.8:2.6)*Math.min(dt,.05)/Math.hypot(forward,sideways);
  const sin=Math.sin(walkYaw),cos=Math.cos(walkYaw);
  const position=walkCamera.position;
  const x=position.x+(-sin*forward+cos*sideways)*step;
  const z=position.z+(-cos*forward-sin*sideways)*step;
  if(!walkCollides(x,position.z))position.x=x;
  if(!walkCollides(position.x,z))position.z=z;
}
function onResize(){
  const w=Math.max(1,host.clientWidth),h=Math.max(1,host.clientHeight);
  const aspect=w/h;
  renderer.setSize(w,h,false);
  for(const perspective of [camera,walkCamera]){
    perspective.aspect=aspect;
    perspective.updateProjectionMatrix();
  }
  const vertical=Math.tan(THREE.MathUtils.degToRad(camera.fov/2))*.88;
  const horizontal=vertical*aspect;
  const distance=Math.max(...overviewCorners.map(corner=>corner.dot(overviewOffset)+Math.max(
    Math.abs(corner.dot(overviewRight))/horizontal,
    Math.abs(corner.dot(overviewUp))/vertical
  )));
  overviewPosition.copy(overviewTarget).addScaledVector(overviewOffset,distance);
  // Manter o edifício dentro do intervalo utilizável mesmo em janelas estreitas.
  controls.maxDistance=Math.max(105,distance*1.12);
  camera.far=Math.max(260,controls.maxDistance+overviewDiagonal);
  camera.updateProjectionMatrix();
  scene.fog.near=Math.max(80,distance+overviewDiagonal/2);
  scene.fog.far=scene.fog.near+80;
  if(followOverview && !tween)moveOrbit(overviewPosition,overviewTarget,true);

  const s=Math.max(overviewBounds.max.z,-overviewBounds.min.z,23/aspect)*1.12;
  mapCamera.left=-s*aspect;mapCamera.right=s*aspect;
  mapCamera.top=s;mapCamera.bottom=-s;
  mapCamera.updateProjectionMatrix();
}
const observer=new ResizeObserver(onResize);observer.observe(host);
onResize();
setModeButtons();
goTo(0,true);

function animate(){
  const dt=clock.getDelta();
  if(mode==='walk')walkStep(dt);
  else if(mode==='top')mapControls.update();
  else{
    if(tween){
      const ease=Math.min(1,dt*3.6);
      camera.position.lerp(tween.p,ease);
      controls.target.lerp(tween.t,ease);
      if(camera.position.distanceTo(tween.p)<.06 && controls.target.distanceTo(tween.t)<.06){
        camera.position.copy(tween.p);controls.target.copy(tween.t);tween=null;
      }
    }
    controls.update();
  }
  if(boxHelper)boxHelper.update();
  renderer.render(scene,activeCamera);
  updateLabels();
}
renderer.setAnimationLoop(animate);

// Diagnóstico simples para quem estiver a testar o projeto em desenvolvimento.
window.addEventListener('unhandledrejection',e=>{
  console.error('Erro na oficina 3D:',e.reason);
  toast('Ocorreu um erro. Consulta a consola do navegador para mais detalhes.');
});
