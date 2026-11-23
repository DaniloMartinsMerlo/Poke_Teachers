// Alcance e "carretilha" das pegadas à distância (laser e mouse).

// Até onde o laser do controle alcança uma bola (m).
export const LASER_REACH = 15;

// Distância da bola segurada até o controle/câmera (m).
export const HOLD_MIN_DISTANCE = 0.15;
export const HOLD_MAX_DISTANCE = LASER_REACH;

// Analógico totalmente inclinado move a bola a esta velocidade (m/s).
export const REEL_SPEED = 4;
export const REEL_DEAD_ZONE = 0.15;

// Rodinha do mouse: metros por unidade de deltaY (1 "clique" ≈ 100).
export const WHEEL_METERS_PER_UNIT = 0.004;

// Encaixes do suporte: soltar a bola a menos disto do encaixe a trava lá.
export const SLOT_SNAP_DISTANCE = 0.3;
// Um encaixe está ocupado se houver bola a menos disto dele.
export const SLOT_OCCUPIED_DISTANCE = 0.1;

// Voo da bola de volta ao suporte (trocar pokémon / segundo pokémon
// barrado): duração (ms), altura do arco (m) e voltas no ar.
export const RETURN_DURATION = 900;
export const RETURN_ARC_HEIGHT = 1;
export const RETURN_SPINS = 2;
// Espera depois de a bola cair antes de voltar, quando barrada (ms).
export const BLOCKED_RETURN_DELAY = 300;
// Bola solta fora da arena (ARENA_BOUNDS) por este tempo (ms) volta
// sozinha para o suporte. A espera deixa ver a bola bater na
// arquibancada antes de voltar.
export const OUT_OF_ARENA_RETURN_DELAY = 800;
