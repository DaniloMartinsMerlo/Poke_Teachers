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

## 2026-11-17 — remoção da cesta e colisão completa das pokébolas

### Mudanças
- Removida a cesta provisória, sua pontuação, modelo 3D e componentes
  exclusivos.
- Adicionados corpos estáticos às arquibancadas, torres, placar e ao tampo
  do suporte das pokébolas; os postes passaram a usar caixas físicas.
- Mantidas as pokébolas como corpos dinâmicos com contato contra todos os
  obstáculos físicos da arena.

### Decisões e motivos
- Os obstáculos visuais passaram a usar `physics-body` porque o cannon.js
  só detecta colisão entre corpos registrados; assim as pokébolas não
  atravessam estruturas da arena.

### Pendências
- Validar a resposta das colisões no Quest 3, especialmente arremessos
  contra arquibancadas e torres.

## 2026-11-17 — professores nas pokébolas, pedestal do adversário, pouso

O projeto (faculdade): batalha Pokémon em que os pokémons são os
professores.

### Mudanças
- **Pedestal do adversário** do outro lado do campo (`-0.6 0 -7`, girado
  -90°), à direita de quem está lá, também com 3 pokébolas.
- **Professores nas bolas:** `ball-rack` ganhou `pokemon` (lista de nomes,
  na ordem das bolas). Nomes = nomes dos arquivos em `site/assets/img/`,
  mapeados em `src/config/teachers.js`.
- **Prévia ao apontar:** componente `pokemon-preview`. Enquanto algum
  raio (mouse, laser do controle ou olhar no VR) aponta para a bola, um
  cartão com foto e nome aparece 32 cm acima dela, virado para a câmera.
  Some quando a bola está na mão.
- **Bola para onde cai:** no primeiro contato "de cima" (normal com
  |y| ≥ 0,7, ver `domain/landing.js`) a bola fica com 20% da velocidade
  horizontal e do giro e passa a ter amortecimento alto. Ao pegar ou
  resetar volta ao normal. Quique contra chão/madeira reduzido.
- **Arremesso mais forte:** `throwBoost` 0,7 → 1, limite 8 → 12 m/s;
  mouse 2,5 → 4,5 m/s (+1,2 para cima).
- **Puxar a bola de longe:** laser alcança 15 m (`config/grab.js`).
  Segurando com o controle, o analógico daquela mão vira carretilha
  (frente afasta, trás puxa; 0,15–15 m) e a locomoção dessa mão pausa.
  No computador, a rodinha do mouse faz o mesmo.
- **Encaixes no suporte:** marcas no tampo em cada posição de bola.
  Soltar a bola a menos de 30 cm de um encaixe livre a trava ali, em pé e
  parada; a marca fica amarela enquanto a bola segurada está ao alcance.
  Os pegadores emitem `grabreleased` (sobe até a cena) ao soltar.

### Decisões e motivos
- Cartão da prévia é filho da cena, não da bola: a bola tem escala 0,01 e
  gira.
- Prévia via eventos `raycaster-intersected(-cleared)`: vale para mouse e
  laser sem código específico de cada um. Batida de lado (parede) não
  conta como pouso, para a bola não "grudar" na parede.
- Adversário com os mesmos 3 professores (ordem invertida) porque só há
  3 imagens por enquanto.

### Pendências
- Mãos rastreadas não têm raio, então não mostram a prévia (possível:
  mostrar quando a mão chega perto).
- Janela à esquerda do jogador para escolher ataques e itens.
- Definir os professores do adversário quando houver mais imagens.
