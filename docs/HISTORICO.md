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

## 2026-11-18 — card do PokeProf em campo acima do HUD

### Mudanças
- `PokeprofCard` (`components/game/pokeprof-card.js`): o cartão (foto,
  nome, barra e número de vida, ATQ/DEF/VEL, "Forte contra") virou uma
  peça reutilizável com dois formatos: `vertical` (prévia sobre a
  pokébola) e `horizontal` (acima do HUD, com a largura do painel).
- `battle-hud`: quando o PokeProf do jogador sai da bola, o cartão
  horizontal aparece logo acima do painel (acompanha a altura do painel
  em cada página) e atualiza a vida ao vivo; some ao recolher.
- `pokemon-preview`: não aparece mais enquanto o professor está em campo.

### Decisões e motivos
- Formato horizontal acima do HUD: o vertical somado ao painel ficaria
  com ~65 cm de altura, obrigando a olhar para cima.
- A barra de vida é ajustada por `setAttribute` (posição/escala), não
  por `object3D`: no 1º `refresh` a entidade ainda não carregou e o
  A-Frame reaplicaria a posição do atributo ao carregar. E a altura da
  barra fica guardada na classe: antes de carregar, `getAttribute`
  devolve a string crua.

### Ajuste no mesmo dia — cartão do adversário
- O HUD também mostra o cartão do PokeProf do adversário em campo,
  empilhado acima do cartão do jogador (como nas batalhas Pokémon: o
  adversário em cima). Sem o PokeProf do jogador, o do adversário desce
  para logo acima do painel.
- `PokeprofCard` aceita `owner`: rótulo ao lado do nome ("Rodinha (J2)")
  e faixa na borda esquerda com a cor do dono.
- Com os dois cartões, a pilha passa ~17 cm acima da altura dos olhos;
  se incomodar no Quest, aumentar `HUD_DROP` em `config/hud.js`.

## 2026-11-18 — PokeProf desmaiado volta para a bola

### Mudanças
- Vida chega a 0: o componente `pokeprof` emite `pokeproffainted` (sobe
  até a cena). Depois de `FAINT_RECALL_DELAY` (900 ms, `config/battle.js`)
  com a barra zerada e "Desmaiado" à vista no cartão, o suporte recolhe o
  pokémon com a mesma animação do "Trocar PokeProf" (encolhe + bola voa ao
  suporte) — `ball-rack.recallBall`.
- Bola de desmaiado jogada de novo não abre: `sendoutblocked` com
  `reason: "fainted"`, a bola volta sozinha e o HUD avisa "X esta
  desmaiado!". O reset do jogo cura todos.
- HUD: ao derrubar o adversário mostra "X desmaiou! -N HP"; o dono do
  desmaiado vê "X desmaiou!". `pokemondamaged` ganhou `defenderPlayer` e
  `fainted`.

### Decisões e motivos
- Desmaiado não volta à batalha até o reset (como no Pokémon); era o
  "provável" anotado no A_FAZER.
- Espera antes de recolher para o jogador ver o golpe final na barra.
- O atraso é contado nos `tick`s do suporte, não com `setTimeout`: pausa
  junto com a cena e funciona no e2e com quadros simulados.

## 2026-11-19 — turnos, CPU, power-ups, tipos, fim de jogo, bola segurada

### Mudanças
- **Tipos** (`config/teachers.js`): Rodinha **Fogo**, Fabi **Grama**,
  Murilo **Agua**; `TYPE_BEATS` Fogo > Grama > Agua > Fogo substitui o
  `BEATS` entre professores. `advantageMultiplier`/`calculateDamage`
  comparam tipos. O cartão mostra "Tipo Fogo > Grama" na cor do tipo.
- **Turnos** (`domain/turn.js`, sistema `battle`): cada jogador escolhe
  um ataque ou power-up; nada é aplicado até os dois escolherem. Depois o
  turno resolve aos poucos (0,5 s, e 1,1 s entre as ações): o mais rápido
  (com power-up ativo) age primeiro; se derrubar o outro, o segundo não
  age. Cada ação vira `turnaction`; o HUD mostra "Aguardando
  adversario...", "Resolvendo o turno..." e o resultado de cada ação.
  Ataque e PowerUps ficam cinza (travados) depois de escolher; Trocar só
  trava durante a resolução. Trocar/recolher apaga a escolha do jogador
  e tira os power-ups do PokeProf. O ataque instantâneo provisório e o
  evento `pokemondamaged` saíram.
