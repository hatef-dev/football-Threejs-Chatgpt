import * as THREE from "https://unpkg.com/three@0.160.0/build/three.module.js";
import { CONFIG, FORMATIONS } from "../config/constants.js";
import { BallEntity } from "../entities/BallEntity.js";
import { PlayerEntity } from "../entities/PlayerEntity.js";
import { WorldBuilder } from "../world/WorldBuilder.js";
import { UIManager } from "./UIManager.js";
import { StateManager } from "./StateManager.js";
import { InputManager } from "./InputManager.js";
import { EventManager } from "./EventManager.js";
import { APIService } from "../services/APIService.js";
import { dampVector3, toXZ } from "../utils/math-utils.js";

export class App {
  #scene;
  #camera;
  #renderer;
  #clock = new THREE.Clock();
  #players = [];
  #homePlayers = [];
  #awayPlayers = [];
  #ball;
  #stateManager;
  #ui;
  #input;
  #events;
  #api;

  constructor() {
    this.#events = new EventManager();
    this.#ui = new UIManager();
    this.#api = new APIService();
    this.#setupThree();
    WorldBuilder.build(this.#scene);
    this.#spawnPlayers();
    this.#ball = new BallEntity(this.#scene);
    this.#stateManager = new StateManager(this.#homePlayers.find((player) => player.role === "ST"));
    this.#input = new InputManager(this.#events, this.#ui);
    this.#hydratePersistedState();
    this.#updateControlIndicator();
    this.#resetKickoff("home", false);
    this.#updateHUD();

    this.#events.on(window, "resize", () => this.#onResize());
    this.#renderer.setAnimationLoop(() => this.#animate());
  }

  // Composition: rendering, input, UI and gameplay services are independent modules.
  #setupThree() {
    this.#scene = new THREE.Scene();
    this.#scene.background = new THREE.Color(0x8ebbe8);
    this.#scene.fog = new THREE.Fog(0x8ebbe8, 130, 330);

    this.#camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 500);
    this.#camera.position.set(-18, 42, 54);

    this.#renderer = new THREE.WebGLRenderer({ antialias: true });
    this.#renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.#renderer.setSize(window.innerWidth, window.innerHeight);
    this.#renderer.shadowMap.enabled = true;
    this.#renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.#renderer.outputColorSpace = THREE.SRGBColorSpace;
    document.body.appendChild(this.#renderer.domElement);

    const hemiLight = new THREE.HemisphereLight(0xcfe9ff, 0x304525, 1.2);
    this.#scene.add(hemiLight);

    const sun = new THREE.DirectionalLight(0xfff7df, 2.3);
    sun.position.set(-45, 80, 30);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -130;
    sun.shadow.camera.right = 130;
    sun.shadow.camera.top = 110;
    sun.shadow.camera.bottom = -110;
    sun.shadow.camera.near = 1;
    sun.shadow.camera.far = 240;
    this.#scene.add(sun);

    const ambientGround = new THREE.Mesh(
      new THREE.CircleGeometry(260, 64),
      new THREE.MeshStandardMaterial({ color: 0x617d54, roughness: 1 })
    );
    ambientGround.rotation.x = -Math.PI / 2;
    ambientGround.receiveShadow = true;
    this.#scene.add(ambientGround);
  }

  #spawnPlayers() {
    FORMATIONS.home.forEach((data) => {
      const player = new PlayerEntity(this.#scene, "home", data);
      this.#players.push(player);
      this.#homePlayers.push(player);
    });
    FORMATIONS.away.forEach((data) => {
      const player = new PlayerEntity(this.#scene, "away", data);
      this.#players.push(player);
      this.#awayPlayers.push(player);
    });
  }

  #hydratePersistedState() {
    const persisted = this.#api.loadJSON("score", { home: 0, away: 0 });
    if (typeof persisted.home === "number" && typeof persisted.away === "number") {
      const state = this.#stateManager.value;
      state.score.home = persisted.home;
      state.score.away = persisted.away;
    }
  }

  #animate() {
    const dt = Math.min(this.#clock.getDelta(), 0.033);
    this.#input.sample();
    this.#updateMatch(dt);
    this.#renderer.render(this.#scene, this.#camera);
  }

  #updateMatch(dt) {
    const state = this.#stateManager.value;
    const input = this.#input.state;

    if (state.gameState !== "fulltime") {
      state.matchTime = Math.max(0, state.matchTime - (state.gameState === "live" ? dt : 0));
    }

    if (state.matchTime <= 0 && state.gameState !== "fulltime") {
      state.gameState = "fulltime";
      this.#ball.owner = null;
      this.#ball.velocity.set(0, 0, 0);
      this.#showCenterMessage("Full Time", "Sakura Brick quick match finished", 100000);
      this.#ui.setStatus("Match complete");
      this.#api.saveJSON("score", state.score);
    }

    if (state.gameState === "countdown") {
      state.countdown -= dt;
      if (state.countdown <= 0) this.#startKickoff();
    }

    if (state.activeToastTimer > 0) {
      state.activeToastTimer -= dt;
      if (state.activeToastTimer <= 0) this.#ui.hideToast();
    }

    if (state.centerMessageTimer > 0) {
      state.centerMessageTimer -= dt;
      if (state.centerMessageTimer <= 0) this.#ui.hideCenterMessage();
    }

    const passPressed = input.pass && !state.prevPass;
    const throughPressed = input.through && !state.prevThrough;
    const switchPressed = input.switchPlayer && !state.prevSwitch;
    const restartPressed = input.restart && !state.prevRestart;
    const shootReleased = state.prevShootHeld && !input.shootHeld;

    if (restartPressed) this.#resetKickoff("home", true);

    if (state.gameState === "live") {
      if (switchPressed) this.#switchControlledPlayer();
      if (passPressed) this.#attemptPass("pass");
      if (throughPressed) this.#attemptPass("through");

      if (input.shootHeld && this.#ball.owner === state.controlledPlayer) {
        state.shotCharge = Math.min(1, state.shotCharge + dt * 0.75);
      }

      if (shootReleased) {
        this.#attemptShot(Math.max(0.18, state.shotCharge));
        state.shotCharge = 0;
      }

      if (!input.shootHeld && this.#ball.owner !== state.controlledPlayer) {
        state.shotCharge = 0;
      }
    } else {
      state.shotCharge = 0;
    }

    this.#updatePlayers(dt);
    this.#updateBall(dt);
    this.#resolveSteals();
    this.#checkGoal();
    this.#updateCamera(dt);
    this.#updateHUD();

    state.prevPass = input.pass;
    state.prevThrough = input.through;
    state.prevSwitch = input.switchPlayer;
    state.prevRestart = input.restart;
    state.prevShootHeld = input.shootHeld;
  }

