import { EVENTS, NO_GRAB_ATTRIBUTE } from "../../config/constants.js";
import { HUD_ACTIONS } from "../../config/hud.js";
import { MESSAGE_TYPES } from "../../config/network.js";
import { PLAYER_IDS } from "../../config/players.js";
import {
  buildBlockedMessage,
  buildChooseMessage,
  buildGameOverMessage,
  buildPlayAgainMessage,
  buildRecallMessage,
  buildRecalledMessage,
  buildReleasedMessage,
  buildResetMessage,
  buildThrowMessage,
  buildTurnActionMessage,
  buildTurnResolvedMessage,
  buildTurnStartedMessage,
  isValidBattleMessage,
} from "../../domain/protocol.js";
import { ACTION_KINDS } from "../../domain/turn.js";

const M = MESSAGE_TYPES;

// Sincronização da partida online J1 x J2 (fica no suporte do J2, ao lado
// do "cpu-player").
//
// Anfitrião (J1, `host`): é a autoridade. Recebe os arremessos, escolhas,
// trocas e "Jogar de novo" do J2 e chama `battle.choose()`, `launch()` ou
// `recallActive()` como a CPU; envia ao J2 tudo o que o sistema "battle"
// decide (PokeProf solto/recolhido/barrado, início/ações/fim do turno,
// fim de jogo e reset).
//
// Convidado (J2, `guest`): envia os próprios arremessos e escolhas ao J1
// e aplica na cena o que o J1 manda.
//
// Em ambos os lados, trava as bolas do adversário (`data-no-grab`) e
// destrava as do jogador local.
AFRAME.registerComponent("remote-player", {
  init() {
    this.applyingRemote = false;
    const sceneEl = this.el.sceneEl;

    this.onModeChanged = () => this.updateBallLocks();
    this.onMessage = ({ detail }) => this.handleMessage(detail);
    this.onBallThrown = ({ detail }) => this.handleBallThrown(detail);
    this.onReleased = ({ detail }) => this.handleReleased(detail);
    this.onRecalled = ({ detail }) => this.handleRecalled(detail);
    this.onBlocked = ({ detail }) => this.handleBlocked(detail);
    this.onTurnChanged = ({ detail }) => this.handleTurnChanged(detail);
    this.onTurnStarted = ({ detail }) => this.handleTurnStarted(detail);
    this.onTurnAction = ({ detail }) => this.handleTurnAction(detail);
    this.onTurnResolved = () => this.handleTurnResolved();
    this.onGameOver = ({ detail }) => this.handleGameOver(detail);
    this.onGameReset = () => this.handleGameReset();
    this.onHudAction = ({ detail }) => this.handleHudAction(detail);

    this.sceneEvents = [
      [EVENTS.GAME_MODE_CHANGED, this.onModeChanged],
      [EVENTS.NETWORK_MESSAGE, this.onMessage],
      [EVENTS.BALL_THROWN, this.onBallThrown],
      [EVENTS.POKEMON_RELEASED, this.onReleased],
      [EVENTS.POKEMON_RECALLED, this.onRecalled],
      [EVENTS.SEND_OUT_BLOCKED, this.onBlocked],
      [EVENTS.TURN_CHANGED, this.onTurnChanged],
      [EVENTS.TURN_STARTED, this.onTurnStarted],
      [EVENTS.TURN_ACTION, this.onTurnAction],
      [EVENTS.TURN_RESOLVED, this.onTurnResolved],
      [EVENTS.GAME_OVER, this.onGameOver],
      [EVENTS.GAME_RESET, this.onGameReset],
      [EVENTS.HUD_ACTION, this.onHudAction],
    ];
    this.sceneEvents.forEach(([name, fn]) => sceneEl.addEventListener(name, fn));
  },

  flow() {
    return this.el.sceneEl.systems["game-flow"];
  },

  battle() {
    return this.el.sceneEl.systems.battle;
  },

  network() {
    return this.el.sceneEl.systems.network;
  },

  rackOf(player) {
    const el = [...this.el.sceneEl.querySelectorAll("[ball-rack]")]
      .find((node) => node.components["ball-rack"]?.data.player === player);
    return el?.components["ball-rack"] || null;
  },

  ballIndex(player, ball) {
    return this.rackOf(player)?.balls.indexOf(ball) ?? -1;
  },

  ballAt(player, index) {
    return this.rackOf(player)?.balls[index] || null;
  },

  send(msg) {
    this.network()?.send(msg);
  },

  // Na partida online, só as bolas do jogador local podem ser pegas.
  // Ao sair da partida online, destrava todas (a CPU trava as dela no tick).
  updateBallLocks() {
    const flow = this.flow();
    const online = flow?.isOnline();
    const mine = flow?.localPlayer();
    PLAYER_IDS.forEach((player) => {
      const lock = online && player !== mine;
      (this.rackOf(player)?.balls || []).forEach((ball) => {
        if (lock) {
          ball.setAttribute(NO_GRAB_ATTRIBUTE, "true");
        } else {
          ball.removeAttribute(NO_GRAB_ATTRIBUTE);
        }
      });
    });
  },

  tick() {
    if (this.flow()?.isOnline()) {
      this.updateBallLocks();
    }
  },

  // --------------------------------------------------- eventos locais → rede
  handleBallThrown({ player, ball, from, velocity }) {
    const flow = this.flow();
    if (!flow?.isOnline() || this.applyingRemote || player !== flow.localPlayer()) {
      return;
    }
    const index = this.ballIndex(player, ball);
    if (index >= 0) {
      this.send(buildThrowMessage(player, index, from, velocity));
    }
  },

  handleReleased({ player, ball, position }) {
    if (!this.flow()?.isHost() || this.applyingRemote) {
      return;
    }
    const index = this.ballIndex(player, ball);
    const pos = position || ball.object3D.position;
    if (index >= 0) {
      this.send(buildReleasedMessage(player, index, pos));
    }
  },

  handleRecalled({ player, ball, animated }) {
    const flow = this.flow();
    if (!flow?.isOnline() || this.applyingRemote) {
      return;
    }
    if (flow.isHost()) {
      const index = this.ballIndex(player, ball);
      if (index >= 0) {
        this.send(buildRecalledMessage(player, index, animated));
      }
      return;
    }
    // Convidado recolheu o próprio PokeProf (botão Trocar ou pegando a bola).
    if (player === "p2" && !ball.components.pokeprof?.prof.isFainted()) {
      this.send(buildRecallMessage());
    }
  },

  handleBlocked({ player, ball, reason }) {
    if (!this.flow()?.isHost() || this.applyingRemote) {
      return;
    }
    const index = this.ballIndex(player, ball);
    if (index >= 0) {
      this.send(buildBlockedMessage(player, index, reason));
    }
  },

  handleTurnChanged({ player }) {
    if (!this.flow()?.isGuest() || this.applyingRemote || player !== "p2") {
      return;
    }
    const choice = this.battle().choices.get("p2");
    if (choice && (choice.kind === ACTION_KINDS.ATTACK || choice.kind === ACTION_KINDS.POWERUP)) {
      this.send(buildChooseMessage(choice));
    }
  },

  handleTurnStarted({ order }) {
    if (this.flow()?.isHost() && !this.applyingRemote) {
      this.send(buildTurnStartedMessage(order));
    }
  },

  handleTurnAction(detail) {
    if (this.flow()?.isHost() && !this.applyingRemote) {
      this.send(buildTurnActionMessage(detail));
    }
  },

  handleTurnResolved() {
    if (this.flow()?.isHost() && !this.applyingRemote) {
      this.send(buildTurnResolvedMessage());
    }
  },

  handleGameOver({ winner, loser }) {
    if (this.flow()?.isHost() && !this.applyingRemote) {
      this.send(buildGameOverMessage(winner, loser));
    }
  },

  handleGameReset() {
    const flow = this.flow();
    if (!flow?.isOnline() || flow.switchingMode || this.applyingRemote) {
      return;
    }
    if (flow.isHost()) {
      this.send(buildResetMessage());
    }
  },

  handleHudAction({ player, action }) {
    if (this.flow()?.isGuest() && player === "p2" && action === HUD_ACTIONS.PLAY_AGAIN) {
      this.send(buildPlayAgainMessage());
    }
  },

  // --------------------------------------------------- rede → cena local
  handleMessage(msg) {
    const flow = this.flow();
    if (!flow?.isOnline() || !isValidBattleMessage(msg)) {
      return;
    }
    this.applyingRemote = true;
    try {
      if (flow.isHost()) {
        this.applyOnHost(msg);
      } else if (flow.isGuest()) {
        this.applyOnGuest(msg);
      }
    } finally {
      this.applyingRemote = false;
    }
  },

  applyOnHost(msg) {
    switch (msg.type) {
      case M.THROW: {
        const ball = this.ballAt("p2", msg.ball);
        ball?.components["physics-body"]?.launch(msg.from, msg.velocity);
        return;
      }
      case M.CHOOSE:
        this.battle().choose("p2", { kind: msg.kind, id: msg.id });
        return;
      case M.RECALL:
        this.rackOf("p2")?.recallActive("p2");
        return;
      case M.PLAY_AGAIN:
        this.el.sceneEl.emit(EVENTS.GAME_RESET, null, false);
        this.send(buildResetMessage());
        return;
      default:
    }
  },

  applyOnGuest(msg) {
    switch (msg.type) {
      case M.THROW: {
        const ball = this.ballAt("p1", msg.ball);
        ball?.components["physics-body"]?.launch(msg.from, msg.velocity);
        return;
      }
      case M.RELEASED: {
        const ball = this.ballAt(msg.player, msg.ball);
        if (!ball) {
          return;
        }
        ball.components["physics-body"]?.settleAt(msg.pos);
        ball.components["pokemon-release"]?.releaseAt(msg.pos);
        return;
      }
      case M.RECALLED: {
        const rack = this.rackOf(msg.player);
        const ball = this.ballAt(msg.player, msg.ball);
        if (!rack || !ball) {
          return;
        }
        if (msg.animated !== false) {
          rack.recallBall(ball);
        } else {
          ball.components["pokemon-release"]?.recall(false);
        }
        return;
      }
      case M.BLOCKED: {
        const ball = this.ballAt(msg.player, msg.ball);
        if (ball) {
          this.el.sceneEl.emit(EVENTS.SEND_OUT_BLOCKED, {
            player: msg.player, ball, reason: msg.reason,
          }, false);
        }
        return;
      }
      case M.TURN_STARTED:
        this.battle().startRemoteTurn(msg.order);
        return;
      case M.TURN_ACTION:
        this.battle().applyRemoteAction(msg);
        return;
      case M.TURN_RESOLVED:
        this.battle().finishRemoteTurn();
        return;
      case M.GAME_OVER:
        this.battle().applyRemoteGameOver(msg.winner, msg.loser);
        return;
      case M.RESET:
        this.el.sceneEl.emit(EVENTS.GAME_RESET, null, false);
        return;
      default:
    }
  },

  remove() {
    const sceneEl = this.el.sceneEl;
    this.sceneEvents.forEach(([name, fn]) => sceneEl.removeEventListener(name, fn));
  },
});
