import { EVENTS } from "../../config/constants.js";
import { BEATS, teacherImage } from "../../config/teachers.js";
import { createEntity, vec3 } from "../../utils/entity.js";
import { isHeld } from "./grab-state.js";

const HP_COLORS = Object.freeze({ high: "#4cd964", mid: "#ffd23f", low: "#ff3b30", empty: "#444444" });

// Prévia do professor guardado na pokébola: enquanto algum raio (mouse,
// laser do controle ou olhar no VR) aponta para a bola, um cartão aparece
// acima dela, sempre virado para o jogador, com foto, nome, barra e
// número de vida (atual/máxima), atributos (ATQ, DEF, VEL) e contra quem
// o professor é forte. A vida vem do componente "pokeprof" da bola e é
// atualizada quando muda (POKEPROF_CHANGED).
//
// O cartão é filho da cena, e não da bola: a bola tem escala 0,01 e gira
// ao rolar. Textos sem acento (fonte do A-Frame).
AFRAME.registerComponent("pokemon-preview", {
  schema: {
    name: { type: "string" },
    size: { default: 0.32 },
    // Distância do centro da bola até o centro da foto.
    lift: { default: 0.55 },
  },

  init() {
    this.pointers = new Set();
    this.ballPosition = new THREE.Vector3();
    this.cameraPosition = new THREE.Vector3();
    this.wasShowing = false;
    this.card = this.buildCard();
    this.el.sceneEl.appendChild(this.card);

    this.onPointed = (event) => this.pointers.add(event.detail.el);
    this.onUnpointed = (event) => this.pointers.delete(event.detail.el);
    this.onChanged = () => this.refresh();
    this.el.addEventListener("raycaster-intersected", this.onPointed);
    this.el.addEventListener("raycaster-intersected-cleared", this.onUnpointed);
    this.el.addEventListener(EVENTS.POKEPROF_CHANGED, this.onChanged);
  },

  buildCard() {
    const { name, size } = this.data;
    const border = 0.02;
    const top = size / 2 + border;
    const bottom = -size / 2 - 0.205;
    const row = (y, value, extra = {}) => createEntity("a-text", {
      value, align: "center", color: "#ffffff", "wrap-count": 24, width: size,
      position: vec3(0, y, 0.001), ...extra,
    });

    this.hpBar = createEntity("a-plane", {
      class: "hp-bar",
      position: vec3(0, -size / 2 - 0.08, 0.002),
      width: size, height: 0.022,
      material: `color: ${HP_COLORS.high}; shader: flat`,
    });
    this.hpText = row(-size / 2 - 0.115, "", { class: "hp-text" });
    this.statsText = row(-size / 2 - 0.15, "", { class: "stats-text" });
    const strongAgainst = BEATS[name];
    return createEntity("a-entity", { class: "pokemon-preview", visible: false }, [
      createEntity("a-plane", {
        position: vec3(0, (top + bottom) / 2, -0.002),
        width: size + border * 2,
        height: top - bottom,
        color: "#222222",
      }),
      // A imagem é carregada já na montagem para não piscar no 1º apontar.
      createEntity("a-image", { src: teacherImage(name), width: size, height: size }),
      createEntity("a-text", {
        value: name, align: "center", color: "#ffffff", width: size * 3,
        position: vec3(0, -size / 2 - 0.04, 0.001),
      }),
      // Fundo da barra de vida (a parte vazia).
      createEntity("a-plane", {
        position: vec3(0, -size / 2 - 0.08, 0.001),
        width: size, height: 0.022,
        material: `color: ${HP_COLORS.empty}; shader: flat`,
      }),
      this.hpBar,
      this.hpText,
      this.statsText,
      row(-size / 2 - 0.185, strongAgainst ? `Forte contra ${strongAgainst}` : "", { color: "#9fd3ff" }),
    ]);
  },

  // Atualiza vida e atributos a partir do PokeProf da bola.
  refresh() {
    const prof = this.el.components.pokeprof?.prof;
    if (!prof) {
      return;
    }
    const { size } = this.data;
    const ratio = prof.hpRatio();
    const { attack, defense, speed } = prof.stats;
    this.hpText.setAttribute("value", prof.isFainted()
      ? `HP 0/${prof.maxHp()} - Desmaiado`
      : `HP ${prof.hp}/${prof.maxHp()}`);
    this.statsText.setAttribute("value", `ATQ ${attack}  DEF ${defense}  VEL ${speed}`);
    // Barra encolhe para a esquerda.
    const bar = this.hpBar.object3D;
    bar.scale.x = Math.max(ratio, 0.0001);
    bar.position.x = -size * (1 - ratio) / 2;
    bar.visible = ratio > 0;
    let color = HP_COLORS.high;
    if (ratio <= 0.2) color = HP_COLORS.low;
    else if (ratio <= 0.5) color = HP_COLORS.mid;
    this.hpBar.setAttribute("material", "color", color);
  },

  isShowing() {
    return this.pointers.size > 0 && !isHeld(this.el);
  },

  tick() {
    const showing = this.isShowing();
    this.card.object3D.visible = showing;
    if (showing && !this.wasShowing) {
      this.refresh();
    }
    this.wasShowing = showing;
    const camera = this.el.sceneEl.camera;
    if (!showing || !camera) {
      return;
    }
    this.el.object3D.getWorldPosition(this.ballPosition);
    camera.getWorldPosition(this.cameraPosition);
    this.card.object3D.position.copy(this.ballPosition).y += this.data.lift;
    this.card.object3D.lookAt(this.cameraPosition);
  },

  remove() {
    this.el.removeEventListener("raycaster-intersected", this.onPointed);
    this.el.removeEventListener("raycaster-intersected-cleared", this.onUnpointed);
    this.el.removeEventListener(EVENTS.POKEPROF_CHANGED, this.onChanged);
    this.card.remove();
  },
});
