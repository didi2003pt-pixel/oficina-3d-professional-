import * as THREE from 'three';
import { assembly, batchMachineParts, fasteners } from './machine-parts.js';
import { createTireAssets } from './tires.js';
import { buildTruckCab } from './truck-cab.js';
import { buildTruckCargo, buildTruckChassis } from './truck-body.js';

const radius = .64;
const tireWidth = .32;
const wheelCenters = { x: 1.5, y: .035 + radius, z: [-3.65, -2.35, 4.85, 6.9] };
const tire = createTireAssets(radius, tireWidth, 'drive');
const material = (color, roughness, metalness) => new THREE.MeshStandardMaterial({ color, roughness, metalness });

const materials = {
  white: material(0xe6ebee, .34, .13),
  whiteTrim: material(0xc4cfd6, .47, .28),
  steel: material(0x9aadb8, .35, .63),
  darkSteel: material(0x424d57, .52, .42),
  black: material(0x253039, .57, .13),
  rubber: material(0x1d242b, .87, 0),
  glass: material(0x294c61, .23, .24),
  light: material(0xdbe9ef, .25, .28),
  red: material(0xb22925, .32, .13),
  amber: material(0xd28a3a, .31, .14)
};

const rimProfile = new THREE.LatheGeometry([
  [.354,-.123], [.395,-.123], [.408,-.102], [.402,-.08], [.4,.087],
  [.409,.116], [.403,.137], [.38,.14], [.365,.124], [.354,.087], [.354,-.123]
].map(([r,z]) => new THREE.Vector2(r,z)), 32);
rimProfile.rotateX(Math.PI/2);

function ventedDisc() {
  const shape = new THREE.Shape();
  shape.absarc(0,0,.367,0,Math.PI*2,false);
  for (let i=0; i<8; i++) {
    const angle = i*Math.PI/4;
    const hole = new THREE.Path();
    hole.absellipse(.267*Math.cos(angle),.267*Math.sin(angle),.036,.057,
      0,Math.PI*2,true,angle);
    shape.holes.push(hole);
  }
  return new THREE.ShapeGeometry(shape, 7);
}

const disc = ventedDisc();
const distantRim = new THREE.CylinderGeometry(.405,.395,.12,16).rotateX(Math.PI/2);
const hub = new THREE.CylinderGeometry(.147,.173,.104,16).rotateX(Math.PI/2);
const hubCap = new THREE.CylinderGeometry(.083,.094,.033,12).rotateX(Math.PI/2);
const lugPositions = Array.from({length:8},(_,i)=>{
  const angle = (i+.5)*Math.PI/4;
  return [.113*Math.cos(angle),.113*Math.sin(angle),.166];
});

function mesh(parent, name, geometry, finish, castShadow = false) {
  const part = new THREE.Mesh(geometry, finish);
  part.name = name;
  part.castShadow = castShadow;
  part.receiveShadow = true;
  parent.add(part);
  return part;
}

function addWheel(parent, x, z) {
  const wheel = assembly(parent,'Roda',x,wheelCenters.y,z);
  wheel.rotation.y = Math.sign(x)*Math.PI/2;

  const lod = new THREE.LOD();
  lod.name = 'Pneu com nível de detalhe';
  wheel.add(lod);
  const detailed = new THREE.Group();
  mesh(detailed,'Carcaça do pneu',tire.bodyGeometry,tire.bodyMaterial,true);
  mesh(detailed,'Piso do pneu',tire.treadGeometry,tire.treadMaterial);
  mesh(detailed,'Rebordo da jante',rimProfile,materials.steel);
  mesh(detailed,'Disco ventilado',disc,materials.steel).position.z = .122;
  mesh(detailed,'Cubo da roda',hub,materials.darkSteel).position.z = .117;
  fasteners(detailed,'Porcas da roda',lugPositions,.019,.020,materials.steel,'z');
  mesh(detailed,'Tampa do cubo',hubCap,materials.steel).position.z = .173;

  const distant = new THREE.Group();
  mesh(distant,'Carcaça simplificada',tire.distantBodyGeometry,tire.bodyMaterial,true);
  mesh(distant,'Jante simplificada',distantRim,materials.steel).position.z = .064;
  mesh(distant,'Cubo',hub,materials.darkSteel).position.z = .117;
  lod.addLevel(detailed,0);
  lod.addLevel(distant,24,.12);
}

export function createTruck() {
  const truck = new THREE.Group();
  truck.name = 'Camião de caixa';
  const chassis = buildTruckChassis(truck, materials);
  const cargo = buildTruckCargo(truck, materials);
  batchMachineParts(chassis);
  batchMachineParts(cargo);
  buildTruckCab(truck, materials);
  const wheels = assembly(truck,'Rodas e jantes');
  for (const z of wheelCenters.z) {
    for (const x of [-wheelCenters.x,wheelCenters.x]) addWheel(wheels,x,z);
  }
  return truck;
}
