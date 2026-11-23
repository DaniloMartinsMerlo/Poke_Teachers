# A fazer

O que falta implementar ou validar. Ao terminar um item, mova-o para
**Concluídas e validadas** (no fim) em uma linha só e registre os
detalhes em `docs/HISTORICO.md`. Ideias novas entram no fim da seção
certa.

---

## Próximo: tela inicial e partida de 2 jogadores

Planejado com o usuário em 2026-11-23. Fazer **na ordem das etapas**:
cada uma funciona sozinha e a 1 não depende de rede.

### Decisões já tomadas

- **Sem servidor próprio:** o jogo continua estático no GitHub Pages. Os
  dois headsets se conectam por **WebRTC ponto a ponto com PeerJS**
  (biblioteca via CDN; o servidor público gratuito do PeerJS só serve
  para os dois se acharem, depois os dados vão direto).
- **Camada de transporte trocável:** o jogo só conhece uma interface
  (`connect`/`send`/`onMessage`/`onClose`). Se a rede bloquear o P2P
  (redes de faculdade às vezes bloqueiam), trocar por **Supabase Realtime**
  (canal "broadcast" = código da sala; passa pela porta 443) sem mexer no
  resto.
- **Sala com código de 4 dígitos** (ex.: `4827`): quem cria a sala é o
  **anfitrião (J1)**; o ID dele no PeerJS é `poketeachers-<código>`. O
  código liga os dois a uma partida específica.
- **Anfitrião é a autoridade:** o J1 roda o sistema `battle` de verdade
  (dano, acerto, PP, turnos, fim de jogo). O J2 só envia o que faz e
  desenha o que o J1 manda — sem dessincronia de vida/acerto.
- **Sem avatar do outro jogador** por enquanto: o outro lado do campo
  fica vazio (só o suporte, as bolas e os PokeProfs dele).
- **Tela inicial em painel 3D** na arena (funciona dentro e fora do VR,
  laser e pinça), reaproveitando os botões do HUD.
- **Créditos:** por enquanto, piada interna — tela em branco só com a
  foto do Murilo (`site/assets/img/Murilo.jpg`) e um botão "Voltar".

### Fluxo das telas

```
Tela inicial
├── J1 x COMP  → partida atual contra a CPU
├── J1 x J2    → [Criar sala] → mostra o código, "Aguardando J2..." → partida
│               [Entrar]     → teclado numérico (0–9, apagar, entrar)
│                               → conecta → partida
│               [Voltar]
└── Creditos   → tela branca com a foto do Murilo → [Voltar]
```

Fim de partida: "Jogar de novo" (mesma sala, mesmos jogadores) e
**"Menu"** (volta para a tela inicial; em J1 x J2 encerra a conexão).

### Etapas

- [ ] **Plano B de rede para a apresentação.** A rede da faculdade
  **bloqueia P2P** (testado com `net-test.html`); no roteador de casa
  funciona. Por enquanto seguimos com P2P e o usuário valida em casa.
  Antes de apresentar na faculdade: servidor TURN gratuito ou trocar o
  transporte (`src/net/`) por Supabase Realtime (porta 443), ou levar um
  roteador próprio.
- [ ] **4. Sincronizar a batalha.**
  - Já pronto (etapa 3): o sistema `network` repassa as mensagens do outro
    aparelho como `NETWORK_MESSAGE` e envia com `network.send(msg)`;
    `game-flow.role` diz se este aparelho é o anfitrião (`host`, J1) ou o
    convidado (`guest`, J2).
  - No anfitrião, componente `remote-player` no suporte do J2, no lugar
    do `cpu-player`: recebe as escolhas do J2 e chama `battle.choose()`,
    como a CPU faz.
  - No J2: o rig começa do outro lado (`z = -7`, virado para +z), o HUD
    usa `player: p2`; ele **não** resolve turnos — aplica o que chega.
    Cada um se vê no próprio lado, sem espelhar coordenadas.
  - Protocolo (mensagens pequenas, JSON, com versão):
    ```
    J2 → J1:  join, throw{ball, from, velocity}, choose{kind, id},
              recall (trocar), playAgain, bye
    J1 → J2:  welcome{versão}, released{player, ball, pos},
              recalled{player, ball}, turnStarted, turnAction{...},
              turnResolved, gameOver{winner}, reset, bye
    ambos:    ping (detectar queda)
    ```
- [ ] **5. Sincronizar arremessos.** Cada um simula a própria bola; ao
  soltar, envia `{bola, posição, velocidade}` e o outro reproduz com
  `physics-body.launch()` (já usado pela CPU). Quem decide se o PokeProf
  saiu (e onde) é o anfitrião; o J2 ajusta a posição. Bola fora da
  arena, bola barrada e recolher seguem o anfitrião.
- [ ] **6. Testes de rede.** Domínio: protocolo (montar/ler mensagens,
  versão errada), código da sala. e2e: duas cenas ligadas por um
  **transporte falso em memória** (sem PeerJS nem internet), partida
  completa J1 x J2 até o fim de jogo.

