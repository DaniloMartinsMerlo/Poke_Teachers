// ======================================================================
// PROFESSORES (os "pokémons" do jogo) — arquivo para balancear o jogo.
// ======================================================================
//
// Cada professor tem:
//   image    arquivo em site/assets/img/ (o nome do professor = chave)
//   hp       vida máxima
//   attack   ataque: quanto mais, mais dano causa
//   defense  defesa: reduz o dano recebido com retorno decrescente
//            (ver DEFENSE_SCALE em config/battle.js):
//              defesa 0   → recebe 100% do dano
//              defesa 50  → recebe ~67%
//              defesa 100 → recebe 50%
//              defesa 200 → recebe ~33%  (nunca chega a 0%)
//   speed    velocidade: em um turno, o mais rápido ataca primeiro
//
// Vantagem (pedra-papel-tesoura): BEATS diz quem cada professor vence.
// O ciclo é 1 > 2 > 3 > 1. Contra quem vence, o dano é multiplicado por
// STRONG_MULTIPLIER; contra quem perde, por WEAK_MULTIPLIER
// (config/battle.js).
//
// Depois de mexer nos números rode `npm test`: o teste "balanceamento"
// simula todos os duelos 1x1 e falha se algum professor deixar de vencer
// quem ele deveria vencer.

export const TEACHER_IMAGE_DIR = "assets/img";

export const TEACHERS = Object.freeze({
  // 1) Equilibrada.
  Fabi: Object.freeze({ image: "Fabi.png", hp: 100, attack: 55, defense: 45, speed: 60 }),
  // 2) Tanque: muita vida e defesa, lento.
  Murilo: Object.freeze({ image: "Murilo.jpg", hp: 120, attack: 45, defense: 60, speed: 40 }),
  // 3) Rápido e forte, mas frágil.
  Rodinha: Object.freeze({ image: "Rodinha.png", hp: 90, attack: 65, defense: 35, speed: 70 }),
});

// Quem cada um vence: Fabi > Murilo > Rodinha > Fabi.
export const BEATS = Object.freeze({
  Fabi: "Murilo",
  Murilo: "Rodinha",
  Rodinha: "Fabi",
});

// Bola sem professor configurado (nome desconhecido) usa estes valores.
export const DEFAULT_STATS = Object.freeze({ hp: 100, attack: 50, defense: 50, speed: 50 });

export const TEACHER_NAMES = Object.freeze(Object.keys(TEACHERS));

/** Caminho da imagem do professor, ou null se não houver. */
export function teacherImage(name) {
  const file = TEACHERS[name]?.image;
  return file ? `${TEACHER_IMAGE_DIR}/${file}` : null;
}

/** Atributos base do professor (ou os padrões, se não existir). */
export function teacherStats(name) {
  const { hp, attack, defense, speed } = TEACHERS[name] || DEFAULT_STATS;
  return { hp, attack, defense, speed };
}
