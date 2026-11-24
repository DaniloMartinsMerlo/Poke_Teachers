// Sistema de turnos (sem A-Frame).
//
// Cada jogador escolhe UMA ação por turno para o PokeProf em campo: um
// ataque, um power-up ou trocar de PokeProf. Nada acontece enquanto os
// dois não escolheram. Com as duas escolhas, quem trocou vai primeiro (a
// troca já aconteceu: o novo PokeProf só "se apresenta"); entre os
// outros, o mais rápido (atributos com power-up ativo) age primeiro; se
// ele derrubar o outro, o segundo não age. No fim do turno os power-ups de
// atributo usados nele passam a valer (ver Pokeprof).
//
// Ataque: gasta 1 PP e sorteia o acerto (`accuracy` %); errou = sem dano.
import { advantageMultiplier, calculateDamage, turnOrder } from "./combat.js";

export const ACTION_KINDS = Object.freeze({ ATTACK: "attack", POWERUP: "powerup", SWITCH: "switch" });

/** Escolha de troca (o id é fixo: não há opções). */
export const SWITCH_CHOICE = Object.freeze({ kind: ACTION_KINDS.SWITCH, id: "switch" });

/**
 * O ataque acerta? `accuracy` em % (sem valor: sempre acerta).
 * `random` injetável para teste.
 */
export function rollHit(accuracy, random = Math.random) {
  if (typeof accuracy !== "number" || accuracy >= 100) {
    return true;
  }
  return random() * 100 < accuracy;
}

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
  let [first, second] = turnOrder(a, b, random).map((entry) => entry.side);
  // Troca tem prioridade (como no Pokémon).
  if (isSwitch(second) && !isSwitch(first)) {
    [first, second] = [second, first];
  }
  return [[first, second], [second, first]];
}

const isSwitch = (side) => side.choice?.kind === ACTION_KINDS.SWITCH;

/**
 * Aplica a ação de `actor` (ataque em `target`, power-up nele mesmo ou a
 * apresentação de quem acabou de trocar). Quem está desmaiado não age;
 * ataque em alvo desmaiado não acontece (nem gasta PP).
 * @param {{attacks:object[], powerups:object[], typeBeats:Record<string,string>, rules:object}} rules
 * @param {() => number} [random] sorteio do acerto
 * @returns {null | {
 *   kind: string, player: string, target: string, label: string,
 *   damage?: number, missed?: boolean, fainted?: boolean,
 *   multiplier?: number (vantagem de tipo), ppLeft?: number,
 *   powerup?: object, healed?: number
 * }} o que aconteceu (null = não agiu)
 */
export function performAction(actor, target, rules, random = Math.random) {
  const { choice } = actor;
  if (!choice || actor.prof.isFainted()) {
    return null;
  }
  const base = { kind: choice.kind, player: actor.player, target: target.player };
  if (choice.kind === ACTION_KINDS.SWITCH) {
    return { ...base, label: "Troca" };
  }
  if (choice.kind === ACTION_KINDS.ATTACK) {
    const move = rules.attacks.find((item) => item.id === choice.id);
    if (!move || target.prof.isFainted() || !actor.prof.spendPp(move)) {
      return null;
    }
    const attacker = fighter(actor.prof);
    const defender = fighter(target.prof);
    const multiplier = advantageMultiplier(attacker.type, defender.type, rules.typeBeats, rules.rules);
    const ppLeft = actor.prof.ppLeft(move);
    if (!rollHit(move.accuracy, random)) {
      return { ...base, id: move.id, label: move.label, damage: 0, missed: true, fainted: false, multiplier, ppLeft };
    }
    const damage = target.prof.takeDamage(calculateDamage(attacker, defender, move.power, rules.typeBeats, rules.rules));
    return { ...base, id: move.id, label: move.label, damage, missed: false, fainted: target.prof.isFainted(), multiplier, ppLeft };
  }
  if (choice.kind === ACTION_KINDS.POWERUP) {
    const powerup = rules.powerups.find((item) => item.id === choice.id);
    if (!powerup) {
      return null;
    }
    if (powerup.effect === "heal") {
      const healed = actor.prof.heal(actor.prof.maxHp() * powerup.percent / 100);
      return { ...base, id: powerup.id, label: powerup.label, powerup, healed };
    }
    actor.prof.queueBoost(powerup);
    return { ...base, id: powerup.id, label: powerup.label, powerup };
  }
  return null;
}

/**
 * Aplica no convidado (J2) uma ação de turno já calculada pelo anfitrião
 * (J1), sem sortear nada: gasta o mesmo PP, aplica o mesmo dano/cura/boost
 * e devolve o detalhe pronto para TURN_ACTION (balões e registro do HUD).
 */
export function applyTurnAction(action, actorProf, targetProf, rules) {
  if (!action || !action.kind || !action.player || !action.target) {
    return null;
  }
  const base = {
    kind: action.kind,
    player: action.player,
    target: action.target,
    actorName: action.actorName || actorProf?.name || "",
    targetName: action.targetName || targetProf?.name || "",
  };
  if (action.kind === ACTION_KINDS.SWITCH) {
    return { ...base, label: action.label || "Troca" };
  }
  if (action.kind === ACTION_KINDS.ATTACK) {
    const move = rules.attacks.find((item) => item.id === action.id || item.label === action.label);
    if (move && actorProf) {
      actorProf.spendPp(move);
    }
    const missed = Boolean(action.missed);
    const damage = missed ? 0 : Math.max(0, Number(action.damage) || 0);
    if (!missed && targetProf && damage > 0) {
      targetProf.takeDamage(damage);
    }
    return {
      ...base,
      id: move?.id || action.id,
      label: action.label || move?.label || "",
      damage,
      missed,
      fainted: targetProf ? targetProf.isFainted() : Boolean(action.fainted),
      multiplier: Number(action.multiplier) || 1,
      ppLeft: move && actorProf ? actorProf.ppLeft(move) : action.ppLeft,
    };
  }
  if (action.kind === ACTION_KINDS.POWERUP) {
    const powerup = rules.powerups.find(
      (item) => item.id === (action.id || action.powerup?.id) || item.label === action.label,
    ) || action.powerup;
    if (!powerup) {
      return null;
    }
    if (powerup.effect === "heal") {
      const healed = Math.max(0, Number(action.healed) || 0);
      if (actorProf && healed > 0) {
        actorProf.heal(healed);
      }
      return { ...base, id: powerup.id, label: powerup.label, powerup, healed };
    }
    if (actorProf) {
      actorProf.queueBoost(powerup);
    }
    return { ...base, id: powerup.id, label: powerup.label, powerup };
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
    .map(([actor, target]) => performAction(actor, target, rules, random))
    .filter(Boolean);
  finishTurn(sides);
  return results;
}

/** O time perdeu? (todos os PokeProfs desmaiados) */
export function isTeamDefeated(profs) {
  return profs.length > 0 && profs.every((prof) => prof.isFainted());
}
