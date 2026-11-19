import * as THREE from 'three';
import { P, assembly, display, fasteners, hose, link, panel, round } from './machine-parts.js';

function buildTireChanger(parent, addTire) {
  const machine = assembly(parent, 'Desmontadora de pneus', -7.1, 0, -10.5);
  panel(machine, 'Base de apoio', 1.45, .12, 1.22, 0, .095, -.035, P.black);
  panel(machine, 'Carroçaria', 1.38, .81, 1.14, 0, .54, -.065);
  panel(machine, 'Tampo da carroçaria', 1.42, .105, 1.19, 0, .957, -.055, P.darkSteel);
  panel(machine, 'Chapa de serviço', 1.02, .49, .05, .02, .607, .514, P.red);
  fasteners(machine, 'Fixações da chapa', [[-.43,.795,.542],[.47,.795,.542],[-.43,.42,.542],[.47,.42,.542]], .022, .013, P.lightSteel, 'z');

  const controls = assembly(machine, 'Pedaleira', 0, .219, .53);
  panel(controls, 'Rebaixo da pedaleira', .85, .15, .07, 0, 0, 0, P.darkSteel);
  round(controls, 'Eixo da pedaleira', .027, .65, 0, .012, .036, P.lightSteel, 'x', 12);
  for (const x of [-.25, 0, .25]) {
    panel(controls, 'Braço do pedal', .08, .07, .12, x, -.005, .076, P.steel, .012).rotation.x = -.23;
    panel(controls, 'Piso do pedal', .148, .035, .105, x, -.026, .101, P.rubber, .009).rotation.x = -.23;
  }

  const table = assembly(machine, 'Mesa de montagem');
  round(table, 'Mancal da mesa', .25, .12, 0, 1.031, 0, P.darkSteel);
  round(table, 'Prato de montagem', .56, .068, 0, 1.096, 0, P.steel, 'y', 28);
  round(table, 'Tampa da transmissão', .19, .026, 0, 1.142, 0, P.darkSteel);
  const clamps = assembly(table, 'Maxilas de fixação');
  for (let i = 0; i < 4; i++) {
    const jaw = assembly(clamps, 'Maxila radial');
    jaw.rotation.y = i * Math.PI / 2;
    panel(jaw, 'Calha', .13, .032, .33, 0, 1.139, .315, P.darkSteel, .008);
    panel(jaw, 'Cursor', .095, .045, .158, 0, 1.16, .356, P.lightSteel, .009);
    panel(jaw, 'Batente de aperto', .103, .055, .047, 0, 1.183, .418, P.steel, .008);
  }
  addTire(machine, .69, .34, 0, 1.29, 0, 'rib').rotation.x = Math.PI / 2;

  const arm = assembly(machine, 'Coluna e braço de montagem');
  panel(arm, 'Flange da coluna', .255, .086, .23, -.613, 1.034, -.541, P.darkSteel);
  panel(arm, 'Coluna de suporte', .189, 1.231, .191, -.622, 1.68, -.55, P.red, .019);
  panel(arm, 'Reforço longitudinal', .077, 1.035, .054, -.622, 1.678, -.442, P.darkSteel, .01);
  round(arm, 'Pivô superior', .108, .108, -.622, 2.305, -.55, P.lightSteel);
  panel(arm, 'Braço oscilante', .82, .124, .157, -.248, 2.29, -.55, P.darkSteel);
  round(arm, 'Charneira do braço', .091, .167, .158, 2.29, -.55, P.red);
  panel(arm, 'Porta-ferramenta', .158, .103, .35, .245, 2.28, -.421, P.steel).rotation.y = .55;
  round(arm, 'Casquilho de guia', .079, .24, .329, 2.218, -.28, P.darkSteel);
  round(arm, 'Haste deslizante', .036, .68, .329, 1.989, -.28, P.lightSteel);
  round(arm, 'Punho da haste', .064, .037, .329, 2.357, -.28, P.black);
  panel(arm, 'Cabeça de montagem', .139, .076, .107, .299, 1.626, -.258, P.steel, .016).rotation.y = -.38;
  panel(arm, 'Patim de proteção', .097, .032, .053, .244, 1.581, -.245, P.black, .009).rotation.y = -.38;
  link(arm, 'Alavanca de bloqueio', [.34,2.276,-.227], [.44,2.34,-.084], .022, P.lightSteel, 8);
  round(arm, 'Punho de bloqueio', .033, .075, .442, 2.345, -.076, P.yellow, 'z', 10);
  hose(arm, 'Conduta da coluna', [[-.514,.968,-.59],[-.481,1.16,-.58],[-.487,1.55,-.59],[-.5,1.977,-.583],[-.505,2.18,-.55],[-.43,2.246,-.551]], .017);
  return machine;
}

