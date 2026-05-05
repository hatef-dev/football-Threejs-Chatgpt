import * as THREE from "https://unpkg.com/three@0.160.0/build/three.module.js";
import { applyDeadzone } from "../utils/math-utils.js";

export class InputManager {
  #events;
  #ui;
  #keys = new Set();
  #gamepadIndex = null;
  #state = {
    move: new THREE.Vector2(),
    sprint: false,
    pass: false,
    through: false,
    switchPlayer: false,
    restart: false,
    shootHeld: false
  };

  constructor(eventManager, uiManager) {
    this.#events = eventManager;
    this.#ui = uiManager;
    this.#bindEvents();
  }

  get state() {
    return this.#state;
  }

  #bindEvents() {
    this.#events.on(window, "keydown", (event) => {
      const key = event.key.toLowerCase();
      this.#keys.add(key);
      if ([" ", "arrowup", "arrowdown", "arrowleft", "arrowright"].includes(key)) {
        event.preventDefault();
      }
    });

    this.#events.on(window, "keyup", (event) => {
      this.#keys.delete(event.key.toLowerCase());
    });

    this.#events.on(window, "gamepadconnected", (event) => {
      this.#gamepadIndex = event.gamepad.index;
      this.#ui.setController(event.gamepad.id.includes("Xbox") ? "Xbox connected" : "Gamepad connected");
    });

    this.#events.on(window, "gamepaddisconnected", () => {
      this.#gamepadIndex = null;
      this.#ui.setController("Keyboard only");
    });
  }

  sample() {
    const move = new THREE.Vector2();
    if (this.#keys.has("w")) move.y -= 1;
    if (this.#keys.has("s")) move.y += 1;
    if (this.#keys.has("a")) move.x -= 1;
    if (this.#keys.has("d")) move.x += 1;

    let gamepadMoveX = 0;
    let gamepadMoveY = 0;
    let gamepadSprint = false;
    let gamepadPass = false;
    let gamepadThrough = false;
    let gamepadSwitch = false;
    let gamepadRestart = false;
    let gamepadShootHeld = false;

    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    const pad = this.#gamepadIndex !== null ? pads[this.#gamepadIndex] : null;
    if (pad) {
      gamepadMoveX = applyDeadzone(pad.axes[0] ?? 0);
      gamepadMoveY = applyDeadzone(pad.axes[1] ?? 0);
      gamepadSprint = (pad.buttons[7]?.value ?? 0) > 0.18;
      gamepadSwitch = pad.buttons[0]?.pressed ?? false;
      gamepadThrough = pad.buttons[1]?.pressed ?? false;
      gamepadPass = pad.buttons[3]?.pressed ?? false;
      gamepadShootHeld = pad.buttons[4]?.pressed ?? false;
      gamepadRestart = pad.buttons[9]?.pressed ?? false;
      this.#ui.setController("Gamepad active");
    } else {
      this.#ui.setController("Keyboard only");
    }

    move.x += gamepadMoveX;
    move.y += gamepadMoveY;
    if (move.lengthSq() > 1) move.normalize();

    this.#state.move.copy(move);
    this.#state.sprint = this.#keys.has("shift") || gamepadSprint;
    this.#state.pass = this.#keys.has("j") || gamepadPass;
    this.#state.through = this.#keys.has("l") || gamepadThrough;
    this.#state.switchPlayer = this.#keys.has("q") || gamepadSwitch;
    this.#state.restart = this.#keys.has("r") || gamepadRestart;
    this.#state.shootHeld = this.#keys.has(" ") || this.#keys.has("k") || gamepadShootHeld;
  }
}
