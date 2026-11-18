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
- [ ] **README.** Desenvolver o `README.md`: o que é o projeto, como rodar
  (`docker compose up --build`, certificado HTTPS, acesso pelo Quest),
  controles (mãos, controles, teclado/mouse), estrutura de pastas, testes
  (`npm test`, `npm run test:e2e`) e onde balancear os professores
  (`site/src/config/teachers.js`).
- [ ] **Sistema de turnos.** Os dois jogadores escolhem a ação no HUD; o
  PokeProf com maior velocidade age primeiro (`turnOrder`, em
  `site/src/domain/combat.js`, já pronto e testado). Hoje o ataque tira
  vida na hora, sem turno (provisório, `site/src/systems/battle.js`).
- [ ] **Power-ups.** ⚠️ Depende do **sistema de turnos**: só começar
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
- [ ] **Fim de jogo.** O que acontece quando todos os PokeProfs de um
  jogador desmaiam: anunciar o vencedor (placar `arena-scoreboard`?),
  travar o HUD, oferecer recomeçar.

## Batalha

- [ ] **Desistir** (hoje não faz nada).
- [ ] HUD do **jogador 2** e jogador **CPU** (`battle-hud` já aceita
  `player: p2`; `control: "cpu"` em `config/players.js` ainda não faz
  nada).
- [ ] Definir os professores do adversário quando houver mais imagens
  (hoje são os mesmos 3, em outra ordem).

## Interação e VR

- [ ] Mãos rastreadas não mostram a prévia da pokébola (não têm raio):
  mostrar quando a mão chega perto.
- [ ] Só com as mãos não dá para andar nem resetar (sem analógico nem
  B/Y): pensar em um gesto.
- [ ] Trocar os pokémons de primitivas por modelos `.glb` (Blender).

## Validar no Quest 3

- [ ] Pinça e troca mão ↔ controle; colisão andando de verdade.
- [ ] Colisões dos arremessos contra arquibancadas e torres.
- [ ] HUD: legibilidade, pinça nos botões, conforto ao seguir o corpo.
- [ ] Carretilha do controle reta ao longo do laser.
