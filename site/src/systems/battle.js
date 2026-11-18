import { ATTACKS, DAMAGE_RULES } from "../config/battle.js";
import { EVENTS } from "../config/constants.js";
import { HUD_ACTIONS } from "../config/hud.js";
import { PLAYER_IDS } from "../config/players.js";
import { BEATS } from "../config/teachers.js";
import { canSendOut } from "../domain/battle.js";
import { calculateDamage } from "../domain/combat.js";

// ----------------------------------------------------------------------
// Sistema "battle": sabe qual pokébola de cada jogador está com o pokémon
// em campo. Regra: um pokémon por jogador de cada vez.
// Atualizado pelos eventos POKEMON_RELEASED / POKEMON_RECALLED que o
// "pokemon-release" emite na cena.
//
// Ataque escolhido no HUD (provisório, sem turnos ainda): se os dois
// jogadores têm PokeProf em campo e o atacante não desmaiou, o dano
// (domain/combat.js) vai direto no PokeProf do adversário.
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
    this.onHudAction = ({ detail }) => {
      if (detail.action === HUD_ACTIONS.ATTACK) {
        this.attack(detail.player, detail.id);
      }
    };
    this.el.addEventListener(EVENTS.HUD_ACTION, this.onHudAction);
  },

  opponentOf(player) {
    return PLAYER_IDS.find((id) => id !== player) || null;
  },

  /** PokeProf (componente) em campo do jogador, ou null. */
  activeProf(player) {
    return this.activeBall(player)?.components.pokeprof || null;
  },

  attack(player, attackId) {
    const move = ATTACKS.find((item) => item.id === attackId);
    const attacker = this.activeProf(player);
    const defender = this.activeProf(this.opponentOf(player));
    if (!move || !attacker || !defender || attacker.prof.isFainted() || defender.prof.isFainted()) {
      return;
    }
    const damage = defender.damage(calculateDamage(attacker.prof, defender.prof, move.power, BEATS, DAMAGE_RULES));
    this.el.emit(EVENTS.POKEMON_DAMAGED, {
      attackerPlayer: player,
      defenderPlayer: this.opponentOf(player),
      attacker: attacker.prof.name,
      defender: defender.prof.name,
      attackLabel: move.label,
      damage,
      hp: defender.prof.hp,
      fainted: defender.prof.isFainted(),
    }, false);
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
    this.el.removeEventListener(EVENTS.HUD_ACTION, this.onHudAction);
  },
});
