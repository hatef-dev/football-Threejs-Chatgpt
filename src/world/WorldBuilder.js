import * as THREE from "https://unpkg.com/three@0.160.0/build/three.module.js";
import { CONFIG } from "../config/constants.js";

export class WorldBuilder {
  static build(scene) {
    this.#createSkyAccent(scene);
    this.#createPitch(scene);
    this.#createSurroundings(scene);
  }

  static #createPitch(scene) {
    const pitchGroup = new THREE.Group();
    scene.add(pitchGroup);

    const pitchBase = new THREE.Mesh(
      new THREE.BoxGeometry(CONFIG.pitchLength, 0.5, CONFIG.pitchWidth),
      new THREE.MeshStandardMaterial({
        color: 0x4c8d48,
        roughness: 0.92,
        metalness: 0.02
      })
    );
    pitchBase.receiveShadow = true;
    pitchBase.position.y = -0.26;
    pitchGroup.add(pitchBase);

    for (let i = 0; i < 12; i += 1) {
      const bandWidth = CONFIG.pitchLength / 12;
      const band = new THREE.Mesh(
        new THREE.PlaneGeometry(bandWidth, CONFIG.pitchWidth),
        new THREE.MeshStandardMaterial({
          color: i % 2 === 0 ? 0x5eae58 : 0x4f984d,
          roughness: 1,
          metalness: 0
        })
      );
      band.rotation.x = -Math.PI / 2;
      band.position.set(-CONFIG.halfLength + bandWidth * 0.5 + i * bandWidth, 0.01, 0);
      band.receiveShadow = true;
      pitchGroup.add(band);
    }

    const lines = new THREE.Group();
    lines.position.y = 0.04;
    pitchGroup.add(lines);
    const lineMat = new THREE.MeshStandardMaterial({ color: 0xf3f4f7, roughness: 0.85 });

    this.#addLine(lines, 0, -CONFIG.halfWidth, CONFIG.pitchLength, 0.25, lineMat);
    this.#addLine(lines, 0, CONFIG.halfWidth, CONFIG.pitchLength, 0.25, lineMat);
    this.#addLine(lines, -CONFIG.halfLength, 0, 0.25, CONFIG.pitchWidth, lineMat);
    this.#addLine(lines, CONFIG.halfLength, 0, 0.25, CONFIG.pitchWidth, lineMat);
    this.#addLine(lines, 0, 0, 0.25, CONFIG.pitchWidth, lineMat);

    const circle = new THREE.Mesh(
      new THREE.RingGeometry(CONFIG.centerCircleRadius - 0.12, CONFIG.centerCircleRadius + 0.12, 64),
      lineMat
    );
    circle.rotation.x = -Math.PI / 2;
    lines.add(circle);

    const centerSpot = new THREE.Mesh(new THREE.CircleGeometry(0.3, 12), lineMat);
    centerSpot.rotation.x = -Math.PI / 2;
    lines.add(centerSpot);

    this.#addRectangle(lines, -CONFIG.halfLength + CONFIG.penaltyDepth * 0.5, 0, CONFIG.penaltyDepth, CONFIG.penaltyWidth, lineMat);
    this.#addRectangle(lines, CONFIG.halfLength - CONFIG.penaltyDepth * 0.5, 0, CONFIG.penaltyDepth, CONFIG.penaltyWidth, lineMat);
    this.#addRectangle(lines, -CONFIG.halfLength + 2.75, 0, 5.5, 18.32, lineMat);
    this.#addRectangle(lines, CONFIG.halfLength - 2.75, 0, 5.5, 18.32, lineMat);
    this.#addPenaltyArc(lines, true, lineMat);
    this.#addPenaltyArc(lines, false, lineMat);

    const leftSpot = new THREE.Mesh(new THREE.CircleGeometry(0.28, 12), lineMat);
    leftSpot.rotation.x = -Math.PI / 2;
    leftSpot.position.set(-CONFIG.halfLength + 11, 0, 0);
    lines.add(leftSpot);

    const rightSpot = new THREE.Mesh(new THREE.CircleGeometry(0.28, 12), lineMat);
    rightSpot.rotation.x = -Math.PI / 2;
    rightSpot.position.set(CONFIG.halfLength - 11, 0, 0);
    lines.add(rightSpot);

