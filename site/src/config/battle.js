// Regras numéricas da batalha. Atributos dos professores e o ciclo de
// vantagem ficam em config/teachers.js.
//
// Dano de um ataque:
//   dano = poder × (ataque / ATTACK_SCALE)
//              × (DEFENSE_SCALE / (DEFENSE_SCALE + defesa))
//              × vantagem (STRONG, WEAK ou 1)
//   arredondado, no mínimo MIN_DAMAGE.

export const ATTACK_SCALE = 50;
export const DEFENSE_SCALE = 100;
export const STRONG_MULTIPLIER = 1.5;
export const WEAK_MULTIPLIER = 0.67;
export const MIN_DAMAGE = 1;

// Ao desmaiar (vida 0), espera este tempo (ms) com a barra zerada à vista
// antes de o PokeProf voltar para a bola, que voa de volta ao suporte.
export const FAINT_RECALL_DELAY = 900;

// Poder usado pelo teste de balanceamento (um ataque "médio").
export const BALANCE_TEST_POWER = 40;

// Ataques do menu: "power" é o poder na fórmula acima.
// Textos sem acento (fonte do A-Frame).
export const ATTACKS = Object.freeze([
  { id: "prova-surpresa", label: "Prova Surpresa", power: 40 },
  { id: "chamada-oral", label: "Chamada Oral", power: 30 },
  { id: "trabalho-em-grupo", label: "Trabalho em Grupo", power: 50 },
  { id: "reprovacao", label: "Reprovar", power: 60 },
]);

// Power-ups (por enquanto só nomes; o efeito vem depois).
export const POWERUPS = Object.freeze([
  { id: "ponto-extra", label: "Ponto Extra" },
  { id: "intervalo", label: "Intervalo" },
  { id: "cola-liberada", label: "Cola Liberada" },
  { id: "feriado", label: "Feriado" },
]);

/** Opções da fórmula de dano, prontas para o domínio. */
export const DAMAGE_RULES = Object.freeze({
  attackScale: ATTACK_SCALE,
  defenseScale: DEFENSE_SCALE,
  strong: STRONG_MULTIPLIER,
  weak: WEAK_MULTIPLIER,
  minDamage: MIN_DAMAGE,
});
