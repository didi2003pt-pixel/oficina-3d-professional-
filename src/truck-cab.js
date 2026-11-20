import * as THREE from 'three';
import { assembly, batchMachineParts, hose, link, panel } from './machine-parts.js';

// Secções horizontais [altura, meia largura, traseira, frente, raio dos cantos].
const sections = [
  [1.22, 1.18, 4.06, 7.74, .20],
  [1.34, 1.28, 3.99, 7.88, .20],
  [1.48, 1.32, 3.95, 7.94, .20],
  [2.09, 1.32, 3.95, 7.93, .21],
  [2.23, 1.32, 3.96, 7.87, .22],
  [2.30, 1.31, 3.97, 7.83, .22],
  [3.06, 1.24, 4.05, 7.46, .22],
  [3.17, 1.19, 4.11, 7.40, .24],
  [3.27, 1.13, 4.17, 7.30, .24],
  [3.32, 1.08, 4.21, 7.24, .24]
];

function addMesh(parent, name, positions, indices, material, castShadow = false) {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = name;
  mesh.castShadow = castShadow;
  mesh.receiveShadow = true;
  parent.add(mesh);
}

function addCabShell(parent, material) {
  const positions = [];
  const indices = [];
  const corners = [[1, 1], [-1, 1], [-1, -1], [1, -1]];
  const segments = 4;
  const ringSize = corners.length * (segments + 1);

  for (const [y, width, back, front, radius] of sections) {
    for (const [corner, [side, facing]] of corners.entries()) {
      const cx = side * (width - radius);
      const cz = facing === 1 ? front - radius : back + radius;
      for (let i = 0; i <= segments; i++) {
        const angle = (corner + i / segments) * Math.PI / 2;
        positions.push(cx + radius * Math.cos(angle), y, cz + radius * Math.sin(angle));
      }
    }
  }
  for (let ring = 0; ring < sections.length - 1; ring++) {
    for (let i = 0; i < ringSize; i++) {
      const a = ring * ringSize + i;
      const b = ring * ringSize + (i + 1) % ringSize;
      indices.push(a, a + ringSize, b, b, a + ringSize, b + ringSize);
    }
  }
  const top = (sections.length - 1) * ringSize;
  for (let i = 1; i < ringSize - 1; i++) {
    indices.push(0, i, i + 1, top, top + i + 1, top + i);
  }
  addMesh(parent, 'Carroçaria moldada da cabine', positions, indices, material, true);
}

function profileAt(y) {
  const next = sections.findIndex(([height]) => y <= height);
  const upperIndex = next < 0 ? sections.length - 1 : next;
  const upper = sections[upperIndex];
  const lower = sections[Math.max(0, upperIndex - 1)];
  const t = upper === lower ? 0 : THREE.MathUtils.clamp((y - lower[0]) / (upper[0] - lower[0]), 0, 1);
  return lower.slice(1).map((value, i) => THREE.MathUtils.lerp(value, upper[i + 1], t));
}

function frontFace(x, y, depth) {
  const [width, , front, radius] = profileAt(y);
  const corner = Math.max(0, Math.abs(x) - width + radius);
  const z = front - radius + Math.sqrt(Math.max(0, radius ** 2 - corner ** 2));
  return [x, y, z + depth];
}

function sideFace(side, z, y, depth) {
  const [width, back, front, radius] = profileAt(y);
  const corner = Math.max(0, z - front + radius, back + radius - z);
  const x = width - radius + Math.sqrt(Math.max(0, radius ** 2 - corner ** 2));
  return [side * (x + depth), y, z];
}

function face(parent, name, points, direction, material) {
  const [origin, second, third] = points.map(point => new THREE.Vector3(...point));
  const normal = second.sub(origin).cross(third.sub(origin));
  const reverse = normal.dot(new THREE.Vector3(...direction)) < 0;
  const indices = [];
  for (let i = 1; i < points.length - 1; i++) {
    indices.push(...(reverse ? [0, i + 1, i] : [0, i, i + 1]));
  }
  addMesh(parent, name, points.flat(), indices, material);
}

