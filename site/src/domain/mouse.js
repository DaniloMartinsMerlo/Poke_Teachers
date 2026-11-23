// Regras do mouse no computador (sem A-Frame).

/** Apertar e soltar com o mouse longe (> `limit` px) = arrasto, não clique. */
export function isMouseDrag(down, up, limit) {
  return Math.hypot(up.x - down.x, up.y - down.y) > limit;
}

/**
 * Velocidade do arremesso com o mouse: `speed` na direção do raio do
 * ponteiro (normalizada) + `lift` para cima.
 * @param {{x:number, y:number, z:number}} direction
 */
export function mouseThrowVelocity(direction, speed, lift) {
  const length = Math.hypot(direction.x, direction.y, direction.z) || 1;
  return {
    x: direction.x / length * speed,
    y: direction.y / length * speed + lift,
    z: direction.z / length * speed,
  };
}
