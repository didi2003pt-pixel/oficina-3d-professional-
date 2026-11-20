import * as THREE from 'three';
import { LAYOUT } from './config.js';

export function createVehicleRoute(points = LAYOUT.route) {
  const knots = points.map(([x,z])=>new THREE.Vector3(x,.061,z));
  const curve = new THREE.CatmullRomCurve3(knots);
  curve.arcLengthDivisions = 1000;
  const length = curve.getLength();
  const position = new THREE.Vector3();
  const tangent = new THREE.Vector3();

  function sample(distance) {
    const fraction = THREE.MathUtils.clamp(distance/length,0,1);
    curve.getPointAt(fraction,position);
    curve.getTangentAt(fraction,tangent);
    return { x:position.x, z:position.z, yaw:Math.atan2(tangent.x,tangent.z) };
  }

  return { curve, length, sample };
}
