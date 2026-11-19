// Regras de combate entre PokeProfs (sem A-Frame).

/**
 * Multiplicador de vantagem por tipo: `typeBeats[a] === b` → tipo a vence
 * tipo b. Mesmo tipo ou sem tipo: 1.
 * @param {string | null} attackerType
 * @param {string | null} defenderType
 * @param {Record<string,string>} typeBeats
 * @param {{strong:number, weak:number}} rules
 */
export function advantageMultiplier(attackerType, defenderType, typeBeats, rules) {
  if (!attackerType || !defenderType) return 1;
  if (typeBeats[attackerType] === defenderType) return rules.strong;
  if (typeBeats[defenderType] === attackerType) return rules.weak;
  return 1;
}

/**
 * Dano de um ataque de `attacker` em `defender` (ver config/battle.js).
 * Os atributos devem ser os que valem no momento (com power-up).
 * @param {{type?:string|null, stats:{attack:number}}} attacker
 * @param {{type?:string|null, stats:{defense:number}}} defender
 * @param {number} power poder do ataque
 * @param {Record<string,string>} typeBeats
 * @param {{attackScale:number, defenseScale:number, strong:number, weak:number, minDamage:number}} rules
 */
export function calculateDamage(attacker, defender, power, typeBeats, rules) {
  const raw = power * (attacker.stats.attack / rules.attackScale);
  const reduced = raw * (rules.defenseScale / (rules.defenseScale + Math.max(0, defender.stats.defense)));
  const damage = reduced * advantageMultiplier(attacker.type, defender.type, typeBeats, rules);
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
 * @param {{name:string, type:string|null, stats:object}} fighterA
 * @param {{name:string, type:string|null, stats:object}} fighterB
 */
export function simulateDuel(fighterA, fighterB, power, typeBeats, rules, maxTurns = 1000) {
  const hp = new Map([[fighterA, fighterA.stats.hp], [fighterB, fighterB.stats.hp]]);
  // Empate de velocidade no teste: `a` começa (determinístico).
  const [first, second] = turnOrder(fighterA, fighterB, () => 0);
  for (let turn = 0; turn < maxTurns; turn++) {
    for (const [attacker, defender] of [[first, second], [second, first]]) {
      hp.set(defender, hp.get(defender) - calculateDamage(attacker, defender, power, typeBeats, rules));
      if (hp.get(defender) <= 0) {
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
