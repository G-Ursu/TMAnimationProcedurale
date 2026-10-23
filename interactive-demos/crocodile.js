
"use strict";

const canvas = document.getElementById("simulation");
const ctx = canvas.getContext("2d");
const status = document.getElementById("status");
const resetButton = document.getElementById("reset");

const SIZE = 1000;
const BODY_SPACING = 20;
const BODY_SIZES = [1, 1, 1, 1, 3, 5, 7, 9, 15, 19, 15, 19, 11, 9, 15, 13];
const ARM_LENGTHS = [30, 60];
const FOLLOW = 0.94;
const SPEED = 7;

let state;
let lastTime = 0;
let elapsed = 0;
let hasPointer = false;
let pointer = { x: 500, y: 500 };

const vec = (x, y) => ({ x, y });

function add(a, b) {
  return vec(a.x + b.x, a.y + b.y);
}

function sub(a, b) {
  return vec(a.x - b.x, a.y - b.y);
}

function mul(a, s) {
  return vec(a.x * s, a.y * s);
}

function length(v) {
  return Math.hypot(v.x, v.y);
}

function distance(a, b) {
  return length(sub(a, b));
}

function normalize(v) {
  const len = length(v);
  return len > 1e-6 ? mul(v, 1 / len) : vec(0, 0);
}

function copy(p) {
  return vec(p.x, p.y);
}

// Place point exactly "distance" units from anchor.
function constrainDistance(anchor, point, distance) {
  const delta = sub(point, anchor);
  const len = length(delta);

  if (len < 1e-6) {
    return add(anchor, vec(distance, 0));
  }

  return add(anchor, mul(delta, distance / len));
}

// FABRIK: forward reaching followed by backward reaching.
function fabrik(limb, anchor, target, iterations, lengths) {
  limb[0] = copy(anchor);

  for (let iteration = 0; iteration < iterations; iteration++) {
    // Forward: move the endpoint to its target.
    limb[limb.length - 1] = copy(target);

    for (let i = limb.length - 2; i >= 0; i--) {
      limb[i] = constrainDistance(
        limb[i + 1],
        limb[i],
        lengths[i]
      );
    }

    // Backward: restore the anchored shoulder.
    limb[0] = copy(anchor);

    for (let i = 0; i < limb.length - 1; i++) {
      limb[i + 1] = constrainDistance(
        limb[i],
        limb[i + 1],
        lengths[i]
      );
    }
  }
}

function createArm(head) {
  return [
    copy(head),
    vec(head.x - 30, head.y + 30),
    vec(head.x - 60, head.y + 60)
  ];
}

function reset() {
  const head = vec(500, 500);

  const body = [copy(head)];

  // Initialize the body as a chain behind the head.
  for (let i = 1; i <= BODY_SIZES.length + 1; i++) {
    body.push(vec(500, 500 + BODY_SPACING * i));
  }

  const arm1 = createArm(head);
  const arm2 = createArm(head);

  const target1 = vec(560, 520);
  const target2 = vec(440, 520);

  state = {
    follower1: copy(head),
    follower2: copy(head),
    direction1: vec(0, 0),
    direction2: vec(0, 0),
    body,
    arm1,
    arm2,
    armTarget1: copy(target1),
    armTarget2: copy(target2),
    armSmooth1: copy(target1),
    armSmooth2: copy(target2),
    targetTimer1: 0,
    targetTimer2: 0
  };

  pointer = copy(head);
  hasPointer = false;
  elapsed = 0;
  lastTime = 0;

  status.textContent = "Bougez votre souris ou touchez la simulation pour guider le crocodile.";
  draw();
}

function resizeCanvas() {
  const rect = canvas.getBoundingClientRect();
  if (!rect.width || !rect.height) return;

  const dpr = Math.min(window.devicePixelRatio || 1, 2);

  canvas.width = Math.round(rect.width * dpr);
  canvas.height = Math.round(rect.height * dpr);

  ctx.setTransform(
    canvas.width / SIZE, 0,
    0, canvas.height / SIZE,
    0, 0
  );

  draw();
}

