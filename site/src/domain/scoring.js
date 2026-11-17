// Regra da cesta: a bola atravessa o plano do aro de cima para baixo,
// por dentro do círculo.

/**
 * @param {number} previousY altura da bola no quadro anterior
 * @param {{x: number, y: number, z: number}} position posição atual
 * @param {{x: number, y: number, z: number}} hoopCenter centro do aro
 * @param {number} hoopRadius
 */
export function isBasket(previousY, position, hoopCenter, hoopRadius) {
  const crossedDown = previousY > hoopCenter.y && position.y <= hoopCenter.y;
  const inside = Math.hypot(position.x - hoopCenter.x, position.z - hoopCenter.z) < hoopRadius;
  return crossedDown && inside;
}
