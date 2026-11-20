import * as THREE from 'three';
import { assembly, fasteners, link, panel, round } from './machine-parts.js';

const axleStations = [-3.65, -2.35, 4.85, 6.9];

function addCargoRibs(parent, material) {
  const rib = new THREE.BoxGeometry(.016, 2.39, .027);
  const ribs = new THREE.InstancedMesh(rib, material, 36);
  const transform = new THREE.Matrix4();
  let index = 0;
  for (const side of [-1, 1]) {
    for (let i = 0; i < 18; i++) {
      ribs.setMatrixAt(index++, transform.makeTranslation(side * 1.363, 2.75, -4.71 + i * .472));
    }
  }
  ribs.name = 'Nervuras laterais da caixa';
  ribs.instanceMatrix.needsUpdate = true;
  ribs.receiveShadow = true;
  parent.add(ribs);
}

function addRearDoors(cargo, M) {
  const rear = assembly(cargo, 'Portas traseiras da caixa');
  panel(rear, 'Junta entre as portas', .028, 2.64, .02, 0, 2.75, -5.154, M.black, .003);
  const hingeFixings = [];
  for (const side of [-1, 1]) {
    panel(rear, 'Folha da porta', 1.286, 2.57, .045, side * .662, 2.75, -5.163, M.white, .014);
    panel(rear, 'Reforço vertical exterior', .072, 2.61, .053, side * 1.321, 2.75, -5.161, M.whiteTrim, .012);
    round(rear, 'Varão do fecho', .017, 2.37, side * .36, 2.75, -5.194, M.steel, 'y', 12);
    for (const y of [1.65, 2.83, 3.90]) {
      panel(rear, 'Chapa da dobradiça', .16, .095, .022, side * 1.232, y, -5.185, M.steel, .008);
      round(rear, 'Perno da dobradiça', .022, .117, side * 1.303, y, -5.188, M.darkSteel, 'y', 12);
      hingeFixings.push([side * 1.19, y, -5.200]);
    }
    for (const y of [1.61, 3.89]) {
      panel(rear, 'Guia do fecho', .11, .095, .036, side * .36, y, -5.184, M.darkSteel, .009);
    }
    panel(rear, 'Manípulo do fecho', .213, .027, .028, side * .262, 2.27, -5.197, M.steel, .007);
  }
  fasteners(rear, 'Fixações das dobradiças', hingeFixings, .014, .011, M.steel, 'z');
}

export function buildTruckCargo(parent, M) {
  const cargo = assembly(parent, 'Caixa de carga');
  panel(cargo, 'Painel branco contínuo', 2.72, 2.66, 8.98, 0, 2.75, -.65, M.white, .047);
  panel(cargo, 'Remate arredondado do tejadilho', 2.83, .12, 9.13, 0, 4.13, -.65, M.whiteTrim, .043);
  // O piso da caixa deixa folga sobre o topo dos pneus de trás.
  panel(cargo, 'Travessa inferior da caixa', 2.89, .10, 8.99, 0, 1.381, -.65, M.steel, .023);
  for (const side of [-1, 1]) {
    panel(cargo, 'Perfil longitudinal exterior', .054, .075, 8.93, side * 1.37, 1.475, -.65, M.whiteTrim, .013);
    panel(cargo, 'Pilar frontal da caixa', .099, 2.57, .103, side * 1.329, 2.75, 3.792, M.whiteTrim, .024);
    for (const z of [-3.93, -.95, 2.06]) {
      panel(cargo, 'Marcador lateral da caixa', .021, .065, .141, side * 1.398, 1.476, z, M.amber, .008);
    }
  }
  addCargoRibs(cargo, M.whiteTrim);
  addRearDoors(cargo, M);
  return cargo;
}

function addAxles(chassis, M) {
  for (const [i, z] of axleStations.entries()) {
    round(chassis, 'Eixo transversal', .082, 3.17, 0, .675, z, M.darkSteel, 'x', 14);
    if (i < 2) round(chassis, 'Cárter do diferencial', .186, .28, 0, .675, z, M.black, 'x', 16);
    for (const side of [-1, 1]) {
      const x = side * .59;
      panel(chassis, 'Sela de suspensão', .214, .18, .32, x, .725, z, M.darkSteel, .029);
      panel(chassis, 'Feixe de suspensão', .135, .074, .85, x, .787, z, M.steel, .017);
    }
  }
  link(chassis, 'Veio de transmissão', [0, .675, -3.65], [0, .85, 4.4], .049, M.darkSteel, 12);
  panel(chassis, 'Resguardo do motor', 1.04, .39, 1.64, 0, 1.00, 5.04, M.darkSteel, .048);
}

