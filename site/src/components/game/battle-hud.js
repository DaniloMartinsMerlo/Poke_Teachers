import { EVENTS, HUD_BUTTON_CLASS } from "../../config/constants.js";
import { ATTACKS, DAMAGE_RULES, POWERUPS } from "../../config/battle.js";
import { TYPE_BEATS } from "../../config/teachers.js";
import { calculateDamage } from "../../domain/combat.js";
import { fighter } from "../../domain/turn.js";
import {
  GAME_OVER_OPTIONS,
  HUD_ACTIONS,
  HUD_ANGLE_DEG,
  HUD_BADGE_COLORS,
  HUD_BUTTON,
  HUD_CARD_GAP,
  HUD_COLORS,
  HUD_DETAIL,
  HUD_DETAIL_COLOR,
  HUD_DISTANCE,
  HUD_DROP,
  HUD_HEIGHT_SLACK,
  HUD_LAYOUT,
  HUD_LOG,
  HUD_LOG_COLORS,
  HUD_PAGES,
  HUD_PINCH_REACH,
  HUD_POSITION_SLACK,
  HUD_RECENTER_DEG,
  HUD_RECENTER_DELAY_MS,
  HUD_RECENTER_RATE,
  HUD_RESULT_COLORS,
  HUD_STATUS_MS,
  HUD_TEXTS,
  MAIN_OPTIONS,
} from "../../config/hud.js";
import { playerInfo } from "../../config/players.js";
import { angleBetween, approachAngle } from "../../domain/battle.js";
import { chooseHudOption, logLine, optionDetail, pullWithin, pullWithin1D } from "../../domain/hud.js";
import { frameSeconds } from "../../utils/time.js";
import { createEntity, vec3, whenSceneLoaded } from "../../utils/entity.js";
import { buttonAtPoint, pinchWorldPoint } from "../../utils/pinch.js";
import { PokeprofCard } from "./pokeprof-card.js";

const PAGE_TITLES = Object.freeze({
  [HUD_PAGES.MAIN]: "Batalha",
  [HUD_PAGES.ATTACK]: "Ataque",
  [HUD_PAGES.POWERUP]: "PowerUps",
  [HUD_PAGES.GAME_OVER]: "Fim de jogo",
});

// Botões que dependem do turno: travados depois de escolher, enquanto o
// turno resolve e no fim de jogo.
const TURN_ACTIONS = new Set([HUD_ACTIONS.ATTACK, HUD_ACTIONS.POWERUP]);

const BACK_OPTION = Object.freeze({ action: HUD_ACTIONS.BACK, label: "Voltar" });

