// Código da sala online (sem A-Frame, sem rede).

/**
 * Código aleatório de `length` dígitos, com zeros à esquerda ("0427").
 * `random` injetável para teste.
 */
export function generateRoomCode(length, random = Math.random) {
  const max = 10 ** length;
  const n = Math.min(max - 1, Math.floor(random() * max));
  return String(n).padStart(length, "0");
}

/** Só os dígitos do que foi digitado (" 48-27 " → "4827"). */
export function normalizeRoomCode(text) {
  return String(text ?? "").replace(/\D/g, "");
}

/** Exatamente `length` dígitos? */
export function isValidRoomCode(code, length) {
  return new RegExp(`^\\d{${length}}$`).test(String(code ?? ""));
}

/** ID do anfitrião no servidor de encontro: prefixo + código. */
export function roomPeerId(code, prefix) {
  return `${prefix}${code}`;
}
