import * as THREE from "https://unpkg.com/three@0.160.0/build/three.module.js";
import { CONFIG } from "../config/constants.js";

export class BallEntity {
  constructor(scene) {
    this.mesh = new THREE.Mesh(
      new THREE.SphereGeometry(CONFIG.ballRadius, 20, 20),
      new THREE.MeshStandardMaterial({
        color: 0xf6f7fb,
        roughness: 0.48,
        metalness: 0.04
      })
    );
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
    this.mesh.position.set(0, CONFIG.ballRadius, 0);

    this.velocity = new THREE.Vector3();
    this.owner = null;
    this.lastTouchTeam = null;
    this.protectedPlayer = null;
    this.protectionTimer = 0;

    scene.add(this.mesh);
  }
}