function addFront(parent, M) {
  const front = (name, polygon, depth, material) => face(parent, name,
    polygon.map(([x, y]) => frontFace(x, y, depth)), [0, 0, 1], material);

  front('Moldura do para-brisas', [[-1.06, 2.36], [1.06, 2.36], [1.00, 3.03], [-1.00, 3.03]], .010, M.black);
  front('Para-brisas inclinado', [[-1.018, 2.397], [1.018, 2.397], [.965, 2.998], [-.965, 2.998]], .017, M.glass);
  for (const x of [-.47, .47]) {
    const arm = frontFace(x + .13, 2.405, .025);
    const pivot = frontFace(x - .15, 2.53, .025);
    link(parent, 'Braço do limpa-vidros', arm, pivot, .013, M.black, 8);
    link(parent, 'Escova do limpa-vidros', frontFace(x - .32, 2.56, .029), frontFace(x + .03, 2.51, .029), .010, M.black, 8);
  }

  front('Contorno da grelha', [[-.77, 1.52], [.77, 1.52], [.78, 1.94], [.59, 2.05], [-.59, 2.05], [-.78, 1.94]], .020, M.darkSteel);
  front('Entrada de ar da grelha', [[-.727, 1.56], [.727, 1.56], [.734, 1.915], [.56, 2.009], [-.56, 2.009], [-.734, 1.915]], .029, M.black);
  for (const y of [1.61, 1.69, 1.77, 1.85, 1.93]) {
    const width = y === 1.93 ? 1.19 : 1.41;
    const [x, , z] = frontFace(0, y, .037);
    panel(parent, 'Lamela da grelha', width, .030, .032, x, y, z, M.steel, .008);
  }
  // O para-choques apoia-se nas extensões das longarinas.
  panel(parent, 'Para-choques dianteiro', 2.86, .29, .28, 0, .655, 7.90, M.darkSteel, .06);
  panel(parent, 'Proteção central inferior', 1.59, .16, .12, 0, .918, 7.898, M.black, .025);
  panel(parent, 'Travessa frontal', 2.20, .34, .23, 0, 1.125, 7.735, M.whiteTrim, .04);
  for (const side of [-1, 1]) {
    front('Caixa da ótica dianteira', [[.83, 1.55], [1.16, 1.57], [1.22, 1.755], [.84, 1.778]].map(([x, y]) => [side * x, y]), .038, M.black);
    front('Farol dianteiro', [[.872, 1.583], [1.134, 1.603], [1.173, 1.738], [.873, 1.743]].map(([x, y]) => [side * x, y]), .046, M.light);
    front('Indicador dianteiro', [[1.137, 1.573], [1.165, 1.583], [1.205, 1.731], [1.173, 1.739]].map(([x, y]) => [side * x, y]), .051, M.amber);
    panel(parent, 'Extremidade do para-choques', .34, .26, .22, side * 1.13, .94, 7.834, M.whiteTrim, .04);
    link(parent, 'Suporte frontal', [side * .67, .76, 6.35], [side * .67, .65, 7.88], .065, M.darkSteel);
  }
}

function addWheelArch(parent, side, z, material) {
  const positions = [];
  const indices = [];
  const segments = 12;
  const axleY = .675;
  for (let i = 0; i <= segments; i++) {
    const angle = (27 + i * 126 / segments) * Math.PI / 180;
    for (const [x, radius] of [[1.22, .742], [1.68, .742], [1.68, .688], [1.61, .686]]) {
      positions.push(side * x, axleY + Math.sin(angle) * radius, z + Math.cos(angle) * radius);
    }
    if (!i) continue;
    for (let edge = 0; edge < 3; edge++) {
      const a = (i - 1) * 4 + edge;
      const b = a + 1;
      const c = a + 4;
      const d = b + 4;
      indices.push(...(side > 0 ? [a, b, c, b, d, c] : [a, c, b, b, c, d]));
    }
  }
  addMesh(parent, 'Guarda-lamas perfilado', positions, indices, material, true);
}

function addSide(parent, side, M) {
  const project = (z, y, depth) => sideFace(side, z, y, depth);
  const outline = [[5.40, 1.47], [5.38, 2.17], [5.40, 2.32], [5.56, 3.06],
    [7.15, 3.06], [7.54, 2.33], [7.56, 2.18], [7.55, 1.49], [7.46, 1.44], [5.49, 1.44], [5.40, 1.47]];
  hose(parent, 'Junta da porta', outline.map(([z, y]) => project(z, y, .010)), .009, M.darkSteel);
  const outlineGlass = [[5.46, 2.35], [7.46, 2.35], [7.124, 2.995], [5.60, 2.995]];
  face(parent, 'Borracha do vidro lateral', outlineGlass.map(([z, y]) => project(z, y, .014)), [side, 0, 0], M.black);
  const glass = [[5.505, 2.389], [7.392, 2.389], [7.093, 2.959], [5.633, 2.959]];
  face(parent, 'Vidro lateral da porta', glass.map(([z, y]) => project(z, y, .018)), [side, 0, 0], M.glass);
  link(parent, 'Montante do vidro lateral', project(6.84, 2.38, .022), project(6.89, 2.965, .022), .015, M.black, 8);
  panel(parent, 'Rebaixo do puxador', .040, .110, .265, side * 1.315, 2.142, 5.66, M.darkSteel, .014);
  panel(parent, 'Puxador da porta', .030, .047, .181, side * 1.343, 2.151, 5.66, M.steel, .010);

  for (const y of [2.39, 2.65]) {
    link(parent, 'Braço do espelho', [side * 1.29, y, 7.03], [side * 1.81, y, 6.91], .032, M.darkSteel);
  }
  const mirror = panel(parent, 'Carcaça do retrovisor', .155, .455, .30, side * 1.811, 2.535, 6.902, M.black, .038);
  mirror.rotation.y = side * .18;
  const lens = panel(parent, 'Vidro do retrovisor', .104, .343, .020, side * 1.785, 2.545, 6.751, M.steel, .006);
  lens.rotation.y = mirror.rotation.y;

  for (const z of [4.85, 6.90]) addWheelArch(parent, side, z, M.rubber);
  panel(parent, 'Suporte de acesso à cabine', .32, .56, .61, side * 1.23, .97, 5.87, M.whiteTrim, .050);
  for (const y of [.664, .889]) {
    panel(parent, 'Degrau de acesso', .43, .079, .54, side * 1.345, y, 5.87, M.darkSteel, .024);
    for (const z of [5.70, 5.87, 6.04]) {
      panel(parent, 'Relevo antiderrapante', .25, .018, .018, side * 1.38, y + .045, z, M.steel, .005);
    }
  }
}

export function buildTruckCab(parent, materials) {
  const cab = assembly(parent, 'Cabine');
  addCabShell(cab, materials.white);
  addFront(cab, materials);
  for (const side of [-1, 1]) addSide(cab, side, materials);
  batchMachineParts(cab);
  return cab;
}
