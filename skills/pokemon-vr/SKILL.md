---
name: pokemon-vr
description: Guia para mexer no jogo de pokébolas em realidade virtual (A-Frame 1.8 + cannon.js, WebXR, Meta Quest) deste repositório. Use sempre que for criar, alterar, corrigir ou revisar qualquer coisa do jogo em site/ — cena, componentes, física, pegar objetos, locomoção, arena, placar — ou quando o usuário pedir algo "no jogo", "na cena" ou "na arena".
---

# Jogo de pokébolas em VR

## Antes de começar
1. Leia `docs/HISTORICO.md` inteiro: o que já foi feito, decisões tomadas e
   pendências. Não desfaça uma decisão registrada sem dizer ao usuário.
2. Leia `site/src/main.js` para ver os componentes existentes e o
   componente mais próximo do que vai mudar. Reaproveite antes de criar.
3. Veja `docs/A_FAZER.md`: o pedido pode já estar descrito lá, com
   detalhes combinados.

## Ao terminar
1. Rode `npm test` e `npm run test:e2e` (raiz do repositório). Se mudou
   comportamento, acrescente casos em `tests/domain.test.js` ou
   `tests/e2e/check.js`.
2. Acrescente uma entrada no fim de `docs/HISTORICO.md`: data, mudanças,
   decisões **com o motivo**, pendências. Curto e objetivo.
3. Atualize o `README.md` se mudou controles, estrutura ou como rodar.
4. Atualize `docs/A_FAZER.md`: marque o que foi feito e acrescente o que
   ficou pendente.
5. Atualize `docs/STATUS_REPORT.md` (relatório para o professor): no fim
   da "Linha do tempo", uma seção `### DD/MM — tema` com **Decisões** e
   **O que aprendi**, em primeira pessoa, como se fosse o autor do projeto
   falando (o porquê das escolhas, sem detalhe técnico de arquivos); ajuste
   "Próximos passos" e a data no topo. Mesmo dia: acrescente à seção
   existente.
6. Diga ao usuário o que precisa ser testado no headset — o e2e simula
   VR, não substitui o Quest.

## Stack e execução
- A-Frame 1.8.0 e cannon.js 0.6.2 via CDN (globais `AFRAME`, `THREE`,
  `CANNON`). Sem bundler: ES modules nativos em `site/src/`.
- `docker compose up --build` → https://localhost:8443. A pasta `site/` é
  montada no contêiner: editou, recarregou.
- O alvo principal é o Meta Quest 3 (mãos rastreadas **e** controles),
  depois o computador (WASD + mouse).

## Arquitetura (dependências apontam para dentro)
```
site/src/
  config/      constantes, medidas e cores da arena, parâmetros de física
  domain/      regras puras — SEM AFRAME/THREE/DOM, testáveis no Node
  systems/     estado global da cena: physics, input-mode
  components/  adaptadores A-Frame
    physics/ interaction/ locomotion/ game/ player/ scene/
  utils/       createEntity, vec3, whenSceneLoaded, frameSeconds
```
- Regra de negócio (cálculo, decisão) vai em `domain/`; o componente só
  lê a cena, chama o domínio e aplica o resultado.
- Números e strings repetidos vão em `config/` (`constants.js`,
  `arena.js`, `physics.js`). Nada de seletor ou nome de evento solto.
- Componentes conversam por **eventos da cena** definidos em
  `EVENTS` (`gamereset`, `scorechanged`, `inputmodechanged`), não
  chamando uns aos outros.
- `index.html` só declara a cena. Peça visual nova = componente em
  `components/scene/` que monta os filhos com `createEntity`, + uma linha
  no HTML.
- Todo arquivo novo precisa ser importado em `site/src/main.js`.

## Convenções
- Identificadores em inglês; comentários e textos para o usuário em
  português.
- Um componente por arquivo, nome do arquivo = nome do componente.
- Todo listener registrado no `init` é removido no `remove`. Handlers
  guardados em `this.onAlgo`.
- `createEntity` recebe atributos **como string** (formato do HTML), use
  `vec3(x, y, z)`.
- **Não use getters** (`get x()`) no objeto do componente: o A-Frame os
  avalia no registro e quebra. Use métodos.
- Posição de mundo só é confiável depois do `loaded` da cena: use
  `whenSceneLoaded`.
- Limite o delta do quadro com `frameSeconds(delta)`.

## Regras do jogo que não podem quebrar
- **Pinça × controle:** o `laser-controls` também conecta na mão
  rastreada. Todo código de controle físico (gatilho, grip, laser,
  analógico, B/Y) deve checar `systems["input-mode"].usesController(hand)`.
  Código de pinça só reage em modo `hand`. Ao trocar de modo, solte o que
  estiver segurando.
- **Objetos pegáveis:** classe `grabbable` + `physics-body`, filhos diretos
  da `<a-scene>`. Estado "segurado" só pelos helpers de
  `components/interaction/grab-state.js` (`markHeld`, `clearHeld`,
  `isHeld`); um objeto só pode estar em uma mão.
- **Física:** corpos via `physics-body` (sphere/box; massa 0 = estático) ou
  `system.addStaticBody`. Materiais e contatos em `config/physics.js`.
  Reset volta todos os corpos dinâmicos à posição inicial.
- **Locomoção artificial** passa por `player-rig.translate()` /
  `rotateAroundHead()` para a colisão valer no mesmo quadro.
- **Obstáculo do jogador:** classe `player-obstacle`, entidade estática
  (lida uma vez no `loaded`).
- Pinça: a posição do evento vem no espaço do rig; converta com a
  `matrixWorld` da entidade da mão.

## Testes
- `npm test` — `node --test` em `tests/*.test.js`, só `domain/`.
- `npm run test:e2e` — `tests/e2e/run.sh` serve a página com
  `tests/e2e/check.js` injetado e roda no Chrome headless (`--dump-dom`).
  O headless não dispara `requestAnimationFrame`: o script simula quadros
  com `scene.tick()`. Modos de entrada são simulados preenchendo
  `systems["tracked-controls"].controllers` e chamando
  `systems["input-mode"].refresh()`. Precisa de internet (CDN).
- Se o Chrome usar módulo antigo em cache, rode com perfil novo (o
  `run.sh` já usa um diretório temporário).
