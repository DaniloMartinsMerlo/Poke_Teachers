// Apertar botões de painel (HUD, menu) com a pinça da mão rastreada.

const local = () => new THREE.Vector3();

/**
 * Ponto da pinça em coordenadas de mundo, ou null. A posição do evento
 * vem no espaço do rig; converte com a matrixWorld da entidade da mão.
 */
export function pinchWorldPoint(event) {
  const hand = event.currentTarget || event.target;
  if (!event.detail || !event.detail.position || !hand) {
    return null;
  }
  hand.object3D.updateMatrixWorld();
  return new THREE.Vector3().copy(event.detail.position).applyMatrix4(hand.object3D.matrixWorld);
}

/**
 * Primeiro botão encostado no ponto da pinça (folga `reach` na largura e
 * na profundidade), ou null.
 * @param {THREE.Vector3} point ponto de mundo
 * @param {{plane: Element, width: number, height: number}[]} buttons
 * @param {number} reach
 * @param {(button: object) => boolean} [skip] botões a ignorar (travados)
 */
export function buttonAtPoint(point, buttons, reach, skip = () => false) {
  const p = local();
  return buttons.find((button) => {
    if (skip(button)) {
      return false;
    }
    const { plane, width, height } = button;
    plane.object3D.updateMatrixWorld();
    plane.object3D.worldToLocal(p.copy(point));
    return Math.abs(p.x) <= width / 2 + reach / 2
      && Math.abs(p.y) <= height / 2
      && Math.abs(p.z) <= reach;
  }) || null;
}
