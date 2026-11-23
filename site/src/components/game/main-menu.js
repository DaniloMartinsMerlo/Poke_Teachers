import { EVENTS, HUD_BUTTON_CLASS, MAX_FRAME_MS } from "../../config/constants.js";
import { HUD_COLORS, HUD_PINCH_REACH, HUD_STATUS_MS } from "../../config/hud.js";
import {
  CREDITS_TEACHER, KEYPAD_KEYS, KEYPAD_LABELS, MENU_ACTIONS, MENU_COLORS, MENU_LAYOUT, MENU_OPTIONS,
  MENU_SCREENS, MENU_TEXTS,
} from "../../config/menu.js";
import { NETWORK_STATES, NETWORK_TEXTS, ROOM } from "../../config/network.js";
import { teacherImage } from "../../config/teachers.js";
import { chooseMenuOption, panelPlacement, shouldReplacePanel, stackPositions } from "../../domain/menu.js";
import { displayRoomCode, isValidRoomCode, typeRoomKey } from "../../domain/room.js";
import { createEntity, vec3, whenSceneLoaded } from "../../utils/entity.js";
import { buttonAtPoint, pinchWorldPoint } from "../../utils/pinch.js";

const SCREENS = MENU_SCREENS;
const NET = NETWORK_STATES;

