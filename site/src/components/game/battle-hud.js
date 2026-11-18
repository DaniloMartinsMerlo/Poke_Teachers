import { EVENTS, HUD_BUTTON_CLASS } from "../../config/constants.js";
import {
  ATTACKS,
  HUD_ACTIONS,
  HUD_ANGLE_DEG,
  HUD_BUTTON,
  HUD_COLORS,
  HUD_DISTANCE,
  HUD_DROP,
  HUD_FOLLOW_RATE,
  HUD_LAYOUT,
  HUD_PAGES,
  HUD_PINCH_REACH,
  HUD_STATUS_MS,
  MAIN_OPTIONS,
  POWERUPS,
} from "../../config/hud.js";
import { playerInfo } from "../../config/players.js";
import { approachAngle } from "../../domain/battle.js";
import { chooseHudOption } from "../../domain/hud.js";
import { frameSeconds } from "../../utils/time.js";
import { createEntity, vec3, whenSceneLoaded } from "../../utils/entity.js";

const PAGE_TITLES = Object.freeze({
  [HUD_PAGES.MAIN]: "Batalha",
  [HUD_PAGES.ATTACK]: "Ataque",
  [HUD_PAGES.POWERUP]: "PowerUps",
});

const BACK_OPTION = Object.freeze({ action: HUD_ACTIONS.BACK, label: "Voltar" });

