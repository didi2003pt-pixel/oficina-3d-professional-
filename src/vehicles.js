import * as THREE from 'three';
import { P, assembly, batchMachineParts, link, panel, round } from './machine-parts.js';
import { createTireAssets } from './tires.js';
import { createTruck } from './truck.js';

export const VEHICLE_TYPES = Object.freeze({
  truck: { name: 'Camião', description: 'Veículo pesado com caixa de carga e cabine dianteira.' },
  jeep: { name: 'Jipe', description: 'Todo-o-terreno de carroçaria alta, com proteções, barras de tejadilho e pneus de piso marcado.' },
  car: { name: 'Carro ligeiro', description: 'Automóvel de passageiros com carroçaria baixa, tejadilho inclinado e quatro rodas.' },
  tractor: { name: 'Trator', description: 'Trator agrícola com cabine elevada, ligação traseira e rodas traseiras maiores.' }
});

const finish = (color, roughness, metalness = .12) =>
  new THREE.MeshStandardMaterial({ color, roughness, metalness });
const M = {
  jeep: finish(0x337f82, .36, .33),
  car: finish(0xc89451, .29, .4),
  tractor: finish(0xc85627, .44, .26),
  glass: finish(0x416374, .23, .38),
  roof: finish(0xd8d5c4, .49),
  light: new THREE.MeshStandardMaterial({ color: 0xe7eff8, emissive: 0xc9e4ff, emissiveIntensity: .35 }),
  tail: new THREE.MeshStandardMaterial({ color: 0xb92a29, emissive: 0xbb1825, emissiveIntensity: .25 })
};
const vertical = new THREE.Vector3(0, 1, 0);

function solid(parent, name, geometry, material, castShadow = true) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = name;
  mesh.castShadow = castShadow;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