  #updatePlayers(dt) {
    const state = this.#stateManager.value;
    const ball2D = toXZ(this.#ball.mesh.position);
    const homeChaser = this.#findNearestPlayer(this.#homePlayers, ball2D);
    const awayChaser = this.#findNearestPlayer(this.#awayPlayers, ball2D);

    this.#players.forEach((player) => {
      player.actionCooldown = Math.max(0, player.actionCooldown - dt);

      if (player === state.controlledPlayer && player.team === "home" && state.gameState === "live") {
        this.#controlPlayer(player, dt);
      } else {
        this.#aiPlayer(player, dt, player.team === "home" ? homeChaser : awayChaser);
      }

      player.mesh.position.x += player.velocity.x * dt;
      player.mesh.position.z += player.velocity.z * dt;
      player.mesh.position.x = THREE.MathUtils.clamp(player.mesh.position.x, -CONFIG.halfLength - 6, CONFIG.halfLength + 6);
      player.mesh.position.z = THREE.MathUtils.clamp(player.mesh.position.z, -CONFIG.halfWidth - 9, CONFIG.halfWidth + 9);

      if (player.velocity.lengthSq() > 0.001) {
        player.facing.copy(player.velocity).normalize();
        player.mesh.rotation.y = Math.atan2(player.facing.x, player.facing.z);
      }

      if (this.#ball.owner === player && player.team === "away" && state.gameState === "live") {
        this.#aiBallDecision(player);
      }
    });
  }

  #controlPlayer(player, dt) {
    const state = this.#stateManager.value;
    if (state.gameState !== "live") {
      dampVector3(player.velocity, dt, 0.8);
      return;
    }

    const move = new THREE.Vector3(this.#input.state.move.x, 0, this.#input.state.move.y);
    const hasBall = this.#ball.owner === player;
    const baseSpeed = hasBall ? 9.4 : 10.6;
    const sprintBoost = this.#input.state.sprint ? 1.38 : 1;
    const desiredSpeed = baseSpeed * sprintBoost;

    if (move.lengthSq() > 0.0001) {
      move.normalize().multiplyScalar(desiredSpeed);
      player.velocity.lerp(move, Math.min(1, dt * 7));
    } else {
      dampVector3(player.velocity, dt, 0.84);
    }
  }

  #aiPlayer(player, dt, chaser) {
    const state = this.#stateManager.value;
    if (state.gameState === "fulltime") {
      dampVector3(player.velocity, dt, 0.86);
      return;
    }

    const desired = this.#getPlayerTarget(player, chaser);
    const current = player.mesh.position;
    const delta = new THREE.Vector2(desired.x - current.x, desired.z - current.z);
    const speed = this.#getPlayerTopSpeed(player, this.#ball.owner === player);

    if (delta.lengthSq() > 0.01) {
      delta.normalize();
      const desiredVelocity = new THREE.Vector3(delta.x * speed, 0, delta.y * speed);
      player.velocity.lerp(desiredVelocity, Math.min(1, dt * 4.2));
    } else {
      dampVector3(player.velocity, dt, 0.88);
    }
  }

  #getPlayerTarget(player, chaser) {
    const attackDir = player.team === "home" ? 1 : -1;
    const teamPlayers = player.team === "home" ? this.#homePlayers : this.#awayPlayers;
    const ownGoalX = player.team === "home" ? -CONFIG.halfLength : CONFIG.halfLength;
    const ballPos = this.#ball.mesh.position;
    const owner = this.#ball.owner;
    const hasPossession = owner && owner.team === player.team;
    const anchor = player.anchor.clone();
    const desired = new THREE.Vector2(anchor.x, anchor.y);

    const ballInfluenceX = THREE.MathUtils.clamp(ballPos.x * 0.18, -12, 12);
    const ballInfluenceZ = THREE.MathUtils.clamp(ballPos.z * 0.22, -10, 10);

    desired.x += ballInfluenceX * (player.role === "GK" ? 0.12 : 0.8);
    desired.y += ballInfluenceZ * (player.role === "GK" ? 0.2 : 0.65);

    if (player.role === "GK") {
      desired.x = ownGoalX + attackDir * 4;
      desired.y = THREE.MathUtils.clamp(ballPos.z * 0.35, -CONFIG.goalHalf + 1.8, CONFIG.goalHalf - 1.8);
      if (
        Math.abs(ballPos.x - ownGoalX) < CONFIG.penaltyDepth &&
        Math.abs(ballPos.z) < CONFIG.penaltyWidth * 0.5 &&
        !owner
      ) {
        desired.x = THREE.MathUtils.lerp(desired.x, ballPos.x, 0.38);
        desired.y = THREE.MathUtils.lerp(desired.y, ballPos.z, 0.38);
      }
      return { x: desired.x, z: desired.y };
    }

    const pressing = chaser === player &&
      (
        !owner ||
        owner.team !== player.team ||
        (owner.team === player.team && owner === player && player.team === "away")
      );

    if (pressing) {
      return {
        x: THREE.MathUtils.clamp(ballPos.x + attackDir * (owner && owner.team === player.team ? 2.5 : 0), -CONFIG.halfLength, CONFIG.halfLength),
        z: THREE.MathUtils.clamp(ballPos.z, -CONFIG.halfWidth + 2, CONFIG.halfWidth - 2)
      };
    }

    if (hasPossession) {
      desired.x += attackDir * this.#getAttackRunBias(player.role);
      desired.y += THREE.MathUtils.clamp(ballPos.z - anchor.y, -8, 8) * 0.35;
    } else {
      desired.x -= attackDir * this.#getDefensiveBias(player.role);
      desired.y += THREE.MathUtils.clamp(ballPos.z - anchor.y, -10, 10) * 0.18;
    }

    if (owner === player) {
      return {
        x: THREE.MathUtils.clamp(player.mesh.position.x + attackDir * 8, -CONFIG.halfLength, CONFIG.halfLength),
        z: THREE.MathUtils.clamp(ballPos.z * 0.55, -CONFIG.halfWidth + 3, CONFIG.halfWidth - 3)
      };
    }

    const supportSpacing = teamPlayers.indexOf(player) % 2 === 0 ? 1 : -1;
    desired.y += supportSpacing * (hasPossession ? 2.2 : 1.1);
    return {
      x: THREE.MathUtils.clamp(desired.x, -CONFIG.halfLength + 2, CONFIG.halfLength - 2),
      z: THREE.MathUtils.clamp(desired.y, -CONFIG.halfWidth + 2, CONFIG.halfWidth - 2)
    };
  }

  #updateBall(dt) {
    const state = this.#stateManager.value;
    if (this.#ball.protectionTimer > 0) {
      this.#ball.protectionTimer = Math.max(0, this.#ball.protectionTimer - dt);
      if (this.#ball.protectionTimer === 0) {
        this.#ball.protectedPlayer = null;
      }
    }

    if (this.#ball.owner) {
      const owner = this.#ball.owner;
      const moveDir = owner.velocity.lengthSq() > 0.001
        ? owner.velocity.clone().normalize()
        : new THREE.Vector3(owner.facing.x, 0, owner.facing.z);
      this.#ball.mesh.position.set(
        owner.mesh.position.x + moveDir.x * 1.2,
        CONFIG.ballRadius,
        owner.mesh.position.z + moveDir.z * 1.2
      );
      this.#ball.velocity.copy(owner.velocity).multiplyScalar(0.55);
    } else {
      this.#ball.mesh.position.addScaledVector(this.#ball.velocity, dt);
      this.#ball.velocity.multiplyScalar(Math.pow(0.992, dt * 60));

      if (Math.abs(this.#ball.mesh.position.z) > CONFIG.halfWidth + 1.2) {
        this.#ball.mesh.position.z = THREE.MathUtils.clamp(this.#ball.mesh.position.z, -CONFIG.halfWidth - 1.2, CONFIG.halfWidth + 1.2);
        this.#ball.velocity.z *= -0.55;
      }

      if (
        Math.abs(this.#ball.mesh.position.x) > CONFIG.halfLength &&
        Math.abs(this.#ball.mesh.position.z) > CONFIG.goalHalf + 1
      ) {
        this.#ball.mesh.position.x = THREE.MathUtils.clamp(this.#ball.mesh.position.x, -CONFIG.halfLength, CONFIG.halfLength);
        this.#ball.velocity.x *= -0.55;
      }

      this.#ball.mesh.rotation.z -= this.#ball.velocity.length() * dt * 1.8;
    }

    if (!this.#ball.owner && this.#ball.velocity.lengthSq() < 0.02) {
      this.#ball.velocity.set(0, 0, 0);
    }

    if (state.gameState === "live") this.#captureLooseBall();
  }

  #captureLooseBall() {
    const state = this.#stateManager.value;
    if (this.#ball.owner || state.gameState !== "live") return;

    let bestPlayer = null;
    let bestDist = Infinity;
    for (const player of this.#players) {
      const dist = player.mesh.position.distanceTo(this.#ball.mesh.position);
      if (dist < bestDist) {
        bestDist = dist;
        bestPlayer = player;
      }
    }
    if (!bestPlayer) return;

    const canClaim = bestDist < CONFIG.playerRadius + CONFIG.ballRadius + 0.9;
    const fastBall = this.#ball.velocity.length() > 40;
    if (this.#ball.protectionTimer > 0 && bestPlayer === this.#ball.protectedPlayer) return;

    if (canClaim && !fastBall) {
      this.#ball.owner = bestPlayer;
      this.#ball.lastTouchTeam = bestPlayer.team;
      if (bestPlayer.team === "home" && bestPlayer !== state.controlledPlayer && bestPlayer.role !== "GK") {
        state.controlledPlayer = bestPlayer;
        this.#updateControlIndicator();
      }
    }
  }

  #resolveSteals() {
    const state = this.#stateManager.value;
    if (!this.#ball.owner || state.gameState !== "live") return;

    const owner = this.#ball.owner;
    const opponents = owner.team === "home" ? this.#awayPlayers : this.#homePlayers;
    for (const opponent of opponents) {
      const dist = opponent.mesh.position.distanceTo(owner.mesh.position);
      if (dist < CONFIG.playerRadius * 1.55 && opponent.velocity.length() > owner.velocity.length() * 0.65) {
        this.#ball.owner = opponent;
        this.#ball.lastTouchTeam = opponent.team;
        if (opponent.team === "home" && opponent.role !== "GK") {
          state.controlledPlayer = opponent;
          this.#updateControlIndicator();
        }
        owner.velocity.multiplyScalar(0.75);
        opponent.velocity.multiplyScalar(1.08);
        break;
      }
    }
  }

  #aiBallDecision(player) {
    if (player.actionCooldown > 0 || this.#ball.owner !== player) return;

    const goalX = player.team === "home" ? CONFIG.halfLength : -CONFIG.halfLength;
    const toGoal = new THREE.Vector2(goalX - player.mesh.position.x, -player.mesh.position.z);
    const goalDist = toGoal.length();
    const nearbyOpponents = (player.team === "home" ? this.#awayPlayers : this.#homePlayers).filter(
      (opponent) => opponent.mesh.position.distanceTo(player.mesh.position) < 6
    );

    if (goalDist < 22) {
      const power = THREE.MathUtils.clamp(1 - goalDist / 22, 0.45, 1);
      this.#kickBall(player, this.#getShotVector(player, power), 0.28);
      player.actionCooldown = 1.1;
      return;
    }

    if (nearbyOpponents.length >= 2 || goalDist > 32) {
      const target = this.#choosePassTarget(player.team, player, goalDist > 34 ? "through" : "pass");
      if (target) {
        const kind = goalDist > 34 ? "through" : "pass";
        const lead = kind === "through" ? 5.6 : 2.6;
        const targetPoint = this.#predictTargetPoint(target, lead);
        const direction = new THREE.Vector3(
          targetPoint.x - player.mesh.position.x,
          0,
          targetPoint.z - player.mesh.position.z
        );
        const speed = kind === "through" ? 32 : 25;
        this.#kickBall(player, direction.normalize().multiplyScalar(speed), 0.18);
        player.actionCooldown = 0.9;
      }
    }
  }

  #attemptPass(kind) {
    const state = this.#stateManager.value;
    const player = state.controlledPlayer;
    if (this.#ball.owner !== player || state.gameState !== "live") return;

    const target = this.#choosePassTarget("home", player, kind);
    if (!target) return;

    const lead = kind === "through" ? 7.2 : 3.2;
    const speed = kind === "through" ? 34 : 24;
    const targetPoint = this.#predictTargetPoint(target, lead);
    const direction = new THREE.Vector3(
      targetPoint.x - player.mesh.position.x,
      0,
      targetPoint.z - player.mesh.position.z
    );
    if (direction.lengthSq() < 0.01) return;

    this.#kickBall(player, direction.normalize().multiplyScalar(speed), 0.12);
    if (target.team === "home" && target.role !== "GK") {
      state.controlledPlayer = target;
      this.#updateControlIndicator();
    }
    this.#ui.setStatus(kind === "through" ? "Through ball played" : "Pass released");
  }

  #attemptShot(power) {
    const state = this.#stateManager.value;
    const player = state.controlledPlayer;
    if (this.#ball.owner !== player || state.gameState !== "live") return;
    this.#kickBall(player, this.#getShotVector(player, power), 0.22);
    this.#ui.setStatus(power > 0.7 ? "Driven shot" : "Quick shot");
  }

  #getShotVector(player, power) {
    const attackX = player.team === "home" ? CONFIG.halfLength + CONFIG.goalDepth : -CONFIG.halfLength - CONFIG.goalDepth;
    const aimZ = THREE.MathUtils.clamp(
      player.mesh.position.z * 0.22 + (Math.random() - 0.5) * 3.2,
      -CONFIG.goalHalf + 1.2,
      CONFIG.goalHalf - 1.2
    );
    const toGoal = new THREE.Vector3(attackX - player.mesh.position.x, 0, aimZ - player.mesh.position.z);
    return toGoal.normalize().multiplyScalar(25 + power * 23);
  }

  #kickBall(player, velocity, cooldown) {
    this.#ball.owner = null;
    this.#ball.lastTouchTeam = player.team;
    this.#ball.protectedPlayer = player;
    this.#ball.protectionTimer = 0.2;
    this.#ball.velocity.copy(velocity);
    player.actionCooldown = cooldown;
  }

  #choosePassTarget(team, passer, kind) {
    const squad = team === "home" ? this.#homePlayers : this.#awayPlayers;
    const attackDir = team === "home" ? 1 : -1;
    let bestTarget = null;
    let bestScore = -Infinity;

    squad.forEach((candidate) => {
      if (candidate === passer || candidate.role === "GK") return;

      const offset = new THREE.Vector2(
        candidate.mesh.position.x - passer.mesh.position.x,
        candidate.mesh.position.z - passer.mesh.position.z
      );
      const distance = offset.length();
      if (distance < 4 || distance > 42) return;

      const forwardProgress = offset.x * attackDir;
      const laneScore = -Math.abs(offset.y) * 0.15;
      const openness = this.#getNearestOpponentDistance(candidate) * 0.32;
      const kindBias = kind === "through" ? forwardProgress * 0.9 - distance * 0.16 : forwardProgress * 0.45 - distance * 0.08;
      const score = openness + kindBias + laneScore;

      if (score > bestScore) {
        bestScore = score;
        bestTarget = candidate;
      }
    });

    return bestTarget;
  }

  #predictTargetPoint(target, lead) {
    const attackDir = target.team === "home" ? 1 : -1;
    const velocityLead = target.velocity.clone().multiplyScalar(0.2);
    return {
      x: target.mesh.position.x + velocityLead.x + attackDir * lead,
      z: target.mesh.position.z + velocityLead.z
    };
  }

  #getNearestOpponentDistance(player) {
    const opponents = player.team === "home" ? this.#awayPlayers : this.#homePlayers;
    let best = Infinity;
    opponents.forEach((opponent) => {
      best = Math.min(best, opponent.mesh.position.distanceTo(player.mesh.position));
    });
    return best;
  }

  #switchControlledPlayer() {
    const state = this.#stateManager.value;
    const candidates = this.#homePlayers.filter((player) => player.role !== "GK");
    let best = state.controlledPlayer;
    let bestScore = Infinity;
    candidates.forEach((candidate) => {
      const distBall = candidate.mesh.position.distanceTo(this.#ball.mesh.position);
      const distAnchor = candidate.mesh.position.distanceTo(
        this.#ball.owner && this.#ball.owner.team === "home" ? this.#ball.owner.mesh.position : this.#ball.mesh.position
      );
      const score = distBall * 0.78 + distAnchor * 0.22;
      if (score < bestScore) {
        bestScore = score;
        best = candidate;
      }
    });
    state.controlledPlayer = best;
    this.#updateControlIndicator();
    this.#ui.setStatus(`Switched to ${best.role}`);
  }

  #updateControlIndicator() {
    const state = this.#stateManager.value;
    this.#homePlayers.forEach((player) => {
      player.selection.visible = player === state.controlledPlayer;
    });
  }

  #checkGoal() {
    const state = this.#stateManager.value;
    if (state.gameState !== "live") return;

    const bx = this.#ball.mesh.position.x;
    const bz = this.#ball.mesh.position.z;
    const inGoalMouth = Math.abs(bz) <= CONFIG.goalHalf;

    if (bx > CONFIG.halfLength && inGoalMouth) {
      this.#scoreGoal("home");
    } else if (bx < -CONFIG.halfLength && inGoalMouth) {
      this.#scoreGoal("away");
    }
  }

  #scoreGoal(team) {
    const state = this.#stateManager.value;
    state.score[team] += 1;
    this.#updateHUD();
    this.#showToast(`${team === "home" ? "Sakura Brick" : "Akai United"} Goal`);
    this.#showCenterMessage("Goal", `${team === "home" ? "Home side finishes" : "Away side answers"}`, 1.5);
    this.#ui.setStatus(`${team === "home" ? "Home" : "Away"} lead the restart`);
    this.#api.saveJSON("score", state.score);
    this.#resetKickoff(team === "home" ? "away" : "home", false);
  }

  #resetKickoff(teamToStart, manualRestart) {
    const state = this.#stateManager.value;
    state.kickoffTeam = teamToStart;
    state.gameState = "countdown";
    state.countdown = manualRestart ? 0.8 : 1.4;
    state.centerMessageTimer = state.countdown + 0.3;
    this.#ui.showCenterMessage(manualRestart ? "Restart" : "Kickoff", `${teamToStart === "home" ? "Home" : "Away"} to play`);
    this.#ui.setStatus(manualRestart ? "Kickoff reset" : "Kickoff ready");

    this.#players.forEach((player) => {
      player.mesh.position.set(player.anchor.x, 0, player.anchor.y);
      player.velocity.set(0, 0, 0);
      player.facing.set(player.team === "home" ? 1 : -1, 0, 0).normalize();
      player.actionCooldown = 0;
    });

    const kickoffSquad = teamToStart === "home" ? this.#homePlayers : this.#awayPlayers;
    const attackDir = teamToStart === "home" ? 1 : -1;
    const kickoffTaker = kickoffSquad.find((player) => player.role === "ST")
      || kickoffSquad.find((player) => player.role !== "GK");
    const kickoffSupport = kickoffSquad.find((player) => player !== kickoffTaker && player.role === "LCM")
      || kickoffSquad.find((player) => player !== kickoffTaker && player.role === "RCM")
      || kickoffSquad.find((player) => player !== kickoffTaker && player.role !== "GK");

    if (kickoffTaker) {
      kickoffTaker.mesh.position.set(-attackDir * 1.2, 0, 0);
      kickoffTaker.facing.set(attackDir, 0, 0);
    }
    if (kickoffSupport) {
      kickoffSupport.mesh.position.set(-attackDir * 3.2, 0, attackDir > 0 ? 2.4 : -2.4);
      kickoffSupport.facing.set(attackDir, 0, 0);
    }

    state.controlledPlayer = this.#homePlayers.find((player) =>
      teamToStart === "home" ? player.role === "ST" : player.role === "LCM"
    ) || state.controlledPlayer;
    this.#updateControlIndicator();

    this.#ball.owner = null;
    this.#ball.mesh.position.set(0, CONFIG.ballRadius, 0);
    this.#ball.velocity.set(0, 0, 0);
    state.shotCharge = 0;
  }

  #startKickoff() {
    const state = this.#stateManager.value;
    state.gameState = "live";
    const team = state.kickoffTeam === "home" ? this.#homePlayers : this.#awayPlayers;
    const taker = team.find((player) => player.role === "ST") || team.find((player) => player.role !== "GK") || team[0];
    this.#ball.owner = taker;
    this.#ball.lastTouchTeam = taker.team;
    if (taker.team === "home" && taker.role !== "GK") {
      state.controlledPlayer = taker;
      this.#updateControlIndicator();
    }
    this.#ui.setStatus(`${taker.team === "home" ? "Home" : "Away"} in possession`);
  }

  #updateCamera(dt) {
    const state = this.#stateManager.value;
    const focus = new THREE.Vector3();
    focus.copy(this.#ball.mesh.position);
    if (state.controlledPlayer) {
      focus.lerp(state.controlledPlayer.mesh.position, 0.32);
    }

    const ballDir = this.#ball.velocity.lengthSq() > 0.01 ? this.#ball.velocity.clone().normalize() : new THREE.Vector3(0.6, 0, 0.2);
    const desired = new THREE.Vector3(
      focus.x - 20 - ballDir.x * 12,
      42,
      focus.z + 40 - ballDir.z * 10
    );

    desired.x = THREE.MathUtils.clamp(desired.x, -90, 90);
    desired.z = THREE.MathUtils.clamp(desired.z, -95, 95);

    this.#camera.position.lerp(desired, 1 - Math.pow(0.0008, dt));
    this.#camera.lookAt(focus.x + 8, 0, focus.z);
  }

  #updateHUD() {
    const state = this.#stateManager.value;
    this.#ui.setTimer(this.#formatTime(state.matchTime));
    this.#ui.setShotCharge(state.shotCharge);
    this.#ui.setScore(state.score);
  }

  #showToast(text) {
    this.#ui.showToast(text);
    this.#stateManager.value.activeToastTimer = 2.2;
  }

  #showCenterMessage(big, small, duration) {
    this.#ui.showCenterMessage(big, small);
    this.#stateManager.value.centerMessageTimer = duration;
  }

  #formatTime(totalSeconds) {
    const seconds = Math.ceil(totalSeconds);
    const minutesPart = Math.floor(seconds / 60).toString().padStart(2, "0");
    const secondsPart = Math.max(0, seconds % 60).toString().padStart(2, "0");
    return `${minutesPart}:${secondsPart}`;
  }

  #getPlayerTopSpeed(player, hasBall) {
    const roleSpeed = {
      GK: 7.1,
      LB: 8.8,
      LCB: 8.2,
      RCB: 8.2,
      RB: 8.8,
      DM: 8.4,
      LCM: 8.8,
      RCM: 8.8,
      LW: 9.4,
      ST: 9.6,
      RW: 9.4
    };
    const speed = roleSpeed[player.role] ?? 8.4;
    return hasBall ? speed * 0.95 : speed;
  }

  #getAttackRunBias(role) {
    switch (role) {
      case "LB":
      case "RB":
        return 3.5;
      case "DM":
        return 2.4;
      case "LCM":
      case "RCM":
        return 5.5;
      case "LW":
      case "RW":
        return 7.5;
      case "ST":
        return 9;
      default:
        return 1.5;
    }
  }

  #getDefensiveBias(role) {
    switch (role) {
      case "LB":
      case "RB":
        return 1.5;
      case "DM":
        return 2.8;
      case "LCM":
      case "RCM":
        return 1.2;
      case "LW":
      case "RW":
      case "ST":
        return 0.6;
      default:
        return 1;
    }
  }

  #findNearestPlayer(team, target2D) {
    let best = null;
    let bestDist = Infinity;
    team.forEach((player) => {
      const dx = player.mesh.position.x - target2D.x;
      const dz = player.mesh.position.z - target2D.y;
      const distSq = dx * dx + dz * dz;
      if (distSq < bestDist) {
        bestDist = distSq;
        best = player;
      }
    });
    return best;
  }

  #onResize() {
    this.#camera.aspect = window.innerWidth / window.innerHeight;
    this.#camera.updateProjectionMatrix();
    this.#renderer.setSize(window.innerWidth, window.innerHeight);
  }
}
