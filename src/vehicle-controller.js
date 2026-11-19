const floorHeight = .035;
const entryClearance = .30;

export function createVehicleController(parent, route, buildVehicle, {getBounds}) {
  const models = new Map();
  let type = 'none';
  let selected = null;

  function place(entry) {
    const {x,z,yaw} = route.sample(entry.start);
    entry.model.position.set(x,floorHeight-entry.bounds.min.y,z);
    // Todos os modelos apontam para +Z no referencial local.
    entry.model.rotation.y = yaw;
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
        models.set(nextType,{model,bounds,start});
      }
      next = models.get(nextType);
      place(next);
      if (canPlace && !canPlace(next.model,next.bounds)) return false;
    }

    selected?.model.removeFromParent();
    selected = next;
    type = nextType;
    if (selected) parent.add(selected.model);
    return true;
  }

  return {
    get type() { return type; },
    get model() { return selected?.model ?? null; },
    get localBounds() { return selected?.bounds ?? null; },
    select
  };
}
