// Pouso da pokébola: decide se um contato é "caiu em cima de algo"
// (chão, tampo) e não uma batida de lado (parede).

/**
 * @param {{y: number}} normal normal do contato (unitária)
 * @param {number} minUp quanto a normal precisa apontar para cima/baixo
 */
export function isLandingNormal(normal, minUp) {
  return Math.abs(normal.y) >= minUp;
}
