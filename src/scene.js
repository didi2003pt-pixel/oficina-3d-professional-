
import * as THREE from 'three';
import { LAYOUT, ZONES } from './config.js';
import { createTireAssets } from './tires.js';
import { buildHeavyChanger } from './machine-heavy.js';
import { buildBalancingEquipment } from './machine-balance.js';
import { buildAlignmentEquipment } from './machine-alignment.js';
import { batchMachineParts } from './machine-parts.js';
import { createTruck } from './truck.js';

const C = {
  floor: 0x59636b, foundation: 0x303942, wall: 0x727e89,
  dark: 0x1b2733, steel: 0x414c56, steelLight: 0x83909a,
  black: 0x12171c, red: 0xb82229, redBright: 0xf04448,
  gold: 0xf6c04d, yellow: 0xf6c748, glass: 0x8ec4d8,
  grey: 0x929da6,
  wood: 0x987554,
  greenery: 0x3f805d, monitor: 0x24485a
};

const mat = (color, opts={}) => new THREE.MeshStandardMaterial({ color, roughness: 0.74, metalness: 0.1, ...opts });
const M = {
  floor: mat(C.floor,{ roughness:.92 }),
  foundation: mat(C.foundation),
  wall: mat(C.wall,{ roughness:.94 }),
  steel: mat(C.steel,{metalness:.72,roughness:.39}),
  steelLight: mat(C.steelLight,{metalness:.7,roughness:.42}),
  black: mat(C.black,{roughness:.85}),
  red: mat(C.red,{metalness:.38,roughness:.43}),
  redBright: mat(C.redBright,{metalness:.37}),
  yellow: mat(C.yellow,{metalness:.08}),
  grey: mat(C.grey,{roughness:.7}),
  rackRed: mat(0xa12728,{metalness:.43,roughness:.55}),
  rackDeck: mat(0x686c70,{metalness:.58,roughness:.61}),
  wood: mat(C.wood,{roughness:.84}),
  glass: mat(C.glass,{transparent:true,opacity:.24,metalness:.08,roughness:.18,side:THREE.DoubleSide,depthWrite:false}),
  screen: mat(C.monitor,{roughness:.2,emissive:0x12608b,emissiveIntensity:.56}),
  light: mat(0xfff2d4,{emissive:0xffe9b7,emissiveIntensity:2.1,roughness:.2}),
  plant: mat(C.greenery,{roughness:.9}),
  signage: mat(C.dark)
};
const boxGeoCache = new Map();
function box(parent, sx,sy,sz, x,y,z, material=M.steel, cast=true) {
  const key=[sx,sy,sz].join(':');
  let geometry=boxGeoCache.get(key);
  if(!geometry) {geometry=new THREE.BoxGeometry(sx,sy,sz);boxGeoCache.set(key,geometry);}
  const m=new THREE.Mesh(geometry,material);
  m.position.set(x,y,z);m.castShadow=cast;m.receiveShadow=true;parent.add(m);return m;
}
function cyl(parent, radius, height, x,y,z, material=M.steel, sides=22) {
  const m=new THREE.Mesh(new THREE.CylinderGeometry(radius,radius,height,sides),material);
  m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;
}
function rod(parent, from, to, radius, material=M.steel) {
  const a=new THREE.Vector3(...from),b=new THREE.Vector3(...to);
  const v=b.clone().sub(a);
  const m=new THREE.Mesh(new THREE.CylinderGeometry(radius,radius,v.length(),8),material);
  m.position.copy(a.add(b).multiplyScalar(.5));
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),v.normalize());
  m.castShadow=true;parent.add(m);return m;
}
function group(parent,name,zone) {
  const g=new THREE.Group();g.name=name;
  if(zone) g.userData.zoneId=zone;
  parent.add(g);return g;
}
function stripe(parent,x1,z1,x2,z2,width=.075,material=M.yellow,y=.037) {
  const dx=x2-x1,dz=z2-z1,len=Math.hypot(dx,dz);
  const m=box(parent,len,.018,width,(x1+x2)/2,y,(z1+z2)/2,material,false);
  m.rotation.y=-Math.atan2(dz,dx);return m;
}
function outline(parent,x,z,w,d,material=M.yellow) {
  stripe(parent,x-w/2,z-d/2,x+w/2,z-d/2,.058,material);
  stripe(parent,x-w/2,z+d/2,x+w/2,z+d/2,.058,material);
  stripe(parent,x-w/2,z-d/2,x-w/2,z+d/2,.058,material);
  stripe(parent,x+w/2,z-d/2,x+w/2,z+d/2,.058,material);
}
function flatArrow(parent,x,z,angle,scale=1) {
  const coordinates=[ [0,0],[-1.2,-.24],[-1.2,-.1],[-1.8,-.1],[-1.8,.1],[-1.2,.1],[-1.2,.24] ];
  const verts=[],cs=Math.cos(angle),sn=Math.sin(angle);
  const add=(p)=>verts.push(x+scale*(p[0]*cs-p[1]*sn), .065, z+scale*(p[0]*sn+p[1]*cs));
  for(let k=1;k<coordinates.length-1;k++){add(coordinates[0]);add(coordinates[k]);add(coordinates[k+1]);}
  const geom=new THREE.BufferGeometry();
  geom.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));geom.computeVertexNormals();
  const m=new THREE.Mesh(geom,new THREE.MeshBasicMaterial({color:C.gold,side:THREE.DoubleSide,depthWrite:false}));
  parent.add(m);return m;
}
function sign(parent,text,x,y,z,width=6, height=.82) {
  const can=document.createElement('canvas');can.width=1024;can.height=180;
  const ctx=can.getContext('2d');
  ctx.fillStyle='#15212d';ctx.fillRect(0,0,can.width,can.height);
  ctx.strokeStyle='#c99a46';ctx.lineWidth=9;ctx.strokeRect(4,4,1016,172);
  ctx.fillStyle='#f1f4f7';
  const lines=text.split('\n');
  ctx.font=lines.length>1?'bold 48px Arial':'bold 65px Arial';
  ctx.textAlign='center';ctx.textBaseline='middle';
  lines.forEach((line,i)=>ctx.fillText(line,512,lines.length===1?90:63+i*62,960));
  const tx=new THREE.CanvasTexture(can);tx.colorSpace=THREE.SRGBColorSpace;
  const plane=new THREE.Mesh(new THREE.PlaneGeometry(width,height),
    new THREE.MeshBasicMaterial({map:tx,side:THREE.DoubleSide}));
  plane.position.set(x,y,z);parent.add(plane);return plane;
}
function tire(parent,radius,width,x,y,z,tread='rib') {
  const g=group(parent,'Pneu');
  g.position.set(x,y,z);
  const {bodyGeometry,treadGeometry,distantBodyGeometry,bodyMaterial,treadMaterial}
    =createTireAssets(radius,width,tread);
  const lod=new THREE.LOD();
  g.add(lod);
  const detail=group(lod,'Piso detalhado');
  const body=new THREE.Mesh(bodyGeometry,bodyMaterial);
  const blocks=new THREE.Mesh(treadGeometry,treadMaterial);
  body.castShadow=true;
  body.receiveShadow=blocks.receiveShadow=true;
  detail.add(body,blocks);
  const distant=new THREE.Mesh(distantBodyGeometry,bodyMaterial);
  distant.castShadow=distant.receiveShadow=true;
  lod.addLevel(detail,0);
  lod.addLevel(distant,24,.12);
  return g;
}
function desk(parent,x,y,z,width=2.3) {
  box(parent,width,.13,.9,x,y,z,M.wood);
  for(const dx of [-width/2+.13,width/2-.13])box(parent,.11,y-.5,.11,x+dx,(y-.5)/2,z-.28,M.steel);
  box(parent,.65,.5,.07,x,y+.35,z-.27,M.black);
  box(parent,.54,.35,.075,x,y+.36,z-.225,M.screen);
  box(parent,.1,.17,.1,x,y+.12,z-.27,M.steel);
  box(parent,.6,.09,.3,x,y+.08,z+.22,M.grey);
}
function chair(parent,x,z,angle=0) {
  const g=group(parent,'Cadeira');g.position.set(x,0,z);g.rotation.y=angle;
  cyl(g,.32,.09,0,.56,0,M.black,14);
  box(g,.65,.65,.09,0,.98,-.29,M.black);
  rod(g,[0,.53,0],[0,.19,0],.06,M.steel);
  for(let k=0;k<4;k++){const a=k*Math.PI/2;rod(g,[0,.19,0],[Math.cos(a)*.33,.1,Math.sin(a)*.33],.035,M.steel);}
  return g;
}
function plant(parent,x,z,scale=1) {
  const g=group(parent,'Planta');g.position.set(x,0,z);g.scale.setScalar(scale);
  cyl(g,.26,.42,0,.21,0,M.grey);
  rod(g,[0,.45,0],[0,1.35,0],.038,M.steel);
  for(let i=0;i<8;i++) {
    const a=i*Math.PI*.76;
    const leaf=new THREE.Mesh(new THREE.SphereGeometry(.20,8,6),M.plant);
    leaf.scale.set(.8,1.7,.5);leaf.position.set(Math.cos(a)*.35,.78+(i%3)*.17,Math.sin(a)*.35);g.add(leaf);
  }
  return g;
}
function lights(scene) {
  scene.add(new THREE.HemisphereLight(0xf2f6fc,0x414b56,2.45));
  const key=new THREE.DirectionalLight(0xfff6ea,2.82);
  key.position.set(-18,30,22);key.castShadow=true;
  key.shadow.mapSize.set(2048,2048);
  key.shadow.camera.left=-35;key.shadow.camera.right=35;
  key.shadow.camera.top=35;key.shadow.camera.bottom=-35;
  key.shadow.camera.far=95;key.shadow.bias=-.00015;
  scene.add(key);
  const fill=new THREE.DirectionalLight(0xc9dcf1,1.2);
  fill.position.set(20,14,-18);scene.add(fill);
}
function buildHall(scene) {
  const structure=group(scene,'Estrutura da nave');
  const roof=group(scene,'Cobertura');
  const w=LAYOUT.width,d=LAYOUT.depth,h=LAYOUT.wallHeight;
  box(structure,w,.36,d,0,-.22,0,M.foundation,false);
  box(structure,w,.14,d,0,-.035,0,M.floor,false);
  // Paredes do fundo e lateral direita
  box(structure,w,.12,.35,0,.05,-d/2,M.steel,false);
  box(structure,w,h,.28,0,h/2,-d/2,M.wall,false);
  box(structure,.28,h,d,w/2,h/2,0,M.wall,false);
  // Parede esquerda com portão verdadeiramente aberto
  const eg=LAYOUT.entrance,z=eg.z,half=eg.opening/2,wallX=-w/2;
  const before=(z-half)-(-d/2);
  const after=d/2-(z+half);
  box(structure,.28,h,before,wallX,h/2,-d/2+before/2,M.wall);
  box(structure,.28,h,after,wallX,h/2,z+half+after/2,M.wall);
  box(structure,.3,h-eg.height,eg.opening,wallX,eg.height+(h-eg.height)/2,z,M.wall);
  box(structure,.53,eg.height,.21,wallX,eg.height/2,z-half,M.steel);
  box(structure,.53,eg.height,.21,wallX,eg.height/2,z+half,M.steel);
  box(structure,.64,.45,eg.opening+.2,wallX,eg.height+.08,z,M.steel);
  for(let k=0;k<6;k++){
    const y=.6+k*.7;
    box(structure,.09,.16,.2,wallX+.23,y,z-half,M.yellow,false);
    box(structure,.09,.16,.2,wallX+.23,y,z+half,M.yellow,false);
  }
  // Parede frontal com ampla abertura de saída. Parede de corte baixa para não esconder a oficina.
  const ex=LAYOUT.exit, xl=ex.x-ex.opening/2,xr=ex.x+ex.opening/2;
  box(structure,xl+w/2,.32,.3,(-w/2+xl)/2,.16,d/2,M.steel);
  box(structure,w/2-xr,.32,.3,(w/2+xr)/2,.16,d/2,M.steel);
  for(const px of [xl,xr]){
    box(structure,.35,ex.height,.37,px,ex.height/2,d/2,M.steel);
    for(let i=0;i<6;i++)box(structure,.34,.12,.39,px,.6+i*.78,d/2,M.yellow,false);
  }
  box(structure,ex.opening,.38,.42,ex.x,ex.height,d/2,M.steel);
  // Pilares estruturais
  for(const x of [-21,-14,-7,0,7,14,21]){
    box(structure,.46,h,.48,x,h/2,-13.7,M.steel);
    box(structure,.75,.18,.8,x,.14,-13.5,M.foundation);
  }
  for(const zz of [-13.6,0,13.6]){
    box(structure,.44,h,.44,20.8,h/2,zz,M.steel);
  }
  // Treliças e perfis de cobertura; painéis leves sem tapar a vista
  for(const x of [-20,-13,-6,1,8,15,20]){
    rod(roof,[x,h,-14],[x,h+1.6,0],.075,M.steelLight);
    rod(roof,[x,h+1.6,0],[x,h,14],.075,M.steelLight);
    rod(roof,[x,h,-14],[x,h,14],.055,M.steel);
  }
  for(const z of [-13,0,13]){
    rod(roof,[-21,h+(z===0?1.6:0),z],[21,h+(z===0?1.6:0),z],.09,M.steelLight);
  }
  const roofMat=mat(0x7294a9,{transparent:true,opacity:.075,depthWrite:false,side:THREE.DoubleSide,metalness:.3});
  const roofPanel=(signZ)=>{
    const pane=box(roof,42,.07,14,0,h+.68,signZ,roofMat,false);
    pane.rotation.x=signZ<0?.113:-.113;
  };
  roofPanel(-7);roofPanel(7);
  // Lâmpadas industriais suspensas
  for(const x of [-15,-5,5,14])for(const z of [-9,1,10]){
    rod(structure,[x,7.3,z],[x,6.7,z],.025,M.steel);
    box(structure,2.0,.13,.38,x,6.64,z,M.light,false);
  }
  // Pavimento: grelha quase impercetível
  const grid=new THREE.GridHelper(42,21,0x607078,0x54616c);
  grid.position.y=.036;grid.material.opacity=.12;grid.material.transparent=true;structure.add(grid);
  // Sinalização de segurança da entrada e saída
  stripe(structure,-20.8,z-half,-18.7,z-half,.16,M.yellow);
  stripe(structure,-20.8,z+half,-18.7,z+half,.16,M.yellow);
  for(let i=0;i<8;i++)stripe(structure,xl+i*.43,13.64,xl+i*.43+.25,14.0,.12,M.yellow);
  sign(structure,'OFICINA DE VEÍCULOS PESADOS',-2.5,6.4,-13.73,9.2,.72);
  return {structure,roof};
}
function buildFlow(scene) {
  const flow=group(scene,'Percurso indicativo','flow');
  const pts=LAYOUT.route.map(p=>new THREE.Vector3(p[0],.061,p[1]));
  const curve=new THREE.CatmullRomCurve3(pts,false,'centripetal',.22);
  const geometry=new THREE.TubeGeometry(curve,105,.075,5,false);
  flow.add(new THREE.Mesh(geometry,M.yellow));
  [0.1,.28,.49,.68,.84,.95].forEach(t=>{
    const p=curve.getPoint(t),tan=curve.getTangent(t);
    flatArrow(flow,p.x,p.z,Math.atan2(tan.z,tan.x),.87);
  });
  // Eixos de referência na entrada e junto à saída sem invadir área útil.
  const entryMarkZ=LAYOUT.entrance.z-LAYOUT.entrance.opening/2;
  stripe(flow,-19.2,entryMarkZ,-15.5,entryMarkZ,.07,M.yellow);
  stripe(flow,7.2,12.9,7.2,14,.08,M.yellow);
  return flow;
}
function makeHeavy(scene) {
  const g=group(scene,'Zona de pneus pesados','heavy');
  outline(g,-14.2,-10.1,10.5,6.2);
  sign(g,'PNEUS PESADOS\nMONTAGEM',-14.0,5.0,-13.45,6.8,1.03);
  const machine = buildHeavyChanger(g,tire);
  batchMachineParts(machine);
  // armário e módulo pneumático
  box(g,1.15,1.72,.62,-10.3,.86,-12.38,M.red);
  for(let i=0;i<4;i++)box(g,.79,.04,.03,-10.3,.33+i*.35,-12.04,M.steelLight,false);
  cyl(g,.5,1.18,-11.4,.6,-9.4,M.steelLight);
  // pneus temporários
  for(let n=0;n<3;n++)tire(g,.94,.44,-11.5+n*.3,.975,-8.2+n*.5,n===1?'rib':'drive');
  return g;
}
function makeBalancing(scene) {
  const g=group(scene,'Zona de montagem e equilibragem','balance');
  outline(g,-4.35,-10.2,8.5,6.2);
  sign(g,'MONTAGEM E\nEQUILIBRAGEM',-4.2,5.0,-13.45,7.0,1.03);
  const equipment = buildBalancingEquipment(g,tire);
  equipment.forEach(batchMachineParts);
  return g;
}
function makeAlignment(scene) {
  const g=group(scene,'Zona de alinhamento','alignment');
  // Deslocar o conjunto completo (equipamentos, marcações e placa) sem alterar a geometria interna.
  g.position.x=LAYOUT.alignmentShiftX;
  outline(g,6.1,-10,8.2,6.8);
  sign(g,'ALINHAMENTO',6.2,5.0,-13.45,6.6,.9);
  const [platform, ...equipment] = buildAlignmentEquipment(g);
  // Agrupar cada pista separadamente mantém a passagem central livre.
  platform.children.filter(part=>part.isGroup).forEach(batchMachineParts);
  equipment.forEach(batchMachineParts);
  return g;
}
function rackBatch(parent,name,geometry,material,matrices,castShadow=true) {
  const mesh=new THREE.InstancedMesh(geometry,material,matrices.length);
  mesh.name=name;
  for(const [i,matrix] of matrices.entries())mesh.setMatrixAt(i,matrix);
  mesh.instanceMatrix.needsUpdate=true;
  mesh.castShadow=castShadow;
  mesh.receiveShadow=true;
  parent.add(mesh);
  return mesh;
}
function makeRack(scene) {
  const g=group(scene,'Armazenamento de pneus','rack');
  const posts=[-18,-13.2,-8.4,-3.6,1.5],z=11;
  const shelves=[.26,1.96,3.66];
  const steelParts=new Map();
  const transform=new THREE.Object3D();
  const upright=new THREE.Vector3(0,1,0);
  const noRotation=new THREE.Quaternion();
  const unitBox=new THREE.BoxGeometry(1,1,1);

  function part(material,x,y,z,width,height,depth,rotation=noRotation){
    if(!steelParts.has(material))steelParts.set(material,[]);
    transform.position.set(x,y,z);
    transform.scale.set(width,height,depth);
    transform.quaternion.copy(rotation);
    transform.updateMatrix();
    steelParts.get(material).push(transform.matrix.clone());
  }
  function brace(from,to){
    const start=new THREE.Vector3(...from),end=new THREE.Vector3(...to);
    const offset=end.clone().sub(start);
    const centre=start.lerp(end,.5);
    const rotation=new THREE.Quaternion().setFromUnitVectors(upright,offset.clone().normalize());
    part(M.steel,centre.x,centre.y,centre.z,.045,offset.length(),.055,rotation);
  }

  for(const x of posts){
    for(const side of [-1,1]){
      const edge=z+side*.67;
      part(M.rackRed,x,2.37,edge,.14,4.74,.14);
      part(M.steel,x,.035,edge,.28,.07,.25);
      for(const top of shelves){
        // Inserção e parafusos da ligação viga-montante.
        part(M.rackRed,x,top-.113,edge,.20,.24,.176);
        for(const y of [top-.058,top-.155]){
          part(M.steelLight,x,y,edge+side*.092,.04,.04,.012);
        }
      }
    }
    for(const y of [.26,1.96,3.66,4.58]){
      part(M.rackRed,x,y-.066,z,.085,.095,1.23);
    }
    brace([x,.23,z-.59],[x,2.25,z+.57]);
    brace([x,2.25,z+.57],[x,4.62,z-.59]);
  }

  const rackCentre=(posts[0]+posts.at(-1))/2;
  const tireLod=new THREE.LOD();
  tireLod.name='Pneus em stock';
  tireLod.position.set(rackCentre,2,z);
  g.add(tireLod);
  const close=group(tireLod,'Piso detalhado');
  const distant=group(tireLod,'Piso simplificado');
  tireLod.addLevel(close,0);
  tireLod.addLevel(distant,27,.12);
  const stock={rib:[],drive:[]};
  const radius=.44,width=.28;
  for(let bay=0;bay<posts.length-1;bay++){
    const left=posts[bay],right=posts[bay+1],span=right-left;
    const x=(left+right)/2;
    for(const top of shelves){
      for(const side of [-1,1]){
        part(M.rackRed,x,top-.088,z+side*.56,span-.14,.17,.12);
      }
      // Três painéis com as juntas entre os pontos de apoio dos pneus.
      const panel=(span-.16)/3;
      for(let k=0;k<3;k++){
        part(M.rackDeck,left+.08+panel*(k+.5),top-.026,z,panel-.012,.052,1.03);
      }
    }
    const rear=z-.69;
    brace([left+.08,.25,rear],[right-.08,4.59,rear]);
    brace([left+.08,4.59,rear-.04],[right-.08,.25,rear-.04]);

    const count=bay===2?4:5;
    for(const [level,top] of shelves.slice(0,2).entries()){
      for(let slot=0;slot<count;slot++){
        const scale=[.99,1,.97,1.02,1.01][(slot+bay+level)%5];
        const centreX=left+.56+slot*(span-1.12)/(count-1);
        const depthOffset=[.07,-.005,.035][(slot+bay+level)%3];
        transform.position.set(centreX-rackCentre,top+radius*scale-2,depthOffset);
        transform.scale.setScalar(scale);
        transform.quaternion.identity();
        transform.updateMatrix();
        const tread=(slot+bay+level)%2?'rib':'drive';
        const shade=[.89,.96,1][(slot+2*bay+level)%3];
        stock[tread].push({matrix:transform.matrix.clone(),shade});
      }
    }
  }

  for(const [material,matrices] of steelParts){
    rackBatch(g,'Perfis, ligações e prateleiras',unitBox,material,matrices);
  }
  for(const [tread,tires] of Object.entries(stock)){
    const {bodyGeometry,treadGeometry,distantBodyGeometry,bodyMaterial,treadMaterial}
      =createTireAssets(radius,width,tread);
    const matrices=tires.map(tire=>tire.matrix);
    const batches=[
      rackBatch(close,'Carcaças',bodyGeometry,bodyMaterial,matrices),
      rackBatch(close,'Blocos do piso',treadGeometry,treadMaterial,matrices,false),
      rackBatch(distant,'Carcaças e sulcos',distantBodyGeometry,bodyMaterial,matrices)
    ];
    const colour=new THREE.Color();
    for(const batch of batches){
      for(const [i,{shade}] of tires.entries())batch.setColorAt(i,colour.setRGB(shade,shade,shade));
      batch.instanceColor.needsUpdate=true;
    }
  }
  outline(g,-8.25,z,20.6,3.2,M.grey);
  return g;
}
function makeTruck(scene) {
  const truck=createTruck();
  truck.position.set(-7.8,0,1.5);
  truck.userData.zoneId='truck';
  scene.add(truck);
  outline(scene,-7.8,3.1,5,15.3,M.grey);
  return truck;
}
function makeLift(scene) {
  const g=group(scene,'Elevador de dois postes central','lift');
  for(const x of [1.6,5.5]){
    box(g,.48,5.1,.55,x,2.56,4.2,M.red);
    box(g,.75,.24,.95,x,.22,4.2,M.steelLight);
    box(g,.55,.35,.75,x,1.55,4.2,M.black);
    const delta=x<3?-1:1;
    rod(g,[x,1.52,4.0],[x-delta*.95,.75,2.6],.105,M.yellow);
    rod(g,[x,1.52,4.4],[x-delta*.85,.75,5.55],.105,M.yellow);
  }
  rod(g,[1.6,5.15,4.2],[5.5,5.15,4.2],.12,M.red);
  outline(g,3.55,4.2,6.9,7.3,M.grey);
  return g;
}
function makeOffice(scene) {
  const g=group(scene,'Bloco de administração','office');
  const x0=15.0,x1=20.7,front=-13.65, back=13.7;
  box(g,5.9,.18,27.45,(x0+x1)/2,.03,.025,M.wood);
  // Parede envidraçada a separar oficina e salas, com pilares/montantes
  for(const z of [-13.6,-6.7,.1,6.9,13.5])box(g,.18,5.4,.2,x0,2.7,z,M.steel);
  for(let i=0;i<4;i++){
    const z=-10.2+i*6.8;
    const pane=box(g,.035,4.0,6.5,x0,2.8,z,M.glass,false);
    pane.renderOrder=2;
    box(g,.12,.12,6.7,x0,4.8,z,M.steel);
    // faixa / puxador de porta
    box(g,.09,.38,.07,x0-.03,1.5,z+2.35,M.steelLight,false);
  }
  for(const z of [-6.8,0,6.8]){
    box(g,5.6,3.9,.055,(x0+x1)/2,2.75,z,M.glass,false);
    box(g,5.6,.1,.14,(x0+x1)/2,4.75,z,M.steel);
  }
  // balneários
  for(let i=0;i<4;i++){
    const xx=16.0+(i%2)*1.1,zz=-12.4+Math.floor(i/2)*1.5;
    box(g,.85,2.4,.65,xx,1.22,zz,M.steelLight);
    box(g,.2,.14,.03,xx,1.6,zz+.335,M.black,false);
  }
  box(g,2.7,.46,.65,18.8,.46,-9.9,M.wood);
  sign(g,'BALNEÁRIOS',17.9,5.45,-13.12,4.6,.67);
  // receção e espera
  desk(g,18.35,1.02,-3.9,2.9);
  box(g,1.7,.4,.85,16.65,.42,-1.6,M.red);
  box(g,1.65,.7,.23,16.65,.92,-1.96,M.red);
  plant(g,20.1,-.8,.82);
  sign(g,'RECEÇÃO / ESPERA',17.9,5.45,-6.68,4.6,.68);
  // reuniões
  cyl(g,1.38,.18,18.0,1.25,3.0,M.wood,24);
  cyl(g,.15,1.2,18.0,.61,3.0,M.steel);
  for(let i=0;i<5;i++){
    const a=i*Math.PI*2/5;chair(g,18.0+Math.cos(a)*1.9,3+Math.sin(a)*1.9,a+Math.PI/2);
  }
  plant(g,20.3,5.7,.8);
  sign(g,'SALA DE REUNIÕES',17.9,5.45,.12,4.8,.68);
  // escritório
  desk(g,17.6,1.0,9.4,2.6);desk(g,18.6,1.0,11.9,2.4);
  chair(g,17.8,10.5,Math.PI);chair(g,18.4,12.9,Math.PI);
  plant(g,20.2,7.8,.8);
  sign(g,'ESCRITÓRIO',17.9,5.45,6.92,4.6,.68);
  return g;
}
function wallPosters(scene) {
  const g=group(scene,'Sinalização');
  for(const z of [-9,-3,4,10]){
    box(g,.035,1.02,1.28,-20.78,3.8,z,M.signage,false);
  }
  // Faixas de proteção junto da zona de saída
  stripe(g,6.7,13.32,6.7,14,.16,M.yellow);
  stripe(g,14.2,13.32,14.2,14,.16,M.yellow);
  // Piso despejado de propósito (sem 3 caixas de estacionamento).
  return g;
}
export function createWorkshop() {
  const scene=new THREE.Scene();
  scene.background=new THREE.Color(0x0d1823);
  scene.fog=new THREE.Fog(0x101922,80,160);
  lights(scene);
  const base=buildHall(scene);
  const flow=buildFlow(scene);
  const elements=[
    makeHeavy(scene),makeBalancing(scene),makeAlignment(scene),
    makeTruck(scene),makeLift(scene),makeRack(scene),makeOffice(scene)
  ];
  wallPosters(scene);
  const groups=new Map();
  scene.traverse(object=>{if(object.userData.zoneId)groups.set(object.userData.zoneId,object);});
  return {scene,structure:base.structure,roof:base.roof,flow,truck:groups.get('truck'),groups,elements,zoneData:ZONES};
}
