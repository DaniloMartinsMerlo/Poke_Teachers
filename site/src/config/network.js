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
