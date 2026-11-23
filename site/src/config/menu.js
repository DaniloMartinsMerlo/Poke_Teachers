// Tela inicial (painel 3D na arena) e modos de jogo.
// Textos sem acento: a fonte padrão do A-Frame não tem esses caracteres.

// O jogo começa no menu; escolher um modo abre a partida.
export const GAME_MODES = Object.freeze({ MENU: "menu", MATCH: "match" });

// Adversário da partida.
export const OPPONENTS = Object.freeze({ CPU: "cpu", PLAYER: "player" });

export const MENU_SCREENS = Object.freeze({
  HOME: "home", VERSUS: "versus", CREDITS: "credits",
});

export const MENU_ACTIONS = Object.freeze({
  VS_CPU: "vs-cpu",
  VS_PLAYER: "vs-player",
  CREDITS: "credits",
  CREATE_ROOM: "create-room",
  JOIN_ROOM: "join-room",
  BACK: "back",
});

// Botões de cada tela, de cima para baixo. `soon`: ainda não existe
// (aparece cinza e só mostra o aviso).
export const MENU_OPTIONS = Object.freeze({
  [MENU_SCREENS.HOME]: Object.freeze([
    { action: MENU_ACTIONS.VS_CPU, label: "J1 x COMP" },
    { action: MENU_ACTIONS.VS_PLAYER, label: "J1 x J2" },
    { action: MENU_ACTIONS.CREDITS, label: "Creditos" },
  ]),
  // Salas online: etapa 3 do A_FAZER.
  [MENU_SCREENS.VERSUS]: Object.freeze([
    { action: MENU_ACTIONS.CREATE_ROOM, label: "Criar sala", soon: true },
    { action: MENU_ACTIONS.JOIN_ROOM, label: "Entrar", soon: true },
    { action: MENU_ACTIONS.BACK, label: "Voltar" },
  ]),
  [MENU_SCREENS.CREDITS]: Object.freeze([
    { action: MENU_ACTIONS.BACK, label: "Voltar" },
  ]),
});

export const MENU_TEXTS = Object.freeze({
  title: "POKE TEACHERS",
  [MENU_SCREENS.HOME]: "Escolha o modo de jogo",
  [MENU_SCREENS.VERSUS]: "J1 x J2",
  soon: "Em breve: partida online",
});

// Créditos (por enquanto, piada interna): tela branca com a foto do
// Murilo. Professor da imagem: config/teachers.js.
export const CREDITS_TEACHER = "Murilo";

// Painel (m): à frente da cabeça, um pouco abaixo dos olhos.
//   minHeight: o centro nunca fica abaixo disto (cabeça ainda sem posição).
//   Ao entrar/sair do VR o headset corrige a posição da cabeça nos
//   primeiros quadros: durante followMs o painel acompanha a cabeça a cada
//   quadro (só com ela acima de headReadyHeight). Depois, se ficar a mais
//   de maxDistance da cabeça ou mais de maxBelow abaixo dela, volta para a
//   frente dela.
export const MENU_LAYOUT = Object.freeze({
  distance: 1.4,
  drop: 0.15,
  minHeight: 0.9,
  headReadyHeight: 0.5,
  followMs: 2500,
  maxDistance: 3,
  maxBelow: 1,
  width: 0.9,
  height: 0.8,
  button: Object.freeze({ width: 0.5, height: 0.1, gap: 0.03 }),
  creditsImage: 0.5,
});

export const MENU_COLORS = Object.freeze({
  panel: "#1d2533",
  credits: "#ffffff",
  title: "#ffd23f",
  subtitle: "#c9d6ea",
  status: "#ffd23f",
});
