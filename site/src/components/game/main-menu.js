import { EVENTS, HUD_BUTTON_CLASS, MAX_FRAME_MS } from "../../config/constants.js";
import { HUD_COLORS, HUD_PINCH_REACH, HUD_STATUS_MS } from "../../config/hud.js";
import {
  CREDITS_TEACHER, MENU_COLORS, MENU_LAYOUT, MENU_OPTIONS, MENU_SCREENS, MENU_TEXTS,
} from "../../config/menu.js";
import { teacherImage } from "../../config/teachers.js";
import { chooseMenuOption, panelPlacement, shouldReplacePanel, stackPositions } from "../../domain/menu.js";
import { createEntity, vec3, whenSceneLoaded } from "../../utils/entity.js";
import { buttonAtPoint, pinchWorldPoint } from "../../utils/pinch.js";

// Tela inicial: painel 3D à frente do jogador enquanto o sistema
// "game-flow" está no menu. Telas (config/menu.js, navegação em
// domain/menu.js):
//   início   → J1 x COMP (abre a partida contra a CPU), J1 x J2, Creditos
//   J1 x J2  → Criar sala / Entrar (em breve: salas online), Voltar
//   créditos → tela branca com a foto do Murilo e "Voltar"
// Botões como os do HUD: mouse (olhar + clique), laser do controle ou
// pinça da mão rastreada encostada no botão.
//
// O painel aparece na frente de onde a cabeça olha ao abrir o menu e fica
// parado no mundo. Ao entrar/sair do VR o headset corrige a posição da
// cabeça nos primeiros quadros (no início a câmera pode estar na altura 0):
// por 2,5 s o painel acompanha a cabeça a cada quadro; depois, se ficar
// longe ou abaixo dela, volta para a frente dela. Fora
// do menu ele some e fica sem botões, para nenhum raio acertá-lo.
// Uma entidade na cena basta: <a-entity main-menu>.
AFRAME.registerComponent("main-menu", {
  init() {
    this.screen = MENU_SCREENS.HOME;
    this.buttons = [];
    this.statusTimer = null;
    this.head = new THREE.Vector3();
    this.forward = new THREE.Vector3();
    this.build();

    this.onModeChanged = () => this.refresh();
    // Entrou/saiu do VR: acompanha a cabeça por um tempo (tick).
    this.sinceViewMs = null;
    this.onViewChanged = () => {
      this.sinceViewMs = 0;
    };
    this.onPinch = (event) => this.pressAtPinch(event);
    const sceneEl = this.el.sceneEl;
    sceneEl.addEventListener(EVENTS.GAME_MODE_CHANGED, this.onModeChanged);
    sceneEl.addEventListener("enter-vr", this.onViewChanged);
    sceneEl.addEventListener("exit-vr", this.onViewChanged);
    whenSceneLoaded(sceneEl, () => {
      this.hands = [...sceneEl.querySelectorAll("[player-hand]")];
      this.hands.forEach((hand) => hand.addEventListener("pinchstarted", this.onPinch));
      this.refresh();
    });
  },

  isOpen() {
    return Boolean(this.el.sceneEl.systems["game-flow"]?.isMenu());
  },

  build() {
    const { width, height } = MENU_LAYOUT;
    const textWidth = width - 0.05;
    this.el.classList.add("main-menu");
    this.panel = createEntity("a-plane", {
      width, height,
      material: `color: ${MENU_COLORS.panel}; shader: flat; side: double`,
    });
    this.title = createEntity("a-text", {
      class: "menu-title", value: MENU_TEXTS.title, align: "center", color: MENU_COLORS.title,
      "wrap-count": 14, width: textWidth, position: vec3(0, height / 2 - 0.1, 0.002),
    });
    this.subtitle = createEntity("a-text", {
      class: "menu-subtitle", value: "", align: "center", color: MENU_COLORS.subtitle,
      "wrap-count": 30, width: textWidth, position: vec3(0, height / 2 - 0.19, 0.002),
    });
    this.status = createEntity("a-text", {
      class: "menu-status", value: "", align: "center", color: MENU_COLORS.status,
      "wrap-count": 30, width: textWidth, position: vec3(0, -height / 2 + 0.06, 0.002),
    });
    this.creditsImage = createEntity("a-image", {
      class: "menu-credits-image",
      src: teacherImage(CREDITS_TEACHER),
      width: MENU_LAYOUT.creditsImage, height: MENU_LAYOUT.creditsImage,
      position: vec3(0, 0.1, 0.002),
      visible: false,
    });
    this.list = createEntity("a-entity", { position: vec3(0, 0, 0.003) });
    [this.panel, this.title, this.subtitle, this.status, this.creditsImage, this.list]
      .forEach((child) => this.el.appendChild(child));
  },

  // Mostra/esconde conforme o modo do jogo. Ao abrir, volta ao início.
  refresh() {
    const open = this.isOpen();
    const wasOpen = this.el.object3D.visible && this.buttons.length > 0;
    this.el.object3D.visible = open;
    this.el.dataset.open = String(open);
    if (open && !wasOpen) {
      this.place();
      this.showScreen(MENU_SCREENS.HOME);
    } else if (!open) {
      this.clearButtons();
      this.setStatus("");
    }
  },

  // À frente de onde a cabeça olha, virado para ela.
  place() {
    const camera = this.el.sceneEl.camera;
    if (!camera) {
      return;
    }
    camera.getWorldPosition(this.head);
    camera.getWorldDirection(this.forward);
    const yaw = Math.atan2(-this.forward.x, -this.forward.z);
    const at = panelPlacement(this.head, yaw, MENU_LAYOUT.distance, MENU_LAYOUT.drop, MENU_LAYOUT.minHeight);
    this.el.object3D.position.set(at.x, at.y, at.z);
    this.el.object3D.lookAt(this.head.x, at.y, this.head.z);
  },

  showScreen(screen) {
    this.screen = screen;
    this.el.dataset.screen = screen;
    const credits = screen === MENU_SCREENS.CREDITS;
    this.panel.setAttribute("material", "color", credits ? MENU_COLORS.credits : MENU_COLORS.panel);
    this.title.setAttribute("visible", !credits);
    this.subtitle.setAttribute("visible", !credits);
    this.subtitle.setAttribute("value", MENU_TEXTS[screen] || "");
    this.creditsImage.setAttribute("visible", credits);
    this.setStatus("");
    this.clearButtons();
    const options = MENU_OPTIONS[screen];
    const { button } = MENU_LAYOUT;
    // Créditos: "Voltar" embaixo da foto; nas outras, botões no meio.
    const centerY = credits ? -0.27 : -0.05;
    const ys = stackPositions(options.length, button.height, button.gap, centerY);
    this.buttons = options.map((option, index) => this.buildButton(option, ys[index]));
  },

  clearButtons() {
    while (this.list.firstChild) {
      this.list.removeChild(this.list.firstChild);
    }
    this.buttons = [];
  },

  // Plano (alvo dos raios) + texto irmão na frente (como no HUD).
  buildButton(option, y) {
    const { width, height } = MENU_LAYOUT.button;
    const idle = option.soon ? HUD_COLORS.disabled : HUD_COLORS.button;
    const plane = createEntity("a-plane", {
      class: `${HUD_BUTTON_CLASS} menu-button`,
      "data-option": option.action,
      "data-soon": String(Boolean(option.soon)),
      position: vec3(0, y, 0),
      width, height,
      material: `color: ${idle}; shader: flat`,
    });
    const label = createEntity("a-text", {
      value: option.label, align: "center", color: HUD_COLORS.text,
      "wrap-count": 16, width, position: vec3(0, y, 0.002),
    });
    const highlight = (on) => {
      const active = on && !option.soon;
      plane.setAttribute("material", "color", active ? HUD_COLORS.buttonHover : idle);
      label.setAttribute("color", active ? HUD_COLORS.textHover : HUD_COLORS.text);
    };
    plane.addEventListener("mouseenter", () => highlight(true));
    plane.addEventListener("mouseleave", () => highlight(false));
    plane.addEventListener("click", () => this.choose(option));
    this.list.appendChild(plane);
    this.list.appendChild(label);
    return { plane, option, width, height };
  },

  choose(option) {
    if (!this.isOpen()) {
      return;
    }
    const { screen, start, notice } = chooseMenuOption(this.screen, option);
    if (notice === "soon") {
      this.setStatus(MENU_TEXTS.soon);
    }
    if (start) {
      this.el.sceneEl.systems["game-flow"].startMatch(start);
      return;
    }
    if (screen !== this.screen) {
      this.showScreen(screen);
    }
  },

  pressAtPinch(event) {
    if (!this.isOpen()) {
      return;
    }
    const point = pinchWorldPoint(event);
    const hit = point && buttonAtPoint(point, this.buttons, HUD_PINCH_REACH);
    if (hit) {
      this.choose(hit.option);
    }
  },

  // Reposiciona logo depois de entrar/sair do VR e sempre que o painel
  // ficar longe ou abaixo da cabeça (ver shouldReplacePanel).
  tick(time, delta) {
    if (!this.isOpen() || !this.el.sceneEl.camera) {
      return;
    }
    if (this.sinceViewMs !== null) {
      this.sinceViewMs += Math.min(delta || 0, MAX_FRAME_MS);
      if (this.sinceViewMs >= MENU_LAYOUT.followMs) {
        this.sinceViewMs = null;
      }
    }
    this.el.sceneEl.camera.getWorldPosition(this.head);
    if (shouldReplacePanel(this.head, this.el.object3D.position, this.sinceViewMs, MENU_LAYOUT)) {
      this.place();
    }
  },

  setStatus(text) {
    this.status.setAttribute("value", text);
    clearTimeout(this.statusTimer);
    if (text) {
      this.statusTimer = setTimeout(() => this.status.setAttribute("value", ""), HUD_STATUS_MS);
    }
  },

  remove() {
    clearTimeout(this.statusTimer);
    const sceneEl = this.el.sceneEl;
    sceneEl.removeEventListener(EVENTS.GAME_MODE_CHANGED, this.onModeChanged);
    sceneEl.removeEventListener("enter-vr", this.onViewChanged);
    sceneEl.removeEventListener("exit-vr", this.onViewChanged);
    (this.hands || []).forEach((hand) => hand.removeEventListener("pinchstarted", this.onPinch));
  },
});
