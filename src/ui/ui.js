export { UI };

var $ = (s) => document.querySelector(s);
var UI = class {
  constructor() {
    this.menu = $("#menu");
    this.hud = $("#hud");
    this.promptEl = $("#prompt");
    this.reticle = $("#reticle");
    this.objectiveEl = $("#objective");
    this.objText = $("#objtext");
    this.subtitleEl = $("#subtitle");
    this.roomEl = $("#roomname");
    this.fadeEl = $("#fade");
    this.bootEl = $("#boot");
    this.bootBar = $("#boot .bar i");
    this.paused = $("#paused");
    this.letterbox = $("#letterbox");
    this.pvTitle = $("#pvtitle");
    this.endcard = $("#endcard");
    this.perf = $("#perf");
    this.clickhint = $("#clickhint");
    this._subTimer = null;
    this._roomTimer = null;
    this._objTimer = null;
  }
  boot(p) {
    if (this.bootBar) this.bootBar.style.width = `${Math.round(p * 100)}%`;
  }
  bootDone() {
    this.bootEl.classList.add("hide");
    setTimeout(() => this.bootEl.style.display = "none", 1200);
  }
  menuShow(v) {
    this.menu.classList.toggle("hide", !v);
    if (v) {
      this.hud.classList.remove("on");
      this.endcard.classList.remove("on");
    }
  }
  hudOn(v) {
    this.hud.classList.toggle("on", v);
  }
  prompt(text) {
    if (!text) {
      this.promptEl.classList.remove("on");
      this.reticle.classList.remove("hot");
      return;
    }
    this.promptEl.innerHTML = `<span class="key">E</span>${text}`;
    this.promptEl.classList.add("on");
    this.reticle.classList.add("hot");
  }
  objective(text, hold = 0) {
    if (!text) {
      this.objectiveEl.classList.remove("on");
      return;
    }
    this.objText.textContent = text;
    this.objectiveEl.classList.add("on");
    clearTimeout(this._objTimer);
    if (hold > 0) this._objTimer = setTimeout(() => this.objectiveEl.classList.remove("on"), hold);
  }
  subtitle(text, ms = 4200) {
    this.subtitleEl.textContent = text;
    this.subtitleEl.classList.add("on");
    clearTimeout(this._subTimer);
    this._subTimer = setTimeout(() => this.subtitleEl.classList.remove("on"), ms);
  }
  room(name) {
    this.roomEl.textContent = name;
    this.roomEl.classList.add("on");
    clearTimeout(this._roomTimer);
    this._roomTimer = setTimeout(() => this.roomEl.classList.remove("on"), 4200);
  }
  fade(to, ms = 800) {
    return new Promise((res) => {
      this.fadeEl.style.transition = `opacity ${ms}ms ease`;
      this.fadeEl.style.opacity = String(to);
      setTimeout(res, ms);
    });
  }
  fadeInstant(v) {
    this.fadeEl.style.transition = "none";
    this.fadeEl.style.opacity = String(v);
  }
  letterboxOn(v) {
    this.letterbox.classList.toggle("on", v);
  }
  pvTitleShow(zh, en) {
    if (!zh) {
      this.pvTitle.classList.remove("on");
      return;
    }
    this.pvTitle.querySelector(".zh").textContent = zh;
    this.pvTitle.querySelector(".en").textContent = en || "";
    this.pvTitle.classList.add("on");
  }
  endcardOn(v) {
    this.endcard.classList.toggle("on", v);
  }
  pausedOn(v) {
    this.paused.classList.toggle("on", v);
  }
  clickHint(v) {
    this.clickhint.classList.toggle("on", v);
  }
  perfOn(v) {
    this.perf.classList.toggle("on", v);
  }
  perf(text) {
    this.perf.textContent = text;
  }
};
