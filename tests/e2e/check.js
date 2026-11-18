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
  for (let i = 0; i < 10; i++) await frame(); step("frames");
  const out = {};
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
  const fieldCard = () => hud.querySelector(".hud-field-card");
  out.hudFieldCardShown = !!fieldCard();
  out.hudFieldCardAbovePanel = fieldCard()
    ? fieldCard().object3D.position.y > hud.querySelector("a-plane").getAttribute("height") / 2
    : false;
  const p1Ball = p1Rack.balls[0];
  p1Ball.emit("raycaster-intersected", { el: cursor }); await frame();
  out.previewHiddenWhileOnField = !p1Ball.components["pokemon-preview"].card.object3D.visible;
  p1Ball.components.pokeprof.damage(25); await frame();
  out.hudFieldCardHp = fieldCard()?.querySelector(".hp-text").getAttribute("value");
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
  // Atributos e vida: card mostra cheio; ataque tira vida do adversário
  // e o card dele mostra a diferença; reset cura.
  const p2Ball = p2Rack.balls[0];
  const p2Card = p2Ball.components["pokemon-preview"].cardView;
  p2Card.refresh(p2Ball.components.pokeprof.prof);
  const hpText = () => p2Card.hpText.getAttribute("value");
  out.cardHpFull = hpText();
  out.cardStats = p2Card.statsText.getAttribute("value");
  await press("attack");
  await press("prova-surpresa");
  out.attackStatus = hud.querySelector(".hud-status").getAttribute("value");
  out.cardHpAfterAttack = hpText();
  out.hpBarScale = +p2Card.hpBar.object3D.scale.x.toFixed(2);
  await press("switch");
  out.switchStatus = hud.querySelector(".hud-status").getAttribute("value");
  out.switchBallReturning = p1Rack.balls[0].hasAttribute("data-returning");
  let peakY = 0;
  for (let i = 0; i < 100; i++) { await frame(); peakY = Math.max(peakY, p1Rack.balls[0].object3D.position.y); }
  out.switchArcPeakY = +peakY.toFixed(2);
  out.switchBallBackInSlotM = +p1Rack.balls[0].object3D.position.distanceTo(p1Rack.slots[0]).toFixed(3);
  out.p1AfterSwitch = pokemonsOf("p1");
  out.hudFieldCardGoneAfterSwitch = !fieldCard();
  await frame();
  out.previewBackAfterSwitch = p1Ball.components["pokemon-preview"].card.object3D.visible;
  p1Ball.emit("raycaster-intersected-cleared", { el: cursor });
  out.p2StillOut = pokemonsOf("p2");
  await drop(p1Rack.balls[2], 0, 4);
  out.p1CanSendAnotherAfterSwitch = pokemonsOf("p1");
  scene.emit("gamereset"); await frame();
  out.cardHpAfterReset = hpText();
  out.errors = errors;
  report(out);
}
run().catch((e) => report({ fatal: String(e.stack || e), errors }));
