(() => {
  const CANVAS_WIDTH = 1280;
  const CANVAS_HEIGHT = 760;

  const TABLE = {
    width: 1072,
    height: 528,
    rail: 76,
    frameTopY: -10,
    frameBottomY: -72,
  };

  const CAMERA = {
    position: { x: 0, y: 860, z: -1120 },
    target: { x: 0, y: 46, z: 36 },
    fovRadians: (38 * Math.PI) / 180,
    screenX: CANVAS_WIDTH * 0.5,
    screenY: CANVAS_HEIGHT * 0.57,
  };

  const BALL_RADIUS = 12;
  const BALL_DIAMETER = BALL_RADIUS * 2;
  const BALL_MASS = 1;
  const POCKET_RADIUS_CORNER = 31;
  const POCKET_RADIUS_SIDE = 26;
  const MAX_SHOT_SPEED = 920;
  const MIN_SHOT_SPEED = 140;
  const STOP_SPEED = 5;
  const FRICTION = 122;
  const BALL_RESTITUTION = 0.98;
  const RAIL_RESTITUTION = 0.88;
  const PHYSICS_STEP = 1 / 120;
  const CPU_THINK_TIME_MS = 1150;
  const SURFACE_Y = 0;
  const BALL_CENTER_Y = BALL_RADIUS;

  const BALL_COLORS = {
    1: "#f5d44a",
    2: "#3057dd",
    3: "#cf3336",
    4: "#6b35c8",
    5: "#ff8b2f",
    6: "#2c9a56",
    7: "#7a2331",
    8: "#181818",
    9: "#f5d44a",
    10: "#3057dd",
    11: "#cf3336",
    12: "#6b35c8",
    13: "#ff8b2f",
    14: "#2c9a56",
    15: "#7a2331",
  };

  const BALL_RGB = Object.fromEntries(
    Object.entries(BALL_COLORS).map(([number, hex]) => [number, hexToRgb(hex)])
  );

  const POCKETS = [
    { x: 0, y: 0, radius: POCKET_RADIUS_CORNER },
    { x: TABLE.width / 2, y: 0, radius: POCKET_RADIUS_SIDE },
    { x: TABLE.width, y: 0, radius: POCKET_RADIUS_CORNER },
    { x: 0, y: TABLE.height, radius: POCKET_RADIUS_CORNER },
    { x: TABLE.width / 2, y: TABLE.height, radius: POCKET_RADIUS_SIDE },
    { x: TABLE.width, y: TABLE.height, radius: POCKET_RADIUS_CORNER },
  ];

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function lerp(start, end, amount) {
    return start + (end - start) * amount;
  }

  function distance(x1, y1, x2, y2) {
    return Math.hypot(x2 - x1, y2 - y1);
  }

  function normalize(x, y) {
    const magnitude = Math.hypot(x, y) || 1;
    return { x: x / magnitude, y: y / magnitude };
  }

  function normalize3(vector) {
    const magnitude = Math.hypot(vector.x, vector.y, vector.z) || 1;
    return {
      x: vector.x / magnitude,
      y: vector.y / magnitude,
      z: vector.z / magnitude,
    };
  }

  function dot3(a, b) {
    return a.x * b.x + a.y * b.y + a.z * b.z;
  }

  function cross3(a, b) {
    return {
      x: a.y * b.z - a.z * b.y,
      y: a.z * b.x - a.x * b.z,
      z: a.x * b.y - a.y * b.x,
    };
  }

  function subtract3(a, b) {
    return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
  }

  function add3(a, b) {
    return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
  }

  function scale3(vector, scalar) {
    return { x: vector.x * scalar, y: vector.y * scalar, z: vector.z * scalar };
  }

  function angleBetween(ax, ay, bx, by) {
    const aMagnitude = Math.hypot(ax, ay) || 1;
    const bMagnitude = Math.hypot(bx, by) || 1;
    const dot = clamp((ax * bx + ay * by) / (aMagnitude * bMagnitude), -1, 1);
    return Math.acos(dot);
  }

  function randomBetween(min, max) {
    return min + Math.random() * (max - min);
  }

  function hexToRgb(hex) {
    const value = Number.parseInt(hex.replace("#", ""), 16);
    return {
      r: (value >> 16) & 255,
      g: (value >> 8) & 255,
      b: value & 255,
    };
  }

  function matrixMultiply(a, b) {
    return [
      a[0] * b[0] + a[1] * b[3] + a[2] * b[6],
      a[0] * b[1] + a[1] * b[4] + a[2] * b[7],
      a[0] * b[2] + a[1] * b[5] + a[2] * b[8],
      a[3] * b[0] + a[4] * b[3] + a[5] * b[6],
      a[3] * b[1] + a[4] * b[4] + a[5] * b[7],
      a[3] * b[2] + a[4] * b[5] + a[5] * b[8],
      a[6] * b[0] + a[7] * b[3] + a[8] * b[6],
      a[6] * b[1] + a[7] * b[4] + a[8] * b[7],
      a[6] * b[2] + a[7] * b[5] + a[8] * b[8],
    ];
  }

  function matrixVectorMultiply(matrix, vector) {
    return {
      x: matrix[0] * vector.x + matrix[1] * vector.y + matrix[2] * vector.z,
      y: matrix[3] * vector.x + matrix[4] * vector.y + matrix[5] * vector.z,
      z: matrix[6] * vector.x + matrix[7] * vector.y + matrix[8] * vector.z,
    };
  }

  function transposeMatrix(matrix) {
    return [
      matrix[0],
      matrix[3],
      matrix[6],
      matrix[1],
      matrix[4],
      matrix[7],
      matrix[2],
      matrix[5],
      matrix[8],
    ];
  }

  function rotationAroundX(angle) {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    return [
      1, 0, 0,
      0, cos, -sin,
      0, sin, cos,
    ];
  }

  function rotationAroundZ(angle) {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    return [
      cos, -sin, 0,
      sin, cos, 0,
      0, 0, 1,
    ];
  }

  class PoolGame {
    constructor() {
      this.canvas = document.getElementById("gameCanvas");
      this.ctx = this.canvas.getContext("2d");
      this.camera = this.createCamera();

      this.ballBuffer = document.createElement("canvas");
      this.ballBufferCtx = this.ballBuffer.getContext("2d");

      this.ui = {
        newGameBtn: document.getElementById("newGameBtn"),
        turnLabel: document.getElementById("turnLabel"),
        statusLabel: document.getElementById("statusLabel"),
        playerGroupLabel: document.getElementById("playerGroupLabel"),
        cpuGroupLabel: document.getElementById("cpuGroupLabel"),
        playerCountLabel: document.getElementById("playerCountLabel"),
        cpuCountLabel: document.getElementById("cpuCountLabel"),
        powerFill: document.getElementById("powerFill"),
        eventLog: document.getElementById("eventLog"),
      };

      this.pointer = {
        screenX: CANVAS_WIDTH * 0.5,
        screenY: CANVAS_HEIGHT * 0.5,
        tableX: TABLE.width * 0.25,
        tableY: TABLE.height * 0.5,
        tableValid: true,
        inside: false,
      };

      this.dragShot = null;
      this.eventLogEntries = [];
      this.balls = [];
      this.currentPlayer = "player";
      this.playerGroup = null;
      this.cpuGroup = null;
      this.statusText = "";
      this.state = "idle";
      this.winner = null;
      this.ballInHand = null;
      this.placementPreview = null;
      this.activeShot = null;
      this.cpuShotAt = 0;
      this.idleTimer = 0;
      this.lastTimestamp = 0;

      this.bindEvents();
      this.resetGame();
      requestAnimationFrame((timestamp) => this.animate(timestamp));
    }

    createCamera() {
      const forward = normalize3(subtract3(CAMERA.target, CAMERA.position));
      const right = normalize3(cross3(forward, { x: 0, y: 1, z: 0 }));
      const up = normalize3(cross3(right, forward));
      const rotation = [
        right.x, right.y, right.z,
        up.x, up.y, up.z,
        forward.x, forward.y, forward.z,
      ];

      return {
        ...CAMERA,
        right,
        up,
        forward,
        rotation,
        focalLength: (CANVAS_HEIGHT * 0.5) / Math.tan(CAMERA.fovRadians * 0.5),
      };
    }

    bindEvents() {
      this.ui.newGameBtn.addEventListener("click", () => this.resetGame());

      this.canvas.addEventListener("pointermove", (event) =>
        this.handlePointerMove(event)
      );
      this.canvas.addEventListener("pointerdown", (event) =>
        this.handlePointerDown(event)
      );
      this.canvas.addEventListener("pointerleave", () => {
        this.pointer.inside = false;
      });
      window.addEventListener("pointerup", (event) =>
        this.handlePointerUp(event)
      );
    }

    resetGame() {
      this.balls = this.createRack();
      this.currentPlayer = "player";
      this.playerGroup = null;
      this.cpuGroup = null;
      this.ballInHand = null;
      this.placementPreview = null;
      this.dragShot = null;
      this.activeShot = null;
      this.state = "aim";
      this.winner = null;
      this.statusText = "Break the rack. Drag backward from the cue ball.";
      this.cpuShotAt = 0;
      this.idleTimer = 0;
      this.eventLogEntries = [];
      this.addLog("New rack. You break.");
      this.syncHud();
    }

    createRack() {
      const balls = [];
      balls.push(
        this.createBall(0, TABLE.width * 0.22, TABLE.height * 0.5)
      );

      const rackApexX = TABLE.width * 0.72;
      const rackCenterY = TABLE.height * 0.5;
      const rackOrder = [1, 10, 3, 12, 8, 5, 14, 2, 15, 4, 13, 6, 9, 7, 11];
      const horizontalStep = BALL_DIAMETER * 0.87;

      let rackIndex = 0;
      for (let row = 0; row < 5; row += 1) {
        for (let slot = 0; slot <= row; slot += 1) {
          const x = rackApexX + row * horizontalStep;
          const y = rackCenterY - row * BALL_RADIUS + slot * BALL_DIAMETER;
          balls.push(this.createBall(rackOrder[rackIndex], x, y));
          rackIndex += 1;
        }
      }

      return balls;
    }

    createBall(number, x, y) {
      return {
        number,
        x,
        y,
        vx: 0,
        vy: 0,
        radius: BALL_RADIUS,
        pocketed: false,
        rotX: randomBetween(-0.6, 0.6),
        rotZ: randomBetween(-0.6, 0.6),
      };
    }

    animate(timestamp) {
      if (!this.lastTimestamp) {
        this.lastTimestamp = timestamp;
      }

      const deltaSeconds = Math.min((timestamp - this.lastTimestamp) / 1000, 0.033);
      this.lastTimestamp = timestamp;

      this.update(deltaSeconds, timestamp);
      this.render();

      requestAnimationFrame((nextTimestamp) => this.animate(nextTimestamp));
    }

    update(deltaSeconds, timestamp) {
      if (this.state === "balls-moving") {
        let timeLeft = deltaSeconds;
        while (timeLeft > 0) {
          const step = Math.min(PHYSICS_STEP, timeLeft);
          this.stepPhysics(step);
          timeLeft -= step;
        }

        if (this.areBallsStill()) {
          this.idleTimer += deltaSeconds;
          if (this.idleTimer > 0.15) {
            this.finishShot();
          }
        } else {
          this.idleTimer = 0;
        }
      }

      if (this.state === "cpu-thinking" && timestamp >= this.cpuShotAt) {
        this.takeCpuTurn();
      }

      if (this.state === "placing-cue-ball" && this.pointer.tableValid) {
        const clamped = this.clampPointToTable(this.pointer.tableX, this.pointer.tableY);
        this.placementPreview = {
          x: clamped.x,
          y: clamped.y,
          valid: this.isCuePlacementValid(clamped.x, clamped.y),
        };
      }

      this.syncHud();
    }

    stepPhysics(deltaSeconds) {
      for (const ball of this.balls) {
        if (ball.pocketed) {
          continue;
        }

        const previousX = ball.x;
        const previousY = ball.y;
        ball.x += ball.vx * deltaSeconds;
        ball.y += ball.vy * deltaSeconds;
        ball.rotX += (ball.y - previousY) / BALL_RADIUS;
        ball.rotZ -= (ball.x - previousX) / BALL_RADIUS;
      }

      for (const ball of this.balls) {
        if (ball.pocketed) {
          continue;
        }

        if (this.checkPocket(ball)) {
          continue;
        }

        this.resolveRailCollision(ball);
      }

      for (let i = 0; i < this.balls.length; i += 1) {
        const firstBall = this.balls[i];
        if (firstBall.pocketed) {
          continue;
        }

        for (let j = i + 1; j < this.balls.length; j += 1) {
          const secondBall = this.balls[j];
          if (secondBall.pocketed) {
            continue;
          }

          this.resolveBallCollision(firstBall, secondBall);
        }
      }

      for (const ball of this.balls) {
        if (ball.pocketed) {
          continue;
        }

        if (this.checkPocket(ball)) {
          continue;
        }

        const speed = Math.hypot(ball.vx, ball.vy);
        if (speed <= 0) {
          continue;
        }

        const reduced = Math.max(0, speed - FRICTION * deltaSeconds);
        if (reduced === 0) {
          ball.vx = 0;
          ball.vy = 0;
          continue;
        }

        const factor = reduced / speed;
        ball.vx *= factor;
        ball.vy *= factor;

        if (Math.hypot(ball.vx, ball.vy) < STOP_SPEED) {
          ball.vx = 0;
          ball.vy = 0;
        }
      }
    }

    checkPocket(ball) {
      for (const pocket of POCKETS) {
        if (distance(ball.x, ball.y, pocket.x, pocket.y) <= pocket.radius) {
          this.pocketBall(ball);
          return true;
        }
      }

      return false;
    }

    pocketBall(ball) {
      ball.pocketed = true;
      ball.vx = 0;
      ball.vy = 0;

      if (this.activeShot) {
        this.activeShot.pocketed.push(ball.number);
        if (ball.number === 0) {
          this.activeShot.cueBallPocketed = true;
        }
      }
    }

    resolveRailCollision(ball) {
      const minX = BALL_RADIUS;
      const maxX = TABLE.width - BALL_RADIUS;
      const minY = BALL_RADIUS;
      const maxY = TABLE.height - BALL_RADIUS;

      let touchedRail = false;

      if (ball.x < minX) {
        ball.x = minX;
        ball.vx = Math.abs(ball.vx) * RAIL_RESTITUTION;
        touchedRail = true;
      } else if (ball.x > maxX) {
        ball.x = maxX;
        ball.vx = -Math.abs(ball.vx) * RAIL_RESTITUTION;
        touchedRail = true;
      }

      if (ball.y < minY) {
        ball.y = minY;
        ball.vy = Math.abs(ball.vy) * RAIL_RESTITUTION;
        touchedRail = true;
      } else if (ball.y > maxY) {
        ball.y = maxY;
        ball.vy = -Math.abs(ball.vy) * RAIL_RESTITUTION;
        touchedRail = true;
      }

      if (touchedRail && this.activeShot) {
        this.activeShot.anyRail = true;
      }
    }

    resolveBallCollision(firstBall, secondBall) {
      const dx = secondBall.x - firstBall.x;
      const dy = secondBall.y - firstBall.y;
      const distanceBetweenCenters = Math.hypot(dx, dy);
      const minimumDistance = firstBall.radius + secondBall.radius;

      if (distanceBetweenCenters === 0 || distanceBetweenCenters >= minimumDistance) {
        return;
      }

      const normalX = dx / distanceBetweenCenters;
      const normalY = dy / distanceBetweenCenters;
      const overlap = minimumDistance - distanceBetweenCenters;

      firstBall.x -= normalX * overlap * 0.5;
      firstBall.y -= normalY * overlap * 0.5;
      secondBall.x += normalX * overlap * 0.5;
      secondBall.y += normalY * overlap * 0.5;

      const relativeVelocityX = secondBall.vx - firstBall.vx;
      const relativeVelocityY = secondBall.vy - firstBall.vy;
      const speedAlongNormal = relativeVelocityX * normalX + relativeVelocityY * normalY;

      if (speedAlongNormal > 0) {
        return;
      }

      if (
        this.activeShot &&
        !this.activeShot.firstHit &&
        (firstBall.number === 0 || secondBall.number === 0)
      ) {
        const objectBall = firstBall.number === 0 ? secondBall : firstBall;
        this.activeShot.firstHit = objectBall.number;
      }

      const impulse = (-(1 + BALL_RESTITUTION) * speedAlongNormal) / (2 / BALL_MASS);
      const impulseX = impulse * normalX;
      const impulseY = impulse * normalY;

      firstBall.vx -= impulseX / BALL_MASS;
      firstBall.vy -= impulseY / BALL_MASS;
      secondBall.vx += impulseX / BALL_MASS;
      secondBall.vy += impulseY / BALL_MASS;
    }

    areBallsStill() {
      return this.balls.every((ball) => {
        if (ball.pocketed) {
          return true;
        }

        return Math.hypot(ball.vx, ball.vy) < STOP_SPEED;
      });
    }

    finishShot() {
      const shot = this.activeShot;
      this.activeShot = null;
      this.idleTimer = 0;

      if (!shot || this.winner) {
        this.prepareNextTurn();
        return;
      }

      const shooter = shot.shooter;
      const opponent = shooter === "player" ? "cpu" : "player";
      const legalTargets = this.getLegalTargetsFor(shooter);
      const pocketed = shot.pocketed.filter((number) => number !== 0);
      const firstGroupPocketed = pocketed.find((number) => number !== 8);

      let foul = false;
      let foulReason = "";

      if (!shot.firstHit) {
        foul = true;
        foulReason = "No object ball was struck.";
      } else if (!legalTargets.includes(shot.firstHit)) {
        foul = true;
        foulReason = "Wrong first contact.";
      } else if (shot.cueBallPocketed) {
        foul = true;
        foulReason = "Scratch.";
      }

      const eightBallPocketed = pocketed.includes(8);
      if (eightBallPocketed) {
        const readyForEight = this.isOnFinalBlack(shooter);
        if (!readyForEight || foul) {
          this.endGame(
            opponent,
            `${this.nameFor(opponent)} wins. ${this.nameFor(shooter)} lost on the 8-ball.`
          );
          return;
        }

        this.endGame(shooter, `${this.nameFor(shooter)} sinks the 8-ball for the win.`);
        return;
      }

      if (!this.playerGroup && !this.cpuGroup && !foul && firstGroupPocketed) {
        const assignedGroup = this.groupForBall(firstGroupPocketed);
        this.assignGroups(shooter, assignedGroup);
        this.addLog(
          `${this.nameFor(shooter)} claims ${this.labelForGroup(assignedGroup).toLowerCase()}.`
        );
      }

      let keepsTurn = false;

      if (!foul) {
        if (this.playerGroup && this.cpuGroup) {
          const shooterGroup = this.groupForPlayer(shooter);
          keepsTurn = pocketed.some(
            (number) => this.groupForBall(number) === shooterGroup
          );
        } else {
          keepsTurn = pocketed.some((number) => number !== 8);
        }
      }

      if (pocketed.length > 0) {
        this.addLog(`${this.nameFor(shooter)} pockets ${pocketed.join(", ")}.`);
      }

      if (foul) {
        this.addLog(`${this.nameFor(shooter)} fouls. ${foulReason}`);
        this.statusText = `${this.nameFor(shooter)} fouled. ${this.nameFor(opponent)} has ball in hand.`;
        this.currentPlayer = opponent;
        this.ballInHand = opponent;
      } else if (keepsTurn) {
        this.currentPlayer = shooter;
        this.ballInHand = null;
        this.statusText = `${this.nameFor(shooter)} stays at the table.`;
      } else {
        this.currentPlayer = opponent;
        this.ballInHand = null;
        this.statusText = `${this.nameFor(opponent)} to shoot.`;
      }

      if (shot.cueBallPocketed) {
        this.getCueBall().pocketed = true;
      }

      this.prepareNextTurn();
    }

    prepareNextTurn() {
      if (this.winner) {
        this.state = "game-over";
        return;
      }

      if (this.ballInHand === "player") {
        this.state = "placing-cue-ball";
        this.placementPreview = this.findDefaultPlayerPlacement();
        this.statusText = "Ball in hand. Click an open spot to place the cue ball.";
        return;
      }

      if (this.ballInHand === "cpu") {
        const placement = this.findBestCpuPlacement();
        this.placeCueBall(placement.x, placement.y);
        this.ballInHand = null;
        this.addLog("CPU takes ball in hand.");
      }

      if (this.currentPlayer === "cpu") {
        this.state = "cpu-thinking";
        this.cpuShotAt = performance.now() + CPU_THINK_TIME_MS;
        this.statusText = "CPU is studying the table.";
      } else {
        this.state = "aim";
        this.statusText = "Your turn. Drag backward from the cue ball to shoot.";
      }
    }

    endGame(winner, message) {
      this.winner = winner;
      this.currentPlayer = winner;
      this.state = "game-over";
      this.statusText = message;
      this.addLog(message);
    }

    groupForBall(number) {
      if (number >= 1 && number <= 7) {
        return "solids";
      }

      if (number >= 9 && number <= 15) {
        return "stripes";
      }

      return null;
    }

    labelForGroup(group) {
      if (group === "solids") {
        return "Solids";
      }

      if (group === "stripes") {
        return "Stripes";
      }

      return "Open Table";
    }

    groupForPlayer(player) {
      return player === "player" ? this.playerGroup : this.cpuGroup;
    }

    assignGroups(player, group) {
      if (player === "player") {
        this.playerGroup = group;
        this.cpuGroup = group === "solids" ? "stripes" : "solids";
      } else {
        this.cpuGroup = group;
        this.playerGroup = group === "solids" ? "stripes" : "solids";
      }
    }

    remainingBallsForGroup(group) {
      return this.balls.filter(
        (ball) => !ball.pocketed && this.groupForBall(ball.number) === group
      ).length;
    }

    isOnFinalBlack(player) {
      const group = this.groupForPlayer(player);
      if (!group) {
        return false;
      }

      return this.remainingBallsForGroup(group) === 0;
    }

    getLegalTargetsFor(player) {
      const group = this.groupForPlayer(player);
      if (!group) {
        return this.balls
          .filter((ball) => !ball.pocketed && ball.number >= 1 && ball.number <= 15 && ball.number !== 8)
          .map((ball) => ball.number);
      }

      if (this.remainingBallsForGroup(group) === 0) {
        return [8];
      }

      return this.balls
        .filter((ball) => !ball.pocketed && this.groupForBall(ball.number) === group)
        .map((ball) => ball.number);
    }

    nameFor(player) {
      return player === "player" ? "You" : "CPU";
    }

    takeCpuTurn() {
      if (this.state !== "cpu-thinking" || this.winner) {
        return;
      }

      if (this.getCueBall().pocketed) {
        const placement = this.findBestCpuPlacement();
        this.placeCueBall(placement.x, placement.y);
      }

      const choice = this.chooseCpuShot();
      const accuracy = clamp(choice.confidence, 0.1, 1);
      const angle = Math.atan2(choice.vector.y, choice.vector.x);
      const aimError = lerp(0.075, 0.008, accuracy);
      const finalAngle = angle + randomBetween(-aimError, aimError);
      const direction = { x: Math.cos(finalAngle), y: Math.sin(finalAngle) };
      const finalPower = clamp(
        choice.power * randomBetween(0.94, 1.04),
        MIN_SHOT_SPEED,
        MAX_SHOT_SPEED
      );

      this.shoot("cpu", direction, finalPower);
      this.statusText = `CPU shoots ${choice.label}.`;
      this.addLog(`CPU shoots ${choice.label.toLowerCase()}.`);
    }

    chooseCpuShot() {
      const cueBall = this.getCueBall();
      const legalTargets = this.getLegalTargetsFor("cpu");
      const targetBalls = this.balls.filter(
        (ball) => !ball.pocketed && legalTargets.includes(ball.number)
      );

      const pottingOptions = [];

      for (const targetBall of targetBalls) {
        for (const pocket of POCKETS) {
          const toPocket = normalize(pocket.x - targetBall.x, pocket.y - targetBall.y);
          const ghostX = targetBall.x - toPocket.x * BALL_DIAMETER;
          const ghostY = targetBall.y - toPocket.y * BALL_DIAMETER;

          if (!this.isPointInsidePlayableArea(ghostX, ghostY, BALL_RADIUS + 2)) {
            continue;
          }

          const cuePathClear = this.isSegmentClear(
            cueBall.x,
            cueBall.y,
            ghostX,
            ghostY,
            [0, targetBall.number],
            BALL_DIAMETER * 0.95
          );

          const objectPathClear = this.isSegmentClear(
            targetBall.x,
            targetBall.y,
            pocket.x,
            pocket.y,
            [targetBall.number],
            BALL_DIAMETER * 0.95
          );

          if (!cuePathClear || !objectPathClear) {
            continue;
          }

          const cueDistance = distance(cueBall.x, cueBall.y, ghostX, ghostY);
          const pocketDistance = distance(targetBall.x, targetBall.y, pocket.x, pocket.y);
          const cutAngle = angleBetween(
            targetBall.x - cueBall.x,
            targetBall.y - cueBall.y,
            pocket.x - targetBall.x,
            pocket.y - targetBall.y
          );

          const confidence = clamp(
            1.08 - cueDistance / 620 - pocketDistance / 740 - cutAngle / Math.PI,
            0.1,
            1
          );

          pottingOptions.push({
            vector: normalize(ghostX - cueBall.x, ghostY - cueBall.y),
            power: clamp(260 + cueDistance * 0.82 + pocketDistance * 0.28, 240, 760),
            confidence,
            score: confidence * 1000 - cueDistance * 0.35 - pocketDistance * 0.42,
            label: `for the ${targetBall.number} toward a pocket`,
          });
        }
      }

      if (pottingOptions.length > 0) {
        pottingOptions.sort((first, second) => second.score - first.score);
        return pottingOptions[0];
      }

      const directHit = this.chooseCpuFallbackShot(targetBalls, cueBall);
      if (directHit) {
        return directHit;
      }

      const clusterCenter = this.findRackCenter();
      return {
        vector: normalize(clusterCenter.x - cueBall.x, clusterCenter.y - cueBall.y),
        power: 720,
        confidence: 0.25,
        label: "into the heart of the rack",
      };
    }

    chooseCpuFallbackShot(targetBalls, cueBall) {
      let bestShot = null;

      for (const targetBall of targetBalls) {
        const clear = this.isSegmentClear(
          cueBall.x,
          cueBall.y,
          targetBall.x,
          targetBall.y,
          [0, targetBall.number],
          BALL_DIAMETER * 0.92
        );

        if (!clear) {
          continue;
        }

        const distanceToBall = distance(cueBall.x, cueBall.y, targetBall.x, targetBall.y);
        const confidence = clamp(0.78 - distanceToBall / 900, 0.2, 0.75);
        const shot = {
          vector: normalize(targetBall.x - cueBall.x, targetBall.y - cueBall.y),
          power: clamp(260 + distanceToBall * 0.6, 250, 640),
          confidence,
          score: confidence * 100 - distanceToBall * 0.18,
          label: `at the ${targetBall.number}`,
        };

        if (!bestShot || shot.score > bestShot.score) {
          bestShot = shot;
        }
      }

      return bestShot;
    }

    findRackCenter() {
      const liveBalls = this.balls.filter((ball) => !ball.pocketed && ball.number !== 0);
      if (liveBalls.length === 0) {
        return { x: TABLE.width * 0.5, y: TABLE.height * 0.5 };
      }

      const total = liveBalls.reduce(
        (sum, ball) => {
          sum.x += ball.x;
          sum.y += ball.y;
          return sum;
        },
        { x: 0, y: 0 }
      );

      return {
        x: total.x / liveBalls.length,
        y: total.y / liveBalls.length,
      };
    }

    isSegmentClear(x1, y1, x2, y2, ignoredNumbers, margin) {
      const segmentLength = distance(x1, y1, x2, y2);
      if (segmentLength < 1) {
        return true;
      }

      for (const ball of this.balls) {
        if (ball.pocketed || ignoredNumbers.includes(ball.number)) {
          continue;
        }

        if (
          this.distancePointToSegment(ball.x, ball.y, x1, y1, x2, y2) < margin
        ) {
          return false;
        }
      }

      return true;
    }

    distancePointToSegment(px, py, x1, y1, x2, y2) {
      const segmentX = x2 - x1;
      const segmentY = y2 - y1;
      const segmentLengthSquared = segmentX * segmentX + segmentY * segmentY;

      if (segmentLengthSquared === 0) {
        return distance(px, py, x1, y1);
      }

      let t =
        ((px - x1) * segmentX + (py - y1) * segmentY) / segmentLengthSquared;
      t = clamp(t, 0, 1);

      return distance(px, py, x1 + segmentX * t, y1 + segmentY * t);
    }

    shoot(shooter, direction, power) {
      const cueBall = this.getCueBall();
      cueBall.pocketed = false;
      cueBall.vx = direction.x * power;
      cueBall.vy = direction.y * power;
      this.dragShot = null;
      this.state = "balls-moving";
      this.activeShot = {
        shooter,
        firstHit: null,
        pocketed: [],
        cueBallPocketed: false,
        anyRail: false,
      };
    }

    getCueBall() {
      return this.balls[0];
    }

    handlePointerMove(event) {
      const point = this.getPointerPosition(event);
      const tablePoint = this.screenToTable(point.x, point.y);

      this.pointer.screenX = point.x;
      this.pointer.screenY = point.y;
      this.pointer.inside = true;
      this.pointer.tableValid = Boolean(tablePoint);

      if (tablePoint) {
        this.pointer.tableX = tablePoint.x;
        this.pointer.tableY = tablePoint.y;
      }

      if (this.dragShot && tablePoint) {
        this.dragShot.currentTableX = tablePoint.x;
        this.dragShot.currentTableY = tablePoint.y;
      }
    }

    handlePointerDown(event) {
      const point = this.getPointerPosition(event);
      const tablePoint = this.screenToTable(point.x, point.y);

      this.pointer.screenX = point.x;
      this.pointer.screenY = point.y;
      this.pointer.inside = true;
      this.pointer.tableValid = Boolean(tablePoint);

      if (tablePoint) {
        this.pointer.tableX = tablePoint.x;
        this.pointer.tableY = tablePoint.y;
      }

      if (this.state === "placing-cue-ball") {
        if (this.currentPlayer !== "player" || !tablePoint) {
          return;
        }

        const clamped = this.clampPointToTable(tablePoint.x, tablePoint.y);
        if (this.isCuePlacementValid(clamped.x, clamped.y)) {
          this.placeCueBall(clamped.x, clamped.y);
          this.ballInHand = null;
          this.state = "aim";
          this.statusText = "Cue ball placed. Take your shot.";
          this.addLog("You place the cue ball.");
        } else {
          this.statusText = "That placement is blocked. Pick a clearer lane.";
        }
        return;
      }

      if (this.state !== "aim" || this.currentPlayer !== "player" || this.winner) {
        return;
      }

      const cueBall = this.getCueBall();
      if (cueBall.pocketed || !this.areBallsStill()) {
        return;
      }

      const cueProjection = this.projectBall(cueBall);
      if (!cueProjection) {
        return;
      }

      if (distance(point.x, point.y, cueProjection.x, cueProjection.y) <= cueProjection.radius * 1.9) {
        this.dragShot = {
          currentTableX: tablePoint ? tablePoint.x : cueBall.x,
          currentTableY: tablePoint ? tablePoint.y : cueBall.y,
        };
      }
    }

    handlePointerUp(event) {
      if (!this.dragShot || this.state !== "aim" || this.currentPlayer !== "player") {
        return;
      }

      const point = this.getPointerPosition(event);
      const tablePoint = this.screenToTable(point.x, point.y);
      if (tablePoint) {
        this.dragShot.currentTableX = tablePoint.x;
        this.dragShot.currentTableY = tablePoint.y;
      }

      const cueBall = this.getCueBall();
      const shotVectorX = cueBall.x - this.dragShot.currentTableX;
      const shotVectorY = cueBall.y - this.dragShot.currentTableY;
      const pullDistance = Math.hypot(shotVectorX, shotVectorY);

      if (pullDistance >= 14) {
        const direction = normalize(shotVectorX, shotVectorY);
        const power = clamp(pullDistance * 5.2, MIN_SHOT_SPEED, MAX_SHOT_SPEED);
        this.shoot("player", direction, power);
        this.statusText = "Balls in motion.";
      }

      this.dragShot = null;
    }

    getPointerPosition(event) {
      const rect = this.canvas.getBoundingClientRect();
      return {
        x: ((event.clientX - rect.left) / rect.width) * this.canvas.width,
        y: ((event.clientY - rect.top) / rect.height) * this.canvas.height,
      };
    }

    screenToTable(screenX, screenY) {
      const camera = this.camera;
      const cameraX = (screenX - camera.screenX) / camera.focalLength;
      const cameraY = -(screenY - camera.screenY) / camera.focalLength;
      const rayCamera = normalize3({ x: cameraX, y: cameraY, z: 1 });
      const rayWorld = {
        x: camera.right.x * rayCamera.x + camera.up.x * rayCamera.y + camera.forward.x * rayCamera.z,
        y: camera.right.y * rayCamera.x + camera.up.y * rayCamera.y + camera.forward.y * rayCamera.z,
        z: camera.right.z * rayCamera.x + camera.up.z * rayCamera.y + camera.forward.z * rayCamera.z,
      };

      if (Math.abs(rayWorld.y) < 0.0001) {
        return null;
      }

      const t = (SURFACE_Y - camera.position.y) / rayWorld.y;
      if (t <= 0) {
        return null;
      }

      const hitPoint = add3(camera.position, scale3(rayWorld, t));
      return {
        x: hitPoint.x + TABLE.width * 0.5,
        y: hitPoint.z + TABLE.height * 0.5,
      };
    }

    clampPointToTable(x, y) {
      return {
        x: clamp(x, BALL_RADIUS, TABLE.width - BALL_RADIUS),
        y: clamp(y, BALL_RADIUS, TABLE.height - BALL_RADIUS),
      };
    }

    isPointInsidePlayableArea(x, y, padding) {
      return (
        x >= padding &&
        x <= TABLE.width - padding &&
        y >= padding &&
        y <= TABLE.height - padding
      );
    }

    isCuePlacementValid(x, y) {
      if (!this.isPointInsidePlayableArea(x, y, BALL_RADIUS)) {
        return false;
      }

      for (const pocket of POCKETS) {
        if (distance(x, y, pocket.x, pocket.y) < pocket.radius + BALL_RADIUS + 8) {
          return false;
        }
      }

      for (const ball of this.balls) {
        if (ball.number === 0 || ball.pocketed) {
          continue;
        }

        if (distance(x, y, ball.x, ball.y) < BALL_DIAMETER + 1.5) {
          return false;
        }
      }

      return true;
    }

    placeCueBall(x, y) {
      const cueBall = this.getCueBall();
      cueBall.pocketed = false;
      cueBall.x = x;
      cueBall.y = y;
      cueBall.vx = 0;
      cueBall.vy = 0;
      this.placementPreview = null;
    }

    findDefaultPlayerPlacement() {
      const placement = this.findAnyValidPlacement(TABLE.width * 0.25, TABLE.height * 0.5);
      return {
        x: placement.x,
        y: placement.y,
        valid: this.isCuePlacementValid(placement.x, placement.y),
      };
    }

    findBestCpuPlacement() {
      const legalTargets = this.getLegalTargetsFor("cpu");
      const candidateTargets = this.balls.filter(
        (ball) => !ball.pocketed && legalTargets.includes(ball.number)
      );

      let best = null;

      for (let x = 110; x <= TABLE.width * 0.48; x += 28) {
        for (let y = 46; y <= TABLE.height - 46; y += 22) {
          if (!this.isCuePlacementValid(x, y)) {
            continue;
          }

          let score = -Infinity;

          for (const target of candidateTargets) {
            if (
              !this.isSegmentClear(
                x,
                y,
                target.x,
                target.y,
                [0, target.number],
                BALL_DIAMETER * 0.92
              )
            ) {
              continue;
            }

            score = Math.max(score, 800 - distance(x, y, target.x, target.y));
          }

          if (score === -Infinity) {
            score = 100 - distance(x, y, TABLE.width * 0.28, TABLE.height * 0.5);
          }

          if (!best || score > best.score) {
            best = { x, y, score };
          }
        }
      }

      if (best) {
        return best;
      }

      return this.findAnyValidPlacement(TABLE.width * 0.25, TABLE.height * 0.5);
    }

    findAnyValidPlacement(preferredX, preferredY) {
      const preferred = this.clampPointToTable(preferredX, preferredY);
      if (this.isCuePlacementValid(preferred.x, preferred.y)) {
        return preferred;
      }

      for (let radius = 0; radius <= 280; radius += 26) {
        for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 8) {
          const candidate = this.clampPointToTable(
            preferred.x + Math.cos(angle) * radius,
            preferred.y + Math.sin(angle) * radius
          );
          if (this.isCuePlacementValid(candidate.x, candidate.y)) {
            return candidate;
          }
        }
      }

      for (let x = BALL_RADIUS; x <= TABLE.width - BALL_RADIUS; x += 18) {
        for (let y = BALL_RADIUS; y <= TABLE.height - BALL_RADIUS; y += 18) {
          if (this.isCuePlacementValid(x, y)) {
            return { x, y };
          }
        }
      }

      return preferred;
    }

    addLog(message) {
      this.eventLogEntries.unshift(message);
      this.eventLogEntries = this.eventLogEntries.slice(0, 7);
    }

    syncHud() {
      this.ui.turnLabel.textContent =
        this.state === "game-over"
          ? `${this.nameFor(this.winner)} Wins`
          : this.currentPlayer === "player"
            ? "You"
            : "CPU";
      this.ui.statusLabel.textContent = this.statusText;
      this.ui.playerGroupLabel.textContent = this.labelForGroup(this.playerGroup);
      this.ui.cpuGroupLabel.textContent = this.labelForGroup(this.cpuGroup);
      this.ui.playerCountLabel.textContent = this.playerGroup
        ? `${this.remainingBallsForGroup(this.playerGroup)}`
        : "7";
      this.ui.cpuCountLabel.textContent = this.cpuGroup
        ? `${this.remainingBallsForGroup(this.cpuGroup)}`
        : "7";

      let power = 0;
      if (this.dragShot && this.currentPlayer === "player" && this.state === "aim") {
        const cueBall = this.getCueBall();
        power = distance(
          cueBall.x,
          cueBall.y,
          this.dragShot.currentTableX,
          this.dragShot.currentTableY
        ) / 180;
      }

      this.ui.powerFill.style.width = `${clamp(power, 0, 1) * 100}%`;
      this.ui.eventLog.innerHTML = this.eventLogEntries
        .map((entry) => `<li>${entry}</li>`)
        .join("");
    }

    tableToWorld(x, y, height) {
      return {
        x: x - TABLE.width * 0.5,
        y: height,
        z: y - TABLE.height * 0.5,
      };
    }

    projectWorld(point) {
      const relative = subtract3(point, this.camera.position);
      const cameraPoint = matrixVectorMultiply(this.camera.rotation, relative);
      if (cameraPoint.z <= 1) {
        return null;
      }

      return {
        x: this.camera.screenX + (cameraPoint.x * this.camera.focalLength) / cameraPoint.z,
        y: this.camera.screenY - (cameraPoint.y * this.camera.focalLength) / cameraPoint.z,
        scale: this.camera.focalLength / cameraPoint.z,
        camera: cameraPoint,
      };
    }

    projectBall(ball) {
      if (ball.pocketed) {
        return null;
      }

      const projection = this.projectWorld(this.tableToWorld(ball.x, ball.y, BALL_CENTER_Y));
      if (!projection) {
        return null;
      }

      return {
        ...projection,
        radius: BALL_RADIUS * projection.scale,
      };
    }

    projectRect(x1, y1, x2, y2, height) {
      return [
        this.projectWorld(this.tableToWorld(x1, y1, height)),
        this.projectWorld(this.tableToWorld(x2, y1, height)),
        this.projectWorld(this.tableToWorld(x2, y2, height)),
        this.projectWorld(this.tableToWorld(x1, y2, height)),
      ];
    }

    projectCirclePoints(x, y, radius, height, segments = 28) {
      const points = [];

      for (let index = 0; index < segments; index += 1) {
        const angle = (index / segments) * Math.PI * 2;
        const projected = this.projectWorld(
          this.tableToWorld(
            x + Math.cos(angle) * radius,
            y + Math.sin(angle) * radius,
            height
          )
        );

        if (projected) {
          points.push(projected);
        }
      }

      return points;
    }

    drawPolygon(ctx, points, fillStyle, strokeStyle = null, lineWidth = 1) {
      if (!points.every(Boolean)) {
        return;
      }

      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (let index = 1; index < points.length; index += 1) {
        ctx.lineTo(points[index].x, points[index].y);
      }
      ctx.closePath();

      if (fillStyle) {
        ctx.fillStyle = fillStyle;
        ctx.fill();
      }

      if (strokeStyle) {
        ctx.strokeStyle = strokeStyle;
        ctx.lineWidth = lineWidth;
        ctx.stroke();
      }
    }

    drawPolyline(ctx, points, strokeStyle, lineWidth, dash = []) {
      const visiblePoints = points.filter(Boolean);
      if (visiblePoints.length < 2) {
        return;
      }

      ctx.save();
      ctx.setLineDash(dash);
      ctx.strokeStyle = strokeStyle;
      ctx.lineWidth = lineWidth;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(visiblePoints[0].x, visiblePoints[0].y);
      for (let index = 1; index < visiblePoints.length; index += 1) {
        ctx.lineTo(visiblePoints[index].x, visiblePoints[index].y);
      }
      ctx.stroke();
      ctx.restore();
    }

    render() {
      const ctx = this.ctx;
      ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      this.drawBackdrop(ctx);
      this.drawTable(ctx);
      this.drawBallShadows(ctx);
      this.drawBalls(ctx);

      if (this.state === "placing-cue-ball" && this.currentPlayer === "player") {
        this.drawPlacementPreview(ctx);
      }

      if (this.state === "aim" && this.currentPlayer === "player") {
        this.drawAimOverlay(ctx);
      }

      if (this.state === "game-over") {
        this.drawWinnerBanner(ctx);
      }
    }

    drawBackdrop(ctx) {
      const sky = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
      sky.addColorStop(0, "#17384a");
      sky.addColorStop(0.5, "#0e2230");
      sky.addColorStop(1, "#061019");
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      const glow = ctx.createRadialGradient(
        CANVAS_WIDTH * 0.5,
        CANVAS_HEIGHT * 0.16,
        40,
        CANVAS_WIDTH * 0.5,
        CANVAS_HEIGHT * 0.16,
        420
      );
      glow.addColorStop(0, "rgba(255, 221, 145, 0.16)");
      glow.addColorStop(1, "rgba(255, 221, 145, 0)");
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      ctx.fillStyle = "rgba(255,255,255,0.02)";
      for (let line = 0; line < 22; line += 1) {
        ctx.fillRect(0, line * 34, CANVAS_WIDTH, 1);
      }
    }

    drawTable(ctx) {
      const outerTop = this.projectRect(
        -TABLE.rail,
        -TABLE.rail,
        TABLE.width + TABLE.rail,
        TABLE.height + TABLE.rail,
        TABLE.frameTopY
      );
      const felt = this.projectRect(0, 0, TABLE.width, TABLE.height, SURFACE_Y);

      const frontFace = [
        this.projectWorld(this.tableToWorld(-TABLE.rail, TABLE.height + TABLE.rail, TABLE.frameTopY)),
        this.projectWorld(this.tableToWorld(TABLE.width + TABLE.rail, TABLE.height + TABLE.rail, TABLE.frameTopY)),
        this.projectWorld(this.tableToWorld(TABLE.width + TABLE.rail, TABLE.height + TABLE.rail, TABLE.frameBottomY)),
        this.projectWorld(this.tableToWorld(-TABLE.rail, TABLE.height + TABLE.rail, TABLE.frameBottomY)),
      ];

      const leftFace = [
        this.projectWorld(this.tableToWorld(-TABLE.rail, -TABLE.rail, TABLE.frameTopY)),
        this.projectWorld(this.tableToWorld(-TABLE.rail, TABLE.height + TABLE.rail, TABLE.frameTopY)),
        this.projectWorld(this.tableToWorld(-TABLE.rail, TABLE.height + TABLE.rail, TABLE.frameBottomY)),
        this.projectWorld(this.tableToWorld(-TABLE.rail, -TABLE.rail, TABLE.frameBottomY)),
      ];

      const rightFace = [
        this.projectWorld(this.tableToWorld(TABLE.width + TABLE.rail, -TABLE.rail, TABLE.frameTopY)),
        this.projectWorld(this.tableToWorld(TABLE.width + TABLE.rail, TABLE.height + TABLE.rail, TABLE.frameTopY)),
        this.projectWorld(this.tableToWorld(TABLE.width + TABLE.rail, TABLE.height + TABLE.rail, TABLE.frameBottomY)),
        this.projectWorld(this.tableToWorld(TABLE.width + TABLE.rail, -TABLE.rail, TABLE.frameBottomY)),
      ];

      const shadow = this.projectRect(
        -TABLE.rail - 14,
        -TABLE.rail + 30,
        TABLE.width + TABLE.rail + 14,
        TABLE.height + TABLE.rail + 34,
        TABLE.frameBottomY - 16
      );

      this.drawPolygon(ctx, shadow, "rgba(0, 0, 0, 0.32)");
      this.drawPolygon(ctx, leftFace, "#3a2414");
      this.drawPolygon(ctx, rightFace, "#442a19");
      this.drawPolygon(ctx, frontFace, "#53321d");

      const woodGradient = ctx.createLinearGradient(0, felt[0].y, 0, felt[3].y + 80);
      woodGradient.addColorStop(0, "#7a5130");
      woodGradient.addColorStop(0.45, "#5c3921");
      woodGradient.addColorStop(1, "#412414");
      this.drawPolygon(ctx, outerTop, woodGradient, "rgba(255,255,255,0.08)", 1.2);

      const feltGradient = ctx.createLinearGradient(0, felt[0].y, 0, felt[3].y);
      feltGradient.addColorStop(0, "#1d9867");
      feltGradient.addColorStop(0.55, "#0f7753");
      feltGradient.addColorStop(1, "#0a553d");
      this.drawPolygon(ctx, felt, feltGradient, "rgba(255,255,255,0.08)", 1.2);

      this.drawTableGuides(ctx);
      this.drawPockets(ctx);
      this.drawSightMarks(ctx);
    }

    drawTableGuides(ctx) {
      const headX = TABLE.width * 0.25;
      this.drawPolyline(
        ctx,
        [
          this.projectWorld(this.tableToWorld(headX, 24, SURFACE_Y + 0.2)),
          this.projectWorld(this.tableToWorld(headX, TABLE.height - 24, SURFACE_Y + 0.2)),
        ],
        "rgba(255,255,255,0.14)",
        2
      );

      const spot = this.projectCirclePoints(headX, TABLE.height * 0.5, 6, SURFACE_Y + 0.3, 20);
      this.drawPolygon(ctx, spot, "rgba(255,255,255,0.17)");
    }

    drawPockets(ctx) {
      for (const pocket of POCKETS) {
        const ring = this.projectCirclePoints(
          pocket.x,
          pocket.y,
          pocket.radius * 1.12,
          SURFACE_Y - 2,
          34
        );
        this.drawPolygon(ctx, ring, "rgba(11, 16, 15, 0.72)");

        const hole = this.projectCirclePoints(
          pocket.x,
          pocket.y,
          pocket.radius,
          SURFACE_Y - 12,
          34
        );
        this.drawPolygon(ctx, hole, "#010201");
      }
    }

    drawSightMarks(ctx) {
      const horizontalStep = TABLE.width / 8;
      const verticalStep = TABLE.height / 4;

      for (let index = 1; index < 8; index += 1) {
        const topMark = this.projectCirclePoints(
          horizontalStep * index,
          -TABLE.rail * 0.56,
          4,
          TABLE.frameTopY + 0.4,
          14
        );
        const bottomMark = this.projectCirclePoints(
          horizontalStep * index,
          TABLE.height + TABLE.rail * 0.56,
          4,
          TABLE.frameTopY + 0.4,
          14
        );
        this.drawPolygon(ctx, topMark, "rgba(255, 228, 166, 0.8)");
        this.drawPolygon(ctx, bottomMark, "rgba(255, 228, 166, 0.8)");
      }

      for (let index = 1; index < 4; index += 1) {
        const leftMark = this.projectCirclePoints(
          -TABLE.rail * 0.56,
          verticalStep * index,
          4,
          TABLE.frameTopY + 0.4,
          14
        );
        const rightMark = this.projectCirclePoints(
          TABLE.width + TABLE.rail * 0.56,
          verticalStep * index,
          4,
          TABLE.frameTopY + 0.4,
          14
        );
        this.drawPolygon(ctx, leftMark, "rgba(255, 228, 166, 0.8)");
        this.drawPolygon(ctx, rightMark, "rgba(255, 228, 166, 0.8)");
      }
    }

    drawBallShadows(ctx) {
      const liveBalls = this.balls
        .filter((ball) => !ball.pocketed)
        .map((ball) => ({
          ball,
          projection: this.projectBall(ball),
          surface: this.projectWorld(this.tableToWorld(ball.x, ball.y, SURFACE_Y)),
        }))
        .filter((entry) => entry.projection && entry.surface)
        .sort((first, second) => second.projection.camera.z - first.projection.camera.z);

      for (const entry of liveBalls) {
        const radius = entry.projection.radius;
        ctx.save();
        ctx.fillStyle = "rgba(0, 0, 0, 0.24)";
        ctx.beginPath();
        ctx.ellipse(
          entry.surface.x + radius * 0.16,
          entry.surface.y + radius * 0.36,
          radius * 0.98,
          radius * 0.46,
          0,
          0,
          Math.PI * 2
        );
        ctx.fill();
        ctx.restore();
      }
    }

    drawBalls(ctx) {
      const liveBalls = this.balls
        .filter((ball) => !ball.pocketed)
        .map((ball) => ({
          ball,
          projection: this.projectBall(ball),
        }))
        .filter((entry) => entry.projection)
        .sort((first, second) => second.projection.camera.z - first.projection.camera.z);

      for (const entry of liveBalls) {
        this.drawBall(ctx, entry.ball, entry.projection);
      }
    }

    drawBall(ctx, ball, projection) {
      const orientation = matrixMultiply(
        rotationAroundZ(ball.rotZ),
        rotationAroundX(ball.rotX)
      );
      const ballToCamera = matrixMultiply(this.camera.rotation, orientation);
      const localFromCamera = transposeMatrix(ballToCamera);
      const spriteSize = this.paintBallSprite(ball.number, projection.radius, localFromCamera);

      ctx.drawImage(
        this.ballBuffer,
        projection.x - spriteSize * 0.5,
        projection.y - spriteSize * 0.5
      );

      this.drawBallDecals(ctx, ball, projection, ballToCamera);

      ctx.save();
      ctx.strokeStyle = "rgba(255,255,255,0.26)";
      ctx.lineWidth = Math.max(0.8, projection.radius * 0.08);
      ctx.beginPath();
      ctx.arc(projection.x, projection.y, projection.radius - 0.4, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    paintBallSprite(number, radius, localFromCamera) {
      const size = Math.max(28, Math.ceil(radius * 2 + 10));
      if (this.ballBuffer.width !== size || this.ballBuffer.height !== size) {
        this.ballBuffer.width = size;
        this.ballBuffer.height = size;
      }

      const image = this.ballBufferCtx.createImageData(size, size);
      const pixels = image.data;
      const sphereRadius = radius;
      const mid = size * 0.5;
      const lightDirection = normalize3({ x: -0.42, y: 0.55, z: 0.72 });

      for (let py = 0; py < size; py += 1) {
        for (let px = 0; px < size; px += 1) {
          const dx = (px + 0.5 - mid) / sphereRadius;
          const dy = (py + 0.5 - mid) / sphereRadius;
          const distanceSquared = dx * dx + dy * dy;

          if (distanceSquared > 1) {
            continue;
          }

          const normalCamera = {
            x: dx,
            y: -dy,
            z: Math.sqrt(1 - distanceSquared),
          };
          const normalLocal = matrixVectorMultiply(localFromCamera, normalCamera);
          const baseColor = this.sampleBallSurface(number, normalLocal);
          const diffuse = Math.max(0, dot3(normalCamera, lightDirection));
          const rim = Math.pow(1 - normalCamera.z, 2.2);
          const brightness = 0.28 + diffuse * 0.72;

          const index = (py * size + px) * 4;
          pixels[index] = clamp(
            Math.round(baseColor.r * brightness + 255 * (0.03 + rim * 0.08)),
            0,
            255
          );
          pixels[index + 1] = clamp(
            Math.round(baseColor.g * brightness + 255 * (0.03 + rim * 0.08)),
            0,
            255
          );
          pixels[index + 2] = clamp(
            Math.round(baseColor.b * brightness + 255 * (0.03 + rim * 0.08)),
            0,
            255
          );
          pixels[index + 3] = 255;
        }
      }

      this.ballBufferCtx.putImageData(image, 0, 0);
      return size;
    }

    sampleBallSurface(number, normalLocal) {
      if (number === 0) {
        return { r: 236, g: 241, b: 248 };
      }

      if (number === 8) {
        return { r: 18, g: 18, b: 20 };
      }

      if (number >= 9) {
        if (Math.abs(normalLocal.y) < 0.34) {
          return BALL_RGB[number];
        }

        return { r: 246, g: 242, b: 233 };
      }

      return BALL_RGB[number];
    }

    drawBallDecals(ctx, ball, projection, ballToCamera) {
      if (ball.number === 0) {
        const spotVectors = [
          normalize3({ x: 0.58, y: 0.18, z: 0.78 }),
          normalize3({ x: -0.46, y: 0.32, z: 0.83 }),
          normalize3({ x: 0.24, y: -0.48, z: 0.84 }),
          normalize3({ x: -0.2, y: -0.18, z: 0.96 }),
        ];

        ctx.save();
        ctx.fillStyle = "#d95f5f";
        for (const vector of spotVectors) {
          const patch = matrixVectorMultiply(ballToCamera, vector);
          if (patch.z <= 0.08) {
            continue;
          }

          const radius = projection.radius * lerp(0.08, 0.14, patch.z);
          ctx.beginPath();
          ctx.arc(
            projection.x + patch.x * projection.radius * 0.92,
            projection.y - patch.y * projection.radius * 0.92,
            radius,
            0,
            Math.PI * 2
          );
          ctx.fill();
        }
        ctx.restore();
        return;
      }

      const patchLocal = normalize3({ x: 0.16, y: -0.04, z: 0.99 });
      const patch = matrixVectorMultiply(ballToCamera, patchLocal);
      if (patch.z <= 0.07) {
        return;
      }

      const patchRadius = projection.radius * lerp(0.1, 0.32, patch.z);
      const patchX = projection.x + patch.x * projection.radius * 0.92;
      const patchY = projection.y - patch.y * projection.radius * 0.92;

      ctx.save();
      const patchGradient = ctx.createRadialGradient(
        patchX - patchRadius * 0.2,
        patchY - patchRadius * 0.25,
        patchRadius * 0.25,
        patchX,
        patchY,
        patchRadius
      );
      patchGradient.addColorStop(0, "#fffdf9");
      patchGradient.addColorStop(1, "#ded9cd");
      ctx.fillStyle = patchGradient;
      ctx.beginPath();
      ctx.arc(patchX, patchY, patchRadius, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#161616";
      ctx.font = `${Math.max(8, patchRadius * 1.18)}px Arial`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(`${ball.number}`, patchX, patchY + patchRadius * 0.05);
      ctx.restore();
    }

    drawPlacementPreview(ctx) {
      if (!this.placementPreview) {
        return;
      }

      const projection = this.projectWorld(
        this.tableToWorld(this.placementPreview.x, this.placementPreview.y, BALL_CENTER_Y)
      );
      if (!projection) {
        return;
      }

      ctx.save();
      ctx.globalAlpha = 0.72;
      ctx.fillStyle = this.placementPreview.valid ? "#ffffff" : "#ff6d6d";
      ctx.beginPath();
      ctx.arc(projection.x, projection.y, projection.scale * BALL_RADIUS, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      const ring = this.projectCirclePoints(
        this.placementPreview.x,
        this.placementPreview.y,
        BALL_RADIUS + 10,
        SURFACE_Y + 0.2,
        24
      );
      this.drawPolyline(
        ctx,
        [...ring, ring[0]],
        this.placementPreview.valid
          ? "rgba(172, 255, 220, 0.95)"
          : "rgba(255, 120, 120, 0.95)",
        2,
        [6, 7]
      );
    }

    drawAimOverlay(ctx) {
      const cueBall = this.getCueBall();
      if (cueBall.pocketed) {
        return;
      }

      const direction = this.dragShot
        ? normalize(
            cueBall.x - this.dragShot.currentTableX,
            cueBall.y - this.dragShot.currentTableY
          )
        : this.pointer.tableValid
          ? normalize(this.pointer.tableX - cueBall.x, this.pointer.tableY - cueBall.y)
          : null;

      if (!direction) {
        return;
      }

      const guideDistance = this.dragShot
        ? clamp(
            distance(
              cueBall.x,
              cueBall.y,
              this.dragShot.currentTableX,
              this.dragShot.currentTableY
            ) * 2.2,
            100,
            360
          )
        : 180;

      const linePoints = [
        this.projectWorld(this.tableToWorld(cueBall.x, cueBall.y, BALL_CENTER_Y)),
        this.projectWorld(
          this.tableToWorld(
            cueBall.x + direction.x * guideDistance,
            cueBall.y + direction.y * guideDistance,
            BALL_CENTER_Y
          )
        ),
      ];

      this.drawPolyline(
        ctx,
        linePoints,
        this.dragShot ? "rgba(255,255,255,0.78)" : "rgba(255,255,255,0.28)",
        this.dragShot ? 2.2 : 1.6,
        this.dragShot ? [10, 8] : [6, 12]
      );

      if (!this.dragShot) {
        return;
      }

      const pull = distance(
        cueBall.x,
        cueBall.y,
        this.dragShot.currentTableX,
        this.dragShot.currentTableY
      );
      const buttPoint = this.projectWorld(
        this.tableToWorld(
          cueBall.x - direction.x * (BALL_RADIUS + pull * 0.78),
          cueBall.y - direction.y * (BALL_RADIUS + pull * 0.78),
          BALL_CENTER_Y + 10
        )
      );
      const tipPoint = this.projectWorld(
        this.tableToWorld(
          cueBall.x - direction.x * (BALL_RADIUS + 10),
          cueBall.y - direction.y * (BALL_RADIUS + 10),
          BALL_CENTER_Y + 8
        )
      );

      if (!buttPoint || !tipPoint) {
        return;
      }

      const cueGradient = ctx.createLinearGradient(
        buttPoint.x,
        buttPoint.y,
        tipPoint.x,
        tipPoint.y
      );
      cueGradient.addColorStop(0, "#8b5b32");
      cueGradient.addColorStop(0.82, "#d9c6a1");
      cueGradient.addColorStop(1, "#f7f3ea");

      ctx.save();
      ctx.strokeStyle = cueGradient;
      ctx.lineCap = "round";
      ctx.lineWidth = 9;
      ctx.beginPath();
      ctx.moveTo(buttPoint.x, buttPoint.y);
      ctx.lineTo(tipPoint.x, tipPoint.y);
      ctx.stroke();
      ctx.restore();
    }

    drawWinnerBanner(ctx) {
      ctx.save();
      const bannerWidth = 460;
      const bannerHeight = 96;
      const x = CANVAS_WIDTH * 0.5 - bannerWidth * 0.5;
      const y = 26;

      ctx.fillStyle = "rgba(7, 16, 30, 0.82)";
      this.roundRect(ctx, x, y, bannerWidth, bannerHeight, 18);
      ctx.fill();

      ctx.strokeStyle = "rgba(255, 220, 115, 0.5)";
      ctx.lineWidth = 1;
      this.roundRect(ctx, x, y, bannerWidth, bannerHeight, 18);
      ctx.stroke();

      ctx.fillStyle = "#f5e9c4";
      ctx.font = "700 18px 'Trebuchet MS'";
      ctx.textAlign = "center";
      ctx.fillText("Match Complete", CANVAS_WIDTH * 0.5, y + 33);

      ctx.fillStyle = "#ffffff";
      ctx.font = "700 28px 'Trebuchet MS'";
      ctx.fillText(this.statusText, CANVAS_WIDTH * 0.5, y + 66);
      ctx.restore();
    }

    roundRect(ctx, x, y, width, height, radius) {
      ctx.beginPath();
      ctx.moveTo(x + radius, y);
      ctx.lineTo(x + width - radius, y);
      ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
      ctx.lineTo(x + width, y + height - radius);
      ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
      ctx.lineTo(x + radius, y + height);
      ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
      ctx.lineTo(x, y + radius);
      ctx.quadraticCurveTo(x, y, x + radius, y);
      ctx.closePath();
    }
  }

  window.addEventListener("DOMContentLoaded", () => {
    new PoolGame();
  });
})();
