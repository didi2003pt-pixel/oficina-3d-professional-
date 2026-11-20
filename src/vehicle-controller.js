export const vehicleFloorHeight = .035;
const entryClearance = .30;
const exitClearance = .20;
const speed = 3;

const unrestricted = () => ({canStage:true,canRun:true});

export function createVehicleController(parent, route, buildVehicle, {getBounds,validateRoute = unrestricted}) {
  const models = new Map();
  let type = 'none';
  let selected = null;
  let status = 'empty';
  let distance = 0;

  function place(entry, at) {
    const {x,z,yaw} = route.sample(at);
    entry.model.position.set(x,vehicleFloorHeight-entry.bounds.min.y,z);
    // Todos os modelos apontam para +Z no referencial local.
    entry.model.rotation.y = yaw;
    entry.model.updateMatrixWorld(true);
  }

  function select(nextType, canPlace) {
    if (nextType === type) return true;
    let next = null;
    if (nextType !== 'none') {
      if (!models.has(nextType)) {
        const model = buildVehicle(nextType);
        if (!model) return false;
        const bounds = getBounds(model);
        const start = Math.max(0,-bounds.min.z)+entryClearance;
        const end = route.length-Math.max(0,bounds.max.z)-exitClearance;
        const availability = validateRoute(bounds,start,end);
        models.set(nextType,{model,bounds,start,end,...availability});
      }
      next = models.get(nextType);
      if (!next.canStage) return false;
      place(next,next.start);
      if (canPlace && !canPlace(next.model,next.bounds)) return false;
    }

    selected?.model.removeFromParent();
    selected = next;
    type = nextType;
    status = !next ? 'empty' : next.canRun && next.end>next.start ? 'idle' : 'unavailable';
    distance = next?.start ?? 0;
    if (next) parent.add(next.model);
    return true;
  }

  function start() {
    if (status !== 'idle' && status !== 'paused') return false;
    status = 'running';
    return true;
  }

  function pause() {
    if (status !== 'running') return false;
    status = 'paused';
    return true;
  }

  function move(at, canPlace) {
    place(selected,at);
    if (canPlace && !canPlace(selected.model,selected.bounds)) {
      place(selected,distance);
      return false;
    }
    distance = at;
    return true;
  }

  function restart(canPlace) {
    if (!selected || status === 'unavailable' || !move(selected.start,canPlace)) return false;
    status = 'idle';
    return true;
  }

  // O retorno indica uma transição a anunciar na interface.
  function update(dt, canPlace) {
    if (status !== 'running' || !Number.isFinite(dt) || dt<=0) return false;
    const next = Math.min(distance+dt*speed,selected.end);
    if (!move(next,canPlace)) {
      status = 'paused';
      return true;
    }
    if (distance<selected.end) return false;
    status = 'finished';
    return true;
  }

  return {
    get type() { return type; },
    get model() { return selected?.model ?? null; },
    get localBounds() { return selected?.bounds ?? null; },
    get status() { return status; },
    get distance() { return distance; },
    select,
    start,
    pause,
    restart,
    update
  };
}
