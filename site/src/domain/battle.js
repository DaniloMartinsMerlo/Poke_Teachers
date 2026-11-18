// Regras da batalha que não dependem do A-Frame.

/**
 * Cada jogador só pode ter um pokémon em campo. `active` mapeia jogador
 * → identificador da bola cujo pokémon está fora (ou ausente).
 * @param {Record<string, unknown>} active
 * @param {string} player
 * @param {unknown} ball
 */
export function canSendOut(active, player, ball) {
  const current = active[player];
  return current == null || current === ball;
}

/**
 * Para onde a bola volta no suporte: o encaixe dela, se livre; senão o
 * primeiro livre; sem nenhum livre, o dela mesmo assim.
 * @param {number} home índice do encaixe da bola
 * @param {boolean[]} occupied ocupação de cada encaixe
 */
export function returnSlot(home, occupied) {
  if (!occupied[home]) {
    return home;
  }
  const free = occupied.indexOf(false);
  return free >= 0 ? free : home;
}

/**
 * Posição na trajetória em arco do retorno da bola (0 ≤ t ≤ 1): vai em
 * linha reta de `from` a `to` e sobe `height` no meio do caminho.
 * @param {{x:number,y:number,z:number}} from
 * @param {{x:number,y:number,z:number}} to
 * @param {number} t
 * @param {number} height
 */
export function arcPoint(from, to, t, height) {
  const k = Math.min(Math.max(t, 0), 1);
  const ease = k * k * (3 - 2 * k);
  return {
    x: from.x + (to.x - from.x) * ease,
    y: from.y + (to.y - from.y) * ease + Math.sin(Math.PI * k) * height,
    z: from.z + (to.z - from.z) * ease,
  };
}

/**
 * Ângulo (rad) suavizado em direção a `target`, pelo caminho mais curto.
 * @param {number} current
 * @param {number} target
 * @param {number} amount fração do caminho (0–1)
 */
export function approachAngle(current, target, amount) {
  return current + angleBetween(current, target) * Math.min(Math.max(amount, 0), 1);
}

/** Diferença `target - current` em radianos, entre -π e π. */
export function angleBetween(current, target) {
  let diff = (target - current) % (Math.PI * 2);
  if (diff > Math.PI) diff -= Math.PI * 2;
  if (diff < -Math.PI) diff += Math.PI * 2;
  return diff;
}