- **Power-ups** (`POWERUPS` em `config/battle.js`): Ponto Extra ATQ +50%,
  Cola Liberada VEL +80%, Feriado DEF +100% (valem no turno seguinte ao
  uso, por 1 turno), Intervalo cura 35% da vida máxima na hora. O cartão
  em campo mostra o power-up ("Feriado: DEF +100% (este turno)" ou
  "(prox. turno)") e os atributos já com o bônus.
- **CPU** (`domain/cpu.js` + componente `cpu-player` no suporte do J2,
  `control: "cpu"`): aguardando → escolher PokeProf → arremessar →
  escolher ação → aguardar turno, voltando a escolher PokeProf quando o
  dela desmaia; para no fim de jogo, reset recomeça. A bola sobe 35 cm
  do suporte e é lançada em arco balístico (1,1 s) até |z| = 3,5 do lado
  dela, x sorteado; solta o PokeProf pelo fluxo normal de pouso. Se não
  soltar em 3,5 s, a bola volta e ela tenta de novo. Pessoas não pegam as
  bolas da CPU (`data-no-grab`).
- **Fim de jogo:** todos os PokeProfs de um jogador desmaiados → depois
  de `GAME_OVER_DELAY` (1,7 s) evento `gameover`; o HUD vira a página
  "Fim de jogo" com "Voce venceu!/perdeu!" e "Jogar de novo" (emite
  `gamereset`: bolas voltam, todos curados, CPU aguardando).
- **Bola segurada não atravessa parede, chão nem móveis:** no sistema de
  física (que roda depois dos `tick` dos pegadores), um raio do cannon.js
  da última posição válida até a posição pedida pela mão testa corpos
  estáticos; batendo, a bola fica rente à superfície e desliza
  (`domain/held.js`). Nunca fica abaixo do chão.

### Decisões e motivos
- **CPU com 25% de chance de power-up** e nunca repetindo o último
  power-up que usou (pedido do usuário: evitar dois seguidos). Também não
  escolhe Intervalo com a vida cheia.
- **Cura vale na hora** (na vez dele na ordem do turno); só os de
  atributo esperam o turno seguinte — curar "no turno seguinte" pareceria
  que o botão não funcionou.
- **Jogador pode repetir power-up** em turnos seguidos (a regra de não
  repetir é só da CPU, como pedido). O efeito não acumula: o novo
  substitui o pendente.
- **Nomes → efeitos:** Ponto Extra = ataque, Cola Liberada = velocidade
  ("responde mais rápido"), Feriado = defesa (descanso), Intervalo = cura.
- **Trocar continua livre** (não gasta o turno), como já era; ficou como
  pendência decidir.
- **Bola segurada corrigida só no desenho do quadro:** a posição pedida
  pela mão é guardada e restaurada no quadro seguinte, senão a "pegada"
  do controle/mouse (posição local) mudaria para sempre depois de
  encostar numa parede. Ao soltar, a bola sai da posição corrigida.
- A CPU chama `systems.battle.choose()` direto (API do sistema, como o
  `ball-rack` já faz com `activeBall`), em vez de fingir um clique no HUD.
- Esperas do turno e da CPU contadas nos `tick`s (pausam com a cena e
  funcionam no e2e com quadros simulados).

### Pendências
- Dois jogadores humanos na mesma partida (rede) — anotado no A_FAZER.
- Trocar gasta o turno? Desistir.
- Validar no Quest: ritmo do turno, legibilidade das mensagens e do
  cartão com power-up, bola encostando nas paredes.
### Ajuste no mesmo dia — poder dos ataques, badges dos power-ups
- Botões de ataque mostram, embaixo do nome, "Poder 60 (~33 dano)": o
  dano estimado contra o PokeProf do adversário em campo (tipo e
  power-ups de agora); sem adversário, só o poder. A página se refaz
  quando alguém entra/sai de campo.
