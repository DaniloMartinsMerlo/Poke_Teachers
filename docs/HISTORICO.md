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
- **Pokémon sai da bola:** componente `pokemon-release`. Quando a bola
  pousa no chão (material `ground`; o tampo do suporte não conta), um
  pokémon genérico (`generic-pokemon`, criatura original feita de
  primitivas) aparece 35 cm à frente dela, virado para o box do
  adversário (lado oposto ao suporte de onde a bola veio), com
  "pop" e clarão. Volta para a bola ao pegar ou resetar. Cada professor
  tem um visual fixo (`config/pokemon.js`). `physics-body` agora emite
  `balllanded` (com a superfície) e `balltakeoff`.

### Decisões e motivos
- Cartão da prévia é filho da cena, não da bola: a bola tem escala 0,01 e
  gira.
- Prévia via eventos `raycaster-intersected(-cleared)`: vale para mouse e
  laser sem código específico de cada um. Batida de lado (parede) não
  conta como pouso, para a bola não "grudar" na parede.
- Pokémons feitos em primitivas por enquanto (sem MCP do Blender na
  sessão); trocar por `.glb` exportado do Blender quando houver modelos.
- Adversário com os mesmos 3 professores (ordem invertida) porque só há
  3 imagens por enquanto.

### Pendências
- Mãos rastreadas não têm raio, então não mostram a prévia (possível:
  mostrar quando a mão chega perto).
- Janela à esquerda do jogador para escolher ataques e itens.
- Definir os professores do adversário quando houver mais imagens.

## 2026-11-18 — HUD de batalha, um PokeProf por jogador, donos

### Mudanças
- **HUD de batalha** em grade 2x2 (`components/game/battle-hud.js`, textos e medidas em
  `config/hud.js`): painel à esquerda do jogador (38°, 75 cm, 30 cm abaixo
  dos olhos) que segue a cabeça. Menu: Ataque, PowerUps, Trocar PokeProf,
  Desistir. Ataque e PowerUps abrem páginas com 4 opções (2x2) + Voltar na
  linha de baixo, largura inteira; o painel se ajusta às linhas de cada
  página (sem espaço vazio); escolher
  volta ao menu principal. Cada escolha emite `hudaction` na cena. Ataques
  e power-ups ainda só mostram mensagem (sem efeito). Desistir não faz nada.
- **Botões** respondem ao mouse (olhar + clique), ao laser do controle
  (gatilho) e à pinça da mão rastreada encostada no botão (5 cm).
- **Jogadores** (`config/players.js`): `ball-rack` e `battle-hud` têm
  `player` (`p1` azul, `p2` vermelho). O pokémon solto ganha anel no chão
  e plaquinha "J1 Fabi" na cor do dono; a faixa do tampo do suporte também
  usa a cor.
- **Um PokeProf por vez** (sistema `battle`, regra em `domain/battle.js`):
  se o jogador já tem um em campo, a segunda bola não abre, o HUD avisa e a
  bola volta voando para o suporte.
- **Trocar PokeProf:** o pokémon encolhe com um clarão vermelho e a bola
  volta em arco (sobe 1 m, gira 2 voltas, 0,9 s) até o encaixe dela (ou o
  primeiro livre). No voo a bola é cinemática (`physics-body.beginScripted`)
  e marcada `data-returning`: ninguém a pega no caminho.

### Decisões e motivos
- HUD filho da cena, não da câmera: posição imediata, mas o giro é
  suavizado — painel preso ao rosto enjoa no VR.
- Texto do botão é irmão do plano, não filho: o raycaster acusaria o
  `a-text` em vez do botão.
- Textos do HUD sem acento: a fonte padrão do A-Frame não tem os glifos.
- Constantes de páginas/ações ficam em `config/hud.js` e o domínio importa
  delas (config é a camada mais interna).

### Pendências
- Efeitos reais de ataques e power-ups; Desistir.
- HUD do jogador 2 / CPU (o componente já aceita `player: p2`).
- Validar no Quest 3: legibilidade do HUD, pinça nos botões, conforto do
  acompanhamento.
- No WSL sem `google-chrome`, o e2e roda com o Chrome do Windows via um
  script `google-chrome` no PATH que chama `chrome.exe` (trocando
  `--user-data-dir` por uma pasta do Windows).

