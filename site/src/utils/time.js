import { MAX_FRAME_MS } from "../config/constants.js";

/** Duração do quadro em segundos, limitada para evitar saltos. */
export const frameSeconds = (deltaMs) => Math.min(deltaMs, MAX_FRAME_MS) / 1000;
