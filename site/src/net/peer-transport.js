import { PROTOCOL_VERSION, ROOM } from "../config/network.js";
import { roomPeerId } from "../domain/room.js";

// Transporte da partida online com PeerJS (WebRTC ponto a ponto).
// O resto do jogo só conhece esta interface — trocar de tecnologia (ex.:
// Supabase Realtime) = escrever outra classe com os mesmos métodos:
//
//   host(code)   → Promise: sala aberta (aguardando o J2)
//   join(code)   → Promise: conectado ao anfitrião
//   send(msg)    → envia um objeto (vira JSON); ganha `v` (versão)
//   on(evento, fn) → "connected", "message" (msg), "closed", "error" (err)
//   close()
//   stats()      → Promise<{candidateType}>: "host" (rede local),
//                  "srflx" (internet, P2P direto) ou "relay" (TURN)
//
// Erros (err.code): "room-taken" (código em uso: gere outro), "not-found"
// (sala não existe), "full" (já tem J2), "timeout", "network".
// Só 2 jogadores: o anfitrião recusa uma segunda conexão.
export class PeerTransport {
  constructor({ PeerClass = globalThis.Peer, prefix = ROOM.peerPrefix, joinTimeoutMs = ROOM.joinTimeoutMs } = {}) {
    if (!PeerClass) {
      throw new Error("PeerJS não carregou (global Peer ausente)");
    }
    this.PeerClass = PeerClass;
    this.prefix = prefix;
    this.joinTimeoutMs = joinTimeoutMs;
    this.peer = null;
    this.conn = null;
    this.listeners = new Map();
  }

  on(event, fn) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(fn);
    return () => this.listeners.get(event)?.delete(fn);
  }

  emit(event, detail) {
    this.listeners.get(event)?.forEach((fn) => fn(detail));
  }

  /** Abre a sala `code` como anfitrião. */
  host(code) {
    return new Promise((resolve, reject) => {
      const peer = new this.PeerClass(roomPeerId(code, this.prefix));
      this.peer = peer;
      peer.on("open", () => resolve());
      peer.on("error", (err) => {
        const error = toError(err);
        if (this.conn === null && error.code === "room-taken") {
          reject(error);
        } else {
          this.emit("error", error);
          reject(error);
        }
      });
      peer.on("connection", (conn) => this.accept(conn));
    });
  }

  // Anfitrião: aceita o primeiro J2; recusa os seguintes ("full").
  accept(conn) {
    if (this.conn) {
      conn.on("open", () => {
        conn.send({ v: PROTOCOL_VERSION, type: "full" });
        setTimeout(() => conn.close(), 300);
      });
      return;
    }
    this.bind(conn);
    conn.on("open", () => this.emit("connected"));
  }

  /** Entra na sala `code` (o anfitrião precisa ter aberto antes). */
  join(code) {
    return new Promise((resolve, reject) => {
      const peer = new this.PeerClass();
      this.peer = peer;
      let settled = false;
      const fail = (error) => {
        if (!settled) {
          settled = true;
          clearTimeout(timer);
          reject(error);
        } else {
          this.emit("error", error);
        }
      };
      const timer = setTimeout(() => fail(codeError("timeout", "Tempo esgotado ao conectar")), this.joinTimeoutMs);
      peer.on("error", (err) => fail(toError(err)));
      peer.on("open", () => {
        const conn = peer.connect(roomPeerId(code, this.prefix), { reliable: true });
        this.bind(conn);
        conn.on("open", () => {
          // Espera um instante: se a sala estiver cheia, o anfitrião manda
          // "full" logo depois de abrir.
          setTimeout(() => {
            if (!settled) {
              settled = true;
              clearTimeout(timer);
              resolve();
              this.emit("connected");
            }
          }, 400);
        });
        this.on("message", (msg) => {
          if (msg.type === "full") {
            fail(codeError("full", "Sala cheia"));
            this.close();
          }
        });
      });
    });
  }

  bind(conn) {
    this.conn = conn;
    conn.on("data", (data) => this.emit("message", data));
    conn.on("close", () => this.emit("closed"));
    conn.on("error", (err) => this.emit("error", toError(err)));
  }

  isConnected() {
    return Boolean(this.conn && this.conn.open);
  }

  send(message) {
    if (!this.isConnected()) {
      return false;
    }
    this.conn.send({ v: PROTOCOL_VERSION, ...message });
    return true;
  }

  async stats() {
    const pc = this.conn?.peerConnection;
    if (!pc) {
      return { candidateType: null };
    }
    const report = await pc.getStats();
    let pair = null;
    report.forEach((item) => {
      if (item.type === "candidate-pair" && (item.selected || item.nominated) && item.state === "succeeded") {
        pair = item;
      }
    });
    const local = pair ? report.get(pair.localCandidateId) : null;
    return { candidateType: local?.candidateType ?? null };
  }

  close() {
    this.conn?.close();
    this.peer?.destroy();
    this.conn = null;
    this.peer = null;
  }
}

function codeError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

// Erros do PeerJS (err.type) → nossos códigos.
function toError(err) {
  switch (err?.type) {
    case "unavailable-id": return codeError("room-taken", "Codigo de sala em uso");
    case "peer-unavailable": return codeError("not-found", "Sala nao encontrada");
    case "network":
    case "server-error":
    case "socket-error":
    case "socket-closed": return codeError("network", "Sem conexao com o servidor de encontro");
    default: return codeError(err?.code || "network", err?.message || String(err));
  }
}
