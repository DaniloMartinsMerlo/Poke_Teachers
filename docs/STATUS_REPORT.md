# Status Report — Poke Teachers VR

Danilo · atualizado em 24/11/2026

## Sobre o projeto

Estou desenvolvendo o **Poke Teachers**: uma batalha no estilo Pokémon em
realidade virtual, em que os "pokémons" são os nossos professores. O jogador fica dentro de uma arena, pega uma pokébola com a mão,
arremessa no campo e comanda a batalha por um menu que acompanha o corpo.

O alvo principal é o **Meta Quest 3**, jogando tanto com as mãos (pinça)
quanto com os controles. Escolhi tecnologias web para que o jogo abra direto
no navegador do headset, sem instalar nada:

- **A-Frame 1.8 + WebXR** para a cena 3D e o VR.
- **cannon.js** para a física das pokébolas.
- **Docker + Caddy** para servir com HTTPS no desenvolvimento (o WebXR exige
  HTTPS).
- **GitHub Pages + GitHub Actions** para publicar automaticamente, rodando os
  testes antes de cada deploy.

## Como uso este documento

Aqui registro, com data, as decisões que tomei e o que aprendi em cada etapa.
A entrada mais recente fica no fim da linha do tempo. O registro técnico
detalhado (arquivos, números, testes) fica em `docs/HISTORICO.md`; aqui conto
o porquê das escolhas.

## Linha do tempo

### 16/11 — Ponto de partida

Comecei com uma cena em A-Frame servida pelo Caddy em Docker, tudo num único
`index.html` de cerca de 1.100 linhas. Já havia a arena, três pokébolas num
suporte, física, pegar com pinça, controle ou mouse, e uma cesta de basquete
provisória para testar arremessos.

**O que aprendi:** o WebXR só funciona com HTTPS, então desde o início
precisei de um certificado local para testar no Quest.

### 17/11 — Organização do código e professores nas pokébolas

**Decisões:**

- Quebrei o arquivo único em camadas (configuração, regras puras, sistemas e
  componentes). As regras do jogo ficam sem dependência do A-Frame para eu
  conseguir testá-las no Node.
- Não usei bundler: módulos nativos do navegador mantêm o fluxo "editei,
  recarreguei".
- Os componentes conversam por eventos da cena, e não chamando uns aos outros.
- Tirei a cesta de basquete e defini o tema: batalha Pokémon com os
  professores. Cada pokébola guarda um professor, e apontar para ela mostra a
  foto e o nome.
- A bola agora para onde cai, e o pokémon sai quando ela toca o chão.

**O que aprendi:**

- No A-Frame, o `laser-controls` também se conecta à mão rastreada. Por isso a
  pinça disparava também o evento do gatilho, e duas "mãos" disputavam a mesma
  bola. Resolvi detectando, por mão, se ela está em modo mão ou controle.
- O cannon.js só detecta colisão entre corpos registrados: tudo que é só
  visual a bola atravessa.
- Getters no objeto de um componente quebram, porque o A-Frame os avalia no
  registro, antes de existir `this.data`.

### 18/11 — HUD de batalha, atributos e vida

**Decisões:**

- Criei o menu de batalha (HUD) à esquerda do jogador. Ele segue o **corpo**,
  e não a cabeça: na primeira versão ele girava com a cabeça e fugia quando eu
  virava para apertar um botão.
- Dei atributos aos professores (vida, ataque, defesa, velocidade) num arquivo
  só de balanceamento, e um teste que falha se o ciclo de vantagem entre eles
  quebrar.
- Para a defesa, escolhi uma fórmula com retorno decrescente: o dano nunca
  zera e "defesa 100 = metade do dano" é fácil de ajustar de cabeça.
- O cartão do professor em campo fica acima do HUD, com o do adversário em
  cima, como nas batalhas Pokémon.
- Professor desmaiado volta para a bola e não luta mais até o fim da partida.
- Publiquei no GitHub Pages: é o jeito mais simples de abrir no Quest, porque
  já tem HTTPS válido.

**O que aprendi:** painel preso ao rosto enjoa no VR. Também aprendi a contar
esperas pelos quadros da cena, e não com `setTimeout`, para que pausem junto
com o jogo e funcionem nos testes automatizados.

### 19/11 — Turnos, adversário computador e power-ups

**Decisões:**

- Troquei a vantagem entre professores por **tipos**: Rodinha é Fogo, Fabi é
  Grama e Murilo é Água, num ciclo como pedra-papel-tesoura.
- Implementei os turnos: cada jogador escolhe uma ação, nada acontece até os
  dois escolherem e o mais rápido age primeiro.
- Criei o adversário computador como uma máquina de estados simples. Ele
  arremessa a pokébola em arco, como se fosse uma pessoa.
- Power-ups (ataque, velocidade e defesa) valem só no turno seguinte, para ter
  um custo: no turno em que uso, posso levar dano sem a vantagem. A cura vale
  na hora, porque curar "depois" pareceria um botão quebrado.
- A CPU nunca repete o último power-up que usou.
- A bola segurada não atravessa mais paredes nem o chão.
- Mostrei no botão o poder e o dano estimado de cada ataque, e coloquei balões
  sobre os PokeProfs e um registro da batalha ao lado do menu.

**O que aprendi:** simulei 20 mil partidas e vi que atacar sempre com o golpe
mais forte vencia cerca de 87% das vezes. Isso mostrou que o jogo precisava de
algum custo para os ataques fortes.