    this.#createGoal(scene, -CONFIG.halfLength, -1);
    this.#createGoal(scene, CONFIG.halfLength, 1);
  }

  static #createGoal(scene, x, side) {
    const goal = new THREE.Group();
    const postMat = new THREE.MeshStandardMaterial({ color: 0xf2f4f8, roughness: 0.6 });
    const netMat = new THREE.MeshStandardMaterial({
      color: 0xdce5f7,
      roughness: 0.92,
      transparent: true,
      opacity: 0.38
    });

    const leftPost = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 2.6, 12), postMat);
    leftPost.position.set(x, 1.3, -CONFIG.goalHalf);
    leftPost.castShadow = true;
    goal.add(leftPost);

    const rightPost = leftPost.clone();
    rightPost.position.z = CONFIG.goalHalf;
    goal.add(rightPost);

    const crossbar = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, CONFIG.goalWidth, 12), postMat);
    crossbar.rotation.z = Math.PI / 2;
    crossbar.position.set(x, 2.6, 0);
    crossbar.castShadow = true;
    goal.add(crossbar);

    const net = new THREE.Mesh(new THREE.BoxGeometry(CONFIG.goalDepth, 2.6, CONFIG.goalWidth), netMat);
    net.position.set(x + side * CONFIG.goalDepth * 0.5, 1.3, 0);
    net.receiveShadow = true;
    goal.add(net);

    scene.add(goal);
  }

  static #createSurroundings(scene) {
    this.#createToriiGate(scene, new THREE.Vector3(-95, 0, -52), 1.5);
    this.#createPagoda(scene, new THREE.Vector3(90, 0, 54), 1.2);
    this.#createLotusPond(scene, new THREE.Vector3(0, -0.2, 96), 20, 14);

    const treePositions = [
      [-92, -14], [-87, 6], [-82, 25], [-72, 44], [-60, -48],
      [72, -46], [84, -18], [92, 10], [76, 40], [55, 58],
      [-28, 84], [12, 88], [44, 82], [-46, -86], [18, -90], [62, -82]
    ];

    treePositions.forEach(([x, z], index) => {
      this.#createSakuraTree(scene, new THREE.Vector3(x, 0, z), 0.9 + (index % 3) * 0.18);
    });
  }

  static #createToriiGate(scene, position, scale) {
    const group = new THREE.Group();
    const darkWood = new THREE.MeshStandardMaterial({ color: 0x723425, roughness: 0.74 });
    const vermillion = new THREE.MeshStandardMaterial({ color: 0xb7342f, roughness: 0.55 });

    const postGeo = new THREE.BoxGeometry(1.4 * scale, 14 * scale, 1.4 * scale);
    const beamGeo = new THREE.BoxGeometry(17 * scale, 1.6 * scale, 1.7 * scale);
    const topGeo = new THREE.BoxGeometry(20 * scale, 1.2 * scale, 2.4 * scale);

    const leftPost = new THREE.Mesh(postGeo, vermillion);
    leftPost.position.set(-6 * scale, 7 * scale, 0);
    leftPost.castShadow = true;
    group.add(leftPost);

    const rightPost = leftPost.clone();
    rightPost.position.x = 6 * scale;
    group.add(rightPost);

    const beam = new THREE.Mesh(beamGeo, darkWood);
    beam.position.set(0, 11.5 * scale, 0);
    beam.castShadow = true;
    group.add(beam);

    const topBeam = new THREE.Mesh(topGeo, vermillion);
    topBeam.position.set(0, 13.2 * scale, 0);
    topBeam.castShadow = true;
    group.add(topBeam);

    group.position.copy(position);
    scene.add(group);
  }

  static #createPagoda(scene, position, scale) {
    const group = new THREE.Group();
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x6a4231, roughness: 0.8 });
    const roofMat = new THREE.MeshStandardMaterial({ color: 0x2f3038, roughness: 0.6, metalness: 0.15 });

    for (let i = 0; i < 4; i += 1) {
      const level = new THREE.Mesh(
        new THREE.CylinderGeometry((8 - i) * scale, (8 - i) * scale, 2.2 * scale, 6),
        woodMat
      );
      level.position.y = 2.2 * scale + i * 4.2 * scale;
      level.castShadow = true;
      group.add(level);

      const roof = new THREE.Mesh(
        new THREE.CylinderGeometry((11 - i * 1.1) * scale, (6.6 - i * 0.8) * scale, 1.3 * scale, 6),
        roofMat
      );
      roof.position.y = 4 * scale + i * 4.2 * scale;
      roof.castShadow = true;
      group.add(roof);
    }

    const spire = new THREE.Mesh(
      new THREE.CylinderGeometry(0.3 * scale, 0.45 * scale, 8 * scale, 10),
      new THREE.MeshStandardMaterial({ color: 0xc7ae72, roughness: 0.35, metalness: 0.6 })
    );
    spire.position.y = 19 * scale;
    spire.castShadow = true;
    group.add(spire);

    group.position.copy(position);
    scene.add(group);
  }

  static #createLotusPond(scene, position, radiusX, radiusZ) {
    const pond = new THREE.Mesh(
      new THREE.CylinderGeometry(radiusX, radiusX, 0.45, 48),
      new THREE.MeshStandardMaterial({
        color: 0x4b7ea2,
        roughness: 0.24,
        metalness: 0.08
      })
    );
    pond.scale.z = radiusZ / radiusX;
    pond.position.copy(position);
    pond.receiveShadow = true;
    scene.add(pond);

    for (let i = 0; i < 12; i += 1) {
      const lily = new THREE.Mesh(
        new THREE.CylinderGeometry(1.15, 1.15, 0.12, 16),
        new THREE.MeshStandardMaterial({ color: 0x78b06d, roughness: 0.92 })
      );
      const angle = (i / 12) * Math.PI * 2;
      const rx = Math.cos(angle) * radiusX * 0.58;
      const rz = Math.sin(angle) * radiusZ * 0.52;
      lily.position.set(position.x + rx, position.y + 0.18, position.z + rz);
      lily.receiveShadow = true;
      scene.add(lily);
    }
  }

  static #createSakuraTree(scene, position, scale) {
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.72 * scale, 0.96 * scale, 8 * scale, 10),
      new THREE.MeshStandardMaterial({ color: 0x6e4a34, roughness: 0.9 })
    );
    trunk.position.copy(position).add(new THREE.Vector3(0, 4 * scale, 0));
    trunk.castShadow = true;
    scene.add(trunk);

    const blossomMat = new THREE.MeshStandardMaterial({
      color: 0xf0b1cb,
      roughness: 0.88
    });

    const clusterOffsets = [
      [0, 9.5, 0], [-2.6, 8.6, 1.4], [2.1, 8.8, -1.2],
      [1.2, 10.2, 2.1], [-1.8, 10.6, -1.9]
    ];

    clusterOffsets.forEach((offset, index) => {
      const bloom = new THREE.Mesh(
        new THREE.SphereGeometry((2.7 - index * 0.18) * scale, 16, 16),
        blossomMat
      );
      bloom.position.set(position.x + offset[0] * scale, offset[1] * scale, position.z + offset[2] * scale);
      bloom.castShadow = true;
      scene.add(bloom);
    });
  }

  static #createSkyAccent(scene) {
    const sunDisk = new THREE.Mesh(
      new THREE.SphereGeometry(10, 24, 24),
      new THREE.MeshBasicMaterial({ color: 0xffddaa })
    );
    sunDisk.position.set(-115, 92, -130);
    scene.add(sunDisk);
  }

  static #addLine(parent, x, z, width, depth, material) {
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, depth), material);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(x, 0, z);
    parent.add(mesh);
  }

  static #addRectangle(parent, x, z, width, depth, material) {
    this.#addLine(parent, x, z - depth * 0.5, width, 0.22, material);
    this.#addLine(parent, x, z + depth * 0.5, width, 0.22, material);
    this.#addLine(parent, x - width * 0.5, z, 0.22, depth, material);
    this.#addLine(parent, x + width * 0.5, z, 0.22, depth, material);
  }

  static #addPenaltyArc(parent, leftSide, material) {
    const shape = new THREE.Shape();
    const centerX = leftSide ? -CONFIG.halfLength + 11 : CONFIG.halfLength - 11;
    const start = leftSide ? -0.92 : Math.PI - 0.92;
    const end = leftSide ? 0.92 : Math.PI + 0.92;
    shape.absarc(centerX, 0, CONFIG.centerCircleRadius, start, end, false);

    const points = shape.getPoints(48);
    const lineGroup = new THREE.Group();
    parent.add(lineGroup);
    for (let i = 1; i < points.length; i += 1) {
      const a = points[i - 1];
      const b = points[i];
      const length = a.distanceTo(b);
      const segment = new THREE.Mesh(new THREE.PlaneGeometry(length, 0.22), material);
      const midX = (a.x + b.x) * 0.5;
      const midZ = (a.y + b.y) * 0.5;
      segment.rotation.x = -Math.PI / 2;
      segment.rotation.z = -Math.atan2(b.y - a.y, b.x - a.x);
      segment.position.set(midX, 0, midZ);
      lineGroup.add(segment);
    }
  }
}