// Secções em X/Y ao longo de Z formam os chanfros e deixam espaço para as rodas.
function hull(parent, name, sections, material, arches = []) {
  const knots = new Set(sections.map(([z]) => z));
  for (const axle of arches) {
    for (const offset of [-1, -.92, -.75, -.5, 0, .5, .75, .92, 1]) {
      knots.add(axle.z + axle.clearance * offset);
    }
  }
  const positions = [];
  const indices = [];
  const ordered = [...knots].sort((a, b) => a - b);
  for (const [i, z] of ordered.entries()) {
    const end = sections.findIndex(section => section[0] >= z);
    const left = sections[Math.max(end - 1, 0)];
    const right = sections[end];
    const factor = end > 0 ? (z - left[0]) / (right[0] - left[0]) : 0;
    const [w, sill, shoulder, top] = left.slice(1).map((value, n) => THREE.MathUtils.lerp(value, right[n + 1], factor));
    const bottom = arches.reduce((height, axle) => {
      const square = axle.clearance ** 2 - (z - axle.z) ** 2;
      return square > 0 ? Math.max(height, axle.radius + Math.sqrt(square)) : height;
    }, sill);
    const contour = [
      [-w * .82, bottom], [w * .82, bottom], [w, bottom + .035], [w, shoulder],
      [w * .84, top], [-w * .84, top], [-w, shoulder], [-w, bottom + .035]
    ];
    for (const [x, y] of contour) positions.push(x, y, z);
    if (i === 0) continue;
    for (let vertex = 0; vertex < 8; vertex++) {
      const a = (i - 1) * 8 + vertex;
      const b = (i - 1) * 8 + (vertex + 1) % 8;
      indices.push(a, b, a + 8, b, b + 8, a + 8);
    }
  }
  for (const [section, normal] of [[0, -1], [ordered.length - 1, 1]]) {
    const cap = positions.length / 3;
    positions.push(...positions.slice(section * 24, section * 24 + 24));
    for (let corner = 1; corner < 7; corner++) {
      const triangle = [cap, cap + corner, cap + corner + 1];
      if (normal < 0) triangle.reverse();
      indices.push(...triangle);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return solid(parent, name, geometry, material);
}

function surface(parent, name, points, outward, material) {
  const [a, b, c] = points.map(point => new THREE.Vector3(...point));
  const facing = b.sub(a).cross(c.sub(a)).dot(new THREE.Vector3(...outward));
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(points.flat(), 3));
  geometry.setIndex(facing < 0 ? [2, 1, 0, 3, 2, 0] : [0, 1, 2, 0, 2, 3]);
  geometry.computeVertexNormals();
  return solid(parent, name, geometry, material, false);
}

function pillar(parent, start, end, material) {
  const base = new THREE.Vector3(...start);
  const tip = new THREE.Vector3(...end);
  const direction = tip.clone().sub(base);
  const center = base.lerp(tip, .5);
  const frame = panel(parent, 'Pilar da cabine', .075, direction.length() + .055, .085, ...center, material, .018);
  frame.quaternion.setFromUnitVectors(vertical, direction.normalize());
}

function cabin(parent, lowerRear, lowerFront, upperRear, upperFront, paint, roofPaint = paint) {
  const at = ([z, y, width], side) => [width * side, y, z];
  const ends = (lower, upper) => [at(lower, -1), at(lower, 1), at(upper, 1), at(upper, -1)];
  surface(parent, 'Para-brisas', ends(lowerFront, upperFront), [0, 0, 1], M.glass);
  surface(parent, 'Vidro traseiro', ends(lowerRear, upperRear), [0, 0, -1], M.glass);
  for (const side of [-1, 1]) {
    surface(parent, 'Vidros laterais', [at(lowerRear, side), at(lowerFront, side), at(upperFront, side), at(upperRear, side)], [side, 0, 0], M.glass);
    pillar(parent, at(lowerRear, side), at(upperRear, side), paint);
    pillar(parent, at(lowerFront, side), at(upperFront, side), paint);
    const middle = (rear, front) => rear.map((value, i) => THREE.MathUtils.lerp(value, front[i], .52));
    pillar(parent, at(middle(lowerRear, lowerFront), side), at(middle(upperRear, upperFront), side), paint);
  }
  const [rearZ, height, rearWidth] = upperRear;
  const [frontZ, , frontWidth] = upperFront;
  hull(parent, 'Tejadilho', [
    [rearZ - .055, rearWidth * .96, height - .038, height + .003, height + .038],
    [rearZ + .065, rearWidth + .048, height - .045, height + .035, height + .078],
    [frontZ - .065, frontWidth + .048, height - .045, height + .035, height + .078],
    [frontZ + .065, frontWidth * .96, height - .038, height + .003, height + .038]
  ], roofPaint);
}

function wheels(parent, spec, rimMaterial = P.steel) {
  const { z, radius, width, track, tread } = spec;
  const assets = createTireAssets(radius, width, tread);
  const lod = new THREE.LOD();
  lod.name = 'Pneus e piso';
  parent.add(lod);
  const detailed = new THREE.Group();
  const distant = new THREE.Group();
  const meshes = [
    [detailed, assets.bodyGeometry, assets.bodyMaterial, true],
    [detailed, assets.treadGeometry, assets.treadMaterial, false],
    [distant, assets.distantBodyGeometry, assets.bodyMaterial, true]
  ];
  for (const [group, geometry, material, castShadow] of meshes) {
    const tires = new THREE.InstancedMesh(geometry, material, z.length * 2);
    let i = 0;
    for (const axle of z) {
      for (const side of [-1, 1]) {
        const matrix = new THREE.Matrix4().makeRotationY(side * Math.PI / 2);
        tires.setMatrixAt(i++, matrix.setPosition(side * track, radius, axle));
      }
    }
    tires.instanceMatrix.needsUpdate = true;
    tires.castShadow = castShadow;
    tires.receiveShadow = true;
    group.add(tires);
  }
  lod.addLevel(detailed, 0);
  lod.addLevel(distant, 23, .12);
  for (const axle of z) {
    link(parent, 'Eixo', [-track, radius, axle], [track, radius, axle], radius * .18, P.black);
    for (const side of [-1, 1]) {
      const outer = side * (track + width * .4 - .004);
      round(parent, 'Jante da roda', radius * .634, width * .80, side * track, radius, axle, rimMaterial, 'x', 20);
      round(parent, 'Disco da jante', radius * .48, .029, outer, radius, axle, P.darkSteel, 'x', 18);
      round(parent, 'Cubo da roda', radius * .23, .055, outer + side * .015, radius, axle, rimMaterial, 'x', 14);
    }
  }
}

function jeep(vehicle) {
  const axle = { z: [-1.35, 1.24], radius: .385, width: .255, track: .81, tread: 'drive' };
  const arches = axle.z.map(z => ({ z, radius: axle.radius, clearance: .43 }));
  const shell = [
    [-2.18,.82,.51,.99,1.11], [-2.02,.91,.48,1.11,1.24], [-1.5,.945,.47,1.13,1.27],
    [-.75,.94,.46,1.13,1.26], [.65,.94,.46,1.13,1.25], [1.24,.94,.47,1.09,1.21],
    [1.91,.91,.49,1.035,1.16], [2.18,.855,.54,.985,1.08]
  ];
  panel(vehicle, 'Longarinas e piso', 1.29,.26,4.12,0,.468,-.02,P.black,.07);
  hull(vehicle, 'Carroçaria todo-o-terreno', shell, M.jeep, arches);
  cabin(vehicle, [-1.91,1.20,.871], [.90,1.218,.84], [-1.78,1.92,.786], [.52,1.92,.775], M.jeep, P.black);
  for (const side of [-1, 1]) {
    panel(vehicle, 'Estribo lateral', .122,.13,1.72,side*.915,.456,-.10,P.black);
    panel(vehicle, 'Friso de proteção', .040,.101,1.50,side*.946,.765,-.19,P.darkSteel);
    panel(vehicle, 'Barras do tejadilho', .055,.065,1.92,side*.61,2.052,-.585,P.darkSteel);
    for (const z of [-1.41,.22]) panel(vehicle, 'Apoio da barra', .078,.085,.087,side*.61,2.000,z,P.black);
    link(vehicle, 'Suporte do espelho', [side*.815,1.342,.685], [side*.916,1.375,.64], .026, P.black);
    panel(vehicle, 'Espelho lateral', .133,.144,.20,side*.918,1.376,.64,P.black,.037);
    panel(vehicle, 'Farol dianteiro', .305,.138,.091,side*.614,.937,2.155,M.light,.030);
    panel(vehicle, 'Farolim traseiro', .20,.182,.078,side*.662,.912,-2.165,M.tail,.021);
  }
  panel(vehicle, 'Grelha de entrada de ar', .756,.233,.087,0,.891,2.161,P.black,.024);
  for (const x of [-.254,-.127,0,.127,.254]) panel(vehicle, 'Aleta da grelha', .034,.158,.018,x,.892,2.207,P.steel,.007);
  panel(vehicle, 'Para-choques dianteiro', 1.72,.172,.144,0,.598,2.166,P.darkSteel,.055);
  panel(vehicle, 'Para-choques traseiro', 1.68,.177,.167,0,.599,-2.15,P.darkSteel,.048);
  wheels(vehicle, axle, P.lightSteel);
}

function car(vehicle) {
  const axle = { z: [-1.32, 1.34], radius: .326, width: .225, track: .786, tread: 'rib' };
  const arches = axle.z.map(z => ({ z, radius: axle.radius, clearance: .37 }));
  const shell = [
    [-2.17,.77,.33,.64,.768], [-1.96,.877,.31,.72,.869], [-1.6,.912,.28,.76,.92],
    [-.85,.914,.275,.80,.963], [.75,.915,.275,.81,.965], [1.32,.908,.28,.75,.895],
    [1.95,.84,.32,.665,.762], [2.17,.74,.356,.60,.687]
  ];
  panel(vehicle, 'Plataforma inferior', 1.26,.23,4.05,0,.348,0,P.black,.077);
  hull(vehicle, 'Carroçaria de passageiros', shell, M.car, arches);
  cabin(vehicle, [-1.73,.787,.781], [1.03,.861,.788], [-.735,1.421,.674], [.457,1.421,.665], M.car);
  for (const side of [-1, 1]) {
    panel(vehicle, 'Soleira lateral', .082,.082,1.67,side*.867,.319,0,P.darkSteel,.025);
    link(vehicle, 'Suporte do espelho', [side*.757,.957,.733], [side*.885,.993,.695], .023, P.darkSteel);
    panel(vehicle, 'Espelho lateral', .138,.108,.212,side*.887,.993,.695,M.car,.027);
    panel(vehicle, 'Puxador da porta', .041,.029,.183,side*.916,.795,-.337,P.darkSteel);
    surface(vehicle, 'Ótica dianteira', [
      [side*.69,.612,2.177], [side*.408,.617,2.177], [side*.454,.666,2.177], [side*.671,.656,2.177]
    ], [0,0,1], M.light);
    surface(vehicle, 'Farolim traseiro afilado', [
      [side*.413,.661,-2.177], [side*.728,.652,-2.177], [side*.696,.691,-2.177], [side*.438,.714,-2.177]
    ], [0,0,-1], M.tail);
  }
  panel(vehicle, 'Entrada de ar dianteira', 1.26,.125,.11,0,.466,2.128,P.black,.037);
  panel(vehicle, 'Difusor traseiro', 1.42,.142,.142,0,.426,-2.142,P.darkSteel,.044);
  wheels(vehicle, axle, P.lightSteel);
}

function tractor(vehicle) {
  panel(vehicle, 'Chassis do trator', 1.18,.37,3.92,0,.704,-.065,P.black,.065);
  hull(vehicle, 'Capô do motor', [
    [-.35,.62,.76,1.48,1.69], [.185,.61,.77,1.56,1.78], [1.24,.535,.76,1.49,1.73],
    [1.95,.474,.755,1.37,1.57], [2.11,.425,.80,1.28,1.465]
  ], M.tractor);
  panel(vehicle, 'Piso da cabine', 1.48,.24,1.97,0,1.191,-.91,M.tractor,.065);
  cabin(vehicle, [-1.82,1.31,.711], [.055,1.31,.71], [-1.74,2.534,.654], [-.04,2.534,.658], P.darkSteel, M.roof);
  panel(vehicle, 'Contrapeso frontal', 1.03,.33,.35,0,.68,2.122,P.darkSteel,.066);
  panel(vehicle, 'Grelha frontal', .775,.56,.085,0,1.07,2.101,P.black,.043);
  for (const y of [.90,.98,1.06,1.14,1.22]) panel(vehicle, 'Aleta do radiador', .625,.023,.028,0,y,2.150,P.steel,.006);
  const rear = { z: [-1.075], radius: .78, width: .396, track: .968, tread: 'drive' };
  const front = { z: [1.428], radius: .459, width: .252, track: .745, tread: 'drive' };
  for (const side of [-1,1]) {
    panel(vehicle, 'Farol frontal', .225,.082,.065,side*.249,1.361,2.108,M.light,.025);
    panel(vehicle, 'Guarda-lamas traseiro', .48,.115,1.56,side*.897,1.629,-1.087,M.tractor,.041);
    panel(vehicle, 'Farolim junto do guarda-lamas', .168,.116,.076,side*.938,1.622,-1.855,M.tail,.026);
    panel(vehicle, 'Degrau superior', .26,.073,.341,side*.758,1.051,.04,P.darkSteel);
    panel(vehicle, 'Degrau inferior', .297,.073,.348,side*.817,.743,.062,P.darkSteel);
    link(vehicle, 'Suporte dos degraus', [side*.688,1.213,.126], [side*.803,.733,.126], .041,P.black);
    link(vehicle, 'Braço da ligação traseira', [side*.37,.856,-1.56], [side*.429,.545,-2.25], .058,P.steel);
    link(vehicle, 'Suporte do espelho', [side*.675,2.011,.021], [side*.773,2.05,.046], .031, P.black);
    panel(vehicle, 'Retrovisor da cabine', .129,.24,.197,side*.775,2.05,.046,P.black,.026);
  }
  round(vehicle, 'Tubo de escape', .055,.761,.443,1.703,.54,P.darkSteel);
  round(vehicle, 'Curva de proteção do escape', .081,.054,.443,2.100,.54,P.black);
  round(vehicle, 'Travessa da ligação traseira', .055,.99,0,.55,-2.25,P.steel,'x',12);
  wheels(vehicle, rear, M.roof);
  wheels(vehicle, front, M.roof);
}

const MODEL_BUILDERS = new Map([['jeep', jeep], ['car', car], ['tractor', tractor]]);

// Modelos independentes, centrados à altura do pavimento e com frente no eixo local +Z.
export function createVehicleModel(type) {
  if (type === 'truck') return createTruck();
  const build = MODEL_BUILDERS.get(type);
  if (!build) return null;
  const vehicle = new THREE.Group();
  vehicle.name = VEHICLE_TYPES[type].name;
  build(vehicle);
  batchMachineParts(vehicle);
  return vehicle;
}
