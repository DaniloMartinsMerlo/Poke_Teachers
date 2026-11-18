// Regras de combate entre PokeProfs (sem A-Frame).
import { Pokeprof } from "./pokeprof.js";

/**
 * Multiplicador de vantagem: `beats[a] === b` → a vence b.
 * @param {string} attacker
 * @param {string} defender
 * @param {Record<string,string>} beats
 * @param {{strong:number, weak:number}} rules
 */
export function advantageMultiplier(attacker, defender, beats, rules) {
  if (beats[attacker] === defender) return rules.strong;
  if (beats[defender] === attacker) return rules.weak;
  return 1;
}

/**
 * Dano de um ataque de `attacker` em `defender` (ver config/battle.js).
 * @param {{name:string, stats:{attack:number}}} attacker
 * @param {{name:string, stats:{defense:number}}} defender
 * @param {number} power poder do ataque
 * @param {Record<string,string>} beats
 * @param {{attackScale:number, defenseScale:number, strong:number, weak:number, minDamage:number}} rules
 */
export function calculateDamage(attacker, defender, power, beats, rules) {
  const raw = power * (attacker.stats.attack / rules.attackScale);
  const reduced = raw * (rules.defenseScale / (rules.defenseScale + Math.max(0, defender.stats.defense)));
  const damage = reduced * advantageMultiplier(attacker.name, defender.name, beats, rules);
  return Math.max(rules.minDamage, Math.round(damage));
}

/**
 * Ordem de ataque no turno: o mais rápido primeiro. Empate: sorteio
 * (`random` injetável para teste).
 * @template T
 * @param {T & {stats:{speed:number}}} a
 * @param {T & {stats:{speed:number}}} b
 * @returns {[T, T]}
 */
export function turnOrder(a, b, random = Math.random) {
  if (a.stats.speed !== b.stats.speed) {
    return a.stats.speed > b.stats.speed ? [a, b] : [b, a];
  }
  return random() < 0.5 ? [a, b] : [b, a];
}

/**
 * Duelo 1x1 até alguém desmaiar, sempre com o mesmo poder de ataque.
 * Usado no teste de balanceamento. Retorna o nome do vencedor.
 */
export function simulateDuel(nameA, statsA, nameB, statsB, power, beats, rules, maxTurns = 1000) {
  const a = new Pokeprof(nameA, statsA);
  const b = new Pokeprof(nameB, statsB);
  // Empate de velocidade no teste: `a` começa (determinístico).
  const [first, second] = turnOrder(a, b, () => 0);
  for (let turn = 0; turn < maxTurns; turn++) {
    for (const [attacker, defender] of [[first, second], [second, first]]) {
      defender.takeDamage(calculateDamage(attacker, defender, power, beats, rules));
      if (defender.isFainted()) {
        return attacker.name;
      }
    }
  }
  return null;
}

/**
 * O mapa de vantagens é um ciclo único que passa por todos (1 > 2 > 3 > 1)?
 * @param {Record<string,string>} beats
 * @param {string[]} names
 */
export function isAdvantageCycle(beats, names) {
  if (names.length < 2 || names.some((name) => !names.includes(beats[name]))) {
    return false;
  }
  const seen = new Set();
  let current = names[0];
  while (!seen.has(current)) {
    seen.add(current);
    current = beats[current];
  }
  return current === names[0] && seen.size === names.length;
}