## Batalha
- [ ] **Desistir** (hoje não faz nada; dá para reusar o fim de jogo).
- [ ] Ajustar a CPU depois de jogar: tempo "pensando", chance de
  power-up (25%), mira do arremesso (`CPU` em `config/battle.js`).
- [ ] Definir os professores do adversário quando houver mais imagens
  (hoje são os mesmos 3, em outra ordem).
- [ ] **Balões no campo se sobrepõem** (visto no Quest 3). O dano tomado
  muitas vezes fica coberto por outros balões, e o balão de um PokeProf
  fica na frente do balão do adversário, sem dar para ler. Ideias:
  empilhar/deslocar os balões que aparecem ao mesmo tempo, atrasar o
  balão do segundo a agir. O registro no HUD lateral já resolve, então a
  prioridade é baixa (`battle-callouts`, `FIELD_CALLOUT` em
  `config/hud.js`).
- [ ] **"Super efetivo!" / "Pouco efetivo..." apagados.** O texto amarelo
  abaixo do PokeProf fica fraco: aumentar o contraste (contorno ou fundo
  escuro, cor mais forte).

## Interação e VR

- [ ] **Mãos rastreadas não mostram a prévia da pokébola** (não têm
  raio): mostrar o card do PokeProf quando a mão chega perto da bola.
  Pedido depois de validar a pinça no Quest 3.
- [ ] **Gesto de reset só com as mãos** (sem B/Y). Também não dá para
  andar só com as mãos: pensar em um gesto para isso. Pedido depois de
  validar a pinça no Quest 3.
- [ ] Trocar os pokémons de primitivas por modelos `.glb` (Blender).
## Validar no Quest 3

- [ ] Salas J1 x J2 (PC x Quest, no roteador de casa): criar a sala
  mostra o código; teclado numérico com laser/pinça; erros legíveis;
  ao conectar os dois entram na partida; fechar a aba de um avisa o
  outro ("O adversario saiu da partida").
- [ ] Tela inicial: tamanho e distância (1,4 m) confortáveis? Pinça e
  laser nos botões; foto do Murilo nos créditos; "Menu" no fim de jogo
  volta para o painel.
- [ ] PP e precisão no botão de ataque ("~33 dano | 65% | PP 5/5"):
  legível? Balão "Errou!" em branco se destaca?
- [ ] Trocar gastando o turno: dá para entender que o adversário está
  esperando o novo PokeProf? (status "Volte, X! (gasta o turno)" e
  registro "J1 trocou: X entrou").
- [ ] Bola na arquibancada/fora do estádio: a espera (0,8 s) antes de
  voltar parece boa?
- [ ] Troca mão ↔ controle; colisão andando de verdade.
- [ ] HUD: pinça nos botões, conforto ao seguir o corpo.

---

## Concluídas e validadas

Detalhes de cada uma em `docs/HISTORICO.md`.

### Implementadas

- [x] Card do PokeProf em campo acima do HUD (o do adversário em cima).
- [x] README completo (como rodar, controles, estrutura, testes,
  balanceamento).
- [x] Sistema de turnos + adversário computador (CPU).
- [x] Power-ups (ataque, velocidade, defesa, cura).
- [x] PokeProf com HP zerado volta para a pokébola.
- [x] Fim de jogo (vencedor no HUD, "Jogar de novo").
- [x] Precisão (% de acerto) e PP dos ataques.
- [x] Trocar PokeProf gasta o turno (o adversário espera o novo chegar).
- [x] Pokébola segurada não atravessa paredes nem o chão.
- [x] Pokébola fora da arena volta para o suporte.
- [x] Etapa 1 dos 2 jogadores: tela inicial (J1 x COMP, J1 x J2 em breve,
  créditos com o Murilo) e botão "Menu" no fim de jogo.
- [x] Controles no computador corrigidos (cursor segue o mouse; bola
  arremessada não volta mais para o encaixe).
- [x] Etapa 2 dos 2 jogadores: teste de conexão (`net-test.html`) —
  funciona no roteador de casa; a rede da faculdade bloqueia P2P.
- [x] Etapa 3 dos 2 jogadores: criar sala (código de 4 dígitos), entrar
  com teclado numérico 3D, erros, aviso quando o outro sai.

### Validadas no Quest 3

- [x] Bola segurada contra parede/chão/suporte desliza rente.
- [x] Partida contra a CPU: ritmo do turno, mensagens do HUD, cartão com
  power-up e tela de fim de jogo legíveis.
- [x] Balões no campo, registro da batalha e HUD: tamanho e legibilidade.
- [x] Pinça.
- [x] Colisões dos arremessos contra arquibancadas e torres.
- [x] Carretilha reta ao longo do laser (bola defasada ao passar o laser
  pelo chão: aceito, sem correção).
- [x] Tela inicial aparece à frente, na altura dos olhos, ao entrar no VR
  (antes ficava abaixo do chão).

### Validadas no navegador do PC

- [x] Mouse e teclado: pegar e arremessar a pokébola, botões do menu e do
  HUD.
