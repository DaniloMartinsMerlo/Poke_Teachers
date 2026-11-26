# Plano de Testes de Mecânicas e Resultados — Poke Teachers VR

## 1. Objetivo e escopo

Este documento descreve **como o Poke Teachers VR é testado** e **o que já se sabe dos resultados**. Ele cobre quatro frentes:

- **Jogabilidade e mecânicas de batalha:** turnos, tipos, dano, precisão, PP, power-ups, troca de PokeProf, adversário computador e fim de jogo.
- **Interação e física:** pegar e arremessar a pokébola com pinça, controle e mouse, colisões e locomoção.
- **Ambientação e interface:** legibilidade do HUD, dos balões e da tela inicial, e a coerência da arena.
- **Aceitação da plataforma:** imersão, conforto, segurança e diversão, medidos com os usuários.

Há ainda uma frente de **partida online (J1 x J2)**, porque ela depende de rede e precisa de testes próprios.

## 2. Ambiente e método

| Item | Descrição |
| --- | --- |
| Headset | Meta Quest 3, navegador do próprio headset, jogando com mãos rastreadas (pinça) e com controles |
| Computador | Navegador com mouse e teclado (WASD, mouse, tecla R) |
| Versão testada | Publicada no GitHub Pages (HTTPS válido) ou servida localmente por Docker + Caddy |
| Tecnologias | A-Frame 1.8.0 (WebXR), cannon.js 0.6.2, JavaScript com ES modules |
| Testes automatizados | `npm test` (regras puras do jogo, Node 22) e `npm run test:e2e` (cena real no Chrome headless, com quadros simulados) |
| Simulação numérica | 20 mil partidas simuladas para medir o equilíbrio entre ataques |
| Teste no headset | Manual, feito pelo desenvolvedor, com registro no histórico do projeto |

**Tipos de evidência usados nas tabelas:**

- **Auto:** coberto por teste automatizado.
- **Quest:** validado no Meta Quest 3.
- **PC:** validado no navegador do computador.
- **Sim:** resultado de simulação.

**Legenda de status:**

- **Aprovado:** cumpriu o critério.
- **Aprovado com ressalva:** cumpriu, mas há um ponto a melhorar ou a validar.
- **Corrigido:** falhou, foi corrigido e passou na revalidação.
- **Pendente:** ainda não foi testado.
- **Limitação conhecida:** não atende e está registrado como melhoria futura.
- **Reprovado:** não atende e ainda não tem solução.

## 3. Resumo dos resultados

| Plano | Casos | Aprovado | Com ressalva | Corrigido | Pendente | Limitação / Reprovado |
| --- | --- | --- | --- | --- | --- | --- |
| A. Batalha e jogabilidade | 12 | 6 | 4 | 1 | 0 | 1 |
| B. Interação e física | 10 | 4 | 1 | 1 | 2 | 2 |
| C. Ambientação e interface | 7 | 1 | 1 | 2 | 3 | 0 |
| D. Aceitação da plataforma | 7 | 0 | 0 | 0 | 7 | 0 |
| E. Partida online | 7 | 1 | 2 | 0 | 3 | 1 |
| **Total** | **43** | **12** | **8** | **4** | **15** | **4** |

A frente mais crítica agora é a **D (aceitação com usuários)**, que ainda não tem dados, e a **E (online)**, que depende de testar PC x Quest em uma rede que permita conexão direta.

## 4. Plano A — Batalha e jogabilidade

