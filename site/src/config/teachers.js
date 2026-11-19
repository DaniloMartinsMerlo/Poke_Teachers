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
//   type     tipo (chave de TYPES): define a vantagem
//
// Vantagem por TIPO (pedra-papel-tesoura): TYPE_BEATS diz qual tipo cada
// tipo vence — Fogo > Grama > Agua > Fogo. Contra o tipo que vence, o dano
// é multiplicado por STRONG_MULTIPLIER; contra o que perde, por
// WEAK_MULTIPLIER; mesmo tipo, 1 (config/battle.js).
//
// Depois de mexer nos números rode `npm test`: o teste "balanceamento"
// simula todos os duelos 1x1 e falha se algum professor deixar de vencer
// quem ele deveria vencer.

export const TEACHER_IMAGE_DIR = "assets/img";

// Tipos: rótulo (sem acento, fonte do A-Frame) e cor no cartão.
export const TYPES = Object.freeze({
  fogo: Object.freeze({ label: "Fogo", color: "#ff8a4c" }),
  grama: Object.freeze({ label: "Grama", color: "#7bd96f" }),
  agua: Object.freeze({ label: "Agua", color: "#5cb8ff" }),
});

// Qual tipo cada tipo vence: Fogo > Grama > Agua > Fogo.
export const TYPE_BEATS = Object.freeze({
  fogo: "grama",
  grama: "agua",
  agua: "fogo",
});

export const TEACHERS = Object.freeze({
  // Grama. Equilibrada.
  Fabi: Object.freeze({ image: "Fabi.png", type: "grama", hp: 100, attack: 55, defense: 45, speed: 60 }),
  // Agua. Tanque: muita vida e defesa, lento.
  Murilo: Object.freeze({ image: "Murilo.jpg", type: "agua", hp: 120, attack: 45, defense: 60, speed: 40 }),
  // Fogo. Rápido e forte, mas frágil.
  Rodinha: Object.freeze({ image: "Rodinha.png", type: "fogo", hp: 90, attack: 65, defense: 35, speed: 70 }),
});

// Bola sem professor configurado (nome desconhecido) usa estes valores.
export const DEFAULT_STATS = Object.freeze({ hp: 100, attack: 50, defense: 50, speed: 50 });

export const TEACHER_NAMES = Object.freeze(Object.keys(TEACHERS));

/** Caminho da imagem do professor, ou null se não houver. */
export function teacherImage(name) {
  const file = TEACHERS[name]?.image;
  return file ? `${TEACHER_IMAGE_DIR}/${file}` : null;
}

/** Tipo do professor (chave de TYPES), ou null. */
export function teacherType(name) {
  return TEACHERS[name]?.type ?? null;
}

/** Rótulo do tipo ("Fogo"), ou "" se não houver. */
export function typeLabel(type) {
  return TYPES[type]?.label ?? "";
}

/** Atributos base do professor (ou os padrões, se não existir). */
export function teacherStats(name) {
  const { hp, attack, defense, speed } = TEACHERS[name] || DEFAULT_STATS;
  return { hp, attack, defense, speed };
}
