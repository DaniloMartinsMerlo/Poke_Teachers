// Sistema de turnos (sem A-Frame).
//
// Cada jogador escolhe UMA ação por turno para o PokeProf em campo: um
// ataque ou um power-up. Nada acontece enquanto os dois não escolheram.
// Com as duas escolhas, o mais rápido (atributos com power-up ativo) age
// primeiro; se ele derrubar o outro, o segundo não age. No fim do turno os
// power-ups de atributo usados nele passam a valer (ver Pokeprof).
import { calculateDamage, turnOrder } from "./combat.js";

export const ACTION_KINDS = Object.freeze({ ATTACK: "attack", POWERUP: "powerup" });

/** Escolhas do turno atual, por jogador: { kind, id }. */
export class TurnChoices {
  constructor() {
    this.choices = new Map();
  }

  /** Registra a escolha; falsa se o jogador já escolheu neste turno. */
  choose(player, choice) {
    if (this.choices.has(player)) {
      return false;
    }
    this.choices.set(player, { kind: choice.kind, id: choice.id });
    return true;
  }

  has(player) {
    return this.choices.has(player);
  }

  get(player) {
    return this.choices.get(player) || null;
  }

  /** Todos os `players` já escolheram? */
  isReady(players) {
    return players.length > 0 && players.every((player) => this.choices.has(player));
  }

  /** Apaga a escolha de um jogador (ou de todos). */
  clear(player) {
    if (player === undefined) {
      this.choices.clear();
    } else {
      this.choices.delete(player);
    }
  }
}

/** Visão de combate de um PokeProf: tipo e atributos valendo agora. */
export function fighter(prof) {
  return { name: prof.name, type: prof.type, stats: prof.effectiveStats() };
}

/**
 * Ordem do turno.
 * @param {{player:string, prof:import("./pokeprof.js").Pokeprof, choice:{kind:string,id:string}}[]} sides
 *   os dois lados
 * @returns {[object, object][]} pares [quem age, alvo], na ordem
 */
export function planTurn(sides, random = Math.random) {
  const [a, b] = sides.map((side) => ({ side, stats: side.prof.effectiveStats() }));
  const [first, second] = turnOrder(a, b, random).map((entry) => entry.side);
  return [[first, second], [second, first]];
}

/**
 * Aplica a ação de `actor` (ataque em `target` ou power-up nele mesmo).
 * Quem está desmaiado não age; ataque em alvo desmaiado não acontece.
 * @param {{attacks:object[], powerups:object[], typeBeats:Record<string,string>, rules:object}} rules
 * @returns {null | {
 *   kind: string, player: string, target: string, label: string,
 *   damage?: number, fainted?: boolean, multiplier?: number,
 *   powerup?: object, healed?: number
 * }} o que aconteceu (null = não agiu)
 */
export function performAction(actor, target, rules) {
  const { choice } = actor;
  if (!choice || actor.prof.isFainted()) {
    return null;
  }
  const base = { kind: choice.kind, player: actor.player, target: target.player };
  if (choice.kind === ACTION_KINDS.ATTACK) {
    const move = rules.attacks.find((item) => item.id === choice.id);
    if (!move || target.prof.isFainted()) {
      return null;
    }
    const attacker = fighter(actor.prof);
    const defender = fighter(target.prof);
    const damage = target.prof.takeDamage(calculateDamage(attacker, defender, move.power, rules.typeBeats, rules.rules));
    return { ...base, label: move.label, damage, fainted: target.prof.isFainted() };
  }
  if (choice.kind === ACTION_KINDS.POWERUP) {
    const powerup = rules.powerups.find((item) => item.id === choice.id);
    if (!powerup) {
      return null;
    }
    if (powerup.effect === "heal") {
      const healed = actor.prof.heal(actor.prof.maxHp() * powerup.percent / 100);
      return { ...base, label: powerup.label, powerup, healed };
    }
    actor.prof.queueBoost(powerup);
    return { ...base, label: powerup.label, powerup };
  }
  return null;
}

/** Fim do turno: power-ups usados nele passam a valer, os antigos expiram. */
export function finishTurn(sides) {
  sides.forEach((side) => side.prof.endTurn());
}

/** Resolve o turno inteiro de uma vez. Retorna as ações, na ordem. */
export function resolveTurn(sides, rules, random = Math.random) {
  const results = planTurn(sides, random)
    .map(([actor, target]) => performAction(actor, target, rules))
    .filter(Boolean);
  finishTurn(sides);
  return results;
}

/** O time perdeu? (todos os PokeProfs desmaiados) */
export function isTeamDefeated(profs) {
  return profs.length > 0 && profs.every((prof) => prof.isFainted());
}
