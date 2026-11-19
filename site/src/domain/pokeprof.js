// PokeProf: um professor em batalha. Guarda os atributos base (fixos), o
// tipo, a vida atual (muda com o dano) e o power-up de atributo. Sem
// A-Frame, testável no Node.
//
// Power-up de atributo ("boost", config/battle.js): usado num turno, fica
// "pendente" e só vale no turno seguinte ("ativo"); depois expira.
// `endTurn()` faz essa passagem no fim de cada turno.

export class Pokeprof {
  /**
   * @param {string} name
   * @param {{hp:number, attack:number, defense:number, speed:number}} stats
   * @param {string | null} [type] chave de TYPES (config/teachers.js)
   */
  constructor(name, stats, type = null) {
    this.name = name;
    this.type = type;
    this.stats = Object.freeze({ ...stats });
    this.hp = stats.hp;
    this.pendingBoost = null;
    this.activeBoost = null;
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
    const gained = Math.min(this.maxHp() - this.hp, Math.max(0, Math.round(amount)));
    this.hp += gained;
    return gained;
  }

  /** Atributos valendo agora: os base com o power-up ativo aplicado. */
  effectiveStats() {
    const stats = { ...this.stats };
    const boost = this.activeBoost;
    if (boost && boost.stat in stats) {
      stats[boost.stat] = Math.round(stats[boost.stat] * (1 + boost.percent / 100));
    }
    return stats;
  }

  /** Power-up de atributo usado agora: vale no próximo turno. */
  queueBoost(boost) {
    this.pendingBoost = boost;
  }

  /** Fim do turno: o ativo expira e o pendente passa a valer. */
  endTurn() {
    this.activeBoost = this.pendingBoost;
    this.pendingBoost = null;
  }

  clearBoosts() {
    this.pendingBoost = null;
    this.activeBoost = null;
  }
}