### Ajuste no mesmo dia — HUD segue o corpo, não a cabeça
- Antes o HUD girava com a cabeça: ao virar para clicar, ele fugia. Agora
  é filho do rig (`index.html`): anda e gira com WASD/analógicos, mas
  fica parado quando só a cabeça vira ou inclina.
- Andar de verdade no quarto: folga de 30 cm (15 cm na altura) antes de o
  HUD ser arrastado (`domain/hud.js` → `pullWithin`), para inclinar até um
  botão não o mover.
- Girar o corpo de verdade: o VR não sabe para onde o tronco aponta, então
  se a cabeça fica mais de 100° virada por 1,2 s, o HUD se recentraliza
  devagar. Também reancora ao entrar/sair do VR. Valores em
  `config/hud.js`.
- No computador o mouse só gira a câmera: o HUD fica parado à esquerda e
  basta olhar para ele para clicar.

## 2026-11-18 — carretilha reta ao longo do laser

### Mudanças
- Com o controle, afastar/aproximar a bola pelo analógico agora move a
  bola paralela ao laser (`domain/reel.js` → `reelAlongRay`). Antes ela
  ia na linha "centro do controle → bola" e entortava em relação ao laser.

### Decisões e motivos
- No Quest o `laser-controls` aplica origem e direção do raio vindas do
  modelo do controle (evento `controllermodelready`): o laser não sai reto
  do centro do controle. A carretilha lê `raycaster.origin/direction` e
  mantém o desvio lateral da bola, para não "pular" para o raio.
- Mouse continua com `moveAlongHoldLine`: o cursor sai do centro da
  câmera, então lá as duas linhas coincidem.

## 2026-11-18 — atributos dos PokeProfs, vida no card

### Mudanças
- **Atributos base** em `config/teachers.js` (arquivo de balanceamento):
  `hp`, `attack`, `defense`, `speed` por professor + `BEATS`, o ciclo de
  vantagem Fabi > Murilo > Rodinha > Fabi.
- **Regras** em `config/battle.js` (fórmula de dano, multiplicadores de
  vantagem 1,5 / 0,67, ataques com `power`; ataques e power-ups saíram de
  `config/hud.js`).
- **Domínio:** classe `Pokeprof` (`domain/pokeprof.js`: vida atual,
  `takeDamage`, `heal`, `isFainted`, `hpRatio`) e `domain/combat.js`
  (`calculateDamage`, `advantageMultiplier`, `turnOrder` por velocidade,
  `simulateDuel`, `isAdvantageCycle`).
- **Componente `pokeprof`** em cada pokébola (instância própria: o mesmo
  professor nos dois lados tem vidas separadas). Reset do jogo cura todos.
- **Card do professor** mostra barra de vida (verde/amarela/vermelha),
  "HP atual/máx" (ou "Desmaiado"), ATQ/DEF/VEL e "Forte contra X";
  atualiza quando a vida muda. Subiu para 55 cm acima da bola.
- **Ataque provisório:** escolher um ataque no HUD com os dois jogadores
  em campo tira vida do PokeProf adversário na hora; o HUD mostra o dano.

### Decisões e motivos
- Defesa com retorno decrescente, `100 / (100 + defesa)`: nunca zera o
  dano, não precisa de teto como uma porcentagem direta, e "defesa 100 =
  metade do dano" é fácil de ajustar de cabeça.
- Teste "balanceamento" (`npm test`) simula os duelos 1x1 com um ataque
  médio (`BALANCE_TEST_POWER`) e falha se o ciclo 1 > 2 > 3 > 1 quebrar
  depois de mudar os números.
- `turnOrder` (velocidade) já existe e está testado, mas ainda não é
  usado: falta o sistema de turnos.

### Pendências
- Sistema de turnos (os dois escolhem, o mais rápido ataca primeiro).
- O que acontece ao desmaiar (trocar obrigatoriamente, fim de jogo).
- Power-ups, Desistir, HUD do jogador 2 / CPU.

## 2026-11-18 — lista "a fazer"

- Criado `docs/A_FAZER.md` com o que falta implementar (README, turnos,
  recolher PokeProf desmaiado, card do PokeProf em campo acima do HUD) e
  as pendências espalhadas nas entradas anteriores deste histórico. A
  partir daqui, pendências novas vão para lá.
