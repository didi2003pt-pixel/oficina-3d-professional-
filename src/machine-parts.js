import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const finish = (color, roughness, metalness = 0) =>
  new THREE.MeshStandardMaterial({ color, roughness, metalness });

export const P = {
  red: finish(0xbc222b, .39, .28),
  steel: finish(0x7d8c98, .36, .66),
  darkSteel: finish(0x3a4954, .46, .51),
  black: finish(0x202831, .52, .12),
  rubber: finish(0x141a20, .84),
  yellow: finish(0xdbaa35, .47, .2),
  lightSteel: finish(0xbac5cd, .29, .71),
  green: finish(0x46ba87, .4),
  amber: finish(0xdc7039, .44)
};

const shapes = new Map();
const staticParts = new WeakSet();
const up = new THREE.Vector3(0, 1, 0);
const screenMaterials = new Map();

export function assembly(parent, name, x = 0, y = 0, z = 0) {
  const group = new THREE.Group();
  group.name = name;
  group.position.set(x, y, z);
  parent.add(group);
  return group;
}

function geometry(key, build) {
  if (!shapes.has(key)) shapes.set(key, build());
  return shapes.get(key);
}

function solid(parent, name, shape, material, x, y, z, castShadow) {
  const mesh = new THREE.Mesh(shape, material);
  mesh.name = name;
  mesh.position.set(x, y, z);
  mesh.castShadow = castShadow;
  mesh.receiveShadow = true;
  parent.add(mesh);
  staticParts.add(mesh);
  return mesh;
}

export function panel(parent, name, w, h, d, x, y, z, material = P.red, radius = .025) {
  const bevel = Math.min(radius, Math.min(w, h, d) * .42);
  const shape = geometry(`panel:${w}:${h}:${d}:${bevel}`, () => bevel > 0
    ? new RoundedBoxGeometry(w, h, d, 1, bevel)
    : new THREE.BoxGeometry(w, h, d));
  return solid(parent, name, shape, material, x, y, z, Math.min(w, h, d) >= .065);
}

export function round(parent, name, radius, length, x, y, z, material = P.steel, axis = 'y', sides = 20) {
  const shape = geometry(`cylinder:${radius}:${length}:${sides}`, () =>
    new THREE.CylinderGeometry(radius, radius, length, sides));
  const mesh = solid(parent, name, shape, material, x, y, z, radius >= .055 && length >= .075);
  if (axis === 'x') mesh.rotation.z = Math.PI / 2;
  if (axis === 'z') mesh.rotation.x = Math.PI / 2;
  return mesh;
}

export function link(parent, name, from, to, radius, material = P.steel, sides = 12) {
  const start = new THREE.Vector3(...from);
  const end = new THREE.Vector3(...to);
  const direction = end.clone().sub(start);
  const center = start.lerp(end, .5);
  const mesh = round(parent, name, radius, direction.length(), ...center, material, 'y', sides);
  mesh.quaternion.setFromUnitVectors(up, direction.normalize());
  return mesh;
}

export function hose(parent, name, points, radius = .023, material = P.rubber) {
  const path = new THREE.CatmullRomCurve3(points.map(point => new THREE.Vector3(...point)));
  const shape = new THREE.TubeGeometry(path, Math.max(10, points.length * 3), radius, 6, false);
  return solid(parent, name, shape, material, 0, 0, 0, false);
}