### 23/11 — Testes no Quest 3, precisão e PP, tela inicial e plano para 2 jogadores

**Validação no headset:** testei no Quest 3 e ficaram aprovados: a bola
deslizando rente às superfícies, a legibilidade da partida contra a CPU, a
pinça, as colisões na arquibancada e a carretilha do controle. Anotei como
melhorias os balões que se sobrepõem e o texto "Super efetivo!" um pouco
apagado.

**Decisões:**

- Cada ataque ganhou **precisão** (chance de acertar) e **PP** (usos por
  partida). Quanto mais forte, menos preciso e com menos usos. Foi a resposta
  aos 87% de vitórias do golpe mais forte.
- **Trocar de PokeProf gasta o turno**, e o adversário espera o novo chegar ao
  campo para atacar. Pegar a bola do campo também conta como troca, para não
  existir um jeito de trocar de graça.
- Pokébola que sai da arena volta sozinha para o suporte.
- Criei uma **tela inicial** em painel 3D: J1 x COMP, J1 x J2 e Créditos.
  Escolhi o painel 3D em vez de uma tela 2D antes do VR para não precisar sair
  do VR para voltar ao menu.
- Planejei o modo de **2 jogadores** sem servidor próprio: os dois headsets se
  conectam direto (WebRTC com PeerJS), por uma sala com código de 4 dígitos.
  Quem cria a sala calcula a batalha e o outro só desenha, para não haver
  divergência de vida ou acerto. Optei por não mostrar um avatar do outro
  jogador por enquanto.
- Passei a registrar as decisões e aprendizados neste status report.
- Decidi que o modo de 2 jogadores vai funcionar entre o **navegador do PC**
  (mouse e teclado) e o **Quest em VR**, para manter a imersão de quem está
  com o headset. Por isso corrigi os controles do PC antes de seguir.
- Fiz uma página de teste de conexão que já usa a mesma camada de rede do
  jogo, para descobrir cedo se a rede da faculdade permite a conexão direta
  entre os aparelhos, antes de construir as salas.
- O teste mostrou que **a rede da faculdade bloqueia a conexão direta**, e no
  meu roteador de casa funciona. Decidi seguir com a conexão direta e validar
  em casa, deixando um plano B (servidor de retransmissão ou outro serviço)
  para antes da apresentação.
- Fiz as **salas dentro do jogo**: quem cria recebe um código de 4 dígitos, e
  quem entra digita num teclado numérico 3D. Antes de começar, os dois
  aparelhos conferem se estão com a mesma versão do jogo, porque um pode estar
  no GitHub Pages e o outro no meu computador. Se um sair, o outro volta ao
  menu com um aviso.

**O que aprendi:**

- O GitHub Pages só serve arquivos estáticos, então um modo online precisa de
  um serviço de fora para os dois jogadores se encontrarem.
- O raycaster do A-Frame acerta objetos invisíveis, então um menu escondido
  precisa ficar sem botões, e não só invisível.
- Testar no headset de verdade mostra coisas que a simulação não mostra, como
  balões se sobrepondo.
- Ao entrar no VR, o headset leva alguns quadros para informar a posição da
  cabeça. Meu menu era posicionado nesse instante, com a câmera na altura 0, e
  aparecia embaixo do chão. Passei a esperar a posição real da cabeça antes de
  posicioná-lo.
- Os controles no navegador do PC não funcionavam por três motivos juntos: o
  cursor ficava preso no centro da tela, o segundo clique precisava acertar a
  própria bola e, o mais escondido, a bola pega continuava em cima do suporte,
  que a encaixava de volta ao soltar. Só descobri o último com um teste
  automatizado que media se a bola tinha saído do lugar.

### 24/11 — Sincronização da batalha entre os 2 jogadores

**Decisões:**

- Coloquei o convidado (J2) de verdade do outro lado da arena (`z = -7`,
  olhando para `+z`), com o HUD dele em vermelho, sem espelhar as coordenadas
  do mundo: assim a posição de cada bola e de cada PokeProf é a mesma nos dois
  aparelhos.
- Mantive o anfitrião (J1) como única autoridade da partida: ele decide quando
  o PokeProf sai da bola, sorteia os acertos, calcula o dano e avisa o J2, que
  só aplica o resultado. No suporte do J2, um componente de jogador remoto faz
  o papel que a CPU fazia no modo de 1 jogador.
- Em "Jogar de novo", o pedido do J2 passa pelo anfitrião para que os dois
  lados reiniciem juntos na mesma sala.

**O que aprendi:**

- Se cada aparelho resolvesse o turno por conta própria, um ataque com 65% de
  precisão poderia acertar num lado e errar no outro. Mandar o resultado já
  calculado pelo anfitrião elimina qualquer divergência de vida e de PP.
- Ao posicionar uma pokébola no campo por mensagem de rede, ela precisa ficar
  marcada como "pousada no chão" na física; senão, quando o jogador tenta
  pegá-la de volta do campo para trocar de PokeProf, o jogo não percebe que ela
  saiu do chão.

## Próximos passos

1. Validar a partida completa J1 x J2 entre PC e Quest 3 no roteador de casa.
2. Resolver a rede da faculdade (que bloqueia a conexão direta) antes da
   apresentação.
3. Validar no Quest 3 a tela inicial, a precisão e o PP, e a troca gastando o
   turno.