// Secção lateral extrudida ao longo da largura. A cobertura fica levantada sobre as charneiras.
function buildWheelGuard(parent) {
  const guard = assembly(parent, 'Guarda da roda');
  const profile = new THREE.Shape();
  profile.moveTo(.5, 1.34);
  profile.quadraticCurveTo(.548, 1.76, .289, 1.943);
  profile.quadraticCurveTo(.013, 2.127, -.446, 2.039);
  profile.lineTo(-.452, 1.964);
  profile.quadraticCurveTo(-.045, 2.04, .242, 1.872);
  profile.quadraticCurveTo(.48, 1.713, .429, 1.34);
  profile.closePath();
  const geometry = new THREE.ExtrudeGeometry(profile, {
    depth: 1.23, bevelThickness: .013, bevelSize: .009, bevelSegments: 1, curveSegments: 6
  });
  const shell = new THREE.Mesh(geometry, P.black);
  shell.name = 'Carapaça de proteção';
  shell.position.x = .615;
  shell.rotation.y = -Math.PI / 2;
  shell.castShadow = shell.receiveShadow = true;
  guard.add(shell);
  for (const x of [-.551, .551]) {
    panel(guard, 'Suporte de charneira', .13, .216, .21, x, 1.256, .461, P.darkSteel);
    round(guard, 'Charneira da cobertura', .072, .167, x, 1.352, .463, P.steel, 'x', 14);
    round(guard, 'Tampa da charneira', .045, .028, x * 1.136, 1.352, .463, P.lightSteel, 'x', 12);
  }
  panel(guard, 'Pega da cobertura', .31, .045, .082, 0, 2.0, -.464, P.darkSteel, .017);
}

function buildRim(parent) {
  const profile = [
    [.321, -.113], [.387, -.118], [.401, -.104], [.401, .106],
    [.393, .125], [.336, .125], [.322, .108], [.321, -.113]
  ].map(([radius, depth]) => new THREE.Vector2(radius, depth));
  const rim = new THREE.Mesh(new THREE.LatheGeometry(profile, 28), P.lightSteel);
  rim.name = 'Aro maquinado da jante';
  rim.rotation.x = Math.PI / 2;
  rim.position.z = 1.513;
  rim.castShadow = rim.receiveShadow = true;
  parent.add(rim);
  round(parent, 'Fundo da jante', .33, .233, 0, 0, 1.497, P.darkSteel, 'z', 24);
  for (let i = 0; i < 6; i++) {
    const spoke = panel(parent, 'Raio de jante', .072, .222, .027, 0, 0, 1.623, P.lightSteel, .008);
    spoke.rotation.z = i * Math.PI / 3;
    spoke.translateY(.218);
  }
}

function buildBalancer(parent, addTire) {
  const machine = assembly(parent, 'Equilibradora de rodas', -3.5, 0, -11.1);
  panel(machine, 'Rodapé da equilibradora', 1.388, .12, 1.092, 0, .095, 0, P.black);
  panel(machine, 'Carroçaria da equilibradora', 1.315, 1.02, 1.01, 0, .637, -.015);
  panel(machine, 'Bandeja superior', 1.377, .106, 1.086, 0, 1.176, -.003, P.darkSteel);
  panel(machine, 'Painel frontal', 1.15, .596, .05, 0, .62, .502, P.red, .035);
  panel(machine, 'Rebaixo de ventilação', .55, .178, .024, -.189, .735, .535, P.darkSteel, .013);
  for (const y of [.684, .718, .752, .786]) {
    panel(machine, 'Grelha de ventilação', .46, .012, .019, -.189, y, .548, P.black, .004);
  }
  fasteners(machine, 'Fixações do painel frontal', [[-.51,.868,.535],[.51,.868,.535],[-.51,.371,.535],[.51,.371,.535]], .023, .012, P.lightSteel, 'z');

  const wheel = assembly(machine, 'Montagem do eixo e da roda', 0, 1.18, 0);
  round(wheel, 'Apoio do fuso', .226, .34, 0, 0, .661, P.darkSteel, 'z');
  round(wheel, 'Flange do mancal', .165, .192, 0, 0, .906, P.steel, 'z');
  round(wheel, 'Eixo de equilibragem', .068, .735, 0, 0, 1.333, P.lightSteel, 'z');
  const cone = new THREE.Mesh(new THREE.CylinderGeometry(.141, .075, .15, 16), P.steel);
  cone.name = 'Cone de centragem';
  cone.position.z = 1.331;
  cone.rotation.x = Math.PI / 2;
  cone.receiveShadow = true;
  wheel.add(cone);
  addTire(wheel, .64, .30, 0, 0, 1.5, 'rib');
  buildRim(wheel);
  round(wheel, 'Disco central', .119, .051, 0, 0, 1.636, P.steel, 'z', 20);
  round(wheel, 'Porca de aperto rápido', .079, .057, 0, 0, 1.676, P.black, 'z', 12);
  panel(wheel, 'Pega de aperto rápido', .245, .043, .038, 0, 0, 1.688, P.black, .012);

  buildWheelGuard(machine);
  panel(machine, 'Fixação do braço', .169, .118, .23, .439, 1.188, .543, P.steel);
  panel(machine, 'Braço da consola', .118, .63, .111, .439, 1.52, .615, P.darkSteel);
  panel(machine, 'Encaixe da consola', .23, .12, .161, .439, 1.816, .619, P.steel);
  const console = assembly(machine, 'Consola da equilibradora', .422, 1.975, .653);
  console.rotation.x = -.11;
  panel(console, 'Moldura da consola', .494, .343, .137, 0, 0, 0, P.black, .032);
  display(console, 'Ecrã de equilibragem', .383, .192, 0, .037, .071, 'balance');
  round(console, 'Indicador de estado', .02, .015, -.178, -.108, .075, P.green, 'z', 12);
  for (const x of [-.073, .006, .087]) {
    panel(console, 'Tecla', .055, .037, .019, x, -.107, .073, P.darkSteel, .006);
  }
  round(console, 'Seletor', .028, .024, .176, -.103, .076, P.lightSteel, 'z', 12);
  return machine;
}

