// Navegação do menu de batalha (HUD), sem A-Frame.

import { HUD_ACTIONS as ACTIONS, HUD_PAGES as PAGES } from "../config/hud.js";

/**
 * Resultado de escolher uma opção no HUD.
 * @param {string} page página atual
 * @param {{action?: string, id?: string}} choice opção escolhida: no menu
 *   principal, `action`; nas páginas de ataque/power-up, `id` do item ou
 *   `action: "back"`.
 * @returns {{page: string, emit: {action: string, id?: string} | null}}
 *   página seguinte e, se houver, a ação a anunciar.
 */
export function chooseHudOption(page, choice) {
  if (choice.action === ACTIONS.BACK) {
    return { page: PAGES.MAIN, emit: null };
  }
  if (page === PAGES.GAME_OVER) {
    return choice.action === ACTIONS.PLAY_AGAIN
      ? { page: PAGES.MAIN, emit: { action: ACTIONS.PLAY_AGAIN } }
      : { page, emit: null };
  }
  if (page === PAGES.MAIN) {
    switch (choice.action) {
      case ACTIONS.ATTACK: return { page: PAGES.ATTACK, emit: null };
      case ACTIONS.POWERUP: return { page: PAGES.POWERUP, emit: null };
      case ACTIONS.SWITCH: return { page: PAGES.MAIN, emit: { action: ACTIONS.SWITCH } };
      case ACTIONS.GIVE_UP: return { page: PAGES.MAIN, emit: { action: ACTIONS.GIVE_UP } };
      default: return { page, emit: null };
    }
  }
  const action = page === PAGES.ATTACK ? ACTIONS.ATTACK : ACTIONS.POWERUP;
  return { page: PAGES.MAIN, emit: { action, id: choice.id } };
}

/**
 * "Folga": o ponto `anchor` só se move quando `target` se afasta mais que
 * `slack`, e aí é puxado até ficar a `slack` de distância. Serve para o
 * HUD não fugir quando o jogador inclina a cabeça para apertar um botão.
 * @param {{x:number,z:number}} anchor
 * @param {{x:number,z:number}} target
 * @param {number} slack
 */
export function pullWithin(anchor, target, slack) {
  const dx = target.x - anchor.x;
  const dz = target.z - anchor.z;
  const distance = Math.hypot(dx, dz);
  if (distance <= slack) {
    return { x: anchor.x, z: anchor.z };
  }
  const k = (distance - slack) / distance;
  return { x: anchor.x + dx * k, z: anchor.z + dz * k };
}

/** Mesmo que `pullWithin`, em uma dimensão (altura). */
export function pullWithin1D(anchor, target, slack) {
  const diff = target - anchor;
  if (Math.abs(diff) <= slack) {
    return anchor;
  }
  return target - Math.sign(diff) * slack;
}
