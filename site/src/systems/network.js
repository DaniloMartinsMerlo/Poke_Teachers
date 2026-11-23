import { EVENTS } from "../config/constants.js";
import { GAME_MODES, OPPONENTS } from "../config/menu.js";
import {
  NETWORK_ROLES, NETWORK_STATES, PROTOCOL_VERSION, ROOM, ROOM_CREATE_ATTEMPTS,
} from "../config/network.js";
import { generateRoomCode, isCompatibleHello, isValidRoomCode } from "../domain/room.js";
import { PeerTransport } from "../net/peer-transport.js";

const S = NETWORK_STATES;

// ----------------------------------------------------------------------
// Sistema "network": a sala da partida J1 x J2.
//
//   createRoom() → anfitrião (J1): sorteia um código de 4 dígitos (outro,
//                  se estiver em uso), abre a sala e espera o J2.
//   joinRoom(c)  → convidado (J2): conecta na sala `c`.
//   leave()      → cancela/sai (avisa o outro com "bye").
//
// Conectados, os dois trocam "hello" com a versão do protocolo; versões
// iguais → a partida J1 x J2 começa nos dois (game-flow). Se o outro sair
// no meio da partida → NETWORK_LOST e volta ao menu. Voltar ao menu
// (botão "Menu") encerra a conexão.
//
// Estado em NETWORK_CHANGED (state, role, code, error). As demais
// mensagens do outro aparelho saem em NETWORK_MESSAGE (sincronizar a
// batalha: etapa 4). O transporte (src/net/) é trocável:
// `TransportClass` (os testes usam um falso, sem internet).
// ----------------------------------------------------------------------
AFRAME.registerSystem("network", {
  init() {
    this.TransportClass = PeerTransport;
    this.transport = null;
    this.state = S.IDLE;
    this.role = null;
    this.code = null;
    this.error = null;
    this.gotHello = false;
    this.onModeChanged = ({ detail }) => {
      // Voltou ao menu no meio de uma partida J1 x J2: encerra a conexão.
      if (detail.mode === GAME_MODES.MENU && this.state === S.READY) {
        this.leave();
      }
    };
    this.el.addEventListener(EVENTS.GAME_MODE_CHANGED, this.onModeChanged);
  },

  isBusy() {
    return this.state !== S.IDLE;
  },

  setState(state, error = null) {
    this.state = state;
    this.error = error;
    this.el.emit(EVENTS.NETWORK_CHANGED, {
      state, role: this.role, code: this.code, error,
    }, false);
  },

  // Novo transporte, com os eventos ligados. Um transporte antigo que
  // ainda dispare eventos é ignorado.
  newTransport() {
    this.dropTransport();
    let transport;
    try {
      transport = new this.TransportClass();
    } catch (err) {
      return null;
    }
    this.transport = transport;
    const mine = (fn) => (detail) => { if (this.transport === transport) fn(detail); };
    transport.on("connected", mine(() => this.onConnected()));
    transport.on("message", mine((msg) => this.onMessage(msg)));
    transport.on("closed", mine(() => this.onClosed()));
    transport.on("error", mine((err) => this.onTransportError(err)));
    return transport;
  },

  dropTransport() {
    const old = this.transport;
    this.transport = null;
    old?.close();
  },

  /** Cria a sala (anfitrião). */
  async createRoom() {
    if (this.isBusy()) {
      return;
    }
    this.role = NETWORK_ROLES.HOST;
    this.gotHello = false;
    for (let attempt = 0; attempt < ROOM_CREATE_ATTEMPTS; attempt += 1) {
      this.code = generateRoomCode(ROOM.codeLength);
      this.setState(S.OPENING);
      const transport = this.newTransport();
      if (!transport) {
        this.fail("no-peerjs");
        return;
      }
      try {
        await transport.host(this.code);
        if (this.transport !== transport) return; // cancelado no meio
        this.setState(S.WAITING);
        return;
      } catch (err) {
        if (this.transport !== transport) return;
        if (err.code !== "room-taken") {
          this.fail(err.code);
          return;
        }
      }
    }
    this.fail("room-taken");
  },

  /** Entra na sala `code` (convidado). */
  async joinRoom(code) {
    if (this.isBusy() || !isValidRoomCode(code, ROOM.codeLength)) {
      return;
    }
    this.role = NETWORK_ROLES.GUEST;
    this.code = code;
    this.gotHello = false;
    this.setState(S.JOINING);
    const transport = this.newTransport();
    if (!transport) {
      this.fail("no-peerjs");
      return;
    }
    try {
      await transport.join(code);
    } catch (err) {
      if (this.transport === transport) {
        this.fail(err.code);
      }
    }
  },

  /** Sai da sala / cancela (avisa o outro). */
  leave() {
    this.transport?.send({ type: "bye" });
    this.dropTransport();
    this.role = null;
    this.code = null;
    if (this.state !== S.IDLE) {
      this.setState(S.IDLE);
    }
  },

  // Erro: encerra a conexão e volta ao início, avisando o motivo.
  fail(code) {
    this.dropTransport();
    this.setState(S.IDLE, code || "network");
  },

  onConnected() {
    this.setState(S.HANDSHAKE);
    this.transport.send({ type: "hello", role: this.role });
    this.maybeReady();
  },

  onMessage(message) {
    if (message?.type === "hello") {
      if (!isCompatibleHello(message, PROTOCOL_VERSION)) {
        this.fail("version");
        return;
      }
      this.gotHello = true;
      this.maybeReady();
      return;
    }
    if (message?.type === "bye") {
      this.onClosed();
      return;
    }
    this.el.emit(EVENTS.NETWORK_MESSAGE, message, false);
  },

  // Os dois mandaram "hello": a partida J1 x J2 começa.
  maybeReady() {
    if (this.state !== S.HANDSHAKE || !this.gotHello) {
      return;
    }
    this.setState(S.READY);
    this.el.systems["game-flow"].startMatch(OPPONENTS.PLAYER, this.role);
  },

  // O outro aparelho saiu (fechou, caiu ou mandou "bye").
  onClosed() {
    const wasPlaying = this.state === S.READY;
    const wasConnected = wasPlaying || this.state === S.HANDSHAKE;
    this.dropTransport();
    this.role = null;
    this.code = null;
    this.setState(S.IDLE, wasConnected ? "lost" : null);
    if (wasPlaying) {
      this.el.emit(EVENTS.NETWORK_LOST, null, false);
      this.el.systems["game-flow"].openMenu();
    }
  },

  onTransportError(err) {
    // Antes de conectar, o host/join já rejeita a promessa (tratado lá).
    if (this.state === S.READY || this.state === S.HANDSHAKE) {
      this.onClosed();
    } else if (this.state === S.WAITING) {
      this.fail(err?.code || "network");
    }
  },

  /** Envia uma mensagem ao outro aparelho (etapa 4). */
  send(message) {
    return this.state === S.READY && Boolean(this.transport?.send(message));
  },

  remove() {
    this.el.removeEventListener(EVENTS.GAME_MODE_CHANGED, this.onModeChanged);
    this.dropTransport();
  },
});
