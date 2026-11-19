import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createVehicleController } from '../src/vehicle-controller.js';

const dimensions = {
  truck: { min: { x: -1.91, y: .035, z: -5.22 }, max: { x: 1.91, y: 4.19, z: 8.05 } },
  jeep: { min: { x: -.98, y: 0, z: -2.24 }, max: { x: .98, y: 2.08, z: 2.24 } },
  car: { min: { x: -.96, y: 0, z: -2.19 }, max: { x: .96, y: 1.5, z: 2.21 } },
  tractor: { min: { x: -1.17, y: 0, z: -2.30 }, max: { x: 1.17, y: 2.61, z: 2.30 } }
};

// Percurso de teste por comprimento de arco, com entrada em +X e saída em +Z.
const gate = { x: -20.3, z: -3 };
const straight = 21;
const radius = 4;
const curveLength = radius * Math.PI / 2;
const afterCurve = straight + curveLength;
const route = {
  length: afterCurve + 14,
  sample(distance) {
    if (distance <= straight) {
      return { x: gate.x + distance, z: gate.z, yaw: Math.PI / 2 };
    }
    if (distance < afterCurve) {
      const angle = (distance - straight) / radius;
      return {
        x: gate.x + straight + radius * Math.sin(angle),
        z: gate.z + radius * (1 - Math.cos(angle)),
        yaw: Math.PI / 2 - angle
      };
    }
    return { x: gate.x + straight + radius, z: gate.z + radius + distance - afterCurve, yaw: 0 };
  }
};

function fixture(validateRoute) {
  const children = new Set();
  const parent = {
    add(model) {
      assert.equal(model.parent, null);
      assert.equal(children.size, 0, 'Retirar o modelo anterior antes de adicionar outro');
      children.add(model);
      model.parent = parent;
    }
  };
  const created = new Map();
  function buildVehicle(type) {
    if (!(type in dimensions)) return null;
    assert.ok(!created.has(type), 'Reutilizar os modelos já construídos');
    const model = {
      type,
      parent: null,
      position: { x: 0, y: 0, z: 0, set(x, y, z) { Object.assign(this, { x, y, z }); } },
      rotation: { y: 0 },
      updateMatrixWorld() {},
      removeFromParent() {
        assert.equal(this.parent, parent);
        assert.ok(children.delete(this));
        this.parent = null;
      }
    };
    created.set(type, model);
    return model;
  }
  const controller = createVehicleController(parent, route, buildVehicle, {
    getBounds: model => dimensions[model.type],
    validateRoute
  });
  return { controller, children, created };
}

function pose(model) {
  return [model.position.x, model.position.y, model.position.z, model.rotation.y];
}

function near(actual, expected) {
  assert.ok(Math.abs(actual - expected) < 1e-9, `Esperado ${expected}. Obtido ${actual}.`);
}

function assertEmpty(controller, children) {
  assert.equal(controller.type, 'none');
  assert.equal(controller.status, 'empty');
  assert.equal(controller.model, null);
  assert.equal(controller.localBounds, null);
  assert.equal(controller.distance, 0);
  assert.equal(children.size, 0);
  assert.equal(controller.start(), false);
  assert.equal(controller.pause(), false);
  assert.equal(controller.restart(), false);
  assert.equal(controller.update(.1), false);
}

test('Oficina vazia no arranque e seleção exclusiva dos quatro modelos', () => {
  const { controller, children, created } = fixture();
  assertEmpty(controller, children);
  assert.equal(created.size, 0);
  const parkedX = new Map();
  for (const type of Object.keys(dimensions)) {
    const previous = controller.model;
    assert.equal(controller.select(type), true);
    const { model, localBounds } = controller;
    assert.equal(controller.type, type);
    assert.equal(model, created.get(type));
    assert.deepEqual([...children], [model]);
    if (previous) assert.equal(previous.parent, null);
    assert.equal(controller.status, 'idle');
    assert.deepEqual(localBounds, dimensions[type]);
    near(model.rotation.y, Math.PI / 2);
    near(model.position.z, gate.z);
    near(model.position.y + localBounds.min.y, .035);
    near(model.position.x + localBounds.min.z, gate.x + .30);
    parkedX.set(type, model.position.x);
    const parked = pose(model);
    assert.equal(controller.update(.1), false);
    assert.deepEqual(pose(model), parked);
    assert.equal(controller.start(), true);
    controller.update(.1);
  }
  assert.ok(parkedX.get('truck') > parkedX.get('car'));
  assert.equal(controller.select('truck'), true);
  assert.equal(controller.model, created.get('truck'));
  assert.deepEqual([...children], [created.get('truck')]);
  assert.equal(controller.status, 'idle');
  near(controller.model.position.x, parkedX.get('truck'));
  assert.equal(created.size, 4);
});

