import * as THREE from 'three';
import { P, assembly, display, fasteners, hose, link, panel, round } from './machine-parts.js';

function buildChassis(machine) {
  const chassis=assembly(machine,'Chassis e calha de carga');
  panel(chassis,'Sapata de apoio',2.04,.105,1.54,0,.083,-.035,P.darkSteel,.025);
  panel(chassis,'Base em aço pintado',2.15,.18,1.65,0,.212,-.025,P.red,.04);
  panel(chassis,'Mesa de carga',.68,.12,1.02,0,.361,.13,P.darkSteel,.025);
  for(const x of [-.25,.25]){
    panel(chassis,'Guia da mesa',.06,.036,.89,x,.426,.13,P.steel,.012);
  }
  fasteners(chassis,'Ancoragens à base',[
    [-.95,.305,.675],[.95,.305,.675],[-.95,.305,-.72],[.95,.305,-.72]
  ],.04,.025);
  panel(chassis,'Flange da coluna',.43,.10,.55,-.90,.347,-.53,P.darkSteel);
  panel(chassis,'Coluna de suporte',.31,2.23,.38,-.90,1.48,-.53,P.red,.035);
  panel(chassis,'Tampa de inspeção da coluna',.22,1.03,.055,-.90,1.02,-.322,P.darkSteel);
  fasteners(chassis,'Fixações da tampa',[
    [-.97,.57,-.288],[-.83,.57,-.288],[-.97,1.47,-.288],[-.83,1.47,-.288]
  ],.024,.020,P.lightSteel,'z');
}

function buildSpindle(machine,addTire) {
  const spindle=assembly(machine,'Conjunto de fixação da roda',0,1.55,0);
  panel(spindle,'Pedestal do mandril',.58,1.27,.49,0,-.625,-.575,P.red,.065);
  panel(spindle,'Chapa de reforço',.67,.105,.55,0,-1.20,-.56,P.darkSteel);
  round(spindle,'Cárter do acionamento',.32,.30,0,0,-.50,P.darkSteel,'z',24);
  round(spindle,'Flange do mandril',.285,.09,0,0,-.317,P.steel,'z',24);
  round(spindle,'Eixo do mandril',.158,.56,0,0,-.064,P.lightSteel,'z');
  addTire(spindle,1.13,.50,0,0,0,'drive');

  const rimProfile=[
    [.57,-.205],[.667,-.205],[.696,-.178],[.681,-.147],[.651,-.113],
    [.651,.113],[.681,.147],[.696,.177],[.667,.205],[.605,.205],
    [.583,.172],[.606,.120],[.606,-.120],[.57,-.205]
  ].map(([radius,depth])=>new THREE.Vector2(radius,depth));
  const rim=new THREE.Mesh(new THREE.LatheGeometry(rimProfile,32),P.steel);
  rim.name='Jante em aço com rebordo';
  rim.rotation.x=Math.PI/2;
  rim.castShadow=rim.receiveShadow=true;
  spindle.add(rim);
  round(spindle,'Disco recuado da jante',.625,.065,0,0,-.099,P.darkSteel,'z',28);
  round(spindle,'Prato frontal de fixação',.279,.146,0,0,.102,P.steel,'z',24);
  round(spindle,'Porca central de aperto',.132,.104,0,0,.233,P.lightSteel,'z',8);
  const jawBolts=[];
  for(const angle of [Math.PI/4,3*Math.PI/4,5*Math.PI/4,7*Math.PI/4]){
    const jaw=assembly(spindle,'Garra radial');
    jaw.rotation.z=angle;
    panel(jaw,'Guia da garra',.37,.105,.092,.401,0,.124,P.darkSteel,.016);
    panel(jaw,'Mordente escalonado',.152,.16,.117,.565,0,.154,P.lightSteel,.016);
    jawBolts.push([.39*Math.cos(angle),.39*Math.sin(angle),.178]);
  }
  fasteners(spindle,'Fixações das guias',jawBolts,.032,.025,P.lightSteel,'z');
}

