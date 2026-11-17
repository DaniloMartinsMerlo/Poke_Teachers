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
