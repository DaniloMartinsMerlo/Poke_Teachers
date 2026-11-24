// Protocolo de sincronização da partida J1 x J2 (sem A-Frame, sem rede).
//
// O anfitrião (J1) é a autoridade: roda o sistema "battle" e anuncia ao
// convidado (J2) quando um PokeProf sai ou volta, o início/ações/fim de
// cada turno, o fim de jogo e o reset. O convidado só envia o que faz
// (arremesso, escolha no HUD, trocar, jogar de novo) e aplica o que chega.

import { MESSAGE_TYPES } from "../config/network.js";
import { PLAYER_IDS } from "../config/players.js";
import { ACTION_KINDS } from "./turn.js";

const round3 = (n) => Math.round((Number(n) || 0) * 1000) / 1000;

export const packVec3 = (v) => ({
  x: round3(v?.x),
  y: round3(v?.y),
  z: round3(v?.z),
});

const isVec3 = (v) => Boolean(
  v && typeof v === "object"
  && Number.isFinite(v.x) && Number.isFinite(v.y) && Number.isFinite(v.z),
);

const isBallIndex = (n) => Number.isInteger(n) && n >= 0;
const isPlayer = (p) => PLAYER_IDS.includes(p);

export const buildThrowMessage = (player, ball, from, velocity) => ({
  type: MESSAGE_TYPES.THROW,
  player,
  ball,
  from: packVec3(from),
  velocity: packVec3(velocity),
});

export const buildChooseMessage = (choice) => ({
  type: MESSAGE_TYPES.CHOOSE,
  kind: choice.kind,
  id: choice.id,
});

export const buildRecallMessage = () => ({ type: MESSAGE_TYPES.RECALL });

export const buildPlayAgainMessage = () => ({ type: MESSAGE_TYPES.PLAY_AGAIN });

export const buildReleasedMessage = (player, ball, pos) => ({
  type: MESSAGE_TYPES.RELEASED,
  player,
  ball,
  pos: packVec3(pos),
});

export const buildRecalledMessage = (player, ball, animated = true) => ({
  type: MESSAGE_TYPES.RECALLED,
  player,
  ball,
  animated: Boolean(animated),
});

export const buildBlockedMessage = (player, ball, reason) => ({
  type: MESSAGE_TYPES.BLOCKED,
  player,
  ball,
  reason,
});

export const buildTurnStartedMessage = (order) => ({
  type: MESSAGE_TYPES.TURN_STARTED,
  order: Array.isArray(order) ? [...order] : [],
});

export function buildTurnActionMessage(detail) {
  const msg = {
    type: MESSAGE_TYPES.TURN_ACTION,
    kind: detail.kind,
    player: detail.player,
    target: detail.target,
    id: detail.id || detail.powerup?.id || null,
    label: detail.label,
    actorName: detail.actorName,
    targetName: detail.targetName,
  };
  if (detail.kind === ACTION_KINDS.ATTACK) {
    msg.damage = detail.damage ?? 0;
    msg.missed = Boolean(detail.missed);
    msg.fainted = Boolean(detail.fainted);
    msg.multiplier = detail.multiplier ?? 1;
    msg.ppLeft = detail.ppLeft ?? null;
  } else if (detail.kind === ACTION_KINDS.POWERUP && detail.healed !== undefined) {
    msg.healed = detail.healed;
  }
  return msg;
}

export const buildTurnResolvedMessage = () => ({ type: MESSAGE_TYPES.TURN_RESOLVED });

export const buildGameOverMessage = (winner, loser) => ({
  type: MESSAGE_TYPES.GAME_OVER,
  winner,
  loser,
});

export const buildResetMessage = () => ({ type: MESSAGE_TYPES.RESET });

/** A mensagem recebida tem os campos esperados para o seu `type`? */
export function isValidBattleMessage(msg) {
  if (!msg || typeof msg !== "object" || typeof msg.type !== "string") {
    return false;
  }
  switch (msg.type) {
    case MESSAGE_TYPES.THROW:
      return isBallIndex(msg.ball) && isVec3(msg.from) && isVec3(msg.velocity);
    case MESSAGE_TYPES.CHOOSE:
      return (msg.kind === ACTION_KINDS.ATTACK || msg.kind === ACTION_KINDS.POWERUP)
        && typeof msg.id === "string" && msg.id.length > 0;
    case MESSAGE_TYPES.RECALL:
    case MESSAGE_TYPES.PLAY_AGAIN:
    case MESSAGE_TYPES.TURN_RESOLVED:
    case MESSAGE_TYPES.RESET:
    case MESSAGE_TYPES.PING:
      return true;
    case MESSAGE_TYPES.RELEASED:
      return isPlayer(msg.player) && isBallIndex(msg.ball) && isVec3(msg.pos);
    case MESSAGE_TYPES.RECALLED:
      return isPlayer(msg.player) && isBallIndex(msg.ball);
    case MESSAGE_TYPES.BLOCKED:
      return isPlayer(msg.player) && isBallIndex(msg.ball) && typeof msg.reason === "string";
    case MESSAGE_TYPES.TURN_STARTED:
      return Array.isArray(msg.order);
    case MESSAGE_TYPES.TURN_ACTION:
      return Object.values(ACTION_KINDS).includes(msg.kind)
        && isPlayer(msg.player) && isPlayer(msg.target) && typeof msg.label === "string";
    case MESSAGE_TYPES.GAME_OVER:
      return isPlayer(msg.winner);
    default:
      return false;
  }
}