function buildToolArm(machine) {
  const tool=assembly(machine,'Braço hidráulico articulado');
  round(tool,'Pivô da coluna',.147,.43,-.90,2.504,-.53,P.darkSteel,'z');
  round(tool,'Tampa do pivô',.096,.06,-.90,2.504,-.286,P.lightSteel,'z',16);
  const arm=panel(tool,'Braço principal',.53,.178,.24,-.747,2.579,-.515,P.red,.032);
  arm.rotation.z=.29;
  const armX=-.623;
  round(tool,'Articulação vertical',.132,.234,armX,2.624,-.505,P.darkSteel);
  round(tool,'Eixo da articulação',.084,.055,armX,2.759,-.505,P.lightSteel,'y',16);
  panel(tool,'Braço de avanço',.18,.145,.91,armX,2.624,-.058,P.red,.036);
  panel(tool,'Cabeça de avanço',.222,.161,.209,armX,2.624,.397,P.darkSteel,.026);
  round(tool,'Veio da ferramenta',.054,.38,armX,2.411,.397,P.lightSteel,'y',16);
  panel(tool,'Suporte da ferramenta',.144,.106,.128,armX,2.216,.397,P.darkSteel,.019);
  link(tool,'Porta-ferramenta',[armX,2.216,.397],[-.472,2.068,.284],.056,P.steel);
  panel(tool,'Cabeça junto ao talão',.115,.098,.13,-.466,2.057,.283,P.lightSteel,.019);

  const ramBase=[-1.068,1.173,-.375];
  const ramJoint=[-.875,2.554,-.375];
  const ramSleeve=ramBase.map((coordinate,index)=>THREE.MathUtils.lerp(coordinate,ramJoint[index],.59));
  round(tool,'Pino inferior do cilindro',.093,.19,-1.005,1.173,-.375,P.darkSteel,'x',16);
  link(tool,'Corpo do cilindro hidráulico',ramBase,ramSleeve,.091,P.darkSteel);
  link(tool,'Haste do cilindro hidráulico',ramSleeve,ramJoint,.043,P.lightSteel);
  round(tool,'Pino superior do cilindro',.080,.15,-.875,2.554,-.381,P.steel,'z',16);
  hose(tool,'Mangueira do cilindro',[
    [-.88,.445,-.49],[-1.027,.49,-.438],[-1.049,.74,-.414],
    [-1.061,1.013,-.385],[-1.033,1.38,-.401]
  ],.024);
  hose(tool,'Mangueira do braço',[
    [-.942,1.89,-.406],[-1.033,2.04,-.397],[-1.02,2.328,-.347],
    [-.844,2.436,-.333],[-.671,2.533,-.401]
  ],.024);
}

function buildControls(machine) {
  const controls=assembly(machine,'Consola de comandos',.66,0,.622);
  panel(controls,'Sapata da consola',.38,.097,.31,0,.346,0,P.darkSteel);
  panel(controls,'Montante da consola',.151,.831,.147,0,.784,0,P.red);
  const consoleHead=assembly(controls,'Painel inclinado',0,1.213,0);
  consoleHead.rotation.x=-.39;
  panel(consoleHead,'Caixa dos comandos',.43,.315,.21,0,0,0,P.red,.039);
  panel(consoleHead,'Espelho dos comandos',.373,.259,.029,0,0,.104,P.darkSteel,.018);
  display(consoleHead,'Visor do sistema hidráulico',.224,.101,-.041,.058,.121,'heavy');
  round(consoleHead,'Botão de comando',.031,.035,-.109,-.058,.133,P.green,'z',12);
  round(consoleHead,'Botão de comando',.031,.035,-.03,-.058,.133,P.steel,'z',12);
  round(consoleHead,'Base do botão de emergência',.063,.024,.107,-.046,.127,P.yellow,'z',16);
  round(consoleHead,'Botão de emergência',.039,.048,.107,-.046,.153,P.red,'z',16);
  hose(controls,'Conduta de alimentação',[
    [.060,.461,-.047],[.135,.388,-.099],[.174,.347,-.282],
    [.174,.346,-.787],[.079,.369,-1.029],[-.365,.404,-1.087]
  ],.021);
}

export function buildHeavyChanger(parent,addTire) {
  const machine=assembly(parent,'Desmontadora de pneus pesados',-16.2,0,-10.1);
  buildChassis(machine);
  buildSpindle(machine,addTire);
  buildToolArm(machine);
  buildControls(machine);
  return machine;
}
