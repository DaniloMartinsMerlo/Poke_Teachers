// Teste de ponta a ponta: roda dentro da página real (injetado por run.sh).
// O Chrome headless não dispara requestAnimationFrame com --dump-dom, então
// os quadros são simulados chamando scene.tick() direto. O resultado vai
// para um <pre id="e2e"> com JSON, que o run.sh extrai.

const errors = [];
window.addEventListener("error", (e) => errors.push(String(e.message)));
const origError = console.error;
console.error = (...a) => { errors.push(a.map(String).join(" ")); origError(...a); };
let simTime = 0;
const frame = async () => { const sc = document.querySelector("a-scene"); simTime += 16; sc.tick(simTime, 16); await new Promise((r) => setTimeout(r, 0)); };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const step = (t) => { let p = document.getElementById("e2e-step"); if (!p) { p = document.createElement("pre"); p.id = "e2e-step"; document.body.appendChild(p);} p.textContent += t + ";"; };
const report = (obj) => { const pre = document.createElement("pre"); pre.id = "e2e"; pre.textContent = JSON.stringify(obj); document.body.appendChild(pre); };

async function run() {
  const scene = document.querySelector("a-scene");
  step("start"); while (!scene.hasLoaded) await wait(50); step("loaded");
  // CPU desligada: o J2 é controlado à mão até a partida completa no fim.
  const cpuEl = scene.querySelector("[cpu-player]");
  cpuEl.setAttribute("cpu-player", "enabled", false);
  for (let i = 0; i < 10; i++) await frame(); step("frames");
  const out = {};

  // Tela inicial: o jogo começa no menu; bolas travadas, HUD escondido.
  const flow = scene.systems["game-flow"];
  const menuEl = scene.querySelector("[main-menu]");
  const hudEl = scene.querySelector("[battle-hud]");
  const menuButtons = () => [...menuEl.querySelectorAll(".menu-button")];
  const pressMenu = async (option) => { menuButtons().find((b) => b.dataset.option === option).emit("click"); await frame(); };
  out.startsInMenu = flow.isMenu();
  out.menuVisible = menuEl.object3D.visible;
  out.menuHomeOptions = menuButtons().map((b) => b.dataset.option);
  out.menuInFrontOfPlayer = +menuEl.object3D.position.z.toFixed(2);
  out.hudHiddenInMenu = !hudEl.object3D.visible && hudEl.querySelectorAll(".hud-button").length === 0;
  // Entrar no VR: a cabeça começa na altura 0 até o headset mandar a
  // posição; o painel não pode ir para baixo do chão.
  const cam = scene.camera.el.object3D;
  const camY = cam.position.y;
  cam.position.y = 0;
  scene.emit("enter-vr");
  for (let i = 0; i < 20; i++) await frame();
  out.menuYWhileHeadUnknown = +menuEl.object3D.position.y.toFixed(2);
  cam.position.y = 1.7;
  for (let i = 0; i < 5; i++) await frame();
  out.menuYAfterHeadTracked = +menuEl.object3D.position.y.toFixed(2);
  // O headset corrige a cabeça de novo logo depois: o painel acompanha.
  cam.position.y = 1.2;
  for (let i = 0; i < 5; i++) await frame();
  out.menuYAfterHeadCorrected = +menuEl.object3D.position.y.toFixed(2);
  // Painel abaixo do chão por qualquer motivo: volta para a frente.
  for (let i = 0; i < 200; i++) await frame(); // passa o tempo de acompanhar
  menuEl.object3D.position.y = -0.5;
  await frame();
  out.menuYRecoveredFromBelow = +menuEl.object3D.position.y.toFixed(2);
  cam.position.y = camY;
  scene.emit("exit-vr");
  for (let i = 0; i < 20; i++) await frame();
  await pressMenu("credits");
  out.creditsScreen = [menuEl.dataset.screen, menuEl.querySelector(".menu-credits-image").getAttribute("visible"),
    menuEl.querySelector(".menu-credits-image").getAttribute("src"), menuButtons().map((b) => b.dataset.option)];
  await pressMenu("back");
  await pressMenu("vs-player");
  out.versusScreen = [menuEl.dataset.screen, menuButtons().map((b) => `${b.dataset.option}:${b.dataset.soon}`)];

  // Salas J1 x J2 com um transporte falso (sem internet): o teste faz o
  // papel do outro aparelho.
  class FakeTransport {
    constructor() { this.listeners = new Map(); this.sent = []; FakeTransport.last = this; }
    on(e, fn) { if (!this.listeners.has(e)) this.listeners.set(e, []); this.listeners.get(e).push(fn); }
    emit(e, d) { (this.listeners.get(e) || []).forEach((fn) => fn(d)); }
    host(code) { this.hostCode = code; return Promise.resolve(); }
    join(code) {
      this.joinCode = code;
      const fail = (c) => Promise.reject(Object.assign(new Error(c), { code: c }));
      if (code === "0000") return fail("not-found");
      if (code === "1111") return fail("full");
      return Promise.resolve().then(() => this.emit("connected"));
    }
    send(m) { this.sent.push({ v: 1, ...m }); return true; }
    close() { this.closed = true; }
  }
  const net = scene.systems.network;
  net.TransportClass = FakeTransport;
  const menuStatus = () => menuEl.querySelector(".menu-status").getAttribute("value");
  const roomCodeText = () => menuEl.querySelector(".menu-room-code").getAttribute("value");
  const settle = async () => { for (let i = 0; i < 3; i++) await frame(); };
  // Anfitrião: cria a sala, mostra o código, o J2 chega, trocam hello.
  await pressMenu("create-room"); await settle();
  const hostT = FakeTransport.last;
  out.hosting = [menuEl.dataset.screen, roomCodeText(), menuStatus(), net.state];
  out.hostingCodeShown = roomCodeText().replace(/ /g, "") === hostT.hostCode;
  hostT.emit("connected"); await settle();
  out.hostSentHello = hostT.sent.some((m) => m.type === "hello" && m.role === "host");
  hostT.emit("message", { v: 1, type: "hello", role: "guest" }); await settle();
  out.hostMatch = [flow.mode, flow.opponent, flow.role, net.state, menuEl.object3D.visible];
  out.cpuIdleInOnlineMatch = cpuEl.dataset.cpuState;
  // O J2 sai: volta ao menu com o aviso.
  hostT.emit("closed"); await settle();
  out.lostBackToMenu = [flow.isMenu(), menuEl.dataset.screen, menuStatus(), net.state];
  // Cancelar a sala antes de alguém entrar.
  await pressMenu("vs-player"); await pressMenu("create-room"); await settle();
  await pressMenu("back"); await settle();
  out.cancelHosting = [menuEl.dataset.screen, net.state, FakeTransport.last.closed === true];
  // Convidado: teclado numérico, erros e entrada.
  await pressMenu("join-room");
  out.joinScreen = [menuEl.dataset.screen, menuButtons().map((b) => b.dataset.option).join(","), roomCodeText()];
  const typeCode = async (digits) => { for (const d of digits) await pressMenu(d); };
  await pressMenu("enter");
  out.joinEmptyCode = menuStatus();
  await typeCode("00000");
  out.joinTyped = roomCodeText();
  await pressMenu("enter"); await settle();
  out.joinNotFound = [menuStatus(), net.state];
  for (let i = 0; i < 4; i++) await pressMenu("delete");
  out.joinAfterDelete = roomCodeText();
  await typeCode("1111"); await pressMenu("enter"); await settle();
  out.joinFull = menuStatus();
  for (let i = 0; i < 4; i++) await pressMenu("delete");
  await typeCode("4827"); await pressMenu("enter"); await settle();
  // Outro aparelho com versão diferente do jogo.
  FakeTransport.last.emit("message", { v: 2, type: "hello", role: "host" }); await settle();
  out.joinVersionMismatch = [menuStatus(), net.state, flow.isMenu()];
  await pressMenu("enter"); await settle();
  const guestT = FakeTransport.last;
  out.guestJoinedCode = guestT.joinCode;
  guestT.emit("message", { v: 1, type: "hello", role: "host" }); await settle();
  out.guestMatch = [flow.mode, flow.opponent, flow.role, net.state];
  const rigEl = document.querySelector("#camera-rig");
  out.guestSpawn = [
    +rigEl.object3D.position.z.toFixed(2),
    +rigEl.object3D.rotation.y.toFixed(2),
    hudEl.getAttribute("battle-hud").player,
    hudEl.querySelector("a-text").getAttribute("value"),
  ];
  // Sincronização J1 x J2 (etapa 4): no convidado (J2), o anfitrião solta
  // os PokeProfs, resolve o turno e anuncia o fim de jogo; no anfitrião
  // (J1), o `remote-player` recebe as escolhas do J2.
  const p1Balls = [...scene.querySelectorAll('[pokeprof][data-player="p1"]')];
  const p2Balls = [...scene.querySelectorAll('[pokeprof][data-player="p2"]')];
  out.guestBallsLocked = [
    p1Balls.every((b) => b.hasAttribute("data-no-grab")),
    p2Balls.every((b) => !b.hasAttribute("data-no-grab")),
  ];
  guestT.emit("message", { v: 1, type: "released", player: "p1", ball: 0, pos: { x: 0, y: 0.088, z: 4 } });
  guestT.emit("message", { v: 1, type: "released", player: "p2", ball: 0, pos: { x: 0, y: 0.088, z: -4 } });
  await settle();
  out.guestBothReleased = [
    Boolean(scene.systems.battle.activeBall("p1")),
    Boolean(scene.systems.battle.activeBall("p2")),
  ];
  // J2 escolhe ataque no próprio HUD: envia `choose` ao J1, mas NÃO
  // começa a resolver o turno sozinho.
  const guestHudBtns = () => [...hudEl.querySelectorAll(".hud-button")];
  guestHudBtns().find((b) => b.dataset.option === "attack").emit("click"); await frame();
  guestHudBtns().find((b) => b.dataset.option === "chamada-oral").emit("click"); await frame();
  out.guestSentChoose = guestT.sent.some((m) => m.type === "choose" && m.kind === "attack" && m.id === "chamada-oral");
  out.guestWaitsHostTurn = !scene.systems.battle.isResolving();
  // O anfitrião manda o turno: J2 aplica o dano sem sortear de novo.
  guestT.emit("message", { v: 1, type: "turnStarted", order: ["p2", "p1"] }); await frame();
  out.guestResolvingFromHost = scene.systems.battle.isResolving();
  guestT.emit("message", {
    v: 1, type: "turnAction", kind: "attack", player: "p2", target: "p1",
    id: "chamada-oral", label: "Chamada Oral", actorName: "Rodinha", targetName: "Fabi",
    damage: 25, missed: false, fainted: false, multiplier: 1.5, ppLeft: 14,
  });
  await frame();
  out.guestAppliedHostAction = [
    p1Balls[0].components.pokeprof.prof.hp,
    p2Balls[0].components.pokeprof.prof.ppLeft({ id: "chamada-oral", pp: 15 }),
  ];
  guestT.emit("message", { v: 1, type: "turnResolved" }); await frame();
  out.guestTurnResolved = !scene.systems.battle.isResolving();
  guestT.emit("message", { v: 1, type: "gameOver", winner: "p2", loser: "p1" }); await frame();
  out.guestGameOver = [hudEl.dataset.page, hudEl.querySelector(".hud-result")?.getAttribute("value")];
  guestHudBtns().find((b) => b.dataset.option === "playagain").emit("click"); await frame();
  out.guestSentPlayAgain = guestT.sent.some((m) => m.type === "playAgain");
  guestT.emit("message", { v: 1, type: "reset" }); await settle();
  out.guestResetFromHost = !scene.systems.battle.isGameOver()
    && p1Balls[0].components.pokeprof.prof.hp === p1Balls[0].components.pokeprof.prof.maxHp();
  // Mensagens da partida (etapa 4) chegam como NETWORK_MESSAGE.
  let netMessage = null;
  scene.addEventListener("networkmessage", (e) => { netMessage = e.detail; }, { once: true });
  guestT.emit("message", { v: 1, type: "turnAction", n: 1 }); await frame();
  out.gameMessageForwarded = netMessage?.type;
  // Voltar ao menu (botão "Menu") encerra a conexão e avisa o outro.
  flow.openMenu(); await settle();
  out.menuLeavesRoom = [net.state, guestT.sent.some((m) => m.type === "bye"), guestT.closed === true];
  menuEl.components["main-menu"].showScreen("home"); await frame();
  await pressMenu("vs-cpu");
  out.matchStarted = [flow.mode, flow.opponent];
  out.menuHiddenInMatch = !menuEl.object3D.visible && menuButtons().length === 0;
  out.hudShownInMatch = hudEl.object3D.visible && hudEl.querySelectorAll(".hud-button").length === 4;
  const balls = [...document.querySelectorAll(".grabbable")];
  out.balls = balls.map((b) => b.object3D.position.toArray().map((n) => +n.toFixed(2)));
  out.obstacles = document.querySelectorAll(".player-obstacle").length;
  const rig = document.querySelector("#camera-rig");
  out.rects = rig.components["player-collision"].rects.length;

  const head = () => scene.camera.getWorldPosition(new THREE.Vector3());
  // teclado (wasd): anda 5 cm por quadro em direção à mureta direita
  for (let i = 0; i < 200; i++) { rig.object3D.position.x += 0.05; await frame(); }
  out.walkRightHeadX = +head().x.toFixed(3);
  for (let i = 0; i < 200; i++) { rig.object3D.position.z += 0.05; await frame(); }
  out.walkCornerHead = [+head().x.toFixed(3), +head().z.toFixed(3)];
  rig.object3D.position.set(0, 0, 0); await frame(); await frame();
  // analógico via player-rig, com um passo enorme de 1 m
  rig.object3D.position.set(-6.5, 0, 0); await frame();
  rig.components["player-rig"].translate(new THREE.Vector3(-1, 0, 0));
  out.bigStepLeftX = +rig.object3D.position.x.toFixed(3);
  // voando por cima da mureta não há colisão
  rig.object3D.position.set(0, 1.5, -9.5); await frame();
  for (let i = 0; i < 40; i++) { rig.object3D.position.z -= 0.05; await frame(); }
  out.flyOverZ = +rig.object3D.position.z.toFixed(2);
  rig.object3D.position.set(0, 0, 7); await frame();

  const tc = scene.systems["tracked-controls"];
  const mode = scene.systems["input-mode"];
  tc.controllers = [
    { handedness: "left", hand: {}, profiles: ["generic-hand"] },
    { handedness: "right", hand: null, profiles: ["oculus-touch-v3"] },
  ];
  mode.refresh();
  out.modes = { ...mode.modes };
  const [leftCtrl, rightCtrl] = document.querySelectorAll("[player-controller]");
  const [leftHand] = document.querySelectorAll("[player-hand]");
  out.leftLaserVisible = leftCtrl.object3D.visible;
  out.rightLaserVisible = rightCtrl.object3D.visible;

  rig.object3D.updateMatrixWorld(true);
  const rigInv = rig.object3D.matrixWorld.clone().invert();
  const ball0 = balls[0];
  const ballWorld = ball0.object3D.getWorldPosition(new THREE.Vector3());
  leftCtrl.object3D.position.copy(ballWorld.clone().applyMatrix4(rigInv)); await frame();
  leftCtrl.emit("triggerdown");
  out.leakedTriggerGrabbed = ball0.hasAttribute("data-held");

  leftHand.emit("pinchstarted", { position: ballWorld.clone().applyMatrix4(rigInv) });
  out.pinchGrabbed = ball0.hasAttribute("data-held");
  leftHand.emit("pinchmoved", { position: ballWorld.clone().add(new THREE.Vector3(0, 0.3, 0)).applyMatrix4(rigInv) });
  await frame();
  out.pinchMovedY = +ball0.object3D.position.y.toFixed(2);
  leftHand.emit("pinchended", {});
  out.pinchReleased = !ball0.hasAttribute("data-held");

  const ball2 = balls[2];
  const b2 = ball2.object3D.getWorldPosition(new THREE.Vector3());
  rightCtrl.object3D.position.copy(b2.clone().applyMatrix4(rigInv)); await frame();
  rightCtrl.emit("triggerdown");
  out.controllerGrabbed = ball2.hasAttribute("data-held");
  tc.controllers = [{ handedness: "right", hand: {}, profiles: ["generic-hand"] }];
  mode.refresh();
  out.releasedOnModeSwitch = !ball2.hasAttribute("data-held");
  out.rightLaserVisibleAfter = rightCtrl.object3D.visible;

  tc.controllers = [{ handedness: "right", hand: null, profiles: ["oculus-touch-v3"] }];
  mode.refresh();
  for (let i = 0; i < 40; i++) await frame();
  out.beforeReset = balls.map((b) => b.object3D.position.toArray().map((n) => +n.toFixed(2)));
  rightCtrl.emit("bbuttondown"); await frame();
  out.afterReset = balls.map((b) => b.object3D.position.toArray().map((n) => +n.toFixed(2)));
  out.resetButtonGone = !document.querySelector("[reset-button], .reset-button");
  out.texts = [...document.querySelectorAll("a-text")].map((t) => t.getAttribute("value"));

  // Prévia do professor: aparece ao apontar, some ao parar de apontar.
  out.ballCount = balls.length;
  out.previews = balls.map((b) => b.getAttribute("pokemon-preview")?.name || null);
  const cursor = document.getElementById("mouse-cursor");
  const card = () => balls[0].components["pokemon-preview"].card.object3D;
  balls[0].emit("raycaster-intersected", { el: cursor }); await frame();
  out.previewShownOnHover = card().visible;
  out.previewAboveBall = +(card().position.y - balls[0].object3D.position.y).toFixed(2);
  balls[0].emit("raycaster-intersected-cleared", { el: cursor }); await frame();
  out.previewHiddenAfter = !card().visible;

  // Pouso: arremesso para frente; depois de cair a bola para logo.
  const body = balls[1].components["physics-body"];
  body.body.position.set(0, 1.5, 6); body.stop(); body.takeOff();
  body.body.velocity.set(0, 2, -6); body.body.wakeUp();
  const zAt = [];
  for (let i = 0; i < 200; i++) { await frame(); if (i === 60 || i === 199) zAt.push(+body.body.position.z.toFixed(2)); }
  out.landed = body.landed;
  out.rollAfterLandingM = +Math.abs(zAt[1] - zAt[0]).toFixed(2);
  // Pokémon: sai ao cair no chão, volta ao resetar.
  out.pokemonReleased = document.querySelectorAll(".released-pokemon").length;
  out.pokemonOnFloorY = +(document.querySelector(".released-pokemon")?.object3D.position.y ?? -1).toFixed(2);
  // Bola do jogador (z > 0): pokémon de costas para ele, olhando para -z.
  const released = document.querySelector(".released-pokemon")?.object3D;
  out.pokemonFacesOpponent = released ? new THREE.Vector3(0, 0, 1).applyQuaternion(released.quaternion).z < -0.9 : false;
  out.ballsOnRackReleasedNothing = document.querySelectorAll(".released-pokemon").length === 1;
  body.reset(); await frame();
  out.pokemonRecalled = document.querySelectorAll(".released-pokemon").length === 0;

  // Carretilha: controle segura a bola e o analógico para frente afasta.
  const reelBall = balls[3];
  const rb = reelBall.components["physics-body"];
  rb.reset(); await frame();
  tc.controllers = [{ handedness: "right", hand: null, profiles: ["oculus-touch-v3"] }];
  mode.refresh();
  rig.object3D.updateMatrixWorld(true);
  const rbWorld = reelBall.object3D.getWorldPosition(new THREE.Vector3());
  rightCtrl.object3D.position.copy(rbWorld.clone().applyMatrix4(rig.object3D.matrixWorld.clone().invert())); await frame();
  rightCtrl.emit("triggerdown");
  out.reelGrabbed = reelBall.hasAttribute("data-held");
  const d0 = reelBall.object3D.position.length();
  const rigBefore = rig.object3D.position.clone();
  rightCtrl.emit("thumbstickmoved", { x: 0, y: -1 });
  for (let i = 0; i < 30; i++) await frame();
  out.reelPushedM = +(reelBall.object3D.position.length() - d0).toFixed(2);
  out.rigStillWhileReeling = rig.object3D.position.distanceTo(rigBefore) < 1e-6;
  rightCtrl.emit("thumbstickmoved", { x: 0, y: 1 });
  for (let i = 0; i < 60; i++) await frame();
  out.reelPulledToMin = +reelBall.object3D.position.length().toFixed(2);
  rightCtrl.emit("thumbstickmoved", { x: 0, y: 0 });
  // Laser inclinado (como no Quest): a bola anda reta, paralela ao laser.
  rightCtrl.setAttribute("raycaster", { origin: { x: 0, y: 0.005, z: -0.02 }, direction: { x: 0, y: -0.6, z: -0.8 } });
  const lp0 = reelBall.object3D.position.clone();
  rightCtrl.emit("thumbstickmoved", { x: 0, y: -1 });
  for (let i = 0; i < 20; i++) await frame();
  rightCtrl.emit("thumbstickmoved", { x: 0, y: 0 });
  const moved = reelBall.object3D.position.clone().sub(lp0).normalize();
  out.reelParallelToLaser = +moved.dot(new THREE.Vector3(0, -0.6, -0.8)).toFixed(3);
  rightCtrl.setAttribute("raycaster", { origin: { x: 0, y: 0, z: 0 }, direction: { x: 0, y: 0, z: -1 } });

  // Bola segurada não atravessa o chão nem a mureta (testado no meio do
  // campo, longe dos suportes; controle no espaço do rig, em z = 7).
  const ctrlHome = rightCtrl.object3D.position.clone();
  const ballWorld3 = () => reelBall.object3D.getWorldPosition(new THREE.Vector3());
  const moveCtrl = async (x, y, z, frames = 3) => {
    rightCtrl.object3D.position.set(x, y, z);
    for (let i = 0; i < frames; i++) await frame();
  };
  await moveCtrl(ctrlHome.x, 2.5, ctrlHome.z);
  await moveCtrl(3, 2.5, -10);
  reelBall.object3D.position.set(0, 0, -0.3);
  await moveCtrl(3, 1, -10);
  out.heldBallFollowsHand = +ballWorld3().distanceTo(new THREE.Vector3(3, 1, -3.3)).toFixed(3);
  await moveCtrl(3, -1, -10);
  out.heldBallAboveGroundY = +ballWorld3().y.toFixed(3);
  await moveCtrl(3, 0.4, -10);
  await moveCtrl(9, 0.4, -10);
  out.heldBallInsideWallX = +ballWorld3().x.toFixed(3);
  await moveCtrl(3, 0.4, -10);
  // Voltou para a "pegada" original (30 cm à frente do controle).
  out.heldBallBackInHandM = +reelBall.object3D.position.distanceTo(new THREE.Vector3(0, 0, -0.3)).toFixed(3);
  await moveCtrl(ctrlHome.x, 2.5, -10);
  await moveCtrl(ctrlHome.x, 2.5, ctrlHome.z);
  await moveCtrl(ctrlHome.x, ctrlHome.y, ctrlHome.z, 1);

  // Encaixe: soltar perto do encaixe (livre) trava a bola nele.
  const slot = scene.querySelector("[ball-rack]").components["ball-rack"].slots[0];
  const snapBall = balls[1];
  rightCtrl.emit("triggerup");
  tc.controllers = [{ handedness: "left", hand: {}, profiles: ["generic-hand"] }];
  mode.refresh();
  // balls[0] ocupa o encaixe 0: tira ela de lá antes.
  balls[0].components["physics-body"].body.position.set(3, 0.1, 0); await frame();
  leftHand.emit("pinchstarted", { position: snapBall.object3D.getWorldPosition(new THREE.Vector3()).applyMatrix4(rigInv) });
  out.snapGrabbed = snapBall.hasAttribute("data-held");
  leftHand.emit("pinchmoved", { position: slot.clone().add(new THREE.Vector3(0.12, 0.1, 0.05)).applyMatrix4(rigInv) });
  await frame();
  out.slotHighlighted = scene.querySelector("[ball-rack]").components["ball-rack"].markers[0].dataset.active === "true";
  leftHand.emit("pinchended", {});
  for (let i = 0; i < 60; i++) await frame();
  out.snappedOffsetM = +snapBall.object3D.position.distanceTo(slot).toFixed(3);

  // HUD de batalha: acompanha o jogador e navega entre páginas.
  scene.emit("gamereset"); await frame(); await frame();
  const hud = scene.querySelector("[battle-hud]");
  const hudButtons = () => [...hud.querySelectorAll(".hud-button")];
  const press = async (option) => { hudButtons().find((b) => b.dataset.option === option).emit("click"); await frame(); };
  out.hudMainOptions = hudButtons().map((b) => b.dataset.option);
  // Grade 2x2: duas colunas (x) e duas linhas (y) distintas.
  const coords = (axis) => new Set(hudButtons().map((b) => +b.object3D.position[axis].toFixed(3))).size;
  out.hudGrid2x2 = [coords("x"), coords("y")];
  const hudPlane = () => hud.querySelector("a-plane").getAttribute("height");
  out.hudMainPanelHeight = +(+hudPlane()).toFixed(3);
  const hudBefore = hud.object3D.getWorldPosition(new THREE.Vector3());
  rig.object3D.position.x += 2; for (let i = 0; i < 3; i++) await frame();
  out.hudFollowedM = +(hud.object3D.getWorldPosition(new THREE.Vector3()).x - hudBefore.x).toFixed(2);
  rig.object3D.position.x -= 2; await frame();
  const headNow = head();
  const toHud = hud.object3D.getWorldPosition(new THREE.Vector3()).sub(headNow);
  const fwd = scene.camera.getWorldDirection(new THREE.Vector3());
  // Esquerda = produto vetorial (frente × cima) negativo.
  out.hudOnLeft = new THREE.Vector3().crossVectors(fwd, new THREE.Vector3(0, 1, 0)).dot(toHud) < 0;
  // Segue o corpo, não a cabeça: virar a cabeça 50° não mexe o HUD.
  const look = scene.camera.el.components["look-controls"];
  const hudWorld = () => hud.object3D.getWorldPosition(new THREE.Vector3());
  const restPos = hudWorld();
  look.yawObject.rotation.y = 0.87;
  for (let i = 0; i < 30; i++) await frame();
  out.hudStillWhenHeadTurns = +hudWorld().distanceTo(restPos).toFixed(3);
  // Inclinar a cabeça 20 cm (alcançar um botão) também não.
  scene.camera.el.object3D.position.x -= 0.2;
  for (let i = 0; i < 5; i++) await frame();
  out.hudStillWhenLeaning = +hudWorld().distanceTo(restPos).toFixed(3);
  scene.camera.el.object3D.position.x += 0.2;
  // Girar o corpo (cabeça virada para trás por mais de 1,2 s) traz o HUD.
  look.yawObject.rotation.y = Math.PI;
  for (let i = 0; i < 160; i++) await frame();
  const hudDir = hudWorld().sub(head()).setY(0).normalize();
  const backDir = new THREE.Vector3(0, 0, 1);
  out.hudRecenteredAfterBodyTurn = hudDir.dot(backDir) > 0.5;
  look.yawObject.rotation.y = 0;
  for (let i = 0; i < 160; i++) await frame();
  out.hudPointableByMouse = cursor.components.raycaster.objects.some((o) => o.el?.classList.contains("hud-button"));
  await press("attack");
  out.hudAttackPage = [hud.dataset.page, hudButtons().length];
  out.hudBackBelowGrid = [coords("x"), coords("y")];
  out.hudAttackPanelHeight = +(+hudPlane()).toFixed(3);
  await press("back");
  await press("powerup");
  out.hudPowerupPage = [hud.dataset.page, hudButtons().length];
  await press("feriado");
  out.hudBackToMainAfterChoice = hud.dataset.page;
  await press("giveup");
  out.hudGiveUpStays = hud.dataset.page;

  // Um pokémon por jogador; distinção por dono; trocar traz a bola de volta.
  const rackOf = (p) => scene.querySelector(`[ball-rack*="${p}"]`).components["ball-rack"];
  const p1Rack = rackOf("p1");
  const p2Rack = rackOf("p2");
  const drop = async (ball, x, z) => {
    const b = ball.components["physics-body"];
    b.body.position.set(x, 0.4, z); b.stop(); b.takeOff(); b.body.wakeUp();
    for (let i = 0; i < 40; i++) await frame();
  };
  const pokemonsOf = (p) => document.querySelectorAll(`.released-pokemon[data-player="${p}"]`).length;
  await drop(p1Rack.balls[0], 0, 4);
  out.p1FirstReleased = pokemonsOf("p1");
  // Em campo: cartão acima do HUD; a prévia na bola não aparece mais.
  const fieldCard = () => hud.querySelector(".hud-field-card-mine");
  const opponentCard = () => hud.querySelector(".hud-field-card-opponent");
  out.hudFieldCardShown = !!fieldCard();
  out.hudFieldCardAbovePanel = fieldCard()
    ? fieldCard().object3D.position.y > hud.querySelector("a-plane").getAttribute("height") / 2
    : false;
  const p1Ball = p1Rack.balls[0];
  p1Ball.emit("raycaster-intersected", { el: cursor }); await frame();
  out.previewHiddenWhileOnField = !p1Ball.components["pokemon-preview"].card.object3D.visible;
  p1Ball.components.pokeprof.damage(25); await frame();
  out.hudFieldCardHp = fieldCard()?.querySelector(".hp-text").getAttribute("value");
  out.hudFieldCardY = fieldCard()?.object3D.position.y;
  out.ownerMarked = !!document.querySelector('.released-pokemon[data-player="p1"] .owner-ring');
  await drop(p1Rack.balls[1], 1, 4);
  out.p1SecondBlocked = pokemonsOf("p1");
  out.hudBlockedMsg = hud.querySelector(".hud-status").getAttribute("value");
  out.secondBallReturning = p1Rack.balls[1].hasAttribute("data-returning");
  for (let i = 0; i < 90; i++) await frame();
  out.secondBallBackInSlotM = +p1Rack.balls[1].object3D.position.distanceTo(p1Rack.slots[1]).toFixed(3);
  await drop(p2Rack.balls[0], 0, -4);
  out.p2Released = pokemonsOf("p2");
  const ringColor = (p) => document.querySelector(`.released-pokemon[data-player="${p}"] .owner-ring`)?.getAttribute("material").color;
  out.ownerColorsDiffer = ringColor("p1") !== ringColor("p2");
  // Cartão do adversário também acima do HUD, empilhado acima do meu.
  await frame();
  out.opponentCardShown = !!opponentCard();
  out.opponentCardAboveMine = opponentCard() && fieldCard()
    ? opponentCard().object3D.position.y > fieldCard().object3D.position.y : false;
  out.opponentCardLabel = opponentCard()?.querySelector("a-text").getAttribute("value");
  // Atributos, tipo e vida no card.
  const battle = scene.systems.battle;
  const status = () => hud.querySelector(".hud-status").getAttribute("value");
  const buttonLocked = (option) => hudButtons().find((b) => b.dataset.option === option)?.dataset.locked;
  const until = async (cond, max) => { for (let i = 0; i < max && !cond(); i++) await frame(); return cond(); };
  const p2Ball = p2Rack.balls[0];
  const p2Card = p2Ball.components["pokemon-preview"].cardView;
  p2Card.refresh(p2Ball.components.pokeprof.prof);
  const hpText = () => p2Card.hpText.getAttribute("value");
  out.cardHpFull = hpText();
  out.cardStats = p2Card.statsText.getAttribute("value");
  out.cardType = [...p2Card.el.querySelectorAll("a-text")].map((t) => t.getAttribute("value")).find((v) => v?.startsWith("Tipo"));
  // Turno: escolher sozinho não aplica nada; HUD espera e trava.
  const actions = [];
  scene.addEventListener("turnaction", (e) => actions.push(e.detail));
  await press("attack");
  out.attackDetails = [...hud.querySelectorAll(".hud-option-detail")].map((t) => t.getAttribute("value"));
  await press("prova-surpresa");
  out.turnWaitingStatus = status();
  out.turnAttackLocked = buttonLocked("attack");
  out.turnSwitchFreeWhileWaiting = buttonLocked("switch");
  out.cardHpAfterChoiceOnly = hpText();
  await press("attack");
  out.lockedAttackStaysMain = hud.dataset.page;
  // J2 escolhe: o turno resolve; o mais rápido primeiro (Rodinha 70 > Fabi 60).
  out.p2ChoiceAccepted = battle.choose("p2", { kind: "attack", id: "chamada-oral" });
  for (let i = 0; i < 45; i++) await frame(); // 0,5 s + um pouco: 1ª ação
  out.calloutsAfterFirstAction = [...document.querySelectorAll(".battle-callout-text")].map((t) => t.getAttribute("value"));
  out.resolvingStatus = status();
  out.switchLockedWhileResolving = buttonLocked("switch");
  await until(() => !battle.isResolving(), 300);
  out.turnOrder = actions.map((a) => a.player);
  out.logLines = [...hud.querySelectorAll(".hud-log-line")].map((t) => t.getAttribute("value")).filter(Boolean);
  out.logRightOfPanel = hud.querySelector(".hud-log").object3D.position.x > 0.2;
  out.cardHpAfterAttack = hpText();
  out.ppAfterFirstTurn = battle.ppLeft("p1", "prova-surpresa");
  out.firstTurnMissed = actions.filter((a) => a.missed).map((a) => a.player);
  out.opponentCardHpAfterAttack = opponentCard()?.querySelector(".hp-text").getAttribute("value");
  out.hpBarScale = +p2Card.hpBar.object3D.scale.x.toFixed(2);
  out.attackUnlockedAfterTurn = buttonLocked("attack");
  // Power-up: Feriado do J1 vale no turno seguinte; J2 cura na hora.
  const p2HpBeforeHeal = p2Ball.components.pokeprof.prof.hp;
  await press("powerup");
  out.powerupBadges = [...hud.querySelectorAll(".hud-option-detail")].map((t) => t.getAttribute("value"));
  out.powerupBadgeCount = hud.querySelectorAll(".hud-badge").length;
  await press("feriado");
  battle.choose("p2", { kind: "powerup", id: "intervalo" });
  await until(() => !battle.isResolving(), 300);
  out.p2Healed = p2Ball.components.pokeprof.prof.hp - p2HpBeforeHeal;
  out.p1BoostActive = p1Ball.components.pokeprof.prof.activeBoost?.id;
  out.boostCardText = fieldCard()?.querySelector(".boost-text")?.getAttribute("value");
  out.boostedDefenseShown = fieldCard()?.querySelector(".stats-text").getAttribute("value");
  await press("switch");
  out.switchStatus = status();
  out.switchBallReturning = p1Rack.balls[0].hasAttribute("data-returning");
  // Trocar gasta o turno: vira a escolha do J1; o J2 escolhe, mas o turno
  // só resolve quando o novo PokeProf chegar.
  out.switchIsTurnChoice = battle.isSwitching("p1");
  out.attackLockedAfterSwitch = buttonLocked("attack");
  out.p2ChoosesWhileP1Switches = battle.choose("p2", { kind: "attack", id: "chamada-oral" });
  out.turnWaitsForNewProf = !battle.isResolving();
  let peakY = 0;
  for (let i = 0; i < 100; i++) { await frame(); peakY = Math.max(peakY, p1Rack.balls[0].object3D.position.y); }
  out.switchArcPeakY = +peakY.toFixed(2);
  out.switchBallBackInSlotM = +p1Rack.balls[0].object3D.position.distanceTo(p1Rack.slots[0]).toFixed(3);
  out.p1AfterSwitch = pokemonsOf("p1");
  out.boostClearedOnRecall = p1Ball.components.pokeprof.prof.activeBoost === null;
  out.hudFieldCardGoneAfterSwitch = !fieldCard();
  out.opponentCardStaysAfterSwitch = !!opponentCard();
  out.opponentCardMovedDown = opponentCard()
    ? Math.abs(opponentCard().object3D.position.y - out.hudFieldCardY) < 1e-6 : false;
  await frame();
  out.previewBackAfterSwitch = p1Ball.components["pokemon-preview"].card.object3D.visible;
  p1Ball.emit("raycaster-intersected-cleared", { el: cursor });
  out.p2StillOut = pokemonsOf("p2");
  out.turnStillWaitingAfterFlight = !battle.isResolving();
  actions.length = 0;
  await drop(p1Rack.balls[2], 0, 4);
  out.p1CanSendAnotherAfterSwitch = pokemonsOf("p1");
  out.turnStartsWhenNewProfLands = battle.isResolving();
  await until(() => !battle.isResolving(), 300);
  out.switchTurnActions = actions.map((a) => `${a.player}:${a.kind}`);
  const newProf = p1Rack.balls[2].components.pokeprof.prof;
  out.newProfHitBySwitchTurn = newProf.hp < newProf.maxHp();
  out.attackUnlockedAfterSwitchTurn = buttonLocked("attack");
  // Desmaio no turno: o adversário zera, volta para a bola (voa ao
  // suporte) e não pode ser jogado de novo até o reset.
  const foeProf = p2Ball.components.pokeprof;
  foeProf.damage(foeProf.prof.hp - 1);
  actions.length = 0;
  await press("attack");
  out.attackDetailsNewProf = [...hud.querySelectorAll(".hud-option-detail")].map((t) => t.getAttribute("value"));
  await press("chamada-oral");
  battle.choose("p2", { kind: "attack", id: "prova-surpresa" });
  await until(() => foeProf.prof.isFainted(), 300);
  out.faintLog = [...hud.querySelectorAll(".hud-log-line")].map((t) => t.getAttribute("value")).filter(Boolean).slice(-2);
  out.foeFainted = foeProf.prof.isFainted();
  out.foeCardShowsFainted = opponentCard()?.querySelector(".hp-text").getAttribute("value");
  out.foeStillOutDuringDelay = pokemonsOf("p2");
  out.noChoiceWhileFoeFainted = !battle.canChoose("p1");
  for (let i = 0; i < 60; i++) await frame(); // > FAINT_RECALL_DELAY (900 ms)
  out.foeReturning = p2Ball.hasAttribute("data-returning");
  out.foeRecalled = p2Ball.components["pokemon-release"].creature === null;
  for (let i = 0; i < 100; i++) await frame();
  out.foeBallBackInSlotM = +p2Ball.object3D.position.distanceTo(p2Rack.slots[0]).toFixed(3);
  out.foeCardGone = !opponentCard();
  out.p2ActiveCleared = battle.activeBall("p2") === null;
  await drop(p2Ball, 0, -4);
  out.faintedCantSendOut = pokemonsOf("p2");
  out.faintedBallReturning = p2Ball.hasAttribute("data-returning");
  for (let i = 0; i < 100; i++) await frame();
  // Outra bola do J2 (viva) pode entrar.
  await drop(p2Rack.balls[1], 0, -4);
  out.otherFoeCanSendOut = pokemonsOf("p2");
  scene.emit("gamereset"); await frame();
  out.cardHpAfterReset = hpText();
  out.noCardsAfterReset = hud.querySelectorAll(".hud-field-card").length === 0;
  out.ppRestoredAfterReset = p1Ball.components.pokeprof.prof.ppLeft({ id: "prova-surpresa", pp: 10 }) === 10;

  // Fora da arena: bola na arquibancada ou além do fundo não abre e volta
  // para o suporte.
  const outBall = p1Rack.balls[0];
  await drop(outBall, 8.3, 0); // degrau da arquibancada direita
  out.outOfArenaNoPokemon = pokemonsOf("p1");
  await until(() => outBall.hasAttribute("data-returning"), 120);
  out.outOfArenaReturning = outBall.hasAttribute("data-returning");
  await until(() => !outBall.hasAttribute("data-returning"), 120);
  out.outOfArenaBackInSlotM = +outBall.object3D.position.distanceTo(p1Rack.slots[0]).toFixed(3);
  await drop(outBall, 0, 10.6); // chão atrás da mureta do fundo
  out.behindWallNoPokemon = pokemonsOf("p1");
  await until(() => !outBall.hasAttribute("data-returning") && outBall.object3D.position.distanceTo(p1Rack.slots[0]) < 0.05, 200);
  out.behindWallBackInSlotM = +outBall.object3D.position.distanceTo(p1Rack.slots[0]).toFixed(3);
  // Dentro do campo continua abrindo.
  await drop(outBall, 0, 4);
  out.insideStillReleases = pokemonsOf("p1");
  scene.emit("gamereset"); await frame();

  // Partida completa contra a CPU, até alguém perder todos os PokeProfs.
  for (let i = 0; i < 5; i++) await frame();
  cpuEl.setAttribute("cpu-player", { enabled: true, thinkMs: 150, sendDelayMs: 150 });
  await frame();
  out.cpuStartsWaiting = cpuEl.dataset.cpuState;
  out.cpuBallsLocked = p2Rack.balls.every((b) => b.hasAttribute("data-no-grab"));
  // Time da CPU fraco para a partida ser curta no teste.
  p2Rack.balls.forEach((b) => b.components.pokeprof.damage(b.components.pokeprof.prof.hp - 12));
  let gameOver = null;
  scene.addEventListener("gameover", (e) => { gameOver = e.detail; });
  await drop(p1Rack.balls[0], 0, 4);
  let cpuPeak = 0;
  await until(() => {
    p2Rack.balls.forEach((b) => { cpuPeak = Math.max(cpuPeak, b.object3D.position.y); });
    return !!battle.activeBall("p2");
  }, 400);
  out.cpuThrowPeakY = +cpuPeak.toFixed(2);
  out.cpuReleased = pokemonsOf("p2");
  out.cpuBallLandedOnField = +(battle.activeBall("p2")?.object3D.position.z ?? 0).toFixed(1);
  const cpuStates = new Set();
  let turns = 0;
  for (let i = 0; i < 6000 && !gameOver; i++) {
    cpuStates.add(cpuEl.dataset.cpuState);
    if (battle.canChoose("p1") && hud.dataset.page === "main") {
      await press("attack");
      // Primeiro ataque ainda com PP.
      const move = hudButtons().find((b) => b.dataset.locked === "false" && b.dataset.option !== "back");
      if (move) { move.emit("click"); await frame(); }
      turns++;
    } else if (!battle.activeBall("p1") && !battle.isGameOver()) {
      const next = p1Rack.balls.find((b) => !b.components.pokeprof.prof.isFainted() && !b.hasAttribute("data-returning"));
      if (next) await drop(next, 0, 4);
    }
    await frame();
  }
  out.matchTurns = turns;
  out.cpuStatesSeen = [...cpuStates];
  out.matchWinner = gameOver?.winner ?? null;
  out.cpuDone = cpuEl.dataset.cpuState;
  out.hudGameOverPage = hud.dataset.page;
  out.hudResult = hud.querySelector(".hud-result")?.getAttribute("value");
  out.gameOverButtons = hudButtons().map((b) => b.dataset.option);
  out.gameOverButtonsSideBySide = new Set(hudButtons().map((b) => +b.object3D.position.y.toFixed(3))).size === 1;
  await press("playagain");
  for (let i = 0; i < 3; i++) await frame();
  out.afterPlayAgain = {
    page: hud.dataset.page,
    cpu: cpuEl.dataset.cpuState,
    gameOver: battle.isGameOver(),
    allHealed: [...p1Rack.balls, ...p2Rack.balls].every((b) => b.components.pokeprof.prof.hp === b.components.pokeprof.prof.maxHp()),
    onField: document.querySelectorAll(".released-pokemon").length,
  };
  // Fim de jogo → Menu: volta para a tela inicial, sem partida.
  battle.result = { winner: "p1", loser: "p2", wait: 0 };
  hud.components["battle-hud"].showGameOver(true);
  await press("menu");
  for (let i = 0; i < 3; i++) await frame();
  out.backToMenu = {
    menu: flow.isMenu(),
    menuVisible: menuEl.object3D.visible,
    screen: menuEl.dataset.screen,
    hudHidden: !hud.object3D.visible,
    cpuIdle: cpuEl.dataset.cpuState,
    gameOverCleared: !battle.isGameOver(),
  };
  // No menu a bola não pode ser pega.
  const lockedBall = p1Rack.balls[0];
  const rigInv2 = rig.object3D.matrixWorld.clone().invert();
  tc.controllers = [{ handedness: "left", hand: {}, profiles: ["generic-hand"] }];
  mode.refresh();
  leftHand.emit("pinchstarted", { position: lockedBall.object3D.getWorldPosition(new THREE.Vector3()).applyMatrix4(rigInv2) });
  out.cantGrabInMenu = !lockedBall.hasAttribute("data-held");
  leftHand.emit("pinchended", {});

  // Mouse (computador): clique na bola pega; arrastar (girar a câmera) não
  // arremessa; clique em qualquer lugar arremessa na direção do ponteiro.
  out.cursorFollowsMouse = cursor.getAttribute("cursor").rayOrigin;
  flow.startMatch("cpu"); await frame();
  const mouseBall = p1Rack.balls[1];
  const mouseStart = mouseBall.object3D.getWorldPosition(new THREE.Vector3());
  mouseBall.emit("click", { cursorEl: cursor }); await frame();
  out.mousePicked = mouseBall.hasAttribute("data-held");
  await wait(5);
  const canvas = scene.canvas;
  const mouse = (type, x, target = canvas) => target.dispatchEvent(new MouseEvent(type, { clientX: x, clientY: 300, bubbles: true }));
  mouse("mousedown", 300); mouse("mouseup", 380, window); mouse("click", 380);
  out.mouseDragKeepsBall = mouseBall.hasAttribute("data-held");
  mouse("mousedown", 300); mouse("mouseup", 301, window); mouse("click", 301);
  out.mouseClickThrows = !mouseBall.hasAttribute("data-held");
  out.mouseBallBackInScene = mouseBall.object3D.parent === scene.object3D;
  for (let i = 0; i < 30; i++) await frame();
  out.mouseThrownMovedM = +mouseBall.object3D.getWorldPosition(new THREE.Vector3()).distanceTo(mouseStart).toFixed(2);
  scene.systems["game-flow"].openMenu(); await frame();
  // No VR o cursor do mouse desliga.
  scene.emit("enter-vr"); await frame();
  out.mouseCursorOffInVr = cursor.getAttribute("raycaster").enabled === false;
  scene.emit("exit-vr"); await frame();
  out.mouseCursorBackAfterVr = cursor.getAttribute("raycaster").enabled === true;
  out.errors = errors;
  report(out);
}
run().catch((e) => report({ fatal: String(e.stack || e), errors }));
