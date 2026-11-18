// PokeProf: um professor em batalha. Guarda os atributos base (fixos) e a
// vida atual (muda com o dano). Sem A-Frame, testável no Node.

export class Pokeprof {
  /**
   * @param {string} name
   * @param {{hp:number, attack:number, defense:number, speed:number}} stats
   */
  constructor(name, stats) {
    this.name = name;
    this.stats = Object.freeze({ ...stats });
    this.hp = stats.hp;
  }

  maxHp() {
    return this.stats.hp;
  }

  /** Fração de vida restante (0–1). */
  hpRatio() {
    return this.maxHp() > 0 ? this.hp / this.maxHp() : 0;
  }

  isFainted() {
    return this.hp <= 0;
  }

  /** Perde vida (sem passar de 0). Retorna quanto perdeu de fato. */
  takeDamage(amount) {
    const lost = Math.min(this.hp, Math.max(0, Math.round(amount)));
    this.hp -= lost;
    return lost;
  }

  /** Recupera vida (sem passar da máxima). Sem valor, cura tudo. */
  heal(amount = Infinity) {
    const gained = Math.min(this.maxHp() - this.hp, Math.max(0, amount));
    this.hp += gained;
    return gained;
  }
}
