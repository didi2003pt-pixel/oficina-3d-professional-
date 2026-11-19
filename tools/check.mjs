import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { LAYOUT, TOUR, ZONES } from '../src/config.js';

const html=await readFile(new URL('../index.html',import.meta.url),'utf8');
const style=await readFile(new URL('../styles.css',import.meta.url),'utf8');
const main=await readFile(new URL('../src/main.js',import.meta.url),'utf8');
const scene=await readFile(new URL('../src/scene.js',import.meta.url),'utf8');

assert.equal(LAYOUT.entrance.wall,'left','A entrada deve permanecer à esquerda');
assert.equal(LAYOUT.exit.wall,'front','A saída deve permanecer na frente');
assert.ok(LAYOUT.exit.opening>=6,'A saída deve continuar ampla no modelo conceptual');
assert.ok(LAYOUT.route[0][0] < -19,'O percurso deve começar junto à entrada');
assert.ok(LAYOUT.route.at(-1)[1] > 13,'O percurso deve acabar na saída frontal');
assert.ok(!ZONES.some(z=>z.id==='elevator'),'Não restaurar antiga zona adicional ELEVADOR');
assert.ok(TOUR.length >= 10,'A visita deve cobrir todas as zonas');
assert.equal(new Set(ZONES.map(z=>z.id)).size,ZONES.length,'IDs de zona únicos');
for(const z of ZONES)assert.ok(typeof z.description==='string'&&z.description.length>20);
for(const marker of ['id="scene"','id="tour-list"','id="next"','id="previous"','id="detail-card"','data-mode="walk"','data-mode="top"']){
  assert.ok(html.includes(marker),'Falta no HTML: '+marker);
}
assert.ok(style.includes('.viewport'),'Estilos do visualizador não encontrados');
assert.ok(main.includes('requestPointerLock'),'Caminhada virtual não encontrada');
assert.ok(scene.includes('makeRack')&&scene.includes('makeTruck'),'Faltam equipamentos 3D');
console.log('Verificações estáticas concluídas: layout, etapas, interface e módulos OK.');