- Botões de power-up ganharam um badge colorido com o efeito ("ATQ +50%
  (1 turno)", "Cura 35% HP"...). Cores em `HUD_BADGE_COLORS`
  (`config/hud.js`); texto em `domain/hud.js` → `optionDetail`.
- Mensagem de desmaio diz de quem é ("Rodinha (J2) desmaiou!"): os dois
  times têm os mesmos professores e antes era ambíguo.
- Pergunta do usuário: "a CPU escolhe o PokeProf com base no meu?" Não:
  sorteio uniforme entre os de pé (1/3 de chance de ter vantagem de
  tipo). Simulação de 20 mil partidas com as regras atuais: jogador
  atacando ao acaso vence ~70%; sempre "Reprovar" vence ~87%. Sem
  mudança de números por enquanto — o mais provável era o jogador não
  saber o poder de cada ataque (Chamada Oral 30 x Reprovar 60), que agora
  aparece no botão.

### Ajuste no mesmo dia — ações do turno mais à vista, cartão sem estourar
- **Balões no campo** (componente `battle-callouts`, uma entidade no
  `index.html`): a cada ação, o nome do golpe/power-up aparece sobre o
  PokeProf que agiu (faixa na cor do dono) e o dano sobre quem levou, com
  "Super efetivo!" / "Pouco efetivo..." / "Desmaiou!". Sobem e somem em
  2,2 s, viram para a câmera e crescem com a distância (o do outro lado
  do campo continua legível). Valores em `FIELD_CALLOUT` (`config/hud.js`).
- **Registro da batalha** à direita do menu: "Turno N" e as últimas 7
  ações, na cor do dono ("J2 Rodinha: Chamada Oral -40 (super)"), e o
  vencedor no fim. O status amarelo ficou só para "Aguardando
  adversario..." / "Resolvendo o turno..." e avisos.
- `performAction` devolve `multiplier` (vantagem de tipo) para mostrar a
  efetividade. Textos em `domain/hud.js` (`calloutTexts`, `logLine`).
- Cartão em campo: a linha do power-up estourava a moldura ("Feriado: DEF
  +100% (este turno)", 2 linhas). Agora "DEF +100% ativo" / "DEF +100%
  prox. turno" (cabe na coluna de ~26 caracteres).
- Motivo: o usuário achou as ações do turno escondidas na linha amarela
  embaixo do HUD.

## 2026-11-23 — validação no Quest 3, precisão e PP, troca gasta o turno, bola fora da arena

### Validação no Quest 3 (usuário)
- Ok: bola segurada desliza rente; partida contra a CPU legível; balões,
  registro e HUD legíveis; pinça; colisões na arquibancada (não abre);
  carretilha reta (bola defasada ao passar o laser pelo chão: aceito).
- Novos itens no A_FAZER: balões que se sobrepõem, texto de efetividade
  apagado, prévia e gesto de reset com as mãos.

### Mudanças
- **Precisão e PP** (`ATTACKS` em `config/battle.js`): Chamada Oral 30 /
  100% / 15 PP, Prova Surpresa 40 / 90% / 10, Trabalho em Grupo 50 / 80% /
  8, Reprovar 60 / 65% / 5. `performAction` gasta 1 PP e sorteia o acerto
  (`rollHit`, `random` injetável); errou = `missed`, sem dano. PP contado
  por PokeProf (`Pokeprof.ppLeft/spendPp/restorePp`); o reset devolve.
  Ataque sem PP: botão travado e `battle.choose` recusa; a CPU só sorteia
  ataques com PP (sem nenhum, usa power-up).
- HUD: detalhe do botão virou "~33 dano | 65% | PP 5/5" (sem adversário
  em campo: "Poder 60 | 65% | PP 5/5"). Balão "Errou!" em branco; registro
  "J2 Rodinha: Reprovar errou!".
- **Trocar gasta o turno:** recolher um PokeProf de pé com o turno aberto
  (botão Trocar ou pegando a bola do campo) vira a escolha `switch`,
  substituindo outra já feita. O adversário pode escolher enquanto isso
  (`canChoose` aceita adversário "trocando"), mas o turno só começa quando
  o novo PokeProf pousa (`maybeStartTurn` no `POKEMON_RELEASED`). A troca
  vai primeiro no turno; o ataque do adversário acerta quem entrou. Balão
  "Vai, X!", registro "J1 trocou: X entrou", status "Volte, X! (gasta o
  turno)".
- **Bola fora da arena** (`ARENA_BOUNDS` = lado de dentro das muretas,
  `isOutsideArena` em `domain/battle.js`): solta fora por 0,8 s
  (`OUT_OF_ARENA_RETURN_DELAY`) volta voando ao suporte do dono
  (`ball-rack.checkOutOfArena`); fora da arena o PokeProf não sai, nem no
  chão atrás da mureta (antes saía).

### Decisões e motivos
- **Valores de precisão/PP** são os sugeridos no A_FAZER (usuário não
  mudou). Teste garante "mais poder → precisão e PP menores ou iguais".
- **PP gasto ao executar**, não ao escolher: se o PokeProf desmaia antes
  de agir, ou o alvo já caiu, não perde PP (como no Pokémon). Errar gasta.
- **Troca livre fora do turno aberto:** repor um desmaiado ou lançar
  enquanto o adversário não tem ninguém em campo não é "trocar".
- **Pegar a bola do campo também conta como troca**, para não haver um
  jeito de trocar de graça.
- Bola fora da arena: espera de 0,8 s para ver a bola bater na
  arquibancada antes de voltar; segurada, voando ou com PokeProf fora não
  conta (laser alcança 15 m).
- Testes de turno passam um `random` fixo (`HIT`/`MISS`): com a precisão,
  `Math.random` deixaria os testes instáveis.

### Pendências
- Validar no Quest 3 (lista no A_FAZER).

## 2026-11-23 — tela inicial (etapa 1 dos 2 jogadores)

### Mudanças
- **Sistema `game-flow`** (`systems/game-flow.js`): modo `menu` ou
  `match` (com `opponent`, por ora só `cpu`). O jogo começa no menu.
  `startMatch(opponent)` / `openMenu()` resetam o jogo (GAME_RESET) e
  avisam GAME_MODE_CHANGED. Constantes em `config/menu.js`.
- **Tela inicial** (componente `main-menu`, uma entidade no
  `index.html`): painel 3D 1,4 m à frente da cabeça. Telas: início (J1 x
  COMP, J1 x J2, Creditos), J1 x J2 (Criar sala / Entrar cinzas com aviso
  "Em breve: partida online", Voltar) e créditos (painel branco com a foto
  do Murilo e "Voltar"). Navegação pura em `domain/menu.js`
  (`chooseMenuOption`, `panelPlacement`, `stackPositions`).
- **No menu:** nenhuma bola pode ser pega (`isFreeGrabbable` consulta o
  `game-flow`), o HUD de batalha some e fica sem botões, a CPU não joga
  (`cpu-player` só age em partida contra a CPU).
- **Fim de jogo:** HUD com "Jogar de novo" e "Menu" lado a lado; "Menu"
  (`HUD_ACTIONS.MENU`) volta para a tela inicial.
- Pinça em botões de painel extraída para `utils/pinch.js`
  (`pinchWorldPoint`, `buttonAtPoint`), usada pelo HUD e pelo menu.

### Decisões e motivos
- Painel parado no mundo, posicionado ao abrir o menu e ao entrar/sair do
  VR (a cabeça "pula"): seguir a cabeça enjoa, e o jogador não anda no
  menu.
- Painel e HUD escondidos ficam **sem botões** (não só invisíveis): o
  raycaster do A-Frame acerta objetos invisíveis, e um botão escondido
  poderia "roubar" o laser ou o clique.
- Trocar de modo sempre reseta: a partida começa limpa e o menu não
  guarda PokeProf em campo.
- Créditos com a foto do Murilo: pedido do usuário (piada interna,
  provisório).

### Pendências
- Etapas 2–6 dos 2 jogadores (A_FAZER). Validar o painel no Quest 3.

### Ajuste no mesmo dia — menu abaixo do chão ao entrar no VR; aba "PokeProf"
- No Quest, ao apertar VR o painel ia para baixo do chão: era
  reposicionado logo no `enter-vr`, quando a câmera ainda está na altura 0
  (o headset só manda a posição da cabeça nos quadros seguintes). 1ª
  tentativa (esperar a cabeça passar de 0,5 m e posicionar uma vez) não
  resolveu no Quest. Agora o `main-menu` acompanha a cabeça a cada quadro
  por 2,5 s depois de entrar/sair do VR (vale a última posição do headset)
  e, depois disso, volta para a frente da cabeça se ficar a mais de 3 m
  dela ou mais de 1 m abaixo (`shouldReplacePanel`); o centro nunca fica
  abaixo de 0,9 m (`minHeight` em `config/menu.js`). Mesmo princípio do
  HUD, que relê a cabeça a cada quadro e funciona no Quest.
- Título da aba do navegador: "PokeProf".

