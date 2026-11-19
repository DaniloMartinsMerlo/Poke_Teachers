// Bola segurada não atravessa paredes nem o chão (sem A-Frame).

/**
 * Empurra `point` para fora de um plano (ponto `planePoint`, normal
 * unitária `normal`) até ficar a pelo menos `radius` dele, pelo lado da
 * normal. Só mexe na componente perpendicular: ao arrastar a bola contra
 * a parede, ela desliza rente a ela.
 */
export function pushOutOfPlane(point, planePoint, normal, radius) {
  const distance = planeDistance(point, planePoint, normal);
  if (distance >= radius) {
    return { x: point.x, y: point.y, z: point.z };
  }
  const push = radius - distance;
  return {
    x: point.x + normal.x * push,
    y: point.y + normal.y * push,
    z: point.z + normal.z * push,
  };
}

/** Distância (com sinal, positiva do lado da normal) de `point` ao plano. */
export function planeDistance(point, planePoint, normal) {
  return (point.x - planePoint.x) * normal.x
    + (point.y - planePoint.y) * normal.y
    + (point.z - planePoint.z) * normal.z;
}

/**
 * Prolonga o segmento `from` → `to` em `extra` metros além de `to`, para
 * o teste de colisão enxergar a superfície antes de o centro da bola
 * chegar nela. Segmento nulo: devolve `to`.
 */
export function extendSegment(from, to, extra) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const dz = to.z - from.z;
  const length = Math.hypot(dx, dy, dz);
  if (length < 1e-9) {
    return { x: to.x, y: to.y, z: to.z };
  }
  const k = (length + extra) / length;
  return { x: from.x + dx * k, y: from.y + dy * k, z: from.z + dz * k };
}
