import * as THREE from 'three';
import { P, assembly, display, fasteners, hose, panel, round } from './machine-parts.js';

const railLength = 4.34;
const rampLength = .61;
const deckHeight = .33;
const floorHeight = .035;
const rampTip = .049;
const rampWidth = .73;
const rampAngle = Math.atan2(deckHeight - rampTip, rampLength);

function makeRampGeometry() {
  const left = -rampWidth / 2;
  const right = rampWidth / 2;
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute([
    left, floorHeight, 0, right, floorHeight, 0,
    right, floorHeight, rampLength, left, floorHeight, rampLength,
    left, deckHeight, 0, right, deckHeight, 0,
    right, rampTip, rampLength, left, rampTip, rampLength
  ], 3));
  geometry.setIndex([
    0, 1, 2, 0, 2, 3, // piso
    4, 7, 6, 4, 6, 5, // superfície inclinada
    0, 4, 5, 0, 5, 1, // encaixe na pista
    3, 2, 6, 3, 6, 7, // ponta
    0, 3, 7, 0, 7, 4,
    1, 5, 6, 1, 6, 2
  ]);
  const flatGeometry = geometry.toNonIndexed();
  flatGeometry.computeVertexNormals();
  return flatGeometry;
}

const rampGeometry = makeRampGeometry();
const gripGeometry = new THREE.BoxGeometry(.095, .008, .015);

function grip(parent, name, points, tilt = 0) {
  const batch = new THREE.InstancedMesh(gripGeometry, P.steel, points.length);
  const transform = new THREE.Object3D();
  transform.rotation.x = tilt;
  points.forEach(([x, y, z], i) => {
    transform.position.set(x, y, z);
    transform.updateMatrix();
    batch.setMatrixAt(i, transform.matrix);
  });
  batch.name = name;
  batch.receiveShadow = true;
  parent.add(batch);
}

function addRamp(parent, direction) {
  const ramp = assembly(parent, direction === 1 ? 'Rampa de entrada' : 'Rampa traseira',
    0, 0, direction * railLength / 2);
  ramp.rotation.y = direction === 1 ? 0 : Math.PI;
  const body = new THREE.Mesh(rampGeometry, P.darkSteel);
  body.name = 'Corpo inclinado com apoio no piso';
  body.castShadow = body.receiveShadow = true;
  ramp.add(body);

  const surfaceLength = Math.hypot(rampLength, deckHeight - rampTip);
  for (const x of [-.307, .307]) {
    const edge = panel(ramp, 'Guia amarela da rampa', .063, .012, surfaceLength - .015,
      x, (deckHeight + rampTip) / 2 + .004, rampLength / 2, P.yellow, .004);
    edge.rotation.x = rampAngle;
    edge.castShadow = false;
  }
  const points = [];
  for (let row = 0; row < 6; row++) {
    const z = .075 + row * .088;
    const y = deckHeight - (deckHeight - rampTip) * z / rampLength + .004;
    const offset = row % 2 === 0 ? -.015 : .015;
    for (const x of [-.19, -.063, .063, .19]) points.push([x + offset, y, z]);
  }
  grip(ramp, 'Relevos antiderrapantes da rampa', points, rampAngle);
}

function addRail(parent, side, x) {
  const rail = assembly(parent, `Pista ${side}`, x);
  for (const z of [-1.81, 0, 1.81]) {
    panel(rail, 'Sapata ancorada', .70, .045, .30, 0, .0575, z, P.darkSteel, .012);
    panel(rail, 'Travessa de apoio', .56, .11, .21, 0, .127, z, P.steel, .014);
  }
  panel(rail, 'Longarina pintada', .71, .188, railLength, 0, .209, 0, P.red, .035);
  panel(rail, 'Chapa superior de rolamento', .68, .048, railLength, 0, .306, 0, P.darkSteel, .018);
  const anchors = [];
  for (const z of [-1.96, -.45, .45, 1.96]) {
    anchors.push([-.307, .332, z], [.307, .332, z]);
  }
  fasteners(rail, 'Fixações da chapa de rolamento', anchors, .017, .012);

  round(rail, 'Aro embutido do prato giratório', .287, .023, 0, .334, -1.25, P.lightSteel, 'y', 24);
  round(rail, 'Prato de viragem', .244, .023, 0, .348, -1.25, P.steel, 'y', 24);
  const mark = panel(rail, 'Índice do prato giratório', .029, .007, .075, 0, .358, -1.45, P.yellow, .003);
  mark.castShadow = false;

  panel(rail, 'Moldura da placa deslizante', .61, .022, 1.04, 0, .338, .81, P.steel, .008);
  panel(rail, 'Placa deslizante', .535, .026, .94, 0, .35, .81, P.lightSteel, .008);
  const points = [];
  for (const [start, rows, y, spacing] of [[-1.99, 3, .333, .091], [-.88, 11, .333, .108],
    [.44, 8, .366, .106], [1.43, 7, .333, .103]]) {
    for (let row = 0; row < rows; row++) {
      const offset = row % 2 === 0 ? -.017 : .017;
      for (const x of [-.164, 0, .164]) points.push([x + offset, y, start + row * spacing]);
    }
  }
  grip(rail, 'Textura em relevo das pistas', points);
  addRamp(rail, 1);
  addRamp(rail, -1);
}

