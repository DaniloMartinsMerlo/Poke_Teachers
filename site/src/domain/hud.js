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

/**
 * Linha de detalhe de uma opção do HUD: poder do ataque (com o dano
 * estimado contra o adversário em campo, se houver) ou o efeito do
 * power-up. "" para as demais.
 * @param {{power?: number, effect?: string, short?: string, percent?: number}} option
 * @param {number | null} [estimate] dano estimado
 */
export function optionDetail(option, estimate = null) {
  if (typeof option.power === "number") {
    return estimate == null ? `Poder ${option.power}` : `Poder ${option.power} (~${estimate} dano)`;
  }
  if (option.effect === "heal") {
    return `Cura ${option.percent}% HP`;
  }
  if (option.effect === "boost") {
    return `${option.short} +${option.percent}% (1 turno)`;
  }
  return "";
}

/** "Super efetivo!" / "Pouco efetivo..." pelo multiplicador de tipo, ou "". */
export function effectivenessNote(multiplier) {
  if (multiplier > 1) return "Super efetivo!";
  if (multiplier > 0 && multiplier < 1) return "Pouco efetivo...";
  return "";
}

/** Efeito curto do power-up: "DEF +100%" ou "+42 HP" (cura). */
function powerupEffect(detail) {
  const { powerup } = detail;
  return powerup.effect === "heal" ? `+${detail.healed} HP` : `${powerup.short} +${powerup.percent}%`;
}

/**
 * Textos que flutuam sobre os PokeProfs no campo para uma ação do turno
 * (TURN_ACTION). `actor`: sobre quem agiu (nome do golpe/power-up);
 * `target`: sobre quem levou o golpe (dano) e `note` (efetividade ou
 * desmaio), ou null.
 */
export function calloutTexts(detail) {
  if (detail.kind === "attack") {
    const notes = [effectivenessNote(detail.multiplier), detail.fainted ? "Desmaiou!" : ""].filter(Boolean);
    return { actor: `${detail.label}!`, target: `-${detail.damage} HP`, note: notes.join(" ") };
  }
  return { actor: `${detail.label}! ${powerupEffect(detail)}`, target: null, note: "" };
}

/**
 * Linha curta do registro de batalha (HUD), ex.: "J2 Rodinha: Chamada
 * Oral -16". `owner`: rótulo do dono de quem agiu ("J1").
 */
export function logLine(detail, owner) {
  const who = `${owner} ${detail.actorName}`;
  if (detail.kind === "attack") {
    const note = detail.multiplier > 1 ? " (super)" : detail.multiplier < 1 ? " (fraco)" : "";
    return `${who}: ${detail.label} -${detail.damage}${note}`;
  }
  return `${who}: ${detail.label} ${powerupEffect(detail)}`;
}
