// Partida online entre dois headsets/navegadores (J1 x J2).
//
// Conexão ponto a ponto (WebRTC) com a biblioteca PeerJS, carregada da CDN
// (global `Peer`). O servidor público gratuito do PeerJS só serve para os
// dois se acharem; depois os dados vão direto de um ao outro. Se a rede
// bloquear o P2P, trocar o transporte (src/net/) por outro (ex.: Supabase
// Realtime) sem mexer no jogo.

// Versão exata da PeerJS (CDN). Ver site/net-test.html.
export const PEERJS_URL = "https://unpkg.com/peerjs@1.5.4/dist/peerjs.min.js";

export const ROOM = Object.freeze({
  // Código da sala: 4 dígitos (fácil de digitar no VR).
  codeLength: 4,
  // ID do anfitrião no servidor do PeerJS = prefixo + código. O prefixo
  // evita colidir com outros apps que usam o mesmo servidor público.
  peerPrefix: "poketeachers-inteli-",
  // Sem conectar depois disto (ms), "Entrar" desiste.
  joinTimeoutMs: 12000,
});

// Versão do protocolo de mensagens: os dois lados precisam ser iguais.
export const PROTOCOL_VERSION = 1;

// Estados da conexão (sistema "network").
export const NETWORK_STATES = Object.freeze({
  IDLE: "idle",
  // Anfitrião: abrindo a sala no servidor de encontro / aguardando o J2.
  OPENING: "opening",
  WAITING: "waiting",
  // Convidado: conectando na sala.
  JOINING: "joining",
  // Conectados, trocando "hello" (confere a versão do jogo).
  HANDSHAKE: "handshake",
  // Partida J1 x J2 em andamento.
  READY: "ready",
});

// Quem é quem: o anfitrião (cria a sala) é o J1 e calcula a batalha.
export const NETWORK_ROLES = Object.freeze({ HOST: "host", GUEST: "guest" });

// Código em uso no servidor: tenta outro, até este número de vezes.
export const ROOM_CREATE_ATTEMPTS = 5;

// Textos do menu (sem acento: fonte do A-Frame).
export const NETWORK_TEXTS = Object.freeze({
  opening: "Abrindo sala...",
  waiting: "Aguardando J2...",
  joining: "Entrando na sala...",
  handshake: "Conectado! Preparando a partida...",
  typeCode: "Digite os 4 digitos",
  errors: Object.freeze({
    "room-taken": "Nao consegui criar a sala. Tente de novo",
    "not-found": "Sala nao encontrada",
    full: "Sala cheia",
    timeout: "Tempo esgotado. Confira o codigo",
    network: "Sem conexao com a internet",
    version: "Versao do jogo diferente no outro aparelho",
    "no-peerjs": "Biblioteca de rede nao carregou",
    lost: "O adversario saiu da partida",
  }),
});

