import * as THREE from "https://unpkg.com/three@0.160.0/build/three.module.js";
import { CONFIG } from "../config/constants.js";

export class PlayerEntity {
  constructor(scene, team, data) {
    this.team = team;
    this.role = data.role;
    this.number = data.number;
    this.anchor = new THREE.Vector2(data.x, data.z);
    this.velocity = new THREE.Vector3();
    this.facing = new THREE.Vector3(team === "home" ? 1 : -1, 0, 0);
    this.actionCooldown = 0;

    const bodyColor = data.role === "GK"
      ? CONFIG.keeperColor
      : (team === "home" ? CONFIG.homeColor : CONFIG.awayColor);

    this.mesh = new THREE.Group();

    const shorts = new THREE.Mesh(
      new THREE.CylinderGeometry(0.88, 0.94, 1.3, 14),
      new THREE.MeshStandardMaterial({
        color: team === "home" ? 0x112849 : 0x5a1512,
        roughness: 0.7,
        metalness: 0.05
      })
    );
    shorts.position.y = 1.2;
    shorts.castShadow = true;
    this.mesh.add(shorts);

    const torso = new THREE.Mesh(
      new THREE.CylinderGeometry(0.95, 0.8, 1.85, 16),
      new THREE.MeshStandardMaterial({
        color: bodyColor,
        roughness: 0.56,
        metalness: 0.08
      })
    );
    torso.position.y = 2.45;
    torso.castShadow = true;
    this.mesh.add(torso);

    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.48, 16, 16),
      new THREE.MeshStandardMaterial({ color: 0xf1d0b3, roughness: 0.8 })
    );
    head.position.y = 3.8;
    head.castShadow = true;
    this.mesh.add(head);

    this.selection = new THREE.Mesh(
      new THREE.RingGeometry(1.18, 1.52, 24),
      new THREE.MeshBasicMaterial({
        color: 0xf3c944,
        transparent: true,
        opacity: 0.95,
        side: THREE.DoubleSide
      })
    );
    this.selection.rotation.x = -Math.PI / 2;
    this.selection.position.y = 0.06;
    this.selection.visible = false;
    this.mesh.add(this.selection);

    this.mesh.position.set(data.x, 0, data.z);
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
    scene.add(this.mesh);
  }
}