// Tela inicial: painel 3D à frente do jogador enquanto o sistema
// "game-flow" está no menu. Telas (config/menu.js, navegação em
// domain/menu.js):
//   início     → J1 x COMP (partida contra a CPU), J1 x J2, Creditos
//   J1 x J2    → Criar sala, Entrar, Voltar
//   sala criada→ código grande + "Aguardando J2..." + Cancelar
//   entrar     → código digitado + teclado numérico (0–9, Apagar, Entrar)
//   créditos   → tela branca com a foto do Murilo e "Voltar"
// A sala é do sistema "network": o menu pede criar/entrar/sair e mostra o
// estado (NETWORK_CHANGED). Conectados, a partida começa sozinha; se o
// outro sair, o menu volta com o aviso.
// Botões como os do HUD: mouse, laser do controle ou pinça da mão
// rastreada encostada no botão.
//
// O painel aparece na frente de onde a cabeça olha ao abrir o menu e fica
// parado no mundo. Ao entrar/sair do VR o headset corrige a posição da
// cabeça nos primeiros quadros (no início a câmera pode estar na altura 0):
// por 2,5 s o painel acompanha a cabeça a cada quadro; depois, se ficar
// longe ou abaixo dela, volta para a frente dela. Fora do menu ele some e
// fica sem botões, para nenhum raio acertá-lo.
// Uma entidade na cena basta: <a-entity main-menu>.
AFRAME.registerComponent("main-menu", {
  init() {
    this.screen = SCREENS.HOME;
    this.buttons = [];
    this.statusTimer = null;
    this.typed = "";
    // Aviso a mostrar quando o menu abrir (ex.: o adversário saiu).
    this.pendingNotice = null;
    this.head = new THREE.Vector3();
    this.forward = new THREE.Vector3();
    this.build();

    this.onModeChanged = () => this.refresh();
    this.onNetwork = ({ detail }) => this.showNetwork(detail);
    // Entrou/saiu do VR: acompanha a cabeça por um tempo (tick).
    this.sinceViewMs = null;
    this.onViewChanged = () => {
      this.sinceViewMs = 0;
    };
    this.onPinch = (event) => this.pressAtPinch(event);
    const sceneEl = this.el.sceneEl;
    sceneEl.addEventListener(EVENTS.GAME_MODE_CHANGED, this.onModeChanged);
    sceneEl.addEventListener(EVENTS.NETWORK_CHANGED, this.onNetwork);
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

  network() {
    return this.el.sceneEl.systems.network;
  },

  build() {
    const { width } = MENU_LAYOUT;
    const textWidth = width - 0.05;
    this.el.classList.add("main-menu");
    this.panel = createEntity("a-plane", {
      width, height: MENU_LAYOUT.height,
      material: `color: ${MENU_COLORS.panel}; shader: flat; side: double`,
    });
    this.title = createEntity("a-text", {
      class: "menu-title", value: MENU_TEXTS.title, align: "center", color: MENU_COLORS.title,
      "wrap-count": 14, width: textWidth,
    });
    this.subtitle = createEntity("a-text", {
      class: "menu-subtitle", value: "", align: "center", color: MENU_COLORS.subtitle,
      "wrap-count": 30, width: textWidth,
    });
    // Código da sala (criada) ou o digitado (entrar), grande.
    this.roomCode = createEntity("a-text", {
      class: "menu-room-code", value: "", align: "center", color: MENU_COLORS.code,
      "wrap-count": 9, width: textWidth, visible: false,
    });
    this.status = createEntity("a-text", {
      class: "menu-status", value: "", align: "center", color: MENU_COLORS.status,
      "wrap-count": 30, width: textWidth,
    });
    this.creditsImage = createEntity("a-image", {
      class: "menu-credits-image",
      src: teacherImage(CREDITS_TEACHER),
      width: MENU_LAYOUT.creditsImage, height: MENU_LAYOUT.creditsImage,
      position: vec3(0, 0.1, 0.002),
      visible: false,
    });
    this.list = createEntity("a-entity", { position: vec3(0, 0, 0.003) });
    [this.panel, this.title, this.subtitle, this.roomCode, this.status, this.creditsImage, this.list]
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
      this.showScreen(SCREENS.HOME);
      if (this.pendingNotice) {
        this.setStatus(this.pendingNotice, { error: true, ms: HUD_STATUS_MS * 2 });
        this.pendingNotice = null;
      }
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

  // Altura do painel e posição de título, subtítulo, código e status.
  layout(height) {
    const top = height / 2;
    this.panel.setAttribute("height", height);
    this.title.setAttribute("position", vec3(0, top - 0.1, 0.002));
    this.subtitle.setAttribute("position", vec3(0, top - 0.19, 0.002));
    this.roomCode.setAttribute("position", vec3(0, top - 0.3, 0.002));
    this.status.setAttribute("position", vec3(0, -top + 0.06, 0.002));
    return top;
  },

  showScreen(screen) {
    this.screen = screen;
    this.el.dataset.screen = screen;
    const credits = screen === SCREENS.CREDITS;
    const join = screen === SCREENS.JOIN;
    const hosting = screen === SCREENS.HOSTING;
    const top = this.layout(join ? MENU_LAYOUT.joinHeight : MENU_LAYOUT.height);
    this.panel.setAttribute("material", "color", credits ? MENU_COLORS.credits : MENU_COLORS.panel);
    this.title.setAttribute("visible", !credits);
    this.subtitle.setAttribute("visible", !credits);
    this.subtitle.setAttribute("value", MENU_TEXTS[screen] || "");
    this.creditsImage.setAttribute("visible", credits);
    this.roomCode.setAttribute("visible", join || hosting);
    this.setStatus("");
    this.clearButtons();
    const options = MENU_OPTIONS[screen];
    const { button } = MENU_LAYOUT;
    if (join) {
      this.typed = "";
      this.showTyped();
      // Teclado abaixo do código; "Voltar" embaixo do teclado.
      const bottom = this.buildKeypad(top - 0.42);
      const ys = stackPositions(options.length, button.height, button.gap, bottom - 0.04 - button.height / 2);
      this.buttons.push(...options.map((option, index) => this.buildButton(option, 0, ys[index])));
      return;
    }
    if (hosting) {
      // O código aparece quando a sala abrir (NETWORK_CHANGED).
      this.roomCode.setAttribute("value", "- - - -");
    }
    // Créditos: "Voltar" embaixo da foto; sala criada: "Cancelar" embaixo
    // do código; nas outras, botões no meio.
    const centerY = credits ? -0.27 : hosting ? -0.16 : -0.05;
    const ys = stackPositions(options.length, button.height, button.gap, centerY);
    this.buttons = options.map((option, index) => this.buildButton(option, 0, ys[index]));
  },

  // Teclado numérico 3 x 4 com a 1ª linha centrada em `firstY`. Retorna o
  // y da borda de baixo.
  buildKeypad(firstY) {
    const { width, height, gap } = MENU_LAYOUT.key;
    KEYPAD_KEYS.forEach((row, r) => {
      row.forEach((key, c) => {
        const option = /^\d$/.test(key)
          ? { action: MENU_ACTIONS.KEY, key, label: key }
          : { action: key === "delete" ? MENU_ACTIONS.DELETE : MENU_ACTIONS.ENTER, label: KEYPAD_LABELS[key] };
        const x = (c - 1) * (width + gap);
        const y = firstY - r * (height + gap);
        this.buttons.push(this.buildButton(option, x, y, { width, height, id: key }));
      });
    });
    return firstY - (KEYPAD_KEYS.length - 1) * (height + gap) - height / 2;
  },

  showTyped() {
    this.roomCode.setAttribute("value", displayRoomCode(this.typed, ROOM.codeLength));
  },

  clearButtons() {
    while (this.list.firstChild) {
      this.list.removeChild(this.list.firstChild);
    }
    this.buttons = [];
  },

  // Plano (alvo dos raios) + texto irmão na frente (como no HUD).
  buildButton(option, x, y, size = MENU_LAYOUT.button) {
    const { width, height } = size;
    const idle = option.soon ? HUD_COLORS.disabled : HUD_COLORS.button;
    const plane = createEntity("a-plane", {
      class: `${HUD_BUTTON_CLASS} menu-button`,
      "data-option": size.id || option.action,
      "data-soon": String(Boolean(option.soon)),
      position: vec3(x, y, 0),
      width, height,
      material: `color: ${idle}; shader: flat`,
    });
    const label = createEntity("a-text", {
      value: option.label, align: "center", color: HUD_COLORS.text,
      "wrap-count": size.id ? 8 : 16, width, position: vec3(x, y, 0.002),
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
    if (option.action === MENU_ACTIONS.KEY || option.action === MENU_ACTIONS.DELETE) {
      this.typed = typeRoomKey(this.typed, option.key ?? "delete", ROOM.codeLength);
      this.showTyped();
      return;
    }
    const { screen, start, notice, network } = chooseMenuOption(this.screen, option);
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
    this.requestNetwork(network);
  },

  requestNetwork(request) {
    const net = this.network();
    if (!request || !net) {
      return;
    }
    if (request === "create") {
      net.createRoom();
    } else if (request === "leave") {
      net.leave();
    } else if (request === "join") {
      if (net.isBusy()) {
        return;
      }
      if (!isValidRoomCode(this.typed, ROOM.codeLength)) {
        this.setStatus(NETWORK_TEXTS.typeCode, { error: true });
        return;
      }
      net.joinRoom(this.typed);
    }
  },

  // Estado da sala (sistema "network") nas telas "sala criada"/"entrar".
  showNetwork(detail) {
    if (!detail) {
      return;
    }
    const errorText = detail.error ? NETWORK_TEXTS.errors[detail.error] || NETWORK_TEXTS.errors.network : "";
    if (detail.error === "lost" && !this.isOpen()) {
      // Saiu no meio da partida: o menu vai abrir; mostra lá.
      this.pendingNotice = errorText;
      return;
    }
    if (!this.isOpen()) {
      return;
    }
    if (this.screen === SCREENS.HOSTING) {
      const waiting = detail.state === NET.WAITING || detail.state === NET.HANDSHAKE;
      this.roomCode.setAttribute("value", waiting && detail.code ? detail.code.split("").join(" ") : "- - - -");
    }
    if (errorText) {
      this.setStatus(errorText, { error: true, ms: HUD_STATUS_MS * 2 });
      return;
    }
    const text = {
      [NET.OPENING]: NETWORK_TEXTS.opening,
      [NET.WAITING]: NETWORK_TEXTS.waiting,
      [NET.JOINING]: NETWORK_TEXTS.joining,
      [NET.HANDSHAKE]: NETWORK_TEXTS.handshake,
    }[detail.state];
    this.setStatus(text || "", { sticky: true });
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

  /**
   * Mensagem no status. `error`: em vermelho; `sticky`: fica até a
   * próxima; `ms`: quanto tempo fica (padrão HUD_STATUS_MS).
   */
  setStatus(text, { error = false, sticky = false, ms = HUD_STATUS_MS } = {}) {
    this.status.setAttribute("value", text);
    this.status.setAttribute("color", error ? MENU_COLORS.error : MENU_COLORS.status);
    clearTimeout(this.statusTimer);
    if (text && !sticky) {
      this.statusTimer = setTimeout(() => this.status.setAttribute("value", ""), ms);
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

  remove() {
    clearTimeout(this.statusTimer);
    const sceneEl = this.el.sceneEl;
    sceneEl.removeEventListener(EVENTS.GAME_MODE_CHANGED, this.onModeChanged);
    sceneEl.removeEventListener(EVENTS.NETWORK_CHANGED, this.onNetwork);
    sceneEl.removeEventListener("enter-vr", this.onViewChanged);
    sceneEl.removeEventListener("exit-vr", this.onViewChanged);
    (this.hands || []).forEach((hand) => hand.removeEventListener("pinchstarted", this.onPinch));
  },
});