| ID | Mecânica e procedimento | Critério de aceitação | Status | Evidência e observações |
| --- | --- | --- | --- | --- |
| A01 | **Turnos.** Os dois jogadores escolhem uma ação; observar quando o turno começa e quem age primeiro | Nada acontece antes das duas escolhas; o mais rápido age primeiro; se derrubar o outro, o segundo não age | Aprovado | Auto (testes de turno). Quest: ritmo do turno aprovado na partida contra a CPU |
| A02 | **Dano e defesa.** Comparar o dano calculado com atributos diferentes | A defesa reduz o dano com retorno decrescente e nunca zera o dano | Aprovado | Auto (teste de dano e defesa) |
| A03 | **Tipos.** Duelar Fogo, Grama e Água entre si | Fogo > Grama > Água > Fogo; vantagem multiplica o dano, desvantagem reduz | Aprovado | Auto (testes de tipos e de balanceamento, que simula todos os duelos 1x1) |
| A04 | **Precisão e PP.** Usar cada ataque várias vezes | Errar não tira vida, mas gasta turno e PP; sem PP o botão trava; o reset devolve o PP | Aprovado com ressalva | Auto (testes de precisão e PP). Falta validar no Quest se "\~33 dano \| 65% \| PP 5/5" é legível e se o balão "Errou!" em branco se destaca |
| A05 | **Power-ups.** Usar ataque, velocidade, defesa e cura | Os de atributo valem só no turno seguinte e expiram; a cura vale na hora e não passa da vida máxima | Aprovado | Auto (testes de power-up). Quest: cartão com power-up legível |
| A06 | **Trocar PokeProf gasta o turno.** Trocar pelo menu e pegando a bola do campo | A troca vai primeiro; o adversário espera o novo PokeProf chegar e ataca quem entrou | Aprovado com ressalva | Auto (teste de troca). Falta validar no Quest se dá para entender que o adversário está esperando |
| A07 | **Desmaio e fim de jogo.** Zerar a vida de todos os PokeProfs de um lado | O desmaiado volta para a bola e não luta mais; o vencedor aparece no HUD; "Jogar de novo" reinicia | Aprovado | Auto (teste de fim de jogo). Quest: tela de fim de jogo legível |
| A08 | **Um PokeProf por vez.** Lançar a segunda bola com um PokeProf em campo | A segunda bola não abre, o HUD avisa e a bola volta ao suporte | Aprovado | Auto (teste de regra por jogador) |
| A09 | **Bola fora da arena.** Arremessar na arquibancada e atrás das muretas | O PokeProf não sai e a bola volta sozinha ao suporte | Aprovado | Auto (teste dos limites da arena).|
| A10 | **Adversário computador (CPU).** Jogar uma partida completa | A CPU espera o primeiro lançamento, arremessa, escolhe ação e escolhe outro PokeProf quando o dela desmaia | Aprovado | Auto (testes da CPU). Quest: partida legível. |
| A11 | **Equilíbrio dos ataques.** Simular partidas com a estratégia "sempre o golpe mais forte" | Nenhuma estratégia única vence de forma esmagadora | Corrigido | Sim: antes da mudança, atacar sempre com "Reprovar" vencia cerca de 87% das partidas; ataque aleatório, cerca de 70%. Correção: precisão e PP. **Reexecutar a simulação** com as regras novas e registrar o número |
| A12 | **Desistir.** Tocar no botão durante a partida | Encerrar a partida contando como derrota | Limitação conhecida | O botão existe, mas ainda não faz nada. Pode reaproveitar o fim de jogo |

## 5. Plano B — Interação e física

| ID | Mecânica e procedimento | Critério de aceitação | Status | Evidência e observações |
| --- | --- | --- | --- | --- |
| B01 | **Pinça (mãos rastreadas).** Pegar, segurar e arremessar a pokébola | A bola é pega, acompanha a mão e sai na direção do movimento | Aprovado | Quest |
| B02 | **Controles, laser e carretilha.** Pegar com gatilho/grip, puxar e afastar com o analógico | A bola anda paralela ao laser | Aprovado com ressalva | Quest. Ao passar o laser pelo chão a bola fica defasada; foi aceito, sem correção |
| B03 | **Bola segurada contra obstáculos.** Empurrar a bola contra parede, chão e suporte | A bola desliza rente e nunca atravessa nem fica abaixo do chão | Aprovado | Quest; Auto (testes de bola segurada) |
| B04 | **Colisões dos arremessos.** Arremessar contra arquibancadas e torres | A bola colide e não atravessa as estruturas | Aprovado | Quest |
| B05 | **Pouso e soltura do PokeProf.** Deixar a bola cair no chão e na mesa | O PokeProf sai só quando a bola pousa no chão, ao lado dela, virado para o adversário | Aprovado | Auto (testes de pouso). Usado em todas as partidas validadas no Quest |
| B06 | **Mouse e teclado no computador.** Pegar e arremessar com clique, mover com WASD, resetar com R | O cursor segue o mouse; a bola arremessada não volta ao encaixe | Corrigido | PC. Falhou por três causas combinadas (cursor preso no centro, segundo clique exigindo acertar a bola, bola ainda "em cima do suporte"); corrigido e revalidado |
| B07 | **Troca entre mãos e controles.** Alternar no meio da pegada | O jogo detecta a mudança e solta o que estava seguro | Pendente | Falta testar no Quest 3 |
| B08 | **Colisão do jogador andando de verdade.** Caminhar em direção às muretas | O jogador é empurrado de volta para dentro | Aprovado | Auto cobre a regra de colisão; Validado no Quest |
| B09 | **Prévia da pokébola com as mãos.** Aproximar a mão da bola | Aparecer o cartão do PokeProf | Limitação conhecida | Mãos rastreadas não têm raio, então não há prévia. Ideia: mostrar o cartão quando a mão chega perto |
| B10 | **Reset e locomoção só com as mãos.** Tentar resetar e andar sem controles | Existir um gesto para isso | Limitação conhecida | Hoje depende de B/Y e do analógico. A definir |

