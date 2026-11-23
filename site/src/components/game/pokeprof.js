import { EVENTS } from "../../config/constants.js";
import { teacherStats, teacherType } from "../../config/teachers.js";
import { Pokeprof } from "../../domain/pokeprof.js";

// PokeProf guardado na pokébola: cada bola tem a sua instância (dois
// jogadores com o mesmo professor têm vidas separadas). Atributos base e
// tipo vêm de config/teachers.js. Avisa POKEPROF_CHANGED na bola quando a
// vida ou o power-up muda e POKEPROF_FAINTED (sobe até a cena) quando a
// vida chega a 0; o reset do jogo cura todos, tira os power-ups e devolve
// o PP dos ataques.
AFRAME.registerComponent("pokeprof", {
  schema: {
    name: { type: "string", default: "" },
  },

  init() {
    this.prof = new Pokeprof(this.data.name, teacherStats(this.data.name), teacherType(this.data.name));
    this.onGameReset = () => {
      this.prof.clearBoosts();
      this.prof.restorePp();
      this.heal();
      this.changed();
    };
    this.el.sceneEl.addEventListener(EVENTS.GAME_RESET, this.onGameReset);
  },

  /** Aplica dano; retorna quanto de vida foi perdido de fato. */
  damage(amount) {
    const before = this.prof.hp;
    const lost = this.prof.takeDamage(amount);
    this.notify(before);
    return lost;
  },

  heal(amount) {
    const before = this.prof.hp;
    const gained = this.prof.heal(amount);
    this.notify(before);
    return gained;
  },

  /**
   * Avisa a cena depois de o PokeProf mudar por fora (o sistema de turnos
   * aplica dano e power-ups direto no domínio). `hpBefore`: vida antes.
   */
  notify(hpBefore = this.prof.hp) {
    this.changed();
    if (hpBefore > 0 && this.prof.isFainted()) {
      this.el.emit(EVENTS.POKEPROF_FAINTED, { name: this.prof.name }, true);
    }
  },

  changed() {
    const { hp } = this.prof;
    this.el.emit(EVENTS.POKEPROF_CHANGED, { hp, maxHp: this.prof.maxHp() }, false);
  },

  remove() {
    this.el.sceneEl.removeEventListener(EVENTS.GAME_RESET, this.onGameReset);
  },
});
