// Adversário computador (CPU): máquina de estados simples e sorteios.
// Sem A-Frame: o componente "cpu-player" monta a `view` (o que a CPU vê
// da cena) a cada quadro, chama `nextCpuState` e executa o efeito pedido.
import { ACTION_KINDS } from "./turn.js";

export const CPU_STATES = Object.freeze({
  // Espera o jogador lançar o primeiro PokeProf.
  WAITING: "waiting",
  // Escolhe um PokeProf de pé e o arremessa (depois de uma pequena espera).
  CHOOSE_PROF: "choose-prof",
  // Bola no ar: espera ela cair e soltar o PokeProf.
  THROWING: "throwing",
  // "Pensando": escolhe ataque ou power-up.
  CHOOSE_ACTION: "choose-action",
  // Já escolheu: espera o turno resolver.
  WAIT_TURN: "wait-turn",
  // Fim de jogo: não faz mais nada até o reset.
  DONE: "done",
});

// O que o componente deve fazer na transição.
export const CPU_EFFECTS = Object.freeze({ THROW: "throw", CHOOSE: "choose" });

const S = CPU_STATES;

/**
 * Próximo estado da CPU.
 * @param {string} state estado atual
 * @param {{
 *   gameOver: boolean,        alguém já perdeu todos
 *   opponentOnField: boolean, o adversário tem PokeProf em campo
 *   ownOnField: boolean,      a CPU tem PokeProf em campo (mesmo desmaiado)
 *   ballInFlight: boolean,    a bola arremessada ainda pode soltar o PokeProf
 *   canChoose: boolean,       o turno aceita a escolha da CPU agora
 *   hasChosen: boolean,       a CPU já escolheu neste turno
 *   ready: boolean,           a espera do estado atual já passou
 * }} view
 * @returns {{state: string, effect: string | null}}
 */
export function nextCpuState(state, view) {
  const go = (next, effect = null) => ({ state: next, effect });
  if (view.gameOver) {
    return go(S.DONE);
  }
  switch (state) {
    case S.WAITING:
      return go(view.opponentOnField ? S.CHOOSE_PROF : S.WAITING);
    case S.CHOOSE_PROF:
      if (view.ownOnField) return go(S.CHOOSE_ACTION);
      return view.ready ? go(S.THROWING, CPU_EFFECTS.THROW) : go(S.CHOOSE_PROF);
    case S.THROWING:
      if (view.ownOnField) return go(S.CHOOSE_ACTION);
      // A bola não soltou o PokeProf a tempo: tenta de novo.
      return go(view.ballInFlight ? S.THROWING : S.CHOOSE_PROF);
    case S.CHOOSE_ACTION:
      if (!view.ownOnField) return go(S.CHOOSE_PROF);
      if (view.hasChosen) return go(S.WAIT_TURN);
      return view.canChoose && view.ready ? go(S.WAIT_TURN, CPU_EFFECTS.CHOOSE) : go(S.CHOOSE_ACTION);
    case S.WAIT_TURN:
      // O dela desmaiou e voltou para a bola: escolhe outro.
      if (!view.ownOnField) return go(S.CHOOSE_PROF);
      // Turno resolvido, novo turno aberto: volta a pensar.
      return go(view.canChoose && !view.hasChosen ? S.CHOOSE_ACTION : S.WAIT_TURN);
    case S.DONE:
    default:
      return go(S.WAITING);
  }
}

const pick = (list, random) => list[Math.min(list.length - 1, Math.floor(random() * list.length))];

/** Sorteia um entre os candidatos (PokeProfs de pé), ou null. */
export function pickProf(candidates, random = Math.random) {
  return candidates.length ? pick(candidates, random) : null;
}

/**
 * Sorteia a ação: power-up com chance `powerupChance`, senão ataque.
 * Nunca repete o último power-up usado (`lastPowerupId`) e não cura com a
 * vida cheia.
 * @returns {{kind: string, id: string}}
 */
export function pickAction({ attacks, powerups, powerupChance, lastPowerupId = null, hpFull = false, random = Math.random }) {
  const usable = powerups.filter((item) => item.id !== lastPowerupId && !(item.effect === "heal" && hpFull));
  if (usable.length && random() < powerupChance) {
    return { kind: ACTION_KINDS.POWERUP, id: pick(usable, random).id };
  }
  return { kind: ACTION_KINDS.ATTACK, id: pick(attacks, random).id };
}

/**
 * Velocidade inicial para ir de `from` a `to` em `time` segundos sob a
 * gravidade `gravity` (negativa): arremesso em arco.
 */
export function ballisticVelocity(from, to, time, gravity) {
  return {
    x: (to.x - from.x) / time,
    y: (to.y - from.y - 0.5 * gravity * time * time) / time,
    z: (to.z - from.z) / time,
  };
}