## 6. Plano C - Ambientação e interface

| ID | Aspecto e procedimento | Critério de aceitação | Status | Evidência e observações |
| --- | --- | --- | --- | --- |
| C01 | **HUD acompanha o corpo, não a cabeça.** Virar a cabeça para apertar um botão | O menu fica parado quando só a cabeça gira | Corrigido | Na primeira versão o menu fugia ao virar a cabeça. Agora é filho do rig. Falta avaliar o conforto do acompanhamento no Quest |
| C02 | **Legibilidade do HUD, registro e balões.** Ler as ações do turno no campo e no registro lateral | Dá para ler golpe, dano, efetividade e quem agiu | Aprovado com ressalva | Quest. Melhorias abertas: balões que se sobrepõem no campo e texto "Super efetivo!" apagado |
| C03 | **Cartão do PokeProf em campo.** Observar foto, vida e atributos acima do HUD | Informação legível sem estourar a moldura | Aprovado | Quest (após encurtar a linha do power-up, que estourava a moldura) |
| C04 | **Posição da tela inicial ao entrar no VR.** Entrar no VR e olhar à frente | O painel aparece à frente, na altura dos olhos | Corrigido | Falhou: aparecia abaixo do chão (a câmera começa na altura 0). Corrigido e aprovado no Quest |
| C05 | **Tamanho, distância e botões da tela inicial.** Tocar nos botões com laser e pinça | Painel a 1,4 m confortável; botões acionados sem erro | Aprovado | Validado no Quest |
| C06 | **Créditos.** Abrir e voltar | Mostrar a foto e o botão "Voltar" | Aprovado | Validado no Quest |
| C07 | **Coerência da arena.** Observar arena, arquibancadas, torres, placar e escala dos PokeProfs | O ambiente transmite a sensação de estádio de batalha | Pendente | Entra no teste de aceitação (D01 e D06) |

## 7. Plano D - Aceitação da plataforma e da ambientação

Este plano mede o que o desenvolvedor sozinho não consegue medir: se o jogo funciona para outras pessoas no headset. Nenhum resultado foi coletado ainda. Os critérios abaixo são uma proposta.

**Protocolo sugerido:**

- Participantes: pelo menos 5 alunos, incluindo quem nunca usou VR.
- Duração: 2 a 7 minutos de jogo contra a CPU, com o experimentador sentado ao lado e sem ajudar nos primeiros 2 minutos.
- Medidas: observação (tempo até o primeiro arremesso, erros) e questionário curto no fim (anexo A).

| ID | Aspecto | Como medir | Critério proposto | Status e resultado |
| --- | --- | --- | --- | --- |
| D01 | **Imersão e presença** | Pergunta Q1 e Q2 do anexo A | Média de 4 ou mais (escala de 1 a 5) | Pendente |
| D02 | **Conforto e enjoo** | Sintomas do anexo A (0 a 3) logo após o jogo | Nenhum participante com sintoma de nota 3; média abaixo de 1 | Pendente |
| D03 | **Segurança e área de uso** | Observação: alguém esbarrou ou saiu da área? | Nenhum incidente | Pendente |
| D04 | **Facilidade de aprender a interação** | Tempo até o primeiro arremesso e primeira ação de batalha sem ajuda | 80% dos participantes em menos de 30 segundos | Pendente |
| D05 | **Compreensão do fluxo de turno** | Pergunta Q5 e observação: o participante entende quando é a vez dele? | Média de 4 ou mais; no máximo 1 participante pede ajuda | Pendente |
| D06 | **Aceitação da temática e do humor dos professores** | Pergunta Q6 e Q7 | Média de 4 ou mais; nenhum participante relata constrangimento | Pendente |
| D07 | **Diversão** | Pergunta Q8 | Média de 4 ou mais; maioria jogaria de novo | Pendente |

## 8. Plano E — Partida online (J1 x J2)

