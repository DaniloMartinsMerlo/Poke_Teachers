# A fazer

Lista do que ainda não foi implementado. Ao terminar um item, marque-o
(`[x]`), registre o que foi feito em `docs/HISTORICO.md` e, depois de um
tempo, apague-o daqui. Ideias novas entram no fim da seção certa.

---

## Prioridade (pedidos do professor/time)

- [x] **Card do PokeProf em campo ao lado do jogador.** Enquanto o
  PokeProf está em campo, o card (foto, vida, atributos) para de aparecer
  sobre a pokébola e passa a ficar fixo ao lado do jogador, acima do HUD,
  seguindo o corpo como o HUD. Volta a aparecer na bola quando ele é
  recolhido. O do adversário também aparece, acima do
  seu.
- [x] **README.** Desenvolver o `README.md`: o que é o projeto, como rodar
  (`docker compose up --build`, certificado HTTPS, acesso pelo Quest),
  controles (mãos, controles, teclado/mouse), estrutura de pastas, testes
  (`npm test`, `npm run test:e2e`) e onde balancear os professores
  (`site/src/config/teachers.js`).
- [x] **Sistema de turnos + adversário computador (CPU).** Fazer as duas
  coisas juntas: uma precisa da outra.
  - **Turnos:**
    - Cada jogador escolhe **uma** ação por turno para o PokeProf em
      campo: um ataque **ou** um power-up (HUD para o jogador; máquina de
      estados para a CPU).
    - **Espera:** nada é aplicado enquanto os dois não escolheram. Com as
      duas escolhas feitas, o turno resolve: o PokeProf com maior
      velocidade age primeiro (`turnOrder`, em
      `site/src/domain/combat.js`, já pronto e testado); se o primeiro
      derrubar o outro, o segundo não age.
    - O HUD mostra "Aguardando adversario..." depois da escolha e trava
      os botões de ação até o turno resolver.
    - Hoje o ataque tira vida na hora, sem turno (provisório,
      `site/src/systems/battle.js`): substituir.
  - **CPU** (jogador `p2`, `control: "cpu"` em `config/players.js`) —
    máquina de estados simples (estados e transições no `domain/`, sem
    A-Frame, testável no Node; sorteio com `random` injetável):
    1. **Aguardando:** espera o jogador lançar o primeiro PokeProf.
    2. **Escolher PokeProf:** sorteia um entre os PokeProfs dela ainda de
       pé (3 no início).
    3. **Arremessar:** a bola sai do suporte da CPU **arremessada em arco,
       como se fosse um jogador de verdade**, cai no campo e solta o
       PokeProf normalmente (mesmo fluxo de pouso das bolas do jogador).
    4. **Escolher ação:** sorteia entre atacar e usar power-up; depois
       sorteia qual ataque / qual power-up. Pequena espera "pensando"
       para não parecer instantâneo.
    5. **Aguardar turno:** espera o turno resolver; volta para 4.
    6. **PokeProf derrotado:** quando o dela desmaia (e volta para a
       bola), volta para 2 e escolhe outro.
    7. **Fim:** para quando alguém perde todos os PokeProfs (ver **Fim de
       jogo**).
  - Enquanto os **power-ups** não existirem, a CPU pode escolher power-up
    e só "gastar" o turno, ou atacar sempre: decidir na implementação.
  - Testes: domínio (transições da máquina de estados, resolução do turno
    com ordem por velocidade, espera pelas duas escolhas) e e2e (partida
    completa contra a CPU até alguém perder todos).
- [x] **Power-ups.** ⚠️ Depende do **sistema de turnos**: só começar
  depois dele. Hoje os 4 botões só mostram mensagem
  (`POWERUPS` em `site/src/config/battle.js`).
  - **Efeitos** (um por botão; valores em `config/battle.js` para
    balancear):
    - **Velocidade +%**: alta o bastante para um PokeProf mais lento
      passar o adversário e ganhar uma vantagem temporária, inclusive o
      que está em desvantagem no ciclo. Ex. com os números atuais:
      +80% leva Murilo (40) a 72, acima de Rodinha (70).
    - **Ataque +%.**
    - **Defesa +%.**
    - **Cura** (quantidade ou % da vida máxima, sem passar do máximo).
  - **Tradeoff:** usar um power-up gasta a ação do turno (não ataca). Se
    o oponente atacar nesse mesmo turno, o dano é calculado **sem** o
    power-up; ele só passa a valer no turno seguinte.
  - **Duração:** 1 turno (o seguinte ao uso); depois volta ao normal.
  - Mostrar no card do PokeProf (acima do HUD) que há um power-up ativo
    e o atributo alterado.
  - A definir: a cura também espera o próximo turno ou vale na hora?
    Pode usar o mesmo power-up em turnos seguidos? Os 4 nomes atuais
    (Ponto Extra, Intervalo, Cola Liberada, Feriado) ficam com qual
    efeito?
  - Testes de domínio: ordem do turno com velocidade aumentada, dano com
    ataque/defesa aumentados, expiração após 1 turno, power-up que não
    vale no turno em que foi usado.
