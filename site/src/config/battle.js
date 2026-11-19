// Regras numéricas da batalha. Atributos e tipos dos professores e o
// ciclo de vantagem entre tipos ficam em config/teachers.js.
//
// Dano de um ataque:
//   dano = poder × (ataque / ATTACK_SCALE)
//              × (DEFENSE_SCALE / (DEFENSE_SCALE + defesa))
//              × vantagem de tipo (STRONG, WEAK ou 1)
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

// Power-ups: usar um gasta a ação do turno (não ataca).
//   effect "boost": aumenta `stat` em `percent`% durante 1 turno — o
//     turno SEGUINTE ao uso. No turno do uso o atributo ainda é o normal
//     (se o adversário atacar nesse turno, o dano é calculado sem ele).
//   effect "heal": cura `percent`% da vida máxima (sem passar do máximo)
//     NA HORA, na vez dele na ordem do turno.
// `short` aparece no cartão e nas mensagens ("VEL +80%").
export const POWERUPS = Object.freeze([
  // +50% de ataque: 55 → 83 (Fabi).
  { id: "ponto-extra", label: "Ponto Extra", effect: "boost", stat: "attack", percent: 50, short: "ATQ" },
  { id: "intervalo", label: "Intervalo", effect: "heal", percent: 35, short: "HP" },
  // +80% de velocidade: alto o bastante para o mais lento passar o mais
  // rápido (Murilo 40 → 72, acima de Rodinha 70).
  { id: "cola-liberada", label: "Cola Liberada", effect: "boost", stat: "speed", percent: 80, short: "VEL" },
  // +100% de defesa: 45 → 90, recebe ~53% do dano em vez de ~69%.
  { id: "feriado", label: "Feriado", effect: "boost", stat: "defense", percent: 100, short: "DEF" },
]);

// Resolução do turno (ms): espera depois das duas escolhas e entre as
// ações de cada PokeProf, para dar tempo de ler o HUD e ver a vida cair.
export const TURN_START_DELAY = 500;
export const TURN_STEP_DELAY = 1100;

// Fim de jogo: espera (ms) depois do último desmaio antes de anunciar o
// vencedor (o jogador vê a barra zerar e o PokeProf voltar para a bola).
export const GAME_OVER_DELAY = FAINT_RECALL_DELAY + 800;

// Adversário computador (componente "cpu-player").
export const CPU = Object.freeze({
  // Chance de usar power-up em vez de atacar. Baixa, para raramente usar
  // dois seguidos; e nunca repete o último power-up que usou.
  powerupChance: 0.25,
  // "Pensando" antes de escolher a ação (ms).
  thinkMs: 1400,
  // Espera antes de arremessar um PokeProf (ms).
  sendDelayMs: 1000,
  // Arremesso: a bola sobe `lift` m acima do suporte (como se fosse
  // pega) e voa em arco por `flightTime` s até o campo, em |z| = targetZ
  // do lado da CPU, com x sorteado em ±spreadX.
  throw: Object.freeze({ lift: 0.35, flightTime: 1.1, targetZ: 3.5, spreadX: 1.5 }),
  // Sem soltar o PokeProf depois disto (ms), a bola volta e tenta de novo.
  throwTimeoutMs: 3500,
});

/** Opções da fórmula de dano, prontas para o domínio. */
export const DAMAGE_RULES = Object.freeze({
  attackScale: ATTACK_SCALE,
  defenseScale: DEFENSE_SCALE,
  strong: STRONG_MULTIPLIER,
  weak: WEAK_MULTIPLIER,
  minDamage: MIN_DAMAGE,
});