| ID | Mecânica e procedimento | Critério de aceitação | Status | Evidência e observações |
| --- | --- | --- | --- | --- |
| E01 | **Criar sala e entrar com código.** Anfitrião cria, convidado digita os 4 dígitos | O código aparece; os dois entram na partida; erros são legíveis (sala não encontrada, sala cheia) | Aprovado com ressalva | Auto (e2e com transporte falso) e teste de conexão real em Chrome headless. Falta validar PC x Quest |
| E02 | **Conexão na rede da faculdade.** Testar com a página de teste de conexão | Os dois aparelhos conectam | Reprovado | A rede da faculdade bloqueia a conexão direta; no roteador funciona. Plano B pendente (servidor TURN, Supabase Realtime ou roteador próprio) |
| E03 | **Versões diferentes do jogo.** Um aparelho no GitHub Pages e outro local | O jogo avisa a diferença antes de começar | Aprovado | Auto (e2e de versão incompatível) |
| E04 | **Aviso quando o outro sai.** Fechar a aba de um dos lados | O outro volta ao menu com "O adversario saiu da partida" | Aprovado | Auto (e2e). Falta validar com o Quest |
| E05 | **Sincronia de vida, PP e acertos.** Jogar vários turnos e comparar os dois lados | Vida, PP e resultado de cada ataque iguais nos dois aparelhos | Pendente | O anfitrião calcula e o convidado só aplica. Falta validar de ponta a ponta |
| E06 | **Partida completa PC x Quest.** Arremesso, turnos, troca, fim de jogo e "Jogar de novo" | Partida termina sem travar e sem divergência | Pendente | Falta validar |
| E07 | **Latência percebida.** Medir o tempo de ida e volta com a página de teste e jogar | Ações do outro lado aparecem sem atraso incômodo | Pendente | A página de teste já mostra o tempo de ida e volta e o tipo de conexão |

## 9. Registro de defeitos encontrados

| Data | Defeito | Causa | Situação |
| --- | --- | --- | --- |
| 17/11 | Pinça disparava também o gatilho e duas "mãos" disputavam a bola | O `laser-controls` do A-Frame aceita a mão rastreada como controle | Corrigido (detecção de modo por mão) |
| 18/11 | O HUD fugia ao virar a cabeça | Estava preso à cabeça | Corrigido (acompanha o corpo) |
| 19/11 | Um único golpe vencia cerca de 87% das partidas | Ataque forte sem custo | Corrigido (precisão e PP) — revalidar |
| 19/11 | Ações do turno escondidas na linha amarela do HUD | Informação em um só lugar pouco visível | Corrigido (balões no campo e registro lateral) |
| 23/11 | Menu abaixo do chão ao entrar no VR | A posição da cabeça chega só nos quadros seguintes | Corrigido (acompanha a cabeça por 2,5 s) |
| 23/11 | Controles do PC não funcionavam | Três causas combinadas | Corrigido |
| 23/11 | Bola defasada ao passar o laser pelo chão | Geometria do laser do controle | Aceito, sem correção |
| 23/11 | Balões se sobrepõem no campo | Vários balões ao mesmo tempo | Aberto, prioridade baixa |
| 23/11 | "Super efetivo!" fraco | Contraste baixo | Aberto |
| 23/11 | Rede da faculdade bloqueia a conexão direta | Política da rede | Aberto, plano B pendente |

## 10. Pendências de validação

As mais importantes, em ordem:

1. Rodar a partida completa **PC x Quest** (E05, E06, E07).
2. Aplicar o **teste de aceitação** com pelo menos 5 pessoas (plano D).
3. Validar no Quest os itens de interface: tela inicial, texto de PP e precisão, troca gastando o turno (A04, A06, A09).
4. Testar a troca entre mãos e controles e a colisão andando de verdade (B07, B08).
5. Reexecutar a simulação de equilíbrio com as regras novas (A11).
6. Definir o plano B de rede antes da apresentação na faculdade (E02).

## Anexo A — Questionário de aceitação

**Parte 1 — Escala de 1 (discordo totalmente) a 5 (concordo totalmente):**

| Nº | Afirmação |
| --- | --- |
| Q1 | Senti que estava dentro da arena de batalha. |
| Q2 | A arena e o cenário parecem um estádio de batalha Pokémon. |
| Q3 | Foi fácil pegar e arremessar a pokébola. |
| Q4 | Consegui ler os menus e as mensagens sem esforço. |
| Q5 | Entendi quando era a minha vez e o que cada ação fazia. |
| Q6 | Reconheci os professores e achei a representação divertida. |
| Q7 | Em nenhum momento me senti constrangido ou achei desrespeitoso. |
| Q8 | Me diverti e jogaria de novo. |

**Parte 2 — Sintomas logo após o jogo (0 = nenhum, 1 = leve, 2 = moderado, 3 = forte):** enjoo, tontura, dor de cabeça, cansaço nos olhos.

**Parte 3 — Perguntas abertas:** o que foi mais difícil? O que mais gostou? O que mudaria?