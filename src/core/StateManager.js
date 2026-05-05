import { CONFIG } from "../config/constants.js";

export class StateManager {
  #state;

  constructor(controlledPlayer = null) {
    this.#state = {
      score: { home: 0, away: 0 },
      controlledPlayer,
      matchTime: CONFIG.matchSeconds,
      gameState: "countdown",
      countdown: 1.4,
      kickoffTeam: "home",
      activeToastTimer: 0,
      centerMessageTimer: 1.4,
      shotCharge: 0,
      prevShootHeld: false,
      prevPass: false,
      prevThrough: false,
      prevSwitch: false,
      prevRestart: false
    };
  }

  get value() {
    return this.#state;
  }

  setControlledPlayer(player) {
    this.#state.controlledPlayer = player;
  }
}
