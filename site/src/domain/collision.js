// Colisão do jogador vista de cima (plano XZ): o jogador é um círculo e
// cada obstáculo é um retângulo alinhado aos eixos. Funções puras, sem
// A-Frame, para poderem ser testadas isoladamente.

const EPSILON = 1e-9;
const PASSES = 2; // cantos (duas paredes) precisam de mais de uma passada

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

/**
 * Retângulo (no chão) a partir de uma caixa 3D { min, max }.
 */
export function rectFromBox(box) {
  return {
    minX: box.min.x,
    maxX: box.max.x,
    minY: box.min.y,
    maxY: box.max.y,
    minZ: box.min.z,
    maxZ: box.max.z,
  };
}

/**
 * O obstáculo está na altura do corpo do jogador?
 * (Ex.: voando por cima de uma mureta, não há colisão.)
 */
export function overlapsHeight(rect, feetY, headY) {
  return headY > rect.minY && feetY < rect.maxY;
}

// Vetor do ponto mais próximo do retângulo até `point` (zero se dentro).
function offsetFromRect(point, rect) {
  return {
    x: point.x - clamp(point.x, rect.minX, rect.maxX),
    z: point.z - clamp(point.z, rect.minZ, rect.maxZ),
  };
}

// Saída "reta" por um dos quatro lados, escolhendo a mais perto de `target`.
function exitTowards(point, radius, rect, target) {
  const exits = [
    { x: rect.minX - radius, z: point.z },
    { x: rect.maxX + radius, z: point.z },
    { x: point.x, z: rect.minZ - radius },
    { x: point.x, z: rect.maxZ + radius },
  ];
  const cost = (exit) => Math.hypot(exit.x - target.x, exit.z - target.z);
  return exits.reduce((best, exit) => (cost(exit) < cost(best) ? exit : best));
}

/**
 * Empurra `point` para fora de `rect`. `previous` é a última posição sem
 * colisão: num passo grande o jogador pode passar do meio da parede, e
 * sem ela seria empurrado para o lado de fora.
 */
function pushOutOfRect(point, radius, rect, previous) {
  const offset = offsetFromRect(point, rect);
  const distanceSq = offset.x * offset.x + offset.z * offset.z;

  if (distanceSq >= radius * radius) {
    return point;
  }

  const before = previous ? offsetFromRect(previous, rect) : offset;
  const sameSideAsBefore = offset.x * before.x + offset.z * before.z > 0;

  if (distanceSq > EPSILON && sameSideAsBefore) {
    const distance = Math.sqrt(distanceSq);
    const push = radius - distance;
    return {
      x: point.x + (offset.x / distance) * push,
      z: point.z + (offset.z / distance) * push,
    };
  }

  // Centro dentro do retângulo ou já do outro lado: volta pelo lado de
  // onde veio (ou pelo mais próximo, se não houver posição anterior).
  return exitTowards(point, radius, rect, previous || point);
}

/**
 * Quanto o círculo precisa se deslocar para não invadir nenhum retângulo.
 * @param {{x: number, z: number}} center
 * @param {number} radius
 * @param {Array<{minX: number, maxX: number, minZ: number, maxZ: number}>} rects
 * @param {{x: number, z: number}} [previous] última posição sem colisão
 * @returns {{x: number, z: number}} deslocamento a aplicar
 */
export function resolveCircleAgainstRects(center, radius, rects, previous) {
  let point = { x: center.x, z: center.z };
  for (let pass = 0; pass < PASSES; pass++) {
    point = rects.reduce((current, rect) => pushOutOfRect(current, radius, rect, previous), point);
  }
  return { x: point.x - center.x, z: point.z - center.z };
}
