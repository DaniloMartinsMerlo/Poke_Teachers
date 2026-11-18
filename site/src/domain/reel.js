// Carretilha: nova distância da bola segurada até quem segura.

/**
 * @param {number} current distância atual (m)
 * @param {number} change quanto aproximar (<0) ou afastar (>0), em m
 * @param {number} min
 * @param {number} max
 */
export function reelDistance(current, change, min, max) {
  return Math.min(max, Math.max(min, current + change));
}

/**
 * Analógico → variação de distância no quadro. Empurrar para frente
 * (y negativo no WebXR) afasta; puxar para trás aproxima.
 */
export function thumbstickReel(y, speed, dt, deadZone) {
  return Math.abs(y) < deadZone ? 0 : -y * speed * dt;
}

/**
 * Carretilha ao longo do laser: move `position` paralelamente ao raio
 * (`origin` + `direction`, unitária), mantendo o desvio lateral. Assim a
 * bola anda reta junto do laser, mesmo que o raio não saia do centro do
 * controle (no Quest ele sai inclinado). A distância medida ao longo do
 * raio fica entre `min` e `max`.
 * @param {{x:number,y:number,z:number}} position
 * @param {{x:number,y:number,z:number}} origin
 * @param {{x:number,y:number,z:number}} direction
 * @returns {{x:number,y:number,z:number}}
 */
export function reelAlongRay(position, origin, direction, change, min, max) {
  const along = (position.x - origin.x) * direction.x
    + (position.y - origin.y) * direction.y
    + (position.z - origin.z) * direction.z;
  const step = reelDistance(along, change, min, max) - along;
  return {
    x: position.x + direction.x * step,
    y: position.y + direction.y * step,
    z: position.z + direction.z * step,
  };
}
