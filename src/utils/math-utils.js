import * as THREE from "https://unpkg.com/three@0.160.0/build/three.module.js";

export function applyDeadzone(value, threshold = 0.16) {
  return Math.abs(value) < threshold ? 0 : value;
}

export function toXZ(vector3) {
  return new THREE.Vector2(vector3.x, vector3.z);
}

export function dampVector3(vector, dt, damping) {
  vector.multiplyScalar(Math.pow(damping, dt * 60));
}
