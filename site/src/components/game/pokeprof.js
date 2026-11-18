import { EVENTS } from "../../config/constants.js";
import { teacherStats } from "../../config/teachers.js";
import { Pokeprof } from "../../domain/pokeprof.js";

// PokeProf guardado na pokébola: cada bola tem a sua instância (dois
// jogadores com o mesmo professor têm vidas separadas). Atributos base
// vêm de config/teachers.js. Avisa POKEPROF_CHANGED na bola quando a vida
// muda e POKEPROF_FAINTED (sobe até a cena) quando chega a 0; o reset do
// jogo cura todos.
AFRAME.registerComponent("pokeprof", {
  schema: {
    name: { type: "string", default: "" },
  },

  init() {
    this.prof = new Pokeprof(this.data.name, teacherStats(this.data.name));
    this.onGameReset = () => this.heal();
    this.el.sceneEl.addEventListener(EVENTS.GAME_RESET, this.onGameReset);
  },

  /** Aplica dano; retorna quanto de vida foi perdido de fato. */
  damage(amount) {
    const lost = this.prof.takeDamage(amount);
    if (lost) {
      this.changed();
      if (this.prof.isFainted()) {
        this.el.emit(EVENTS.POKEPROF_FAINTED, { name: this.prof.name }, true);
      }
    }
    return lost;
  },

  heal(amount) {
    const gained = this.prof.heal(amount);
    if (gained) {
      this.changed();
    }
    return gained;
  },

  changed() {
    const { hp } = this.prof;
    this.el.emit(EVENTS.POKEPROF_CHANGED, { hp, maxHp: this.prof.maxHp() }, false);
  },

  remove() {
    this.el.sceneEl.removeEventListener(EVENTS.GAME_RESET, this.onGameReset);
  },
});
