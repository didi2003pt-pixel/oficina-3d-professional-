
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { LAYOUT, TOUR, ZONES, ZONE_BY_ID } from './config.js';
import { createWorkshop } from './scene.js';

const $ = id => document.getElementById(id);
const viewport=$('viewport'), host=$('scene');
const { scene, roof, flow, truck, groups } = createWorkshop();
const renderer = new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.65));
renderer.shadowMap.enabled=true;
renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=1.34;
host.appendChild(renderer.domElement);
const camera = new THREE.PerspectiveCamera(43,1,.09,260);
camera.position.set(44,33,47);
const mapCamera=new THREE.OrthographicCamera(-27,27,18,-18,.05,170);
mapCamera.position.set(0,78,.01);mapCamera.lookAt(0,0,0);
let activeCamera=camera;
const controls=new OrbitControls(camera,renderer.domElement);
controls.enableDamping=true;
controls.dampingFactor=.072;
controls.target.set(0,1.3,0);
controls.minDistance=4.5;controls.maxDistance=105;
controls.maxPolarAngle=Math.PI*.49;
controls.screenSpacePanning=true;
controls.update();
let mode='orbit', index=0, tween=null, selectedZone=null, boxHelper=null, noticeTimer=0;
const raycaster=new THREE.Raycaster();
const mouse=new THREE.Vector2();
let lastPointer=null,walkYaw=-Math.PI*.7,walkPitch=-.04;
const pressed=new Set();
const clock=new THREE.Clock();
const labelItems=[];

function toast(message){
  const notice=$('notice');
  notice.textContent=message;notice.classList.add('visible');
  window.clearTimeout(noticeTimer);
  noticeTimer=window.setTimeout(()=>notice.classList.remove('visible'),3200);
}

function makeLabels(){
  const layer=$('labels-layer');
  for(const z of ZONES){
    if(z.id==='flow'||z.id==='truck'||z.id==='lift')continue;
    const e=document.createElement('div');
    e.className='world-label'+(['entrance','exit'].includes(z.id)?' important':'');
    e.textContent=z.name.toUpperCase();
    layer.appendChild(e);
    labelItems.push({element:e,position:new THREE.Vector3(...z.position)});
  }
}
function updateLabels(){
  if(!labelItems.length)return;
  const bounds=host.getBoundingClientRect();
  for(const {element,position} of labelItems){
    if(!$('labels-layer').classList.contains('shown')){element.style.display='none';continue;}
    const p=position.clone().project(activeCamera);
    const px=(p.x*.5+.5)*bounds.width;
    const py=(-p.y*.5+.5)*bounds.height;
    const ok=p.z > -1 && p.z < 1 && px>30 && px<bounds.width-30 && py>14 && py<bounds.height-12;
    element.style.display=ok?'block':'none';
    if(ok){element.style.left=px+'px';element.style.top=py+'px';}
  }
}
makeLabels();
$('labels-layer').classList.add('shown');
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
function toOrbit(){
  if(document.pointerLockElement===renderer.domElement)document.exitPointerLock();
  mode='orbit';activeCamera=camera;
  controls.object=camera;
  controls.enableRotate=true;
  controls.enabled=true;
  camera.position.set(...TOUR[index].position);
  controls.target.set(...TOUR[index].target);
  controls.update();
  setModeButtons();
}
function setModeButtons(){
  document.querySelectorAll('[data-mode]').forEach(el=>el.classList.toggle('active',el.dataset.mode===mode));
  const text={
    orbit:'Arrasta para rodar · Roda do rato para aproximar · Botão direito para deslocar',
    walk:'WASD/setas para andar · Move o rato para olhar · Clique para capturar rato · ESC para libertar',
    top:'Planta ortográfica · Arrasta para mover · Roda do rato para zoom'
  };
  $('mode-help').textContent=text[mode];
}
function goTo(i){
  index=Math.max(0,Math.min(TOUR.length-1,i));
  if(mode!=='orbit')toOrbit();
  const entry=TOUR[index];
  tween={
    p:new THREE.Vector3(...entry.position),
    t:new THREE.Vector3(...entry.target)
  };
  updateTourUI();
  hideDetail();
}
function reset(){
  if(mode!=='orbit')toOrbit();
  goTo(0);
}
function switchMode(next){
  if(next===mode)return;
  if(next==='orbit'){toOrbit();tween=null;return;}
  if(next==='top'){
    if(document.pointerLockElement===renderer.domElement)document.exitPointerLock();
    mode='top';activeCamera=mapCamera;controls.enabled=true;
    controls.object=mapCamera;controls.target.set(0,0,0);
    mapCamera.position.set(0,75,.001);
    mapCamera.lookAt(0,0,0);
    controls.enableRotate=false;
    controls.minZoom=.6;controls.maxZoom=4;
    controls.update();
    tween=null;setModeButtons();return;
  }
  if(next==='walk'){
    if(mode==='top'){controls.object=camera;controls.enableRotate=true;controls.update();}
    mode='walk';activeCamera=camera;controls.enabled=false;
    tween=null;pressed.clear();
    camera.position.set(-14.0,1.72,1.8);
    camera.rotation.order='YXZ';
    walkYaw=-Math.PI*.12;walkPitch=0;
    camera.rotation.set(walkPitch,walkYaw,0,'YXZ');
    setModeButtons();
    toast('Caminhada: usa WASD e clica no 3D para controlar o olhar.');
  }
}
document.querySelectorAll('[data-mode]').forEach(btn=>btn.addEventListener('click',()=>{
  const next=btn.dataset.mode;
  if(next==='orbit' && mode==='top'){
    controls.object=camera;controls.enableRotate=true;
    controls.target.set(0,1.3,0);controls.update();
  }
  switchMode(next);
}));
$('previous').addEventListener('click',()=>goTo(index-1));
$('next').addEventListener('click',()=>goTo(index+1));
$('reset').addEventListener('click',reset);

