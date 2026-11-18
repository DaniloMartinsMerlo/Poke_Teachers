import { EVENTS } from "../config/constants.js";
import { canSendOut } from "../domain/battle.js";

// ----------------------------------------------------------------------
// Sistema "battle": sabe qual pokébola de cada jogador está com o pokémon
// em campo. Regra: um pokémon por jogador de cada vez.
// Atualizado pelos eventos POKEMON_RELEASED / POKEMON_RECALLED que o
// "pokemon-release" emite na cena.
// ----------------------------------------------------------------------
AFRAME.registerSystem("battle", {
  init() {
    this.active = {};
    this.onReleased = ({ detail }) => {
      this.active[detail.player] = detail.ball;
    };
    this.onRecalled = ({ detail }) => {
      if (this.active[detail.player] === detail.ball) {
        delete this.active[detail.player];
      }
    };
    this.el.addEventListener(EVENTS.POKEMON_RELEASED, this.onReleased);
    this.el.addEventListener(EVENTS.POKEMON_RECALLED, this.onRecalled);
  },

  canSendOut(player, ball) {
    return canSendOut(this.active, player, ball);
  },

  /** Pokébola cujo pokémon está em campo (ou null). */
  activeBall(player) {
    return this.active[player] || null;
  },

  remove() {
    this.el.removeEventListener(EVENTS.POKEMON_RELEASED, this.onReleased);
    this.el.removeEventListener(EVENTS.POKEMON_RECALLED, this.onRecalled);
  },
});