function addDrawer(parent, width, height, x, y, z) {
  panel(parent, 'Frente da gaveta', width, height, .038, x, y, z, P.darkSteel, .012);
  panel(parent, 'Puxador', width * .54, .033, .028, x, y + height * .19, z + .024, P.lightSteel, .009);
}

function buildWorkbench(parent) {
  const bench = assembly(parent, 'Bancada de trabalho', -.9, 0, -12.3);
  panel(bench, 'Tampo metálico', 2.7, .11, 1.01, 0, 1.05, 0, P.steel, .031);
  panel(bench, 'Travessa posterior', 2.48, .19, .1, 0, .916, -.349, P.darkSteel);
  panel(bench, 'Corpo da gaveteira', .849, .929, .809, -.703, .582, 0);
  panel(bench, 'Base da gaveteira', .855, .086, .811, -.703, .079, 0, P.black);
  for (const [y, height] of [[.249,.19],[.449,.179],[.634,.172],[.799,.137],[.939,.119]]) {
    addDrawer(bench, .749, height, -.703, y, .409);
  }
  for (const z of [-.333, .335]) {
    panel(bench, 'Pé da bancada', .111, .94, .127, 1.122, .55, z, P.darkSteel);
    panel(bench, 'Apoio do pé', .181, .065, .182, 1.122, .068, z, P.black, .013);
  }
  panel(bench, 'Travamento lateral', .116, .083, .744, 1.122, .248, 0, P.red);

  const tray = assembly(bench, 'Bandeja de ferramentas', .584, 1.105, -.207);
  panel(tray, 'Fundo da bandeja', .526, .022, .328, 0, .011, 0, P.black, .008);
  for (const z of [-.153, .153]) panel(tray, 'Bordo da bandeja', .516, .048, .021, 0, .036, z, P.darkSteel, .008);
  for (const x of [-.253, .253]) panel(tray, 'Bordo da bandeja', .021, .048, .31, x, .036, 0, P.darkSteel, .008);
  fasteners(tray, 'Chaves de caixa', [[-.167,.046,-.067],[-.069,.046,-.067],[.029,.046,-.067],[.127,.046,-.067]], .035, .049, P.lightSteel);
  panel(tray, 'Extensão para chaves de caixa', .263, .026, .027, .029, .035, .074, P.steel, .007);

  const vise = assembly(bench, 'Torno de bancada', -.8, 1.105, .184);
  round(vise, 'Suporte do torno', .151, .039, 0, .019, 0, P.darkSteel);
  panel(vise, 'Corpo do torno', .237, .099, .192, 0, .073, -.014, P.red, .023);
  for (const z of [-.075, .074]) {
    panel(vise, 'Mordente do torno', .186, .055, .064, 0, .141, z, P.lightSteel, .01);
  }
  round(vise, 'Fuso do torno', .026, .169, 0, .072, .122, P.lightSteel, 'z', 12);
  link(vise, 'Manípulo do fuso', [-.082,.072,.188], [.082,.072,.188], .012, P.steel, 8);
  return bench;
}

function buildToolCabinet(parent) {
  const cabinet = assembly(parent, 'Armário de ferramentas', -.6, 0, -9.3);
  panel(cabinet, 'Rodapé do armário', .825, .105, .572, 0, .088, 0, P.black);
  panel(cabinet, 'Carroçaria do armário', .818, 1.217, .511, 0, .732, 0);
  panel(cabinet, 'Tampo do armário', .845, .107, .593, 0, 1.4, 0, P.steel);
  for (const [y, height] of [[.309,.297],[.593,.237],[.841,.218],[1.033,.14],[1.198,.137]]) {
    addDrawer(cabinet, .708, height, 0, y, .263);
  }
  return cabinet;
}

export function buildBalancingEquipment(parent, addTire) {
  return [
    buildTireChanger(parent, addTire),
    buildBalancer(parent, addTire),
    buildWorkbench(parent),
    buildToolCabinet(parent)
  ];
}