function update(dt) {
  const s = state;
  const target = hasPointer ? pointer : vec(500, 500);

  // First smoothed follower.
  const delta1 = sub(target, s.follower1);
  const dist1 = Math.max(length(delta1), 0.0001);

  s.direction1 = add(
    mul(normalize(delta1), 1 - FOLLOW),
    mul(s.direction1, FOLLOW)
  );

  s.follower1 = add(
    s.follower1,
    mul(s.direction1, SPEED * dt)
  );

  // Second follower tracks the first with additional smoothing.
  const predicted1 = add(
    s.follower1,
    mul(s.direction1, SPEED)
  );

  const delta2 = sub(predicted1, s.follower2);
  const dist2 = Math.max(length(delta2), 0.0001);

  s.direction2 = add(
    mul(normalize(delta2), 1 - FOLLOW),
    mul(s.direction2, FOLLOW)
  );

  s.follower2 = add(
    s.follower2,
    mul(s.direction2, SPEED * dt)
  );

  // The head anchors the body chain.
  s.body[0] = copy(s.follower2);

  for (let i = 0; i < s.body.length - 1; i++) {
    s.body[i + 1] = constrainDistance(
      s.body[i],
      s.body[i + 1],
      BODY_SPACING
    );
  }

  const shoulder = s.body[5];
  const upperBody = s.body[2];
  const bodyA = s.body[4];
  const bodyB = s.body[6];

  // Update arm targets periodically, following the body orientation.
  s.targetTimer1 += dt / 60;
  s.targetTimer2 += dt / 60;

  if (s.targetTimer1 >= 0.12) {
    const d = distance(bodyB, s.armTarget1);

    if (d > 100 || d < 20) {
      s.armTarget1 = add(
        upperBody,
        mul(
          vec(bodyB.y - bodyA.y, bodyA.x - bodyB.x),
          1.5
        )
      );
    }

    s.targetTimer1 = 0;
  }

  if (s.targetTimer2 >= 0.12) {
    const d = distance(bodyB, s.armTarget2);

    if (d > 100 || d < 20) {
      s.armTarget2 = add(
        upperBody,
        mul(
          vec(bodyA.y - bodyB.y, bodyB.x - bodyA.x),
          1.5
        )
      );
    }

    s.targetTimer2 = 0;
  }

  // Smooth arm targets so the arms don't snap.
  const armTargetSpeed = 4 * SPEED * dt;

  for (const [smoothKey, targetKey] of [
    ["armSmooth1", "armTarget1"],
    ["armSmooth2", "armTarget2"]
  ]) {
    const delta = sub(s[targetKey], s[smoothKey]);
    const d = length(delta);

    if (d > armTargetSpeed && d > 0) {
      s[smoothKey] = add(
        s[smoothKey],
        mul(delta, armTargetSpeed / d)
      );
    } else {
      s[smoothKey] = copy(s[targetKey]);
    }
  }

  // Solve both two-segment arms using FABRIK.
  fabrik(s.arm1, shoulder, s.armSmooth1, 3, ARM_LENGTHS);
  fabrik(s.arm2, shoulder, s.armSmooth2, 3, ARM_LENGTHS);
}

function circle(point, radius, color) {
  ctx.beginPath();
  ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
}

function draw() {
  if (!state) return;

  const s = state;

  ctx.clearRect(0, 0, SIZE, SIZE);
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, SIZE, SIZE);

  // Draw the segmented body, from tail to head.
  for (let i = s.body.length - 1; i >= 2; i--) {
    const sizeIndex = Math.min(
      s.body.length - 1 - i,
      BODY_SIZES.length - 1
    );

    const radius = BODY_SIZES[sizeIndex];

    const green = Math.max(0, 255 - 10 * sizeIndex);
    circle(s.body[i], radius, `rgb(0, ${green}, ${green})`);
  }

  // Draw arm segments.
  for (const arm of [s.arm1, s.arm2]) {
    for (let i = 0; i < arm.length - 1; i++) {
      ctx.beginPath();
      ctx.moveTo(arm[i].x, arm[i].y);
      ctx.lineTo(arm[i + 1].x, arm[i + 1].y);
      ctx.strokeStyle = "#00ff00";
      ctx.lineWidth = 8;
      ctx.lineCap = "round";
      ctx.stroke();
    }

    for (let i = arm.length - 1; i >= 0; i--) {
      circle(arm[i], 8, "#00ffff");
    }
  }

  // Pointer and the two followers.
  circle(hasPointer ? pointer : vec(500, 500), 4, "#ff0000");
  circle(s.follower1, 5, "#00ff00");
  circle(s.follower2, 5, "#0000ff");
}

function animate(timestamp) {
  if (!lastTime) lastTime = timestamp;

  const dt = Math.min((timestamp - lastTime) / 16.6667, 2);
  lastTime = timestamp;

  update(dt);
  draw();

  requestAnimationFrame(animate);
}

function updatePointer(event) {
  const rect = canvas.getBoundingClientRect();

  pointer = vec(
    (event.clientX - rect.left) * SIZE / rect.width,
    (event.clientY - rect.top) * SIZE / rect.height
  );

  hasPointer = true;
  status.textContent = "Simulation opérationnelle";
}

canvas.addEventListener("pointerdown", event => {
  canvas.setPointerCapture(event.pointerId);
  updatePointer(event);
});

canvas.addEventListener("pointermove", event => {
  if (event.pointerType === "mouse" || event.buttons > 0) {
    updatePointer(event);
  }
});

canvas.addEventListener("pointerup", () => {
  status.textContent = "Bougez votre souris ou touchez la simulation pour guider le crocodile.";
});

resetButton.addEventListener("click", reset);

window.addEventListener("resize", resizeCanvas);

reset();
resizeCanvas();
requestAnimationFrame(animate);
