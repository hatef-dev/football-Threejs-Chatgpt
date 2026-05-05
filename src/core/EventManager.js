export class EventManager {
  #listeners = [];

  on(target, type, handler, options) {
    target.addEventListener(type, handler, options);
    this.#listeners.push({ target, type, handler, options });
  }

  dispose() {
    for (const item of this.#listeners) {
      item.target.removeEventListener(item.type, item.handler, item.options);
    }
    this.#listeners = [];
  }
}