function addRearProtection(chassis, M) {
  panel(chassis, 'Travessa terminal', 2.13, .18, .21, 0, .989, -4.93, M.darkSteel, .02);
  panel(chassis, 'Suporte das óticas traseiras', 2.65, .115, .11, 0, .754, -5.043, M.darkSteel, .018);
  for (const side of [-1, 1]) {
    const x = side * 1.17;
    panel(chassis, 'Suporte do para-choques traseiro', .12, .58, .164, side * .95, .774, -4.93, M.darkSteel, .018);
    panel(chassis, 'Suporte da pala', .38, .08, .163, side * 1.474, 1.307, -4.38, M.darkSteel, .015);
    panel(chassis, 'Pala traseira', .347, .73, .047, side * 1.489, .919, -4.42, M.rubber, .010);
    panel(chassis, 'Caixa da ótica traseira', .468, .207, .115, x, .784, -5.102, M.black, .025);
    panel(chassis, 'Farolim traseiro', .241, .129, .027, x + side * .074, .792, -5.169, M.red, .013);
    panel(chassis, 'Indicador traseiro', .097, .129, .027, x - side * .105, .792, -5.169, M.amber, .012);
  }
  panel(chassis, 'Proteção traseira inferior', 2.78, .167, .185, 0, .48, -5.085, M.steel, .033);
  panel(chassis, 'Suporte da matrícula', .339, .112, .027, 0, .71, -5.105, M.darkSteel, .009);
}

function addSideProtection(chassis, M) {
  for (const side of [-1, 1]) {
    for (const y of [.42, .60]) {
      panel(chassis, 'Barra de proteção lateral', .089, .089, 4.45, side * 1.275, y, 1.185, M.steel, .021);
    }
    for (const z of [-.92, 2.74]) {
      panel(chassis, 'Suporte das barras laterais', .10, .46, .157, side * 1.25, .648, z, M.darkSteel, .012);
      link(chassis, 'Travamento da proteção', [side * .6, .886, z], [side * 1.25, .63, z], .044, M.darkSteel, 10);
    }
  }
  round(chassis, 'Depósito de combustível', .272, 1.336, .951, .835, .41, M.darkSteel, 'z', 20);
  for (const z of [-.046, .867]) {
    round(chassis, 'Cinta do depósito', .285, .064, .951, .835, z, M.steel, 'z', 20);
  }
  round(chassis, 'Tampão do depósito', .056, .048, 1.057, 1.098, .76, M.black, 'y', 12);
  panel(chassis, 'Caixa de baterias', .452, .39, 1.025, -.894, .779, 1.97, M.darkSteel, .033);
  panel(chassis, 'Tampa da caixa de baterias', .479, .08, 1.064, -.894, .996, 1.97, M.black, .018);
  round(chassis, 'Reservatório de ar', .179, .84, -.916, .72, -.37, M.black, 'z', 16);
  for (const z of [-.63, -.11]) {
    panel(chassis, 'Suporte do reservatório de ar', .40, .078, .105, -.777, .82, z, M.darkSteel, .015);
  }
}

export function buildTruckChassis(parent, M) {
  const chassis = assembly(parent, 'Chassis e componentes inferiores');
  for (const x of [-.60, .60]) {
    panel(chassis, 'Longarina principal', .184, .255, 12.67, x, .93, 1.33, M.darkSteel, .025);
  }
  for (const z of [-4.77, -3.33, -1.43, .81, 3.49, 6.14, 7.43]) {
    panel(chassis, 'Travessa do chassis', 1.495, .157, .174, 0, .961, z, M.steel, .019);
  }
  for (const z of [-4.57, -2.05, .2, 2.57, 3.63]) {
    panel(chassis, 'Travessa de apoio da caixa', 2.59, .292, .156, 0, 1.201, z, M.darkSteel, .017);
  }
  addAxles(chassis, M);
  addRearProtection(chassis, M);
  addSideProtection(chassis, M);
  return chassis;
}