// Menu de batalha à esquerda do jogador, um pouco abaixo dos olhos. Segue
// o CORPO, não a cabeça: virar a cabeça para olhar/apertar um botão deixa
// o menu parado. É filho do rig, então anda e gira junto com a locomoção
// (WASD, analógicos). Andar de verdade (passos no quarto) o arrasta depois
// de uma folga; girar o corpo de verdade o recentraliza (ver config/hud.js).
//
// Botões em grade 2x2 ("Voltar" ocupa a linha de baixo nas páginas de
// ataque e power-up). Botões: mouse (olhar + clique), laser do controle (gatilho) ou pinça da
// mão rastreada perto do botão. Menu principal: Ataque, PowerUps, Trocar
// PokeProf e Desistir. Ataque e PowerUps abrem páginas com 4 opções e
// "Voltar". Cada escolha vira o evento HUD_ACTION na cena; "Trocar" também
// pede RECALL_REQUESTED (o suporte traz a bola de volta).
//
// Turnos (sistema "battle"): escolhido o ataque/power-up, mostra
// "Aguardando adversario..." e trava Ataque e PowerUps (cinza) até o turno
// resolver; Trocar fica travado só enquanto o turno resolve. Cada ação do
// turno aparece no status. No fim de jogo mostra "Voce venceu!/perdeu!" e
// o botão "Jogar de novo" (reseta a partida).
//
// PokeProf do jogador em campo: o cartão dele (foto, vida, atributos) fica
// logo acima do painel e acompanha a vida ao vivo; some ao recolher.
//
// Tela inicial (sistema "game-flow" no menu): o HUD some e fica sem
// botões. Fim de jogo: "Jogar de novo" e "Menu".
//
// Deve ficar dentro do rig do jogador no HTML.
AFRAME.registerComponent("battle-hud", {
  schema: {
    player: { default: "p1" },
  },

  init() {
    this.page = HUD_PAGES.MAIN;
    // Cartões dos PokeProfs em campo (acima do painel), por jogador:
    // { card, ball, onChanged }.
    this.fieldCards = new Map();
    this.buttons = [];
    // Âncora do corpo no espaço do rig: posição dos olhos e direção.
    this.anchor = null;
    this.bodyYaw = 0;
    this.turnedAwayMs = 0;
    this.recentering = false;
    this.statusTimer = null;
    this.head = new THREE.Vector3();
    this.forward = new THREE.Vector3();
    this.eye = new THREE.Vector3();
    this.rigQuaternion = new THREE.Quaternion();

    this.hidden = this.el.sceneEl.systems["game-flow"]?.isMenu() ?? false;
    this.el.object3D.visible = !this.hidden;
    this.build();
    this.showPage(HUD_PAGES.MAIN);
    this.onModeChanged = () => {
      this.hidden = this.el.sceneEl.systems["game-flow"].isMenu();
      this.el.object3D.visible = !this.hidden;
      this.anchor = null;
      this.showPage(HUD_PAGES.MAIN);
    };
    this.el.sceneEl.addEventListener(EVENTS.GAME_MODE_CHANGED, this.onModeChanged);

    this.onBlocked = ({ detail }) => {
      if (detail.player !== this.data.player) {
        return;
      }
      const name = detail.ball.components.pokeprof?.prof.name;
      this.setStatus(detail.reason === "fainted"
        ? `${name} esta desmaiado!`
        : "Apenas 1 PokeProf por vez!");
    };
    // Turno: cada ação aparece no status; travas seguem o estado do turno.
    this.lockKey = "";
    this.logEntries = [];
    this.turnNumber = 0;
    this.onTurnAction = ({ detail }) => this.logAction(detail);
    this.onTurnStarted = () => {
      this.turnNumber += 1;
      this.addLog(`Turno ${this.turnNumber}`, HUD_LOG_COLORS.turn);
      this.setStatus(HUD_TEXTS.resolving, true);
    };
    this.onTurnResolved = () => this.setStatus("");
    this.onTurnChanged = () => this.refreshLocks();
    this.onGameOver = ({ detail }) => {
      this.addLog(`Fim de jogo: ${playerInfo(detail.winner).label} venceu!`, HUD_LOG_COLORS.turn);
      this.showGameOver(detail.winner === this.data.player);
    };
    this.onGameReset = () => {
      this.setStatus("");
      this.turnNumber = 0;
      this.logEntries = [];
      this.renderLog();
      this.lockKey = this.computeLockKey();
      this.showPage(HUD_PAGES.MAIN);
    };
    const sceneEvents = [
      [EVENTS.TURN_ACTION, this.onTurnAction],
      [EVENTS.TURN_STARTED, this.onTurnStarted],
      [EVENTS.TURN_RESOLVED, this.onTurnResolved],
      [EVENTS.TURN_CHANGED, this.onTurnChanged],
      [EVENTS.GAME_OVER, this.onGameOver],
      [EVENTS.GAME_RESET, this.onGameReset],
    ];
    this.sceneEvents = sceneEvents;
    sceneEvents.forEach(([name, handler]) => this.el.sceneEl.addEventListener(name, handler));
    // Dano estimado nos botões de ataque depende de quem está em campo.
    this.refreshAttackPage = () => {
      if (this.page === HUD_PAGES.ATTACK) {
        this.showPage(HUD_PAGES.ATTACK);
      }
    };
    this.onSentOut = ({ detail }) => {
      this.showFieldCard(detail.player, detail.ball);
      this.refreshAttackPage();
    };
    this.onRecalled = ({ detail }) => {
      if (this.fieldCards.get(detail.player)?.ball === detail.ball) {
        this.hideFieldCard(detail.player);
      }
      this.refreshAttackPage();
    };
    this.el.sceneEl.addEventListener(EVENTS.POKEMON_RELEASED, this.onSentOut);
    this.el.sceneEl.addEventListener(EVENTS.POKEMON_RECALLED, this.onRecalled);
    this.onPinch = (event) => this.pressAtPinch(event);
    // Entrou/saiu do VR: a cabeça "pula"; reancora na nova posição.
    this.onViewChanged = () => { this.anchor = null; };
    this.el.sceneEl.addEventListener("enter-vr", this.onViewChanged);
    this.el.sceneEl.addEventListener("exit-vr", this.onViewChanged);
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
    [this.panel, this.stripe, this.title, this.list, this.status, this.buildLog()]
      .forEach((child) => this.el.appendChild(child));
  },

  // Registro de batalha à direita do painel: "Turno N" e cada ação, na
  // cor do dono; a mais nova embaixo.
  buildLog() {
    const { width, lines, lineHeight, wrapCount } = HUD_LOG;
    const { padding, title } = HUD_LAYOUT;
    this.logHeight = padding + title + lines * lineHeight + padding;
    const top = this.logHeight / 2;
    const textWidth = width - 2 * padding;
    this.logLines = Array.from({ length: lines }, (_, index) => createEntity("a-text", {
      class: "hud-log-line", value: "", anchor: "left", align: "left",
      color: HUD_COLORS.text, "wrap-count": wrapCount, width: textWidth,
      position: vec3(-textWidth / 2, top - padding - title - (index + 0.5) * lineHeight, 0.002),
    }));
    this.logPanel = createEntity("a-entity", { class: "hud-log" }, [
      createEntity("a-plane", {
        width, height: this.logHeight,
        material: `color: ${HUD_COLORS.panel}; shader: flat; transparent: true; opacity: 0.88`,
      }),
      createEntity("a-text", {
        value: "Registro da batalha", align: "center", color: "#ffffff", "wrap-count": 30, width: textWidth,
        position: vec3(0, top - padding - title / 2, 0.002),
      }),
      ...this.logLines,
    ]);
    return this.logPanel;
  },

  addLog(text, color) {
    this.logEntries.push({ text, color });
    this.logEntries = this.logEntries.slice(-HUD_LOG.lines);
    this.renderLog();
  },

  renderLog() {
    this.logLines.forEach((line, index) => {
      const entry = this.logEntries[index];
      line.setAttribute("value", entry ? entry.text : "");
      if (entry) {
        line.setAttribute("color", entry.color);
      }
    });
  },

  logAction(detail) {
    const color = (player) => HUD_LOG_COLORS[player] || HUD_COLORS.text;
    this.addLog(logLine(detail, playerInfo(detail.player).label), color(detail.player));
    if (detail.fainted) {
      this.addLog(`${playerInfo(detail.target).label} ${detail.targetName} desmaiou!`, color(detail.target));
    }
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
    // Registro alinhado pelo topo, à direita do painel.
    this.logPanel.object3D.position.set(
      this.panelWidth / 2 + HUD_LOG.gap + HUD_LOG.width / 2, top - this.logHeight / 2, 0);
    this.panelTop = top;
    this.placeFieldCards();
  },

  // Cartão do PokeProf de `player` (o do jogador ou o adversário).
  showFieldCard(player, ball) {
    this.hideFieldCard(player);
    const prof = ball.components.pokeprof?.prof;
    const mine = player === this.data.player;
    const card = new PokeprofCard(prof?.name || "", "horizontal", {
      width: this.panelWidth, owner: playerInfo(player),
    });
    card.el.classList.add("hud-field-card", mine ? "hud-field-card-mine" : "hud-field-card-opponent");
    card.el.dataset.player = player;
    const onChanged = () => card.refresh(ball.components.pokeprof?.prof);
    ball.addEventListener(EVENTS.POKEPROF_CHANGED, onChanged);
    this.fieldCards.set(player, { card, ball, onChanged });
    this.el.appendChild(card.el);
    onChanged();
    this.placeFieldCards();
  },

  hideFieldCard(player) {
    const entry = this.fieldCards.get(player);
    if (!entry) {
      return;
    }
    entry.ball.removeEventListener(EVENTS.POKEPROF_CHANGED, entry.onChanged);
    entry.card.remove();
    this.fieldCards.delete(player);
    this.placeFieldCards();
  },

  // Empilha acima do painel: o do jogador embaixo, o adversário em cima
  // (como nas batalhas Pokémon). A altura do painel muda com a página.
  placeFieldCards() {
    if (this.panelTop === undefined) {
      return;
    }
    const mine = this.data.player;
    const order = [...this.fieldCards.keys()].sort((a, b) => (a === mine ? -1 : b === mine ? 1 : 0));
    let y = this.panelTop + HUD_CARD_GAP;
    order.forEach((player) => {
      const { card } = this.fieldCards.get(player);
      // setAttribute: vale mesmo antes de a entidade carregar.
      card.el.setAttribute("position", { x: 0, y: y + card.height() / 2, z: 0 });
      y += card.height() + HUD_CARD_GAP;
    });
  },

  optionsOf(page) {
    if (page === HUD_PAGES.ATTACK) return [...ATTACKS, BACK_OPTION];
    if (page === HUD_PAGES.POWERUP) return [...POWERUPS, BACK_OPTION];
    if (page === HUD_PAGES.GAME_OVER) return GAME_OVER_OPTIONS;
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
    // Escondido (menu): sem botões, para nenhum raio ou pinça acertá-los.
    if (this.hidden) {
      this.buttons = [];
      return;
    }
    if (page === HUD_PAGES.GAME_OVER) {
      this.layout(2);
      this.list.appendChild(this.buildResultText());
    } else {
      this.layout(options.length > 4 ? 3 : 2);
    }
    this.buttons = options.map((option, index) => this.buildButton(option, this.slotOf(page, index)));
  },

  // Fim de jogo: resultado grande na 1ª linha, "Jogar de novo" na 2ª.
  showGameOver(won) {
    this.won = won;
    this.setStatus("");
    this.showPage(HUD_PAGES.GAME_OVER);
  },

  buildResultText() {
    return createEntity("a-text", {
      class: "hud-result",
      value: this.won ? HUD_TEXTS.win : HUD_TEXTS.lose,
      color: this.won ? HUD_RESULT_COLORS.win : HUD_RESULT_COLORS.lose,
      align: "center", "wrap-count": 14, width: this.gridWidth,
      position: vec3(0, 0, 0.002),
    });
  },

  // Posição e largura do botão `index` na página. Grade 2x2: índices 0–3
  // nas duas primeiras linhas; o 5º ("Voltar") ocupa a linha de baixo
  // inteira. No fim de jogo, os botões ficam lado a lado na 2ª linha.
  slotOf(page, index) {
    const { width, height, gap } = HUD_BUTTON;
    const full = 2 * width + gap;
    if (page === HUD_PAGES.GAME_OVER) {
      return { x: (index - 0.5) * (width + gap), y: -(height + gap), width };
    }
    if (index < 4) {
      return { x: ((index % 2) - 0.5) * (width + gap), y: -Math.floor(index / 2) * (height + gap), width };
    }
    return { x: 0, y: -2 * (height + gap), width: full };
  },

  // Botão = plano (alvo dos raios) + texto irmão na frente. O texto não é
  // filho do plano para o raio sempre acusar o próprio botão. Botão
  // travado fica cinza e não responde.
  buildButton(option, { x, y, width }) {
    const { height } = HUD_BUTTON;
    const locked = this.isLocked(option);
    const idleColor = locked ? HUD_COLORS.disabled : HUD_COLORS.button;
    const plane = createEntity("a-plane", {
      class: HUD_BUTTON_CLASS,
      "data-option": option.action || option.id,
      "data-locked": String(locked),
      position: vec3(x, y, 0),
      width, height,
      material: `color: ${idleColor}; shader: flat`,
    });
    const detail = optionDetail(option, this.estimateDamage(option), this.ppLeft(option));
    const label = createEntity("a-text", {
      value: option.label, align: "center", color: HUD_COLORS.text,
      "wrap-count": 18, width: HUD_BUTTON.width,
      position: vec3(x, y + (detail ? HUD_DETAIL.labelLift : 0), 0.002),
    });
    const detailText = detail ? this.buildDetail(option, detail, x, y) : null;
    const highlight = (on) => {
      const active = on && !this.isLocked(option);
      plane.setAttribute("material", "color", active ? HUD_COLORS.buttonHover : idleColor);
      label.setAttribute("color", active ? HUD_COLORS.textHover : HUD_COLORS.text);
      // Poder do ataque (texto solto) acompanha o destaque; o badge não.
      if (detailText && !option.effect) {
        detailText.setAttribute("color", active ? HUD_COLORS.textHover : HUD_DETAIL_COLOR);
      }
    };
    plane.addEventListener("mouseenter", () => highlight(true));
    plane.addEventListener("mouseleave", () => highlight(false));
    plane.addEventListener("click", () => this.choose(option));
    this.list.appendChild(plane);
    this.list.appendChild(label);
    return { plane, option, width, height };
  },

  // Linha de baixo do botão: ataque = "Poder 60 (~32 dano)"; power-up =
  // badge colorido com o efeito ("ATQ +50% (1 turno)"). Sem classe de
  // botão: o raio atravessa e acerta o botão.
  buildDetail(option, value, x, y) {
    const rowY = y + HUD_DETAIL.rowY;
    const text = createEntity("a-text", {
      class: "hud-option-detail",
      value, align: "center", color: option.effect ? "#ffffff" : HUD_DETAIL_COLOR,
      "wrap-count": 30, width: HUD_BUTTON.width,
      position: vec3(x, rowY, 0.003),
    });
    if (option.effect) {
      this.list.appendChild(createEntity("a-plane", {
        class: "hud-badge",
        width: HUD_DETAIL.badgeWidth, height: HUD_DETAIL.badgeHeight,
        position: vec3(x, rowY, 0.001),
        material: `color: ${HUD_BADGE_COLORS[option.effect === "heal" ? "heal" : option.stat]}; shader: flat`,
      }));
    }
    this.list.appendChild(text);
    return text;
  },

  // PP restante do ataque para o PokeProf do jogador em campo (ou null).
  ppLeft(option) {
    if (typeof option.pp !== "number") {
      return null;
    }
    return this.el.sceneEl.systems.battle?.ppLeft(this.data.player, option.id) ?? null;
  },

  // Dano estimado do ataque contra o PokeProf do adversário em campo
  // (atributos e power-ups de agora), ou null.
  estimateDamage(option) {
    const battle = this.el.sceneEl.systems.battle;
    if (typeof option.power !== "number" || !battle) {
      return null;
    }
    const mine = battle.activeProf(this.data.player)?.prof;
    const foe = battle.activeProf(battle.opponentOf(this.data.player))?.prof;
    if (!mine || !foe || foe.isFainted()) {
      return null;
    }
    return calculateDamage(fighter(mine), fighter(foe), option.power, TYPE_BEATS, DAMAGE_RULES);
  },

  // Botão travado pelo turno? Ataques e power-ups (e os botões que abrem
  // as páginas deles) depois de escolher (inclusive trocar), durante a
  // resolução e no fim de jogo; ataque sem PP sempre. Trocar só durante a
  // resolução e no fim de jogo (trocar depois de escolher troca a escolha).
  isLocked(option) {
    const battle = this.el.sceneEl.systems.battle;
    if (!battle) {
      return false;
    }
    const busy = battle.isResolving() || battle.isGameOver();
    const onTurnPage = this.page === HUD_PAGES.ATTACK || this.page === HUD_PAGES.POWERUP;
    if (TURN_ACTIONS.has(option.action) || (onTurnPage && option.id)) {
      return busy || battle.hasChosen(this.data.player) || this.ppLeft(option) === 0;
    }
    return option.action === HUD_ACTIONS.SWITCH && busy;
  },

  computeLockKey() {
    return MAIN_OPTIONS.map((option) => (this.isLocked(option) ? 1 : 0)).join("");
  },

  // Estado do turno mudou: redesenha os botões se alguma trava mudou.
  // Travado numa página de ataque/power-up: volta ao menu principal.
  refreshLocks() {
    if (this.page === HUD_PAGES.GAME_OVER) {
      return;
    }
    const key = this.computeLockKey();
    if (key === this.lockKey) {
      return;
    }
    this.lockKey = key;
    const onTurnPage = this.page === HUD_PAGES.ATTACK || this.page === HUD_PAGES.POWERUP;
    this.showPage(onTurnPage && this.isLocked({ action: HUD_ACTIONS.ATTACK }) ? HUD_PAGES.MAIN : this.page);
  },

  choose(option) {
    if (this.hidden || this.isLocked(option)) {
      return;
    }
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
    // Status padrão antes do evento: se o ataque acertar, o sistema de
    // batalha emite POKEMON_DAMAGED e o status é trocado pelo dano.
    this.defaultStatus(emit, option, activeBall, activeName);
    sceneEl.emit(EVENTS.HUD_ACTION, { player, ...emit }, false);
    this.refreshLocks();
    if (emit.action === HUD_ACTIONS.SWITCH && activeBall) {
      sceneEl.emit(EVENTS.RECALL_REQUESTED, { player }, false);
    }
  },

  defaultStatus(emit, option, activeBall, activeName) {
    switch (emit.action) {
      case HUD_ACTIONS.SWITCH:
        if (!activeBall) {
          this.setStatus("Nenhum PokeProf em campo");
          return;
        }
        // Com o turno aberto, a troca é a ação do turno.
        this.setStatus(this.el.sceneEl.systems.battle.isTurnOpen()
          ? `Volte, ${activeName}! (gasta o turno)`
          : `Volte, ${activeName}!`);
        return;
      case HUD_ACTIONS.ATTACK:
      case HUD_ACTIONS.POWERUP: {
        const battle = this.el.sceneEl.systems.battle;
        const opponent = battle.opponentOf(this.data.player);
        if (battle.canChoose(this.data.player)) {
          // Se o adversário já escolheu, o turno começa na hora e troca
          // este texto por "Resolvendo".
          this.setStatus(HUD_TEXTS.waiting, true);
        } else if (!activeBall) {
          this.setStatus("Nenhum PokeProf em campo");
        } else if (activeBall.components.pokeprof?.prof.isFainted()) {
          this.setStatus(`${activeName} esta desmaiado`);
        } else if (!battle.activeBall(opponent) || battle.activeProf(opponent).prof.isFainted()) {
          this.setStatus("Aguarde o adversario lancar um PokeProf");
        }
        return;
      }
      default:
        // Desistir: por enquanto não faz nada.
    }
  },

  /** Mensagem no status; some depois de HUD_STATUS_MS, salvo `sticky`. */
  setStatus(text, sticky = false) {
    this.status.setAttribute("value", text);
    clearTimeout(this.statusTimer);
    if (!sticky && text) {
      this.statusTimer = setTimeout(() => this.status.setAttribute("value", ""), HUD_STATUS_MS);
    }
  },

  // Mão rastreada: pinça encostada num botão.
  pressAtPinch(event) {
    const point = pinchWorldPoint(event);
    const hit = point && buttonAtPoint(point, this.buttons, HUD_PINCH_REACH, ({ option }) => this.isLocked(option));
    if (hit) {
      this.choose(hit.option);
    }
  },

  // Cabeça no espaço do pai (rig): posição e direção horizontal (rad).
  readHead(camera) {
    const parent = this.el.object3D.parent;
    camera.getWorldPosition(this.head);
    parent.worldToLocal(this.head);
    camera.getWorldDirection(this.forward);
    parent.getWorldQuaternion(this.rigQuaternion);
    this.forward.applyQuaternion(this.rigQuaternion.invert());
    return Math.atan2(-this.forward.x, -this.forward.z);
  },

  // O corpo só "gira" quando a cabeça fica virada para longe por um tempo.
  updateBodyYaw(heading, deltaMs) {
    const away = Math.abs(angleBetween(this.bodyYaw, heading));
    if (this.recentering) {
      this.bodyYaw = approachAngle(this.bodyYaw, heading,
        1 - Math.exp(-HUD_RECENTER_RATE * frameSeconds(deltaMs)));
      this.recentering = away > THREE.MathUtils.degToRad(5);
      return;
    }
    this.turnedAwayMs = away > THREE.MathUtils.degToRad(HUD_RECENTER_DEG)
      ? this.turnedAwayMs + deltaMs
      : 0;
    if (this.turnedAwayMs >= HUD_RECENTER_DELAY_MS) {
      this.recentering = true;
      this.turnedAwayMs = 0;
    }
  },

  tick(time, delta) {
    const camera = this.el.sceneEl.camera;
    if (!camera || !this.el.object3D.parent) {
      return;
    }
    const heading = this.readHead(camera);
    if (!this.anchor) {
      this.anchor = this.head.clone();
      this.bodyYaw = heading;
    }
    const flat = pullWithin(this.anchor, this.head, HUD_POSITION_SLACK);
    this.anchor.set(flat.x, pullWithin1D(this.anchor.y, this.head.y, HUD_HEIGHT_SLACK), flat.z);
    this.updateBodyYaw(heading, Math.min(delta || 0, 100));

    const angle = this.bodyYaw + THREE.MathUtils.degToRad(HUD_ANGLE_DEG);
    const object = this.el.object3D;
    object.position.set(
      this.anchor.x - Math.sin(angle) * HUD_DISTANCE,
      this.anchor.y - HUD_DROP,
      this.anchor.z - Math.cos(angle) * HUD_DISTANCE);
    // Vira para os olhos da âncora (lookAt usa coordenadas de mundo).
    object.parent.localToWorld(this.eye.copy(this.anchor));
    object.lookAt(this.eye);
  },

  remove() {
    clearTimeout(this.statusTimer);
    this.el.sceneEl.removeEventListener(EVENTS.GAME_MODE_CHANGED, this.onModeChanged);
    this.el.sceneEl.removeEventListener(EVENTS.SEND_OUT_BLOCKED, this.onBlocked);
    this.sceneEvents.forEach(([name, handler]) => this.el.sceneEl.removeEventListener(name, handler));
    this.el.sceneEl.removeEventListener(EVENTS.POKEMON_RELEASED, this.onSentOut);
    this.el.sceneEl.removeEventListener(EVENTS.POKEMON_RECALLED, this.onRecalled);
    [...this.fieldCards.keys()].forEach((player) => this.hideFieldCard(player));
    this.el.sceneEl.removeEventListener("enter-vr", this.onViewChanged);
    this.el.sceneEl.removeEventListener("exit-vr", this.onViewChanged);
    (this.hands || []).forEach((hand) => hand.removeEventListener("pinchstarted", this.onPinch));
  },
});
