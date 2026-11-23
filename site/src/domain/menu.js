// Navegação da tela inicial, sem A-Frame.
import {
  MENU_ACTIONS as ACTIONS, MENU_BACK, MENU_SCREENS as SCREENS, OPPONENTS,
} from "../config/menu.js";

/**
 * Resultado de escolher uma opção do menu.
 * @param {string} screen tela atual (MENU_SCREENS)
 * @param {{action: string, soon?: boolean}} option botão escolhido
 * @returns {{screen: string, start: string | null, notice: string | null, network: string | null}}
 *   tela seguinte; `start`: adversário da partida a abrir (OPPONENTS), se
 *   houver; `notice`: "soon" para opções que ainda não existem;
 *   `network`: o que pedir ao sistema de rede — "create" (criar sala),
 *   "join" (entrar com o código digitado), "leave" (cancelar/sair).
 */
export function chooseMenuOption(screen, option) {
  const stay = { screen, start: null, notice: null, network: null };
  if (option.soon) {
    return { ...stay, notice: "soon" };
  }
  if (option.action === ACTIONS.BACK) {
    const leaves = screen === SCREENS.HOSTING || screen === SCREENS.JOIN;
    return { ...stay, screen: MENU_BACK[screen] || SCREENS.HOME, network: leaves ? "leave" : null };
  }
  switch (screen) {
    case SCREENS.HOME:
      switch (option.action) {
        case ACTIONS.VS_CPU: return { ...stay, start: OPPONENTS.CPU };
        case ACTIONS.VS_PLAYER: return { ...stay, screen: SCREENS.VERSUS };
        case ACTIONS.CREDITS: return { ...stay, screen: SCREENS.CREDITS };
        default: return stay;
      }
    case SCREENS.VERSUS:
      switch (option.action) {
        case ACTIONS.CREATE_ROOM: return { ...stay, screen: SCREENS.HOSTING, network: "create" };
        case ACTIONS.JOIN_ROOM: return { ...stay, screen: SCREENS.JOIN };
        default: return stay;
      }
    case SCREENS.JOIN:
      return option.action === ACTIONS.ENTER ? { ...stay, network: "join" } : stay;
    default:
      return stay;
  }
}

/**
 * Onde fica o painel: `distance` à frente da cabeça (direção horizontal
 * `yaw`, rad; 0 = olhando para -z) e `drop` abaixo dos olhos, nunca abaixo
 * de `minHeight`.
 * @param {{x:number, y:number, z:number}} head
 */
export function panelPlacement(head, yaw, distance, drop, minHeight = -Infinity) {
  return {
    x: head.x - Math.sin(yaw) * distance,
    y: Math.max(head.y - drop, minHeight),
    z: head.z - Math.cos(yaw) * distance,
  };
}

/**
 * O painel deve ser reposicionado à frente da cabeça neste quadro?
 * - Logo depois de entrar/sair do VR (`sinceViewMs` < `followMs`): sim, a
 *   cada quadro, desde que a cabeça já tenha posição (acima de
 *   `headReadyHeight`) — vale a última posição que o headset mandar.
 * - Sempre: se o painel ficou longe (> `maxDistance`) ou bem abaixo da
 *   cabeça (> `maxBelow`).
 * @param {{x:number,y:number,z:number}} head
 * @param {{x:number,y:number,z:number}} panel
 * @param {number | null} sinceViewMs ms desde entrar/sair do VR (null: faz tempo)
 */
export function shouldReplacePanel(head, panel, sinceViewMs, rules) {
  if (sinceViewMs !== null && sinceViewMs < rules.followMs && head.y >= rules.headReadyHeight) {
    return true;
  }
  const distance = Math.hypot(head.x - panel.x, head.y - panel.y, head.z - panel.z);
  return distance > rules.maxDistance || panel.y < head.y - rules.maxBelow;
}

/**
 * Posição (y, de cima para baixo) de `count` botões empilhados e
 * centrados em `centerY`.
 */
export function stackPositions(count, height, gap, centerY = 0) {
  const total = count * height + (count - 1) * gap;
  return Array.from({ length: count }, (_, index) => centerY + total / 2 - height / 2 - index * (height + gap));
}
