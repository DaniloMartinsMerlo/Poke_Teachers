# A fazer

O que falta implementar ou validar. Ao terminar um item, mova-o para
**Concluídas e validadas** (no fim) em uma linha só e registre os
detalhes em `docs/HISTORICO.md`. Ideias novas entram no fim da seção
certa.

---

## Batalha

- [ ] **Dois jogadores na mesma partida, ao mesmo tempo.** Pensar em um
  jeito de duas pessoas (dois headsets/navegadores) entrarem e jogarem a
  mesma batalha: sincronizar bolas, PokeProfs em campo, escolhas do turno
  e resultado entre os dois (ex.: servidor WebSocket no próprio contêiner,
  ou WebRTC ponto a ponto; quem resolve o turno — servidor ou um dos
  jogadores como "anfitrião"). O J2 hoje é a CPU (`cpu-player`); o
  `battle-hud` já aceita `player: p2`.
- [ ] HUD do **jogador 2** humano (`battle-hud` já aceita `player: p2`),
  para dois jogadores (ver item acima).
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
- [ ] **Controles no computador (teclado/mouse): decidir entre remover ou
  corrigir.** Hoje não funcionam direito no navegador e foram retirados da
  tabela de controles do README. Componentes envolvidos: `cursor-grabber`,
  `keyboard-reset`, `vertical-controls`, `wasd-controls`/`look-controls` e
  o `<a-cursor id="mouse-cursor">` em `site/index.html`. Se corrigir, voltar
  a coluna "Computador" na tabela do README.

## Validar no Quest 3

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

### Validadas no Quest 3

- [x] Bola segurada contra parede/chão/suporte desliza rente.
- [x] Partida contra a CPU: ritmo do turno, mensagens do HUD, cartão com
  power-up e tela de fim de jogo legíveis.
- [x] Balões no campo, registro da batalha e HUD: tamanho e legibilidade.
- [x] Pinça.
- [x] Colisões dos arremessos contra arquibancadas e torres.
- [x] Carretilha reta ao longo do laser (bola defasada ao passar o laser
  pelo chão: aceito, sem correção).
