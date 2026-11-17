# Histórico do jogo

Registro do que já foi feito e **por quê**. Leia antes de mudar o jogo e
acrescente uma entrada nova no fim a cada sessão de trabalho (mais recente
por último). Formato: data, o que mudou, decisões e o motivo, pendências.

---

## Antes de 2026-11-17 — ponto de partida

- Cena A-Frame 1.8 servida pelo Caddy em Docker (HTTPS local, necessário
  para WebXR no Quest).
- Tudo em um único `site/index.html` (~1100 linhas): física com cannon.js
  0.6.2, arena Pokémon (campo, muretas, arquibancadas, placar, torres de
  luz), cesta de basquete provisória com placar de cestas, 3 pokébolas
  sobre um suporte, pegar com pinça / controle / mouse, locomoção com
  analógicos, botão físico vermelho de reset.

## 2026-11-17 — refatoração, pinça + controles, colisão do jogador

### Mudanças
- **Pinça e controles na mesma sessão.** Causa do problema: no A-Frame o
  `laser-controls` aceita a mão rastreada como "controle genérico" (perfil
  `generic-hand` casa com o prefixo `generic`), então a pinça disparava
  `pinchstarted` **e** `triggerdown`, e dois pegadores disputavam a bola.
  Solução: sistema `input-mode` (`site/src/systems/input-mode.js`) que lê
  `tracked-controls.controllers` a cada `controllersupdated` e diz, por mão,
  se é `hand` ou `controller`. Gatilho, laser, analógicos só agem em modo
  `controller`; trocar de modo no meio de uma pegada solta a bola.
- **Colisão jogador × muretas.** `player-collision` no rig: círculo de
  0,25 m em volta da cabeça contra retângulos (AABB) das entidades com
  classe `player-obstacle`, lidos uma vez no `loaded`. Corrige teclado,
  analógico e andar de verdade (o rig é empurrado de volta). Guarda a
  última posição segura para não "atravessar" num passo grande.
- **Suporte das pokébolas ao lado** do jogador (`ball-rack` em
  `0.6 0 7`, girado 90°), bolas em fila ao longo do corpo.
- **Reset:** removidos o botão físico, o texto "RESET" e o texto de
  instruções. Reset no VR só por B/Y; tecla R mantida para o computador.
- **Clean code / clean architecture:** código movido para `site/src/` em
  camadas (`config` → `domain` → `systems` → `components`), `index.html`
  com ~70 linhas, cenário montado por componentes.
- Modelos movidos para `site/assets/models/`.
- Testes: `npm test` (regras puras) e `npm run test:e2e` (cena real no
  Chrome headless).

### Decisões e motivos
- **ES modules sem build.** O A-Frame 1.8 só monta a cena depois de
  `document.readyState === "complete"`, então registrar componentes em
  `<script type="module">` é seguro. Sem bundler para manter o fluxo
  "editou, recarregou" do docker-compose.
- **Comunicação por eventos da cena** (`gamereset`, `scorechanged`,
  `inputmodechanged`) em vez de um componente chamar o outro.
- **`domain/` sem A-Frame/THREE** para ser testável no Node.
- **Pokébolas são filhas da `<a-scene>`**, não do suporte: pegadores e
  física assumem que a posição local do objeto solto é a de mundo.
- **Componentes compostos `player-hand` / `player-controller`** para não
  repetir `hand: left` em quatro componentes no HTML.
- **Removidos** (não eram usados): `aframe-extras`, `physics-pusher`
  (empurrar mesa com o controle), corpo físico `compound`.
- **Getters no objeto do componente quebram** (o A-Frame avalia na hora do
  registro, com `this.data` indefinido). Usar métodos.

### Pendências / ideias
- Não testado em headset; só simulado. Validar no Quest 3: pinça, troca
  mão↔controle, colisão andando de verdade.
- Só com as mãos não há como andar artificialmente nem resetar (sem
  analógico nem B/Y). Possível gesto para isso.
- A cesta de basquete é provisória.
