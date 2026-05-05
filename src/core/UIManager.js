export class UIManager {
  #scoreEl;
  #timerEl;
  #statusEl;
  #controllerEl;
  #chargeBarEl;
  #goalToastEl;
  #centerMessageEl;
  #centerBigEl;
  #centerSmallEl;

  constructor(doc = document) {
    this.#scoreEl = doc.getElementById("score");
    this.#timerEl = doc.getElementById("timer");
    this.#statusEl = doc.getElementById("statusText");
    this.#controllerEl = doc.getElementById("controllerText");
    this.#chargeBarEl = doc.getElementById("chargeBar");
    this.#goalToastEl = doc.getElementById("goalToast");
    this.#centerMessageEl = doc.getElementById("centerMessage");
    this.#centerBigEl = doc.getElementById("centerBig");
    this.#centerSmallEl = doc.getElementById("centerSmall");
  }

  setScore(score) {
    this.#scoreEl.textContent = `${score.home} - ${score.away}`;
  }

  setTimer(text) {
    this.#timerEl.textContent = text;
  }

  setStatus(text) {
    this.#statusEl.textContent = text;
  }

  setController(text) {
    this.#controllerEl.textContent = text;
  }

  setShotCharge(ratio) {
    this.#chargeBarEl.style.width = `${Math.round(ratio * 100)}%`;
  }

  showToast(text) {
    this.#goalToastEl.textContent = text;
    this.#goalToastEl.classList.add("show");
  }

  hideToast() {
    this.#goalToastEl.classList.remove("show");
  }

  showCenterMessage(big, small) {
    this.#centerBigEl.textContent = big;
    this.#centerSmallEl.textContent = small;
    this.#centerMessageEl.style.opacity = "1";
  }

  hideCenterMessage() {
    this.#centerMessageEl.style.opacity = "0";
  }
}
