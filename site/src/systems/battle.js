import {
  ATTACKS, DAMAGE_RULES, GAME_OVER_DELAY, POWERUPS, TURN_START_DELAY, TURN_STEP_DELAY,
} from "../config/battle.js";
import { EVENTS, MAX_FRAME_MS } from "../config/constants.js";
import { HUD_ACTIONS } from "../config/hud.js";
import { PLAYER_IDS } from "../config/players.js";
import { TYPE_BEATS } from "../config/teachers.js";
import { canSendOut } from "../domain/battle.js";
import {
  ACTION_KINDS, SWITCH_CHOICE, TurnChoices, applyTurnAction, finishTurn, isTeamDefeated, performAction, planTurn,
} from "../domain/turn.js";

const TURN_RULES = Object.freeze({
  attacks: ATTACKS, powerups: POWERUPS, typeBeats: TYPE_BEATS, rules: DAMAGE_RULES,
});

// ----------------------------------------------------------------------
// Sistema "battle": quem está em campo, turnos e fim de jogo.
//
// Em campo: qual pokébola de cada jogador está com o PokeProf fora (um
// por jogador), pelos eventos POKEMON_RELEASED / POKEMON_RECALLED.
//
// Turnos (regras em domain/turn.js): com os dois PokeProfs em campo e de
// pé, cada jogador escolhe uma ação — HUD_ACTION (pessoa) ou `choose()`
// (CPU). Com as duas escolhas o turno resolve aos poucos (TURN_START_DELAY
// e TURN_STEP_DELAY entre as ações, contados nos ticks): o mais rápido age
// primeiro; cada ação vira TURN_ACTION. Ataque sem PP é recusado.
//
// Trocar gasta o turno: recolher um PokeProf de pé com o turno aberto
// (botão "Trocar" ou pegando a bola do campo) vira a escolha "switch" do
// jogador, no lugar de qualquer outra. O adversário pode escolher
// enquanto isso, mas o turno só resolve quando o novo PokeProf chega ao
// campo — o ataque do adversário acerta o que entrou. Fora de um turno
// aberto (adversário sem PokeProf, desmaio, resolução) a troca é livre.
//
// Fim de jogo: quando todos os PokeProfs de um jogador desmaiam, depois
// de GAME_OVER_DELAY emite GAME_OVER. "Jogar de novo" no HUD reseta tudo
// (GAME_RESET, o mesmo da tecla R / botões B/Y).
// ----------------------------------------------------------------------
AFRAME.registerSystem("battle", {
  init() {
    this.active = {};
    this.choices = new TurnChoices();
    // Turno resolvendo: { sides, steps: [[actor, target]...], wait }.
    this.resolving = null;
    // Fim de jogo: { winner, loser, wait } (wait > 0: ainda não anunciado).
    this.result = null;

    this.onReleased = ({ detail }) => {
      this.active[detail.player] = detail.ball;
      // A troca escolhida continua valendo: é a ação deste turno.
      if (this.choices.get(detail.player)?.kind !== ACTION_KINDS.SWITCH) {
        this.choices.clear(detail.player);
      }
      this.changed();
      this.maybeStartTurn();
    };
    this.onRecalled = ({ detail }) => {
      if (this.active[detail.player] === detail.ball) {
        const switching = this.isTurnOpen();
        delete this.active[detail.player];
        detail.ball.components.pokeprof?.prof.clearBoosts();
        this.choices.clear(detail.player);
        if (switching) {
          this.choices.choose(detail.player, SWITCH_CHOICE);
        }
        this.changed(switching ? detail.player : null);
      }
    };
    this.onHudAction = ({ detail }) => {
      if (detail.action === HUD_ACTIONS.ATTACK || detail.action === HUD_ACTIONS.POWERUP) {
        this.choose(detail.player, { kind: detail.action, id: detail.id });
      } else if (detail.action === HUD_ACTIONS.PLAY_AGAIN && !this.isGuest()) {
        this.el.emit(EVENTS.GAME_RESET, null, false);
      }
    };
    this.onFainted = (event) => this.checkGameOver(event.target.dataset.player);
    this.onGameReset = () => {
      this.active = {};
      this.choices.clear();
      this.resolving = null;
      this.result = null;
      this.changed();
    };
    this.el.addEventListener(EVENTS.POKEMON_RELEASED, this.onReleased);
    this.el.addEventListener(EVENTS.POKEMON_RECALLED, this.onRecalled);
    this.el.addEventListener(EVENTS.HUD_ACTION, this.onHudAction);
    this.el.addEventListener(EVENTS.POKEPROF_FAINTED, this.onFainted);
    this.el.addEventListener(EVENTS.GAME_RESET, this.onGameReset);
  },

  opponentOf(player) {
    return PLAYER_IDS.find((id) => id !== player) || null;
  },

  // No convidado (J2), quem resolve os turnos e decide o fim de jogo é o
  // anfitrião (J1).
  isGuest() {
    return Boolean(this.el.systems["game-flow"]?.isGuest());
  },

  /** PokeProf (componente) em campo do jogador, ou null. */
  activeProf(player) {
    return this.activeBall(player)?.components.pokeprof || null;
  },

  canSendOut(player, ball) {
    return canSendOut(this.active, player, ball);
  },

  /** Pokébola cujo pokémon está em campo (ou null). */
  activeBall(player) {
    return this.active[player] || null;
  },

  /** Pokébolas (com PokeProf) de um jogador. */
  ballsOf(player) {
    return [...this.el.querySelectorAll(`[pokeprof][data-player="${player}"]`)];
  },

  isResolving() {
    return Boolean(this.resolving);
  },

  isGameOver() {
    return Boolean(this.result);
  },

  /** Vencedor/perdedor, depois de anunciado (ou null). */
  gameResult() {
    return this.result && this.result.wait <= 0 ? { winner: this.result.winner, loser: this.result.loser } : null;
  },

  hasChosen(player) {
    return this.choices.has(player);
  },

  /** Os dois jogadores têm PokeProf em campo e de pé? */
  bothOnField() {
    return PLAYER_IDS.every((player) => {
      const prof = this.activeProf(player)?.prof;
      return prof && !prof.isFainted();
    });
  },

  /** Há um turno aberto? (os dois em campo, de pé, sem resolução nem fim) */
  isTurnOpen() {
    return !this.result && !this.resolving && this.bothOnField();
  },

  /** O jogador recolheu o PokeProf e o substituto ainda não chegou? */
  isSwitching(player) {
    return this.choices.get(player)?.kind === ACTION_KINDS.SWITCH;
  },

  /**
   * O turno aceita a escolha deste jogador agora? O PokeProf dele está em
   * campo e de pé, e o do adversário também — ou o adversário está
   * trocando (a escolha espera o novo PokeProf chegar).
   */
  canChoose(player) {
    if (this.result || this.resolving || this.choices.has(player)) {
      return false;
    }
    const alive = (id) => {
      const prof = this.activeProf(id)?.prof;
      return Boolean(prof && !prof.isFainted());
    };
    const opponent = this.opponentOf(player);
    return alive(player) && (alive(opponent) || this.isSwitching(opponent));
  },

  /** PP restante do ataque `attackId` do PokeProf em campo (ou null). */
  ppLeft(player, attackId) {
    const prof = this.activeProf(player)?.prof;
    const move = ATTACKS.find((item) => item.id === attackId);
    return prof && move ? prof.ppLeft(move) : null;
  },

  /**
   * Escolha de ação do turno. Retorna se foi aceita.
   * @param {string} player
   * @param {{kind: string, id: string}} choice ACTION_KINDS + id do ataque/power-up
   */
  choose(player, choice) {
    const list = choice.kind === ACTION_KINDS.ATTACK ? ATTACKS
      : choice.kind === ACTION_KINDS.POWERUP ? POWERUPS : [];
    if (!this.canChoose(player) || !list.some((item) => item.id === choice.id)) {
      return false;
    }
    if (choice.kind === ACTION_KINDS.ATTACK && this.ppLeft(player, choice.id) === 0) {
      return false;
    }
    this.choices.choose(player, choice);
    this.changed(player);
    this.maybeStartTurn();
    return true;
  },

  // Começa o turno quando os dois escolheram e estão em campo (quem trocou
  // precisa ter lançado o novo PokeProf). No convidado, espera o anfitrião.
  maybeStartTurn() {
    if (!this.isGuest() && !this.resolving && !this.result && this.choices.isReady(PLAYER_IDS) && this.bothOnField()) {
      this.startTurn();
    }
  },

  startTurn() {
    const sides = PLAYER_IDS.map((player) => ({
      player,
      ball: this.activeBall(player),
      prof: this.activeProf(player).prof,
      choice: this.choices.get(player),
    }));
    this.resolving = { sides, steps: planTurn(sides), wait: TURN_START_DELAY };
    this.choices.clear();
    this.el.emit(EVENTS.TURN_STARTED, { order: this.resolving.steps.map(([actor]) => actor.player) }, false);
    this.changed();
  },

  /** Convidado (J2): o anfitrião avisou que o turno começou a resolver. */
  startRemoteTurn(order = []) {
    const sides = PLAYER_IDS
      .map((player) => ({ player, ball: this.activeBall(player), prof: this.activeProf(player)?.prof }))
      .filter((side) => side.ball && side.prof);
    this.resolving = { sides, steps: [], wait: Infinity, remote: true };
    this.choices.clear();
    this.el.emit(EVENTS.TURN_STARTED, { order }, false);
    this.changed();
  },

  /** Convidado (J2): aplica uma ação de turno recebida do anfitrião. */
  applyRemoteAction(action) {
    const actorBall = this.activeBall(action.player);
    const targetBall = this.activeBall(action.target);
    const actorProf = actorBall?.components.pokeprof?.prof || null;
    const targetProf = targetBall?.components.pokeprof?.prof || null;
    const beforeActor = actorProf?.hp;
    const beforeTarget = targetProf?.hp;
    const detail = applyTurnAction(action, actorProf, targetProf, TURN_RULES);
    if (!detail) {
      return false;
    }
    actorBall?.components.pokeprof?.notify(beforeActor);
    targetBall?.components.pokeprof?.notify(beforeTarget);
    this.el.emit(EVENTS.TURN_ACTION, detail, false);
    return true;
  },

  /** Convidado (J2): o anfitrião avisou que o turno terminou. */
  finishRemoteTurn() {
    if (!this.resolving) {
      return;
    }
    const { sides } = this.resolving;
    finishTurn(sides);
    sides.forEach((side) => side.ball.components.pokeprof?.changed());
    this.resolving = null;
    this.el.emit(EVENTS.TURN_RESOLVED, null, false);
    this.changed();
  },

  /** Convidado (J2): o anfitrião anunciou o fim de jogo. */
  applyRemoteGameOver(winner, loser = this.opponentOf(winner)) {
    this.result = { winner, loser, wait: 0 };
    this.el.emit(EVENTS.GAME_OVER, { winner, loser }, false);
    this.changed();
  },

  // Uma ação do turno. Quem saiu de campo no meio (bola pega) não age nem
  // é alvo.
  performStep([actor, target]) {
    if (this.activeBall(actor.player) !== actor.ball || this.activeBall(target.player) !== target.ball) {
      return false;
    }
    const before = new Map([actor, target].map((side) => [side, side.prof.hp]));
    const result = performAction(actor, target, TURN_RULES);
    if (!result) {
      return false;
    }
    [actor, target].forEach((side) => side.ball.components.pokeprof?.notify(before.get(side)));
    this.el.emit(EVENTS.TURN_ACTION, {
      ...result, actorName: actor.prof.name, targetName: target.prof.name,
    }, false);
    return true;
  },

  finishTurn() {
    const { sides } = this.resolving;
    finishTurn(sides);
    sides.forEach((side) => side.ball.components.pokeprof?.changed());
    this.resolving = null;
    this.el.emit(EVENTS.TURN_RESOLVED, null, false);
    this.changed();
  },

  checkGameOver(loser) {
    if (this.isGuest() || this.result || !loser) {
      return;
    }
    const profs = this.ballsOf(loser).map((ball) => ball.components.pokeprof.prof);
    if (isTeamDefeated(profs)) {
      this.result = { winner: this.opponentOf(loser), loser, wait: GAME_OVER_DELAY };
      this.changed();
    }
  },

  changed(player = null) {
    this.el.emit(EVENTS.TURN_CHANGED, { player }, false);
  },

  tick(time, delta) {
    const dt = Math.min(delta || 0, MAX_FRAME_MS);
    if (this.resolving && !this.resolving.remote) {
      this.resolving.wait -= dt;
      while (this.resolving && this.resolving.wait <= 0) {
        const step = this.resolving.steps.shift();
        if (!step) {
          this.finishTurn();
        } else if (this.performStep(step)) {
          this.resolving.wait = TURN_STEP_DELAY;
        }
      }
    }
    if (this.result && this.result.wait > 0) {
      this.result.wait -= dt;
      if (this.result.wait <= 0) {
        this.el.emit(EVENTS.GAME_OVER, { winner: this.result.winner, loser: this.result.loser }, false);
        this.changed();
      }
    }
  },

  remove() {
    this.el.removeEventListener(EVENTS.POKEMON_RELEASED, this.onReleased);
    this.el.removeEventListener(EVENTS.POKEMON_RECALLED, this.onRecalled);
    this.el.removeEventListener(EVENTS.HUD_ACTION, this.onHudAction);
    this.el.removeEventListener(EVENTS.POKEPROF_FAINTED, this.onFainted);
    this.el.removeEventListener(EVENTS.GAME_RESET, this.onGameReset);
  },
});