test('Movimento por distância, pausa exata, continuação e remoção em andamento', () => {
  const { controller, children } = fixture();
  assert.equal(controller.select('jeep'), true);
  const { model } = controller;
  const parked = pose(model);
  const start = controller.distance;
  assert.equal(controller.start(), true);
  assert.equal(controller.start(), false);
  assert.equal(controller.update(0), false);
  assert.equal(controller.distance, start);
  assert.deepEqual(pose(model), parked);
  assert.equal(controller.update(.1), false);
  near(controller.distance, start + .30);
  near(model.position.x - parked[0], .30);
  assert.equal(controller.pause(), true);
  assert.equal(controller.pause(), false);
  const paused = pose(model);
  const pauseDistance = controller.distance;
  assert.equal(controller.update(.5), false);
  assert.equal(controller.distance, pauseDistance);
  assert.deepEqual(pose(model), paused);
  assert.equal(controller.start(), true);
  assert.deepEqual(pose(model), paused);
  controller.update(.05);
  near(controller.distance, pauseDistance + .15);
  near(model.position.x - paused[0], .15);
  assert.equal(controller.select('jeep'), true);
  assert.equal(controller.status, 'running');
  assert.equal(controller.select('none'), true);
  assert.equal(model.parent, null);
  assertEmpty(controller, children);
});

test('A orientação segue a curva e a frente para junto à saída', () => {
  const { controller } = fixture();
  assert.equal(controller.select('car'), true);
  const { model, localBounds } = controller;
  const parked = pose(model);
  const start = controller.distance;
  assert.equal(controller.start(), true);
  const turns = [];
  for (let elapsed = 0; elapsed < 20 && controller.status === 'running'; elapsed += .05) {
    const previous = controller.distance;
    controller.update(.05);
    assert.ok(controller.distance > previous);
    assert.ok(controller.distance - previous <= .150000001);
    const expected = route.sample(controller.distance);
    near(model.position.x, expected.x);
    near(model.position.z, expected.z);
    near(model.position.y + localBounds.min.y, .035);
    near(model.rotation.y, expected.yaw);
    if (controller.distance > straight && controller.distance < afterCurve) turns.push(model.rotation.y);
  }
  assert.ok(turns.length > 10);
  assert.ok(turns.every((yaw, i) => !i || yaw < turns[i - 1]));
  assert.equal(controller.status, 'finished');
  near(model.rotation.y, 0);
  near(route.sample(route.length).z - (model.position.z + localBounds.max.z), .20);
  const finished = pose(model);
  assert.equal(controller.update(.1), false);
  assert.equal(controller.start(), false);
  assert.deepEqual(pose(model), finished);
  assert.equal(controller.restart(), true);
  assert.equal(controller.status, 'idle');
  assert.equal(controller.distance, start);
  assert.deepEqual(pose(model), parked);
});

test('Preparação e percurso indisponíveis mantêm as restrições por modelo', () => {
  const { controller, children } = fixture((bounds, start, end) => {
    near(start, -bounds.min.z + .30);
    near(end, route.length - bounds.max.z - .20);
    return { canStage: bounds !== dimensions.tractor, canRun: bounds !== dimensions.truck };
  });
  assert.equal(controller.select('car'), true);
  const first = controller.model;
  assert.equal(controller.start(), true);
  controller.update(.1);
  const moving = pose(first);
  const distance = controller.distance;
  assert.equal(controller.select('tractor'), false);
  assert.equal(controller.select('desconhecido'), false);
  assert.equal(controller.status, 'running');
  assert.equal(controller.distance, distance);
  assert.deepEqual(pose(first), moving);
  assert.deepEqual([...children], [first]);
  assert.equal(controller.select('truck'), true);
  assert.equal(controller.type, 'truck');
  assert.equal(controller.status, 'unavailable');
  assert.deepEqual([...children], [controller.model]);
  const parked = pose(controller.model);
  assert.equal(controller.start(), false);
  assert.equal(controller.pause(), false);
  assert.equal(controller.restart(), false);
  assert.equal(controller.update(.1), false);
  assert.deepEqual(pose(controller.model), parked);
  assert.equal(controller.select('none'), true);
  assertEmpty(controller, children);
});

test('A caminhada pode impedir uma troca, um reinício ou o próximo avanço', () => {
  const { controller, children } = fixture();
  assert.equal(controller.select('car'), true);
  const { model } = controller;
  assert.equal(controller.start(), true);
  controller.update(.1);
  const moving = pose(model);
  const distance = controller.distance;
  assert.equal(controller.select('truck', (candidate, bounds) => {
    assert.equal(candidate.type, 'truck');
    assert.equal(candidate.parent, null);
    near(candidate.position.x + bounds.min.z, gate.x + .30);
    return false;
  }), false);
  assert.deepEqual([...children], [model]);
  assert.equal(controller.restart(candidate => {
    assert.equal(candidate, model);
    assert.ok(candidate.position.x < moving[0]);
    return false;
  }), false);
  assert.equal(controller.status, 'running');
  assert.deepEqual(pose(model), moving);
  assert.equal(controller.distance, distance);
  assert.equal(controller.update(.1, candidate => {
    assert.equal(candidate, model);
    assert.ok(candidate.position.x > moving[0]);
    return false;
  }), true);
  assert.equal(controller.status, 'paused');
  assert.deepEqual(pose(model), moving);
  assert.equal(controller.distance, distance);
  assert.equal(controller.start(), true);
  controller.update(.1, candidate => candidate.position.x > moving[0]);
  near(controller.distance, distance + .30);
});