function toggle(name,button){
  if(name==='roof'){roof.visible=!roof.visible;button.classList.toggle('active',roof.visible);button.setAttribute('aria-pressed',String(roof.visible));}
  if(name==='flow'){flow.visible=!flow.visible;button.classList.toggle('active',flow.visible);button.setAttribute('aria-pressed',String(flow.visible));}
  if(name==='labels'){
    const visible=$('labels-layer').classList.toggle('shown');
    button.classList.toggle('active',visible);button.setAttribute('aria-pressed',String(visible));
  }
  if(name==='truck'){
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
  if(mode!=='orbit'){
    if(mode==='top'){controls.object=camera;controls.enableRotate=true;}
    toOrbit();
  }
  const target=new THREE.Vector3(...z.position);
  tween={t:target,p:target.clone().add(new THREE.Vector3(12,10,13))};
});

renderer.domElement.addEventListener('pointerdown',e=>{
  lastPointer={x:e.clientX,y:e.clientY};
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
renderer.domElement.addEventListener('click',()=>{
  if(mode==='walk' && !document.pointerLockElement)renderer.domElement.requestPointerLock?.();
});
document.addEventListener('mousemove',e=>{
  if(mode!=='walk'||document.pointerLockElement!==renderer.domElement)return;
  walkYaw -= e.movementX*.0023;
  walkPitch -= e.movementY*.0023;
  walkPitch=Math.max(-1.2,Math.min(1.2,walkPitch));
});
document.addEventListener('keydown',e=>{
  if(e.code==='Escape'){hideDetail();return;}
  if(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','ShiftLeft'].includes(e.code)){
    if(mode==='walk')e.preventDefault();
    pressed.add(e.code);
  }
  if(e.code==='Space' && mode==='orbit' && e.target.tagName!=='BUTTON'){
    e.preventDefault();goTo((index+1)%TOUR.length);
  }
});
document.addEventListener('keyup',e=>pressed.delete(e.code));
window.addEventListener('blur',()=>pressed.clear());

function walkCollides(x,z){
  // Área visível da nave; simples contenção conceptual, sem validação dimensional.
  if(x < -20.5 || x > 20.35 || z < -13.15 || z > 13.45)return true;
  const rects=[
    {x:-14,z:-10,w:10.2,d:5.0},
    {x:-4,z:-10,w:8.2,d:5.0},
    {x:6,z:-10,w:8.1,d:4.9},
    {x:-7.8,z:3,w:4.2,d:13.3},
    {x:3.5,z:4,w:5.9,d:6.5},
    {x:-8.3,z:11,w:20.2,d:2.3},
    {x:18,z:0,w:6.3,d:28}
  ];
  return rects.some(r=>Math.abs(x-r.x)<r.w/2+.45 && Math.abs(z-r.z)<r.d/2+.45);
}
function walkStep(dt){
  camera.rotation.set(walkPitch,walkYaw,0,'YXZ');
  const f=Number(pressed.has('KeyW')||pressed.has('ArrowUp'))-Number(pressed.has('KeyS')||pressed.has('ArrowDown'));
  const s=Number(pressed.has('KeyD')||pressed.has('ArrowRight'))-Number(pressed.has('KeyA')||pressed.has('ArrowLeft'));
  if(!f&&!s)return;
  const length=Math.hypot(f,s)||1,speed=(pressed.has('ShiftLeft')?7.4:3.5)*Math.min(dt,.05);
  const forward=new THREE.Vector3(-Math.sin(walkYaw),0,-Math.cos(walkYaw));
  const right=new THREE.Vector3(-forward.z,0,forward.x);
  const d=forward.multiplyScalar(f/length*speed).add(right.multiplyScalar(s/length*speed));
  const x=camera.position.x+d.x,z=camera.position.z+d.z;
  if(!walkCollides(x,camera.position.z))camera.position.x=x;
  if(!walkCollides(camera.position.x,z))camera.position.z=z;
  camera.position.y=1.72;
}
function onResize(){
  const w=Math.max(1,host.clientWidth),h=Math.max(1,host.clientHeight);
  renderer.setSize(w,h,false);
  camera.aspect=w/h;camera.updateProjectionMatrix();
  const s=26;
  mapCamera.left=-s*w/h;mapCamera.right=s*w/h;
  mapCamera.top=s;mapCamera.bottom=-s;
  mapCamera.updateProjectionMatrix();
}
const observer=new ResizeObserver(onResize);observer.observe(host);
window.addEventListener('resize',onResize);
onResize();
goTo(0);

function animate(){
  const dt=clock.getDelta();
  if(mode==='walk')walkStep(dt);
  else{
    if(tween && mode==='orbit'){
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