- [x] **PokeProf com HP zerado volta para a pokébola.** Ao desmaiar,
  recolher com a mesma animação do "Trocar PokeProf" (bola voa de volta
  ao suporte). A bola de um desmaiado não abre de novo até o reset.
- [x] **Fim de jogo.** O que acontece quando todos os PokeProfs de um
  jogador desmaiam: anunciar o vencedor (placar `arena-scoreboard`?),
  travar o HUD, oferecer recomeçar. É o fim da partida contra a CPU
  (item de turnos + CPU).

## Batalha

- [ ] **Dois jogadores na mesma partida, ao mesmo tempo.** Pensar em um
  jeito de duas pessoas (dois headsets/navegadores) entrarem e jogarem a
  mesma batalha: sincronizar bolas, PokeProfs em campo, escolhas do turno
  e resultado entre os dois (ex.: servidor WebSocket no próprio contêiner,
  ou WebRTC ponto a ponto; quem resolve o turno — servidor ou um dos
  jogadores como "anfitrião"). O J2 hoje é a CPU (`cpu-player`); o
  `battle-hud` já aceita `player: p2`.
- [ ] **Trocar PokeProf gasta o turno?** Hoje trocar é livre (fora da
  resolução) e apaga a escolha feita; no Pokémon trocar gasta a vez.
- [ ] **Desistir** (hoje não faz nada; dá para reusar o fim de jogo).
- [ ] HUD do **jogador 2** humano (`battle-hud` já aceita `player: p2`),
  para dois jogadores (ver item acima).
- [ ] Ajustar a CPU depois de jogar: tempo "pensando", chance de
  power-up (25%), mira do arremesso (`CPU` em `config/battle.js`).
- [ ] Definir os professores do adversário quando houver mais imagens
  (hoje são os mesmos 3, em outra ordem).

## Interação e VR

- [x] Pokébola segurada atravessava paredes e o chão.
- [ ] Mãos rastreadas não mostram a prévia da pokébola (não têm raio):
  mostrar quando a mão chega perto.
- [ ] Só com as mãos não dá para andar nem resetar (sem analógico nem
  B/Y): pensar em um gesto.
- [ ] Trocar os pokémons de primitivas por modelos `.glb` (Blender).
- [ ] **Controles no computador (teclado/mouse): decidir entre remover ou
  corrigir.** Hoje não funcionam direito no navegador e foram retirados da
  tabela de controles do README. Componentes envolvidos: `cursor-grabber`,
  `keyboard-reset`, `vertical-controls`, `wasd-controls`/`look-controls` e
  o `<a-cursor id="mouse-cursor">` em `site/index.html`. Se corrigir, voltar
  a coluna "Computador" na tabela do README.

## Validar no Quest 3

- [ ] Bola segurada contra parede/chão/suporte: desliza rente sem
  tremer? Volta para a mão ao afastar?
- [ ] Partida contra a CPU: ritmo do turno (esperas), mensagens do HUD,
  cartão com power-up e tela de fim de jogo legíveis.
- [ ] Balões no campo: tamanho/legibilidade perto e do outro lado do
  campo. Registro da batalha: letra pequena demais? Largura do HUD com o
  registro (~80 cm) confortável?
- [ ] Pinça e troca mão ↔ controle; colisão andando de verdade.
- [ ] Colisões dos arremessos contra arquibancadas e torres.
- [ ] HUD: legibilidade, pinça nos botões, conforto ao seguir o corpo.
- [ ] Carretilha do controle reta ao longo do laser.