// Menu de batalha que acompanha o jogador pela esquerda, um pouco abaixo
// dos olhos. Segue a posição da cabeça na hora e o giro dela com atraso
// suave (não "gruda" no rosto, o que enjoa no VR).
//
// Botões em grade 2x2 ("Voltar" ocupa a linha de baixo nas páginas de
// ataque e power-up). Botões: mouse (olhar + clique), laser do controle (gatilho) ou pinça da
// mão rastreada perto do botão. Menu principal: Ataque, PowerUps, Trocar
// PokeProf e Desistir. Ataque e PowerUps abrem páginas com 4 opções e
// "Voltar". Cada escolha vira o evento HUD_ACTION na cena; "Trocar" também
// pede RECALL_REQUESTED (o suporte traz a bola de volta).
//
// O HUD é filho da cena, e não da câmera: assim a posição é suavizada.
AFRAME.registerComponent("battle-hud", {
  schema: {
    player: { default: "p1" },
  },

  init() {
    this.page = HUD_PAGES.MAIN;
    this.buttons = [];
    this.yaw = null;
    this.statusTimer = null;
    this.head = new THREE.Vector3();
    this.forward = new THREE.Vector3();
    this.local = new THREE.Vector3();

    this.build();
    this.showPage(HUD_PAGES.MAIN);

    this.onBlocked = ({ detail }) => {
      if (detail.player === this.data.player) {
        this.setStatus("Apenas 1 PokeProf por vez!");
      }
    };
    this.onPinch = (event) => this.pressAtPinch(event);
    this.el.sceneEl.addEventListener(EVENTS.SEND_OUT_BLOCKED, this.onBlocked);
    whenSceneLoaded(this.el.sceneEl, () => {
      this.hands = [...this.el.sceneEl.querySelectorAll("[player-hand]")];
      this.hands.forEach((hand) => hand.addEventListener("pinchstarted", this.onPinch));
    });
  },

  build() {
    const { width, gap } = HUD_BUTTON;
    const owner = playerInfo(this.data.player);
    this.gridWidth = 2 * width + gap;
    this.panelWidth = this.gridWidth + 2 * HUD_LAYOUT.padding;

    this.panel = createEntity("a-plane", {
      width: this.panelWidth, height: 0.1,
      material: `color: ${HUD_COLORS.panel}; shader: flat; transparent: true; opacity: 0.88`,
    });
    // Faixa na cor do jogador, para saber de quem é o menu.
    this.stripe = createEntity("a-plane", {
      width: this.panelWidth, height: HUD_LAYOUT.stripe,
      material: `color: ${owner.color}; shader: flat`,
    });
    this.title = createEntity("a-text", {
      align: "center", color: "#ffffff", "wrap-count": 30, width: this.gridWidth,
    });
    this.status = createEntity("a-text", {
      class: "hud-status", value: "", align: "center", color: HUD_COLORS.buttonHover,
      "wrap-count": 36, width: this.gridWidth,
    });
    this.list = createEntity("a-entity");

    this.el.classList.add("battle-hud");
    [this.panel, this.stripe, this.title, this.list, this.status]
      .forEach((child) => this.el.appendChild(child));
  },

  // Ajusta o painel ao número de linhas de botões da página: título em
  // cima, grade no meio, linha de status embaixo, margens justas.
  layout(rows) {
    const { height, gap } = HUD_BUTTON;
    const { padding, title, status, stripe } = HUD_LAYOUT;
    const gridHeight = rows * height + (rows - 1) * gap;
    const panelHeight = padding + title + gridHeight + status + padding;
    const top = panelHeight / 2;

    this.panel.setAttribute("height", panelHeight);
    this.stripe.object3D.position.set(0, top - stripe / 2, 0.001);
    this.title.object3D.position.set(0, top - padding - title / 2, 0.002);
    this.list.object3D.position.set(0, top - padding - title - height / 2, 0.003);
    this.status.object3D.position.set(0, -top + padding + status / 2, 0.002);
  },

  optionsOf(page) {
    if (page === HUD_PAGES.ATTACK) return [...ATTACKS, BACK_OPTION];
    if (page === HUD_PAGES.POWERUP) return [...POWERUPS, BACK_OPTION];
    return MAIN_OPTIONS;
  },

  showPage(page) {
    this.page = page;
    this.el.dataset.page = page;
    const owner = playerInfo(this.data.player);
    this.title.setAttribute("value", `${owner.label} - ${PAGE_TITLES[page]}`);
    while (this.list.firstChild) {
      this.list.removeChild(this.list.firstChild);
    }
    const options = this.optionsOf(page);
    this.layout(options.length > 4 ? 3 : 2);
    this.buttons = options.map((option, index) => this.buildButton(option, index));
  },

  // Botão = plano (alvo dos raios) + texto irmão na frente. O texto não é
  // filho do plano para o raio sempre acusar o próprio botão.
  // Grade 2x2: índices 0–3 nas duas primeiras linhas; o 5º botão
  // ("Voltar") ocupa a linha de baixo inteira.
  buildButton(option, index) {
    const { height, gap } = HUD_BUTTON;
    const inGrid = index < 4;
    const width = inGrid ? HUD_BUTTON.width : 2 * HUD_BUTTON.width + gap;
    const x = inGrid ? ((index % 2) - 0.5) * (HUD_BUTTON.width + gap) : 0;
    const y = -(inGrid ? Math.floor(index / 2) : 2) * (height + gap);
    const plane = createEntity("a-plane", {
      class: HUD_BUTTON_CLASS,
      "data-option": option.action || option.id,
      position: vec3(x, y, 0),
      width, height,
      material: `color: ${HUD_COLORS.button}; shader: flat`,
    });
    const label = createEntity("a-text", {
      value: option.label, align: "center", color: HUD_COLORS.text,
      "wrap-count": 18, width: HUD_BUTTON.width,
      position: vec3(x, y, 0.002),
    });
    const highlight = (on) => {
      plane.setAttribute("material", "color", on ? HUD_COLORS.buttonHover : HUD_COLORS.button);
      label.setAttribute("color", on ? HUD_COLORS.textHover : HUD_COLORS.text);
    };
    plane.addEventListener("mouseenter", () => highlight(true));
    plane.addEventListener("mouseleave", () => highlight(false));
    plane.addEventListener("click", () => this.choose(option));
    this.list.appendChild(plane);
    this.list.appendChild(label);
    return { plane, option, width };
  },

  choose(option) {
    const { page, emit } = chooseHudOption(this.page, option);
    if (emit) {
      this.announce(emit, option);
    }
    if (page !== this.page) {
      this.showPage(page);
    }
  },

  announce(emit, option) {
    const { player } = this.data;
    const sceneEl = this.el.sceneEl;
    const activeBall = sceneEl.systems.battle.activeBall(player);
    const activeName = activeBall?.components["pokemon-release"]?.data.name;
    sceneEl.emit(EVENTS.HUD_ACTION, { player, ...emit }, false);

    switch (emit.action) {
      case HUD_ACTIONS.SWITCH:
        if (!activeBall) {
          this.setStatus("Nenhum PokeProf em campo");
          return;
        }
        this.setStatus(`Volte, ${activeName}!`);
        sceneEl.emit(EVENTS.RECALL_REQUESTED, { player }, false);
        return;
      case HUD_ACTIONS.ATTACK:
        this.setStatus(activeBall ? `${activeName} usou ${option.label}!` : "Nenhum PokeProf em campo");
        return;
      case HUD_ACTIONS.POWERUP:
        this.setStatus(`${option.label} ativado!`);
        return;
      default:
        // Desistir: por enquanto não faz nada.
    }
  },

  setStatus(text) {
    this.status.setAttribute("value", text);
    clearTimeout(this.statusTimer);
    this.statusTimer = setTimeout(() => this.status.setAttribute("value", ""), HUD_STATUS_MS);
  },

  // Mão rastreada: pinça (posição no espaço do rig) encostada num botão.
  pressAtPinch(event) {
    const hand = event.currentTarget || event.target;
    if (!event.detail || !event.detail.position || !hand) {
      return;
    }
    hand.object3D.updateMatrixWorld();
    const point = new THREE.Vector3().copy(event.detail.position).applyMatrix4(hand.object3D.matrixWorld);
    const { height } = HUD_BUTTON;
    const hit = this.buttons.find(({ plane, width }) => {
      plane.object3D.updateMatrixWorld();
      plane.object3D.worldToLocal(this.local.copy(point));
      return Math.abs(this.local.x) <= width / 2 + HUD_PINCH_REACH / 2
        && Math.abs(this.local.y) <= height / 2
        && Math.abs(this.local.z) <= HUD_PINCH_REACH;
    });
    if (hit) {
      this.choose(hit.option);
    }
  },

  // Acompanha a cabeça: posição imediata, giro suavizado.
  tick(time, delta) {
    const camera = this.el.sceneEl.camera;
    if (!camera) {
      return;
    }
    camera.getWorldPosition(this.head);
    camera.getWorldDirection(this.forward);
    const heading = Math.atan2(-this.forward.x, -this.forward.z);
    this.yaw = this.yaw === null
      ? heading
      : approachAngle(this.yaw, heading, 1 - Math.exp(-HUD_FOLLOW_RATE * frameSeconds(delta)));

    const angle = this.yaw + THREE.MathUtils.degToRad(HUD_ANGLE_DEG);
    const object = this.el.object3D;
    object.position.set(
      this.head.x - Math.sin(angle) * HUD_DISTANCE,
      this.head.y - HUD_DROP,
      this.head.z - Math.cos(angle) * HUD_DISTANCE);
    object.lookAt(this.head);
  },

  remove() {
    clearTimeout(this.statusTimer);
    this.el.sceneEl.removeEventListener(EVENTS.SEND_OUT_BLOCKED, this.onBlocked);
    (this.hands || []).forEach((hand) => hand.removeEventListener("pinchstarted", this.onPinch));
  },
});
