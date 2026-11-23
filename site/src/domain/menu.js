// Navegação da tela inicial, sem A-Frame.
import { MENU_ACTIONS as ACTIONS, MENU_SCREENS as SCREENS, OPPONENTS } from "../config/menu.js";

/**
 * Resultado de escolher uma opção do menu.
 * @param {string} screen tela atual (MENU_SCREENS)
 * @param {{action: string, soon?: boolean}} option botão escolhido
 * @returns {{screen: string, start: string | null, notice: string | null}}
 *   tela seguinte; `start`: adversário da partida a abrir (OPPONENTS), se
 *   houver; `notice`: "soon" para opções que ainda não existem.
 */
export function chooseMenuOption(screen, option) {
  const stay = { screen, start: null, notice: null };
  if (option.soon) {
    return { ...stay, notice: "soon" };
  }
  if (option.action === ACTIONS.BACK) {
    return { ...stay, screen: SCREENS.HOME };
  }
  if (screen === SCREENS.HOME) {
    switch (option.action) {
      case ACTIONS.VS_CPU: return { ...stay, start: OPPONENTS.CPU };
      case ACTIONS.VS_PLAYER: return { ...stay, screen: SCREENS.VERSUS };
      case ACTIONS.CREDITS: return { ...stay, screen: SCREENS.CREDITS };
      default: return stay;
    }
  }
  return stay;
}

/**
 * Onde fica o painel: `distance` à frente da cabeça (direção horizontal
 * `yaw`, rad; 0 = olhando para -z) e `drop` abaixo dos olhos.
 * @param {{x:number, y:number, z:number}} head
 */
export function panelPlacement(head, yaw, distance, drop) {
  return {
    x: head.x - Math.sin(yaw) * distance,
    y: head.y - drop,
    z: head.z - Math.cos(yaw) * distance,
  };
}

/**
 * Posição (y, de cima para baixo) de `count` botões empilhados e
 * centrados em `centerY`.
 */
export function stackPositions(count, height, gap, centerY = 0) {
  const total = count * height + (count - 1) * gap;
  return Array.from({ length: count }, (_, index) => centerY + total / 2 - height / 2 - index * (height + gap));
}
