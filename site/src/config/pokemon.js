// Pokémons genéricos que saem da pokébola quando ela cai no chão.
// São criaturas originais montadas com primitivas do A-Frame (ver
// components/scene/generic-pokemon.js); para trocar por um modelo do
// Blender, exporte um .glb e use "gltf-model" no lugar.

// Material do chão (ver config/physics.js): pousar no tampo do suporte
// não solta o pokémon.
export const RELEASE_SURFACE = "ground";

// Altura aproximada do pokémon, em metros.
export const POKEMON_SIZE = 0.6;

// Animação de saída (ms).
export const POP_DURATION = 450;
export const FLASH_DURATION = 350;

// Cada professor recebe sempre o mesmo visual (escolhido pelo nome).
export const POKEMON_LOOKS = Object.freeze([
  { body: "#7bc96f", belly: "#e8f5c8", accent: "#3f8f3a", ears: "pointy" },
  { body: "#f2994a", belly: "#ffe3b8", accent: "#c0572a", ears: "round" },
  { body: "#5aa9e6", belly: "#dff1ff", accent: "#2f6fa8", ears: "round" },
  { body: "#f5d547", belly: "#fff6c9", accent: "#3a2f1f", ears: "pointy" },
  { body: "#b48ee0", belly: "#f1e6ff", accent: "#7552a3", ears: "pointy" },
]);

// Recolher o pokémon (trocar): encolhe com um clarão vermelho (ms).
export const RECALL_DURATION = 350;
export const RECALL_FLASH_COLOR = "#ff4d4d";

// Marca do dono no campo: anel no chão e plaquinha acima da cabeça.
export const OWNER_RING_RADIUS = 0.34;
export const OWNER_TAG_HEIGHT = POKEMON_SIZE + 0.18;
