export class APIService {
  #storage;
  #prefix;

  constructor(storage = window.localStorage, prefix = "sakura_brick_") {
    this.#storage = storage;
    this.#prefix = prefix;
  }

  saveJSON(key, value) {
    try {
      this.#storage.setItem(`${this.#prefix}${key}`, JSON.stringify(value));
    } catch {
      // Non-blocking persistence only.
    }
  }

  loadJSON(key, fallback) {
    try {
      const raw = this.#storage.getItem(`${this.#prefix}${key}`);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  }
}
