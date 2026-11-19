import * as THREE from 'three';
import { LAYOUT } from './config.js';
import { vehicleFloorHeight } from './vehicle-controller.js';

const sampleSpacing = .05;
const margin = .045;
const markingHeight = .055;

// Uma caixa orientada do veículo é confrontada com as caixas dos obstáculos fixos.
// Os quatro eixos do teste 2D incluem os dois eixos locais do veículo.
function intersects(pose, vehicle, obstacles) {
  const sin = Math.sin(pose.yaw), cos = Math.cos(pose.yaw);
  const absSin = Math.abs(sin), absCos = Math.abs(cos);
  const x = pose.x+vehicle.centerX*cos+vehicle.centerZ*sin;
  const z = pose.z-vehicle.centerX*sin+vehicle.centerZ*cos;
  const extentX = absCos*vehicle.halfX+absSin*vehicle.halfZ;
  const extentZ = absSin*vehicle.halfX+absCos*vehicle.halfZ;

  if (x-extentX < -LAYOUT.width/2 || x+extentX > LAYOUT.officeX ||
      z-extentZ < -LAYOUT.depth/2 || z+extentZ > LAYOUT.depth/2) return true;

  return obstacles.some(box=>{
    if (box.minY >= vehicle.top) return false;
    const dx = box.x-x, dz = box.z-z;
    return Math.abs(dx) < extentX+box.halfX && Math.abs(dz) < extentZ+box.halfZ &&
      Math.abs(dx*cos-dz*sin) < vehicle.halfX+box.halfX*absCos+box.halfZ*absSin &&
      Math.abs(dx*sin+dz*cos) < vehicle.halfZ+box.halfX*absSin+box.halfZ*absCos;
  });
}

export function createRouteValidator(route, roots) {
  const obstacles = [];
  const bounds = new THREE.Box3();
  for (const root of roots) {
    root.updateWorldMatrix(true,true);
    root.traverse(mesh=>{
      if (!mesh.isMesh) return;
      bounds.setFromObject(mesh,true);
      if (bounds.isEmpty() || bounds.max.y<=markingHeight) return;
      const {min,max} = bounds;
      obstacles.push({
        x:(min.x+max.x)/2, z:(min.z+max.z)/2, minY:min.y,
        halfX:(max.x-min.x)/2, halfZ:(max.z-min.z)/2
      });
    });
  }

  return (bounds,start,end)=>{
    const {min,max} = bounds;
    const vehicle = {
      centerX:(min.x+max.x)/2, centerZ:(min.z+max.z)/2,
      halfX:(max.x-min.x)/2+margin, halfZ:(max.z-min.z)/2+margin,
      top:vehicleFloorHeight+max.y-min.y
    };
    if (intersects(route.sample(start),vehicle,obstacles)) return {canStage:false,canRun:false};
    if (end<=start) return {canStage:true,canRun:false};
    const count = Math.ceil((end-start)/sampleSpacing);
    for (let i=1;i<=count;i++) {
      const distance = start+(end-start)*i/count;
      if (intersects(route.sample(distance),vehicle,obstacles)) return {canStage:true,canRun:false};
    }
    return {canStage:true,canRun:true};
  };
}