function addRunways(parent) {
  const runways = assembly(parent, 'Plataforma de alinhamento', 6.15, 0, -9.85);
  for (const z of [-1.81, 1.81]) {
    panel(runways, 'Viga transversal de ligação', 2.60, .08, .155, 0, .075, z, P.darkSteel, .012);
  }
  addRail(runways, 'esquerda', -1.30);
  addRail(runways, 'direita', 1.30);
  return runways;
}

function addSensor(parent, x, side) {
  const sensor = assembly(parent, `Sensor de alinhamento ${side}`, x, 0, -8.8);
  sensor.rotation.y = Math.atan2(6.15 - x, -1.15);
  panel(sensor, 'Placa de ancoragem do sensor', .32, .055, .32, 0, .0625, 0, P.darkSteel, .018);
  fasteners(sensor, 'Ancoragens do sensor', [[-.111, .092, -.111], [.111, .092, -.111],
    [-.111, .092, .111], [.111, .092, .111]], .024, .021);
  panel(sensor, 'Coluna fixa de aço', .126, 1.34, .125, 0, .755, 0, P.darkSteel, .013);
  panel(sensor, 'Proteção inferior pintada', .185, .56, .172, 0, .37, 0, P.red, .024);
  panel(sensor, 'Tubo superior de suporte', .089, .71, .089, 0, 1.74, 0, P.lightSteel, .012);
  panel(sensor, 'Abraçadeira do tubo', .162, .107, .142, 0, 1.40, 0, P.steel, .013);
  panel(sensor, 'Suporte da cabeça ótica', .21, .10, .15, 0, 2.06, 0, P.steel, .018);
  panel(sensor, 'Carcaça da cabeça ótica', .375, .254, .183, 0, 2.2, 0, P.black, .033);
  panel(sensor, 'Viseira da cabeça ótica', .358, .050, .128, 0, 2.308, .074, P.darkSteel, .013);
  for (const lx of [-.089, .089]) {
    round(sensor, 'Aro de proteção ótica', .057, .049, lx, 2.2, .105, P.steel, 'z', 14);
    round(sensor, 'Janela ótica', .037, .012, lx, 2.2, .127, P.black, 'z', 14);
  }
  panel(sensor, 'Indicador de funcionamento', .094, .016, .02, 0, 2.285, -.092, P.green, .006);
  hose(sensor, 'Cabo de sinal da cabeça', [[0, 2.16, -.088], [0, 2.08, -.126], [0, 2.00, -.045],
    [0, 1.50, -.049], [0, 1.36, -.07]], .014);
  return sensor;
}

function addConsole(parent) {
  const console = assembly(parent, 'Consola de alinhamento', 9.65, 0, -12.0);
  panel(console, 'Rodapé da consola', .84, .13, .58, 0, .10, 0, P.darkSteel, .025);
  panel(console, 'Armário de eletrónica', .78, .94, .52, 0, .641, 0, P.red, .047);
  panel(console, 'Porta técnica', .63, .67, .037, 0, .616, .266, P.darkSteel, .022);
  panel(console, 'Pega da porta técnica', .036, .15, .032, .235, .755, .288, P.lightSteel, .010);
  panel(console, 'Tampo da consola', .82, .072, .57, 0, 1.139, 0, P.black, .023);
  const keys = assembly(console, 'Mesa de comandos', 0, 1.191, .103);
  keys.rotation.x = .16;
  panel(keys, 'Painel de comandos inclinado', .65, .044, .292, 0, 0, 0, P.darkSteel, .016);
  for (const [x, material] of [[-.055, P.green], [.055, P.amber], [.166, P.black]]) {
    round(keys, 'Botão de comando', .034, .02, x, .025, .058, material, 'y', 12);
  }
  panel(keys, 'Seletor da consola', .10, .022, .09, -.19, .026, .032, P.lightSteel, .01);

  panel(console, 'Base da coluna do monitor', .26, .07, .18, 0, 1.201, -.148, P.steel, .012);
  panel(console, 'Coluna do monitor', .12, 1.35, .12, 0, 1.906, -.148, P.darkSteel, .014);
  panel(console, 'Braço do monitor', .22, .14, .18, 0, 2.571, -.086, P.steel, .022);
  const monitor = assembly(console, 'Monitor da estação', 0, 2.669, .038);
  monitor.rotation.x = -.12;
  panel(monitor, 'Moldura do monitor', .96, .64, .145, 0, 0, 0, P.black, .041);
  display(monitor, 'Gráfico de convergência e cambagem', .867, .513, 0, .025, .074, 'alignment');
  panel(monitor, 'Indicador do monitor', .039, .012, .008, .381, -.276, .072, P.green, .004);
  hose(console, 'Cabo do monitor', [[-.26, 2.60, -.035], [-.22, 2.45, -.117], [-.067, 2.42, -.181],
    [-.06, 1.42, -.195], [-.09, 1.19, -.195]], .015);
  return console;
}

export function buildAlignmentEquipment(parent) {
  return [
    addRunways(parent),
    addSensor(parent, 3.25, 'esquerdo'),
    addSensor(parent, 9.10, 'direito'),
    addConsole(parent)
  ];
}