export function fasteners(parent, name, positions, radius = .04, length = .025, material = P.lightSteel, axis = 'y') {
  const shape = geometry(`cylinder:${radius}:${length}:6`, () =>
    new THREE.CylinderGeometry(radius, radius, length, 6));
  const mesh = new THREE.InstancedMesh(shape, material, positions.length);
  const transform = new THREE.Matrix4();
  if (axis === 'x') transform.makeRotationZ(Math.PI / 2);
  if (axis === 'z') transform.makeRotationX(Math.PI / 2);
  positions.forEach(([x, y, z], i) => mesh.setMatrixAt(i, transform.setPosition(x, y, z)));
  mesh.name = name;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function makeScreen(kind) {
  const canvas = document.createElement('canvas');
  canvas.width = 320;
  canvas.height = 192;
  const ctx = canvas.getContext('2d');
  const ink = '#b2d8e3';
  const mint = '#68cdb9';

  ctx.fillStyle = '#142633';
  ctx.fillRect(0, 0, 320, 192);
  ctx.fillStyle = '#203c4b';
  ctx.fillRect(0, 0, 320, 36);
  ctx.fillStyle = ink;
  ctx.font = 'bold 18px sans-serif';
  const titles = { heavy: 'COMANDOS', balance: 'EQUILIBRAGEM', alignment: 'ALINHAMENTO' };
  ctx.fillText(titles[kind], 16, 25);
  ctx.fillStyle = mint;
  ctx.beginPath();
  ctx.arc(294, 18, 5, 0, 2 * Math.PI);
  ctx.fill();

  if (kind === 'alignment') {
    ctx.strokeStyle = '#517887';
    ctx.lineWidth = 2;
    ctx.strokeRect(120, 54, 80, 105);
    ctx.fillRect(155, 52, 10, 110);
    for (const y of [68, 124]) {
      ctx.fillRect(107, y + 12, 106, 3);
      ctx.strokeRect(99, y, 15, 28);
      ctx.strokeRect(206, y, 15, 28);
    }
    ctx.font = '18px monospace';
    ctx.fillText('0.06°', 22, 88);
    ctx.fillText('0.04°', 232, 88);
    ctx.fillText('0.02°', 22, 144);
    ctx.fillText('0.03°', 232, 144);
  } else if (kind === 'balance') {
    ctx.strokeStyle = '#668f9f';
    ctx.lineWidth = 3;
    for (const radius of [31, 18]) {
      ctx.beginPath();
      ctx.arc(160, 111, radius, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.fillRect(155, 104, 10, 14);
    ctx.font = 'bold 31px monospace';
    ctx.fillText('05', 36, 115);
    ctx.fillText('10', 226, 115);
    ctx.font = '13px sans-serif';
    ctx.fillText('INT.  g', 35, 142);
    ctx.fillText('EXT.  g', 226, 142);
  } else {
    ctx.font = 'bold 26px sans-serif';
    ctx.fillText('PRONTO', 20, 105);
    ctx.fillStyle = '#294856';
    ctx.fillRect(20, 124, 278, 12);
    ctx.fillStyle = mint;
    ctx.fillRect(20, 124, 187, 12);
  }
  ctx.fillStyle = '#3d616f';
  ctx.fillRect(15, 172, 290, 2);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return new THREE.MeshStandardMaterial({
    map: texture, roughness: .34, emissive: 0xb5e3ed,
    emissiveMap: texture, emissiveIntensity: .5
  });
}

export function display(parent, name, width, height, x, y, z, kind) {
  if (!screenMaterials.has(kind)) screenMaterials.set(kind, makeScreen(kind));
  const shape = geometry(`screen:${width}:${height}`, () => new THREE.PlaneGeometry(width, height));
  const mesh = new THREE.Mesh(shape, screenMaterials.get(kind));
  mesh.name = name;
  mesh.position.set(x, y, z);
  parent.add(mesh);
  return mesh;
}

// As peças estáticas partilham lotes por acabamento dentro de cada equipamento.
// Pneus com LOD, instâncias, ecrãs e os grupos principais mantêm a sua hierarquia.
export function batchMachineParts(machine) {
  machine.updateMatrixWorld(true);
  const inverse = machine.matrixWorld.clone().invert();
  const finishes = new Map();
  machine.traverse(mesh => {
    if (!staticParts.has(mesh)) return;
    const key = `${mesh.material.id}:${mesh.castShadow}`;
    if (!finishes.has(key)) finishes.set(key, []);
    finishes.get(key).push(mesh);
  });

  for (const parts of finishes.values()) {
    if (parts.length < 3) continue;
    const shapes = parts.map(part => {
      const shape = part.geometry.index ? part.geometry.toNonIndexed() : part.geometry.clone();
      return shape.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inverse, part.matrixWorld));
    });
    const merged = mergeGeometries(shapes);
    shapes.forEach(shape => shape.dispose());
    const batch = new THREE.Mesh(merged, parts[0].material);
    batch.name = 'Peças por acabamento';
    batch.castShadow = parts[0].castShadow;
    batch.receiveShadow = true;
    parts.forEach(part => part.removeFromParent());
    machine.add(batch);
  }
}
