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

  const ROOM = {
    floorY: -214,
    wallTopY: 468,
    wallInset: 420,
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
  const HEAD_STRING_X = TABLE.width * 0.25;

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

  const POCKET_LABELS = [
    "top-left",
    "top-center",
    "top-right",
    "bottom-left",
    "bottom-center",
    "bottom-right",
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

  function rotate2(vector, angle) {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    return {
      x: vector.x * cos - vector.y * sin,
      y: vector.x * sin + vector.y * cos,
    };
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
      this.cameraOrbit = this.createCameraOrbit();
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
        callLabel: document.getElementById("callLabel"),
        toggleSafetyBtn: document.getElementById("toggleSafetyBtn"),
        clearCallBtn: document.getElementById("clearCallBtn"),
        decisionSection: document.getElementById("decisionSection"),
        decisionPrompt: document.getElementById("decisionPrompt"),
        decisionButtons: document.getElementById("decisionButtons"),
      };

      this.pointer = {
        screenX: CANVAS_WIDTH * 0.5,
        screenY: CANVAS_HEIGHT * 0.5,
        tableX: TABLE.width * 0.25,
        tableY: TABLE.height * 0.5,
        tableValid: true,
        inside: false,
      };

      this.cameraGesture = null;
      this.controlDrag = null;
      this.playerAimView = this.createPlayerAimView();
      this.shotSetup = this.createShotSetup();
      this.shotPower = 0;
      this.shotSpin = { x: 0, y: 0 };
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
      this.breakShotPending = true;
      this.breaker = "player";
      this.playerCall = this.createEmptyCall();
      this.pendingDecision = null;
      this.upcomingShotRestriction = false;
      this.decisionRenderKey = "";
      this.cpuShotAt = 0;
      this.idleTimer = 0;
      this.lastTimestamp = 0;

      this.bindEvents();
      this.resetGame();
      requestAnimationFrame((timestamp) => this.animate(timestamp));
    }

    createShotSetup() {
      return {
        cueSelected: false,
        targetBallNumber: null,
      };
    }

    createPlayerAimView() {
      return {
        yawOffset: 0,
        pitchOffset: 0,
        distanceOffset: 0,
        lateralOffset: 0,
        leadOffset: 0,
      };
    }

    createCameraOrbit() {
      const offset = subtract3(CAMERA.position, CAMERA.target);
      const distanceToTarget = Math.hypot(offset.x, offset.y, offset.z) || 1;
      const horizontalDistance = Math.hypot(offset.x, offset.z) || 1;

      return {
        yaw: Math.atan2(offset.x, offset.z),
        pitch: Math.atan2(offset.y, horizontalDistance),
        distance: distanceToTarget,
        target: { ...CAMERA.target },
      };
    }

    createCamera() {
      const orbit = this.cameraOrbit || this.createCameraOrbit();
      const horizontalDistance = Math.cos(orbit.pitch) * orbit.distance;
      const position = {
        x: orbit.target.x + Math.sin(orbit.yaw) * horizontalDistance,
        y: orbit.target.y + Math.sin(orbit.pitch) * orbit.distance,
        z: orbit.target.z + Math.cos(orbit.yaw) * horizontalDistance,
      };
      const forward = normalize3(subtract3(orbit.target, position));
      const right = normalize3(cross3(forward, { x: 0, y: 1, z: 0 }));
      const up = normalize3(cross3(right, forward));
      const rotation = [
        right.x, right.y, right.z,
        up.x, up.y, up.z,
        forward.x, forward.y, forward.z,
      ];

      return {
        ...CAMERA,
        position,
        target: { ...orbit.target },
        right,
        up,
        forward,
        rotation,
        focalLength: (CANVAS_HEIGHT * 0.5) / Math.tan(CAMERA.fovRadians * 0.5),
      };
    }

    clampCameraOrbit() {
      this.cameraOrbit.pitch = clamp(this.cameraOrbit.pitch, 0.3, 1.18);
      this.cameraOrbit.distance = clamp(this.cameraOrbit.distance, 640, 2200);
      this.cameraOrbit.target.x = clamp(this.cameraOrbit.target.x, -320, 320);
      this.cameraOrbit.target.y = clamp(this.cameraOrbit.target.y, 0, 140);
      this.cameraOrbit.target.z = clamp(this.cameraOrbit.target.z, -220, 220);
    }

    updateCamera() {
      this.clampCameraOrbit();
      this.camera = this.createCamera();
      this.refreshPointerTableCoordinates();
    }

    orbitCamera(deltaX, deltaY) {
      this.cameraOrbit.yaw -= deltaX * 0.0055;
      this.cameraOrbit.pitch = clamp(this.cameraOrbit.pitch + deltaY * 0.0045, 0.3, 1.18);
      this.updateCamera();
    }

    panCamera(deltaX, deltaY) {
      const right = normalize(this.camera.right.x, this.camera.right.z);
      const forward = normalize(this.camera.forward.x, this.camera.forward.z);
      const scale = this.cameraOrbit.distance / this.camera.focalLength;
      this.cameraOrbit.target.x += (-deltaX * right.x + deltaY * forward.x) * scale * 3.2;
      this.cameraOrbit.target.z += (-deltaX * right.y + deltaY * forward.y) * scale * 3.2;
      this.updateCamera();
    }

    zoomCamera(deltaY) {
      this.cameraOrbit.distance = clamp(
        this.cameraOrbit.distance * Math.exp(deltaY * 0.0012),
        640,
        2200
      );
      this.updateCamera();
    }

    bindEvents() {
      this.ui.newGameBtn.addEventListener("click", () => this.resetGame());
      this.ui.toggleSafetyBtn.addEventListener("click", () => this.togglePlayerSafety());
      this.ui.clearCallBtn.addEventListener("click", () => this.resetPlayerCall());

      this.canvas.addEventListener("contextmenu", (event) => event.preventDefault());
      this.canvas.addEventListener("pointermove", (event) =>
        this.handlePointerMove(event)
      );
      this.canvas.addEventListener("pointerdown", (event) =>
        this.handlePointerDown(event)
      );
      this.canvas.addEventListener(
        "wheel",
        (event) => this.handleWheel(event),
        { passive: false }
      );
      this.canvas.addEventListener("pointerleave", () => {
        this.pointer.inside = false;
      });
      window.addEventListener("pointerup", (event) =>
        this.handlePointerUp(event)
      );
    }

    createEmptyCall() {
      return {
        ballNumber: null,
        pocketIndex: null,
        safety: false,
      };
    }

    resetShotSetup() {
      this.shotSetup = this.createShotSetup();
    }

    resetShotControls() {
      this.shotPower = 0;
      this.shotSpin = { x: 0, y: 0 };
      this.controlDrag = null;
    }

    resetPlayerAimView() {
      this.playerAimView = this.createPlayerAimView();
    }

    getShotControlLayout() {
      const panelWidth = 148;
      const panelHeight = 248;
      const panelX = CANVAS_WIDTH - panelWidth - 26;
      const panelY = CANVAS_HEIGHT - panelHeight - 24;
      const spinRadius = 38;
      const spinCenterX = panelX + panelWidth * 0.5;
      const spinCenterY = panelY + panelHeight - 56;
      const powerWidth = 28;
      const powerHeight = 120;
      const powerX = spinCenterX - powerWidth * 0.5;
      const powerY = panelY + 34;

      return {
        panelX,
        panelY,
        panelWidth,
        panelHeight,
        spinCenterX,
        spinCenterY,
        spinRadius,
        knobRadius: 8,
        knobLimit: spinRadius * 0.62,
        powerX,
        powerY,
        powerWidth,
        powerHeight,
      };
    }

    updateShotSpinFromPoint(screenX, screenY) {
      const layout = this.getShotControlLayout();
      const rawX = screenX - layout.spinCenterX;
      const rawY = layout.spinCenterY - screenY;
      const magnitude = Math.hypot(rawX, rawY);
      const limit = layout.knobLimit;
      const scale = magnitude > limit ? limit / magnitude : 1;
      this.shotSpin.x = (rawX * scale) / limit;
      this.shotSpin.y = (rawY * scale) / limit;
    }

    updateShotPowerFromPoint(screenY) {
      const layout = this.getShotControlLayout();
      const relative = clamp((layout.powerY + layout.powerHeight - screenY) / layout.powerHeight, 0, 1);
      this.shotPower = relative;
    }

    getShotSpeedFromControl() {
      if (this.shotPower <= 0) {
        return 0;
      }

      return lerp(MIN_SHOT_SPEED, MAX_SHOT_SPEED, this.shotPower);
    }

    hitTestShotControls(screenX, screenY) {
      const layout = this.getShotControlLayout();
      const inPowerBar =
        screenX >= layout.powerX - 10 &&
        screenX <= layout.powerX + layout.powerWidth + 10 &&
        screenY >= layout.powerY - 10 &&
        screenY <= layout.powerY + layout.powerHeight + 10;

      if (inPowerBar) {
        return "power";
      }

      if (
        distance(screenX, screenY, layout.spinCenterX, layout.spinCenterY) <=
        layout.spinRadius + 10
      ) {
        return "spin";
      }

      return null;
    }

    selectCueBallForShot() {
      this.resetPlayerAimView();
      this.shotSetup.cueSelected = true;
      this.shotSetup.targetBallNumber = null;
      this.statusText = this.breakShotPending
        ? "Cue ball selected. Click a target ball, set power and spin, then click the cue ball again to break."
        : "Cue ball selected. Click a legal target ball, set power and spin, then click the cue ball again to shoot.";
    }

    getTargetBallForShot() {
      if (this.shotSetup.targetBallNumber === null) {
        return null;
      }

      return this.balls.find(
        (ball) =>
          !ball.pocketed &&
          ball.number === this.shotSetup.targetBallNumber &&
          ball.number !== 0
      ) || null;
    }

    getAimDirectionForPlayer() {
      const cueBall = this.getCueBall();
      const targetBall = this.getTargetBallForShot();
      if (targetBall) {
        return normalize(targetBall.x - cueBall.x, targetBall.y - cueBall.y);
      }

      if (!this.shotSetup.cueSelected || !this.pointer.tableValid) {
        return null;
      }

      return normalize(this.pointer.tableX - cueBall.x, this.pointer.tableY - cueBall.y);
    }

    isLegalTargetBallForShot(number) {
      if (this.breakShotPending) {
        return number >= 1 && number <= 15;
      }

      return this.isLegalCalledBall(number, "player");
    }

    deselectTargetBallForShot() {
      const previousTarget = this.shotSetup.targetBallNumber;
      if (previousTarget === null) {
        return;
      }

      this.shotSetup.cueSelected = true;
      this.shotSetup.targetBallNumber = null;

      if (this.breakShotPending) {
        this.statusText =
          "Target cleared. Click a different ball, set power and spin, then click the cue ball again to break.";
        return;
      }

      if (this.playerCall.safety) {
        this.statusText =
          "Safety target cleared. Click another legal ball or keep adjusting the safety line before shooting.";
        return;
      }

      this.playerCall.ballNumber = null;

      if (this.playerCall.pocketIndex !== null) {
        this.statusText = `${POCKET_LABELS[this.playerCall.pocketIndex]} stays selected. Click a different legal ball.`;
        return;
      }

      this.statusText =
        "Target cleared. Click a different legal ball, choose a pocket, then click the cue ball again to shoot.";
    }

    selectTargetBallForShot(number) {
      if (
        this.shotSetup.cueSelected &&
        this.shotSetup.targetBallNumber === number
      ) {
        this.deselectTargetBallForShot();
        return;
      }

      if (!this.isLegalTargetBallForShot(number)) {
        this.statusText = "That is not a legal target ball right now.";
        return;
      }

      this.shotSetup.cueSelected = true;
      this.shotSetup.targetBallNumber = number;

      if (!this.breakShotPending) {
        this.selectPlayerBallCall(number);
        if (this.playerCall.pocketIndex === null) {
          const suggestion = this.suggestPlayerCall();
          if (suggestion && suggestion.calledBall === number) {
            this.playerCall.pocketIndex = suggestion.calledPocketIndex;
          }
        }

        this.statusText =
          this.playerCall.pocketIndex === null
            ? `Ball ${number} selected. Choose a pocket, then click the cue ball again to shoot.`
            : `Ball ${number} to the ${POCKET_LABELS[this.playerCall.pocketIndex]} selected. Click the cue ball again to shoot with the current power and spin.`;
        this.frameCameraForPlayerShot(this.getAimDirectionForPlayer(), { recenter: true });
        return;
      }

      this.statusText = `Target ball ${number} selected. Click the cue ball again to break with the current power and spin.`;
      this.frameCameraForPlayerShot(this.getAimDirectionForPlayer(), { recenter: true });
    }

    refreshPointerTableCoordinates() {
      const tablePoint = this.screenToTable(this.pointer.screenX, this.pointer.screenY);
      this.pointer.tableValid = Boolean(tablePoint);
      if (tablePoint) {
        this.pointer.tableX = tablePoint.x;
        this.pointer.tableY = tablePoint.y;
      }
    }

    startCameraGesture(type, point) {
      this.cameraGesture = {
        type,
        lastScreenX: point.x,
        lastScreenY: point.y,
      };
    }

    setCameraPose(position, target) {
      const offset = subtract3(position, target);
      const horizontalDistance = Math.hypot(offset.x, offset.z) || 1;
      this.cameraOrbit.distance = Math.hypot(offset.x, offset.y, offset.z) || CAMERA.position.y;
      this.cameraOrbit.yaw = Math.atan2(offset.x, offset.z);
      this.cameraOrbit.pitch = Math.atan2(offset.y, horizontalDistance);
      this.cameraOrbit.target = { ...target };
      this.updateCamera();
    }

    isPlayerAimCameraActive() {
      return (
        this.currentPlayer === "player" &&
        this.state === "aim" &&
        this.shotSetup.cueSelected &&
        this.shotSetup.targetBallNumber !== null &&
        !this.winner
      );
    }

    frameCameraForPlayerShot(direction, options = {}) {
      if (!direction) {
        return;
      }

      const cueBall = this.getCueBall();
      if (!cueBall || cueBall.pocketed) {
        return;
      }

      if (options.recenter) {
        this.resetPlayerAimView();
      }

      const targetBall = this.getTargetBallForShot();
      const shotDirection = normalize(direction.x, direction.y);
      const sideDirection = {
        x: -shotDirection.y,
        y: shotDirection.x,
      };
      const baseForwardDistance = this.breakShotPending
        ? 230
        : clamp(
            targetBall
              ? distance(cueBall.x, cueBall.y, targetBall.x, targetBall.y) * 0.72
              : 180,
            150,
            260
          );
      const forwardDistance = clamp(
        baseForwardDistance + this.playerAimView.leadOffset,
        120,
        320
      );
      const baseCameraDistance = this.breakShotPending
        ? 1020
        : clamp(820 + baseForwardDistance * 0.9, 820, 1120);
      const cameraDistance = clamp(
        baseCameraDistance + this.playerAimView.distanceOffset,
        680,
        1380
      );
      const pitch = clamp(
        (this.breakShotPending ? 0.64 : 0.6) + this.playerAimView.pitchOffset,
        0.34,
        1.02
      );
      const rotatedView = rotate2(shotDirection, this.playerAimView.yawOffset);
      const viewDirection = normalize(rotatedView.x, rotatedView.y);
      const horizontalDistance = Math.cos(pitch) * cameraDistance;
      const focusTableX = clamp(
        cueBall.x +
          shotDirection.x * forwardDistance +
          sideDirection.x * this.playerAimView.lateralOffset,
        BALL_RADIUS,
        TABLE.width - BALL_RADIUS
      );
      const focusTableY = clamp(
        cueBall.y +
          shotDirection.y * forwardDistance +
          sideDirection.y * this.playerAimView.lateralOffset,
        BALL_RADIUS,
        TABLE.height - BALL_RADIUS
      );
      const target = this.tableToWorld(focusTableX, focusTableY, 24);
      const position = {
        x: target.x - viewDirection.x * horizontalDistance,
        y: target.y + Math.sin(pitch) * cameraDistance,
        z: target.z - viewDirection.y * horizontalDistance,
      };

      this.setCameraPose(position, target);
    }

    adjustPlayerAimCameraOrbit(deltaX, deltaY) {
      this.playerAimView.yawOffset = clamp(
        this.playerAimView.yawOffset - deltaX * 0.0055,
        -0.72,
        0.72
      );
      this.playerAimView.pitchOffset = clamp(
        this.playerAimView.pitchOffset + deltaY * 0.0044,
        -0.24,
        0.26
      );
      this.frameCameraForPlayerShot(this.getAimDirectionForPlayer());
    }

    adjustPlayerAimCameraPan(deltaX, deltaY) {
      this.playerAimView.lateralOffset = clamp(
        this.playerAimView.lateralOffset - deltaX * 0.72,
        -140,
        140
      );
      this.playerAimView.leadOffset = clamp(
        this.playerAimView.leadOffset + deltaY * 0.8,
        -90,
        100
      );
      this.frameCameraForPlayerShot(this.getAimDirectionForPlayer());
    }

    adjustPlayerAimCameraZoom(deltaY) {
      this.playerAimView.distanceOffset = clamp(
        this.playerAimView.distanceOffset + deltaY * 0.52,
        -300,
        460
      );
      this.frameCameraForPlayerShot(this.getAimDirectionForPlayer());
    }

    getSuggestedPlayerShotChoice() {
      if (this.breakShotPending) {
        return this.chooseCpuBreakShot();
      }

      const cueBall = this.getCueBall();
      const legalTargets = this.getLegalTargetsFor("player");
      const allTargetBalls = this.balls.filter(
        (ball) => !ball.pocketed && legalTargets.includes(ball.number)
      );
      const restrictedTargets = allTargetBalls.filter((ball) => ball.x >= HEAD_STRING_X);
      const targetBalls =
        this.upcomingShotRestriction && restrictedTargets.length > 0
          ? restrictedTargets
          : allTargetBalls;

      const pottingOption = this.findCpuPottingOption(targetBalls, cueBall);
      if (pottingOption) {
        return pottingOption;
      }

      const safetyOption = this.chooseCpuSafetyShot(targetBalls, cueBall);
      if (safetyOption) {
        return safetyOption;
      }

      const clusterCenter = this.findRackCenter();
      const fallbackTarget = targetBalls[0] || null;
      return {
        vector: normalize(clusterCenter.x - cueBall.x, clusterCenter.y - cueBall.y),
        power: 430,
        confidence: 0.24,
        calledBall: null,
        calledPocketIndex: null,
        safety: true,
        targetBallNumber: fallbackTarget ? fallbackTarget.number : null,
      };
    }

    applySuggestedPlayerShot(choice) {
      if (!choice) {
        return;
      }

      this.resetPlayerAimView();
      this.shotSetup.cueSelected = true;
      this.shotSetup.targetBallNumber =
        choice.targetBallNumber ?? choice.calledBall ?? null;
      this.shotPower = clamp(
        (choice.power - MIN_SHOT_SPEED) / (MAX_SHOT_SPEED - MIN_SHOT_SPEED),
        0.22,
        0.98
      );
      this.shotSpin = { x: 0, y: 0 };

      if (this.breakShotPending) {
        this.playerCall = this.createEmptyCall();
        this.statusText = "Suggested break loaded. Adjust the line, power, or spin, then click the cue ball to break.";
      } else if (choice.safety) {
        this.playerCall = {
          ballNumber: null,
          pocketIndex: null,
          safety: true,
        };
        const targetLabel = choice.targetBallNumber ? ` off the ${choice.targetBallNumber}` : "";
        this.statusText = `Suggested safety${targetLabel} loaded. Adjust the line, power, or spin, then click the cue ball to shoot.`;
      } else {
        this.playerCall = {
          ballNumber: choice.calledBall ?? null,
          pocketIndex: choice.calledPocketIndex ?? null,
          safety: false,
        };
        if (choice.calledBall !== null && choice.calledPocketIndex !== null) {
          this.statusText = `Suggested shot loaded: ${choice.calledBall} to the ${POCKET_LABELS[choice.calledPocketIndex]}. Adjust the line, power, or spin, then click the cue ball to shoot.`;
        } else {
          this.statusText = "Suggested shot loaded. Adjust the line, power, or spin, then click the cue ball to shoot.";
        }
      }

      this.frameCameraForPlayerShot(choice.vector || this.getAimDirectionForPlayer());
    }

    autoPlanNextPlayerShot() {
      if (this.currentPlayer !== "player" || this.state !== "aim" || this.winner) {
        return;
      }

      const choice = this.getSuggestedPlayerShotChoice();
      this.applySuggestedPlayerShot(choice);
    }

    isPlayerReadyToShoot() {
      if (this.breakShotPending) {
        return true;
      }

      if (this.playerCall.safety) {
        return true;
      }

      return (
        this.playerCall.ballNumber !== null &&
        this.playerCall.pocketIndex !== null &&
        this.isLegalCalledBall(this.playerCall.ballNumber, "player")
      );
    }

    describePlayerCall() {
      if (this.breakShotPending) {
        return "Break shot. No call required.";
      }

      if (this.currentPlayer !== "player" || this.state === "cpu-thinking") {
        return "CPU is handling its own called shot.";
      }

      if (this.playerCall.safety) {
        return "Safety called. Any pocketed balls stay down and the turn passes.";
      }

      if (
        this.playerCall.ballNumber !== null &&
        this.playerCall.pocketIndex !== null
      ) {
        return `Ball ${this.playerCall.ballNumber} to the ${POCKET_LABELS[this.playerCall.pocketIndex]}.`;
      }

      if (this.playerCall.ballNumber !== null) {
        return `Ball ${this.playerCall.ballNumber} selected. Choose a pocket.`;
      }

      if (this.playerCall.pocketIndex !== null) {
        return `Pocket ${POCKET_LABELS[this.playerCall.pocketIndex]} selected. Choose a legal ball.`;
      }

      return "No call selected. Click a legal ball, click a pocket, then shoot.";
    }

    resetPlayerCall() {
      this.playerCall = this.createEmptyCall();
      if (this.currentPlayer === "player" && this.state === "aim" && !this.breakShotPending) {
        this.statusText = "Choose a legal target ball and pocket, or toggle Safety.";
      }
      this.syncHud();
    }

    selectPlayerBallCall(number) {
      if (!this.isLegalCalledBall(number, "player")) {
        this.statusText = "That ball is not a legal called object right now.";
        return;
      }

      this.playerCall.safety = false;
      this.playerCall.ballNumber = number;
      if (
        this.playerCall.pocketIndex !== null &&
        !POCKET_LABELS[this.playerCall.pocketIndex]
      ) {
        this.playerCall.pocketIndex = null;
      }

      this.statusText =
        this.playerCall.pocketIndex === null
          ? `Ball ${number} selected. Choose a pocket.`
          : `Ball ${number} to the ${POCKET_LABELS[this.playerCall.pocketIndex]} called.`;
    }

    selectPlayerPocketCall(pocketIndex) {
      this.playerCall.safety = false;
      this.playerCall.pocketIndex = pocketIndex;
      this.statusText =
        this.playerCall.ballNumber === null
          ? `Pocket ${POCKET_LABELS[pocketIndex]} selected. Choose a legal ball.`
          : `Ball ${this.playerCall.ballNumber} to the ${POCKET_LABELS[pocketIndex]} called.`;
      this.frameCameraForPlayerShot(this.getAimDirectionForPlayer(), { recenter: true });
    }

    suggestPlayerCall() {
      const cueBall = this.getCueBall();
      const legalTargets = this.getLegalTargetsFor("player");
      let targetBalls = this.balls.filter(
        (ball) => !ball.pocketed && legalTargets.includes(ball.number)
      );

      if (this.playerCall.ballNumber !== null) {
        const selectedBall = targetBalls.find(
          (ball) => ball.number === this.playerCall.ballNumber
        );
        targetBalls = selectedBall ? [selectedBall] : [];
      }

      if (targetBalls.length === 0) {
        return null;
      }

      const preferredPocketIndex = this.playerCall.pocketIndex;
      const matchedPocketOption =
        preferredPocketIndex === null
          ? null
          : this.findCpuPottingOption(targetBalls, cueBall, preferredPocketIndex);

      const pottingOption =
        matchedPocketOption || this.findCpuPottingOption(targetBalls, cueBall);
      if (pottingOption) {
        return pottingOption;
      }

      const fallbackBall = targetBalls
        .slice()
        .sort(
          (first, second) =>
            distance(cueBall.x, cueBall.y, first.x, first.y) -
            distance(cueBall.x, cueBall.y, second.x, second.y)
        )[0];

      if (!fallbackBall) {
        return null;
      }

      let fallbackPocketIndex = preferredPocketIndex;
      if (fallbackPocketIndex === null) {
        fallbackPocketIndex = POCKETS.map((pocket, pocketIndex) => ({
          pocketIndex,
          distance: distance(fallbackBall.x, fallbackBall.y, pocket.x, pocket.y),
        })).sort((first, second) => first.distance - second.distance)[0].pocketIndex;
      }

      return {
        calledBall: fallbackBall.number,
        calledPocketIndex: fallbackPocketIndex,
      };
    }

    togglePlayerSafety() {
      if (this.currentPlayer !== "player" || this.state !== "aim" || this.breakShotPending || this.pendingDecision) {
        return;
      }

      this.playerCall.safety = !this.playerCall.safety;
      if (this.playerCall.safety) {
        this.playerCall.ballNumber = null;
        this.playerCall.pocketIndex = null;
        this.statusText = "Safety called. Shoot a legal safety and play will pass.";
      } else {
        this.statusText = "Safety cleared. Keep the suggestion or choose a legal target ball and pocket.";
      }
      this.syncHud();
    }

    resetGame() {
      this.eventLogEntries = [];
      this.startRack("player", "New rack. You break.");
      this.syncHud();
    }

    startRack(breaker, logMessage = null) {
      this.balls = this.createRack();
      this.currentPlayer = breaker;
      this.breaker = breaker;
      this.playerGroup = null;
      this.cpuGroup = null;
      this.ballInHand = {
        player: breaker,
        restrictedToHeadString: true,
      };
      this.placementPreview = null;
      this.resetShotSetup();
      this.resetShotControls();
      this.activeShot = null;
      this.pendingDecision = null;
      this.breakShotPending = true;
      this.playerCall = this.createEmptyCall();
      this.upcomingShotRestriction = false;
      this.state = breaker === "player" ? "placing-cue-ball" : "cpu-thinking";
      this.winner = null;
      this.statusText =
        breaker === "player"
          ? "Break shot. Place the cue ball above the head string."
          : "CPU prepares the break.";
      this.cpuShotAt = 0;
      this.idleTimer = 0;
      if (logMessage) {
        this.addLog(logMessage);
      }
      this.prepareNextTurn();
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
        spinX: 0,
        spinY: 0,
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
      this.refreshPointerTableCoordinates();

      if (this.isPlayerAimCameraActive() && !this.cameraGesture) {
        this.frameCameraForPlayerShot(this.getAimDirectionForPlayer());
      }

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
        const restrictedToHeadString = Boolean(
          this.ballInHand && this.ballInHand.restrictedToHeadString
        );
        const clamped = this.clampPointToTable(this.pointer.tableX, this.pointer.tableY);
        this.placementPreview = {
          x: clamped.x,
          y: clamped.y,
          valid: this.isCuePlacementValid(clamped.x, clamped.y, restrictedToHeadString),
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

        if (ball.number === 0 && (Math.abs(ball.spinX) > 0.001 || Math.abs(ball.spinY) > 0.001)) {
          const speed = Math.hypot(ball.vx, ball.vy);
          if (speed > 1) {
            const dirX = ball.vx / speed;
            const dirY = ball.vy / speed;
            const normalX = -dirY;
            const normalY = dirX;
            const sideForce = ball.spinX * 44 * deltaSeconds;
            const forwardForce = ball.spinY * 30 * deltaSeconds;
            ball.vx += normalX * sideForce + dirX * forwardForce;
            ball.vy += normalY * sideForce + dirY * forwardForce;
          }

          const spinDecay = Math.exp(-2.4 * deltaSeconds);
          ball.spinX *= spinDecay;
          ball.spinY *= spinDecay;
        }

        if (
          this.activeShot &&
          this.activeShot.restrictedToHeadString &&
          ball.number === 0 &&
          !this.activeShot.firstHit &&
          ball.x > HEAD_STRING_X
        ) {
          this.activeShot.cueCrossedHeadString = true;
        }
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
      for (let pocketIndex = 0; pocketIndex < POCKETS.length; pocketIndex += 1) {
        const pocket = POCKETS[pocketIndex];
        if (distance(ball.x, ball.y, pocket.x, pocket.y) <= pocket.radius) {
          this.pocketBall(ball, pocketIndex);
          return true;
        }
      }

      return false;
    }

    pocketBall(ball, pocketIndex) {
      ball.pocketed = true;
      ball.vx = 0;
      ball.vy = 0;
      ball.spinX = 0;
      ball.spinY = 0;

      if (this.activeShot) {
        this.activeShot.pocketed.push(ball.number);
        this.activeShot.pocketEvents.push({
          number: ball.number,
          pocketIndex,
        });
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
      let verticalRail = false;
      let horizontalRail = false;

      if (ball.x < minX) {
        ball.x = minX;
        ball.vx = Math.abs(ball.vx) * RAIL_RESTITUTION;
        touchedRail = true;
        verticalRail = true;
      } else if (ball.x > maxX) {
        ball.x = maxX;
        ball.vx = -Math.abs(ball.vx) * RAIL_RESTITUTION;
        touchedRail = true;
        verticalRail = true;
      }

      if (ball.y < minY) {
        ball.y = minY;
        ball.vy = Math.abs(ball.vy) * RAIL_RESTITUTION;
        touchedRail = true;
        horizontalRail = true;
      } else if (ball.y > maxY) {
        ball.y = maxY;
        ball.vy = -Math.abs(ball.vy) * RAIL_RESTITUTION;
        touchedRail = true;
        horizontalRail = true;
      }

      if (touchedRail && ball.number === 0) {
        if (verticalRail) {
          ball.vy += ball.spinX * 76;
        }
        if (horizontalRail) {
          ball.vx -= ball.spinX * 76;
        }
        ball.spinX *= 0.48;
        ball.spinY *= 0.72;
      }

      if (touchedRail && this.activeShot) {
        this.activeShot.anyRail = true;
        if (this.activeShot.firstHit) {
          this.activeShot.railAfterContact = true;
        }
        if (this.activeShot.isBreak && ball.number !== 0) {
          this.activeShot.railContactBalls.add(ball.number);
        }
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
        this.activeShot.firstHitWasAboveHeadString = objectBall.x < HEAD_STRING_X;
      }

      const impulse = (-(1 + BALL_RESTITUTION) * speedAlongNormal) / (2 / BALL_MASS);
      const impulseX = impulse * normalX;
      const impulseY = impulse * normalY;

      firstBall.vx -= impulseX / BALL_MASS;
      firstBall.vy -= impulseY / BALL_MASS;
      secondBall.vx += impulseX / BALL_MASS;
      secondBall.vy += impulseY / BALL_MASS;

      const cueBall =
        firstBall.number === 0 ? firstBall : secondBall.number === 0 ? secondBall : null;
      if (cueBall) {
        const cueDirectionSign = cueBall === firstBall ? 1 : -1;
        if (Math.abs(cueBall.spinY) > 0.01) {
          cueBall.vx += normalX * cueDirectionSign * cueBall.spinY * 78;
          cueBall.vy += normalY * cueDirectionSign * cueBall.spinY * 78;
          cueBall.spinY *= 0.36;
        }
        if (Math.abs(cueBall.spinX) > 0.01) {
          const tangentX = -normalY;
          const tangentY = normalX;
          cueBall.vx += tangentX * cueBall.spinX * 34;
          cueBall.vy += tangentY * cueBall.spinX * 34;
          cueBall.spinX *= 0.58;
        }
      }
    }

    areBallsStill() {
      return this.balls.every((ball) => {
        if (ball.pocketed) {
          return true;
        }

        return Math.hypot(ball.vx, ball.vy) < STOP_SPEED;
      });
    }

    isTemporaryEightBallAvailable() {
      return (
        !this.playerGroup &&
        !this.cpuGroup &&
        (this.remainingBallsForGroup("solids") === 0 ||
          this.remainingBallsForGroup("stripes") === 0)
      );
    }

    getHeadStringFoulReason(shot, breakShotLabel) {
      if (!shot.restrictedToHeadString) {
        return "";
      }

      if (shot.cueStartX >= HEAD_STRING_X) {
        return "Cue ball was not placed above the head string.";
      }

      if (!shot.cueCrossedHeadString && (!shot.firstHit || shot.firstHitWasAboveHeadString)) {
        return breakShotLabel
          ? "Cue ball failed to break out of the head string."
          : "Cue ball failed to play out of the head string.";
      }

      return "";
    }

    getBreakFoulReason(shot) {
      const headStringFoul = this.getHeadStringFoulReason(shot, true);
      if (headStringFoul) {
        return headStringFoul;
      }

      if (shot.cueBallPocketed) {
        return "Scratch on the break.";
      }

      return "";
    }

    getStandardFoulReason(shot, legalTargets) {
      const headStringFoul = this.getHeadStringFoulReason(shot, false);
      if (headStringFoul) {
        return headStringFoul;
      }

      if (!shot.firstHit) {
        return "No object ball was struck.";
      }

      if (!legalTargets.includes(shot.firstHit)) {
        return "Wrong first contact.";
      }

      const anyObjectBallPocketed = shot.pocketEvents.some((event) => event.number !== 0);
      if (!anyObjectBallPocketed && !shot.railAfterContact) {
        return "No ball reached a rail after contact.";
      }

      if (shot.cueBallPocketed) {
        return "Scratch.";
      }

      return "";
    }

    didShotMakeCalledBall(shot) {
      if (shot.safety || shot.calledBall === null || shot.calledPocketIndex === null) {
        return false;
      }

      return shot.pocketEvents.some(
        (event) =>
          event.number === shot.calledBall &&
          event.pocketIndex === shot.calledPocketIndex
      );
    }

    respotEightBall() {
      const eightBall = this.balls.find((ball) => ball.number === 8);
      if (!eightBall) {
        return;
      }

      const footSpotX = TABLE.width * 0.72;
      const footSpotY = TABLE.height * 0.5;

      const candidates = [];
      for (let offset = 0; offset <= TABLE.width * 0.28; offset += 6) {
        candidates.push({ x: footSpotX + offset, y: footSpotY });
      }
      for (let offset = 6; offset <= TABLE.width * 0.48; offset += 6) {
        candidates.push({ x: footSpotX - offset, y: footSpotY });
      }

      const placement =
        candidates.find((candidate) => this.isCuePlacementValidForSpot(candidate.x, candidate.y, 8)) ||
        { x: footSpotX, y: footSpotY };

      eightBall.pocketed = false;
      eightBall.x = placement.x;
      eightBall.y = placement.y;
      eightBall.vx = 0;
      eightBall.vy = 0;
    }

    isCuePlacementValidForSpot(x, y, ignoredNumber) {
      if (!this.isPointInsidePlayableArea(x, y, BALL_RADIUS)) {
        return false;
      }

      for (const ball of this.balls) {
        if (ball.number === ignoredNumber || ball.pocketed) {
          continue;
        }

        if (distance(x, y, ball.x, ball.y) < BALL_DIAMETER + 1.5) {
          return false;
        }
      }

      return true;
    }

    rerackAfterBreak(nextBreaker, logMessage) {
      this.startRack(nextBreaker, logMessage);
    }

    setPendingDecision(prompt, options) {
      this.pendingDecision = { prompt, options };
      this.state = "decision";
      this.syncHud();
    }

    clearPendingDecision() {
      this.pendingDecision = null;
      this.decisionRenderKey = "";
    }

    resolveBreakShot(shot, shooter, opponent) {
      const objectBallPocketed = shot.pocketEvents.some(
        (event) => event.number !== 0 && event.number !== 8
      );
      const eightBallPocketed = shot.pocketEvents.some((event) => event.number === 8);
      const foulReason = this.getBreakFoulReason(shot);
      const foul = Boolean(foulReason);
      const legalBreak = objectBallPocketed || shot.railContactBalls.size >= 4;

      this.resetPlayerCall();

      if (eightBallPocketed && foul) {
        this.respotEightBall();
        const logMessage = `${this.nameFor(shooter)} pockets the 8-ball on a foul break.`;
        this.addLog(logMessage);

        if (opponent === "cpu") {
          const option = this.evaluateCpuBreakChoice([
            {
              score: 70,
              action: () => {
                this.currentPlayer = opponent;
                this.ballInHand = {
                  player: opponent,
                  restrictedToHeadString: true,
                };
                this.breakShotPending = false;
                this.statusText = "8-ball spotted. CPU has cue-ball in hand above the head string.";
                this.prepareNextTurn();
              },
            },
            {
              score: 45,
              action: () =>
                this.rerackAfterBreak(shooter, "CPU chooses to have the breaker re-break after the foul break."),
            },
          ]);
          option.action();
          return;
        }

        this.currentPlayer = opponent;
        this.setPendingDecision("Foul break with the 8-ball pocketed. Choose the restart.", [
          {
            label: "Spot 8 and take cue ball in hand",
            action: () => {
              this.clearPendingDecision();
              this.ballInHand = {
                player: opponent,
                restrictedToHeadString: true,
              };
              this.breakShotPending = false;
              this.statusText = "8-ball spotted. You have cue-ball in hand above the head string.";
              this.prepareNextTurn();
            },
          },
          {
            label: "Re-rack and breaker breaks again",
            action: () => {
              this.clearPendingDecision();
              this.rerackAfterBreak(shooter, "You choose to have the breaker re-break after the foul break.");
            },
          },
        ]);
        return;
      }

      if (eightBallPocketed) {
        this.respotEightBall();
        this.addLog(`${this.nameFor(shooter)} pockets the 8-ball on the break.`);

        if (shooter === "cpu") {
          const option = this.evaluateCpuBreakChoice([
            {
              score: this.evaluateOpenTableForCpu() + 15,
              action: () => {
                this.currentPlayer = shooter;
                this.ballInHand = null;
                this.breakShotPending = false;
                this.statusText = "8-ball spotted after the break. Table open.";
                this.prepareNextTurn();
              },
            },
            {
              score: 55,
              action: () =>
                this.rerackAfterBreak(shooter, "CPU chooses to re-break after pocketing the 8-ball."),
            },
          ]);
          option.action();
          return;
        }

        this.currentPlayer = shooter;
        this.setPendingDecision("You pocketed the 8-ball on a legal break. Choose what happens next.", [
          {
            label: "Spot 8 and continue",
            action: () => {
              this.clearPendingDecision();
              this.ballInHand = null;
              this.breakShotPending = false;
              this.statusText = "8-ball spotted after the break. Table open.";
              this.prepareNextTurn();
            },
          },
          {
            label: "Re-rack and break again",
            action: () => {
              this.clearPendingDecision();
              this.rerackAfterBreak(shooter, "You choose to re-break after pocketing the 8-ball.");
            },
          },
        ]);
        return;
      }

      if (foul) {
        this.addLog(`${this.nameFor(shooter)} fouls on the break. ${foulReason}`);

        if (opponent === "cpu") {
          const option = this.evaluateCpuBreakChoice([
            {
              score: this.evaluateOpenTableForCpu() - 10,
              action: () => {
                this.currentPlayer = opponent;
                this.ballInHand = null;
                this.breakShotPending = false;
                this.statusText = "CPU accepts the table after the break foul.";
                this.prepareNextTurn();
              },
            },
            {
              score: this.evaluateOpenTableForCpu() + 20,
              action: () => {
                this.currentPlayer = opponent;
                this.ballInHand = {
                  player: opponent,
                  restrictedToHeadString: true,
                };
                this.breakShotPending = false;
                this.statusText = "CPU takes cue-ball in hand above the head string.";
                this.prepareNextTurn();
              },
            },
          ]);
          option.action();
          return;
        }

        this.currentPlayer = opponent;
        this.setPendingDecision("Break foul. Choose whether to accept the table or take cue-ball in hand above the head string.", [
          {
            label: "Accept table",
            action: () => {
              this.clearPendingDecision();
              this.ballInHand = null;
              this.breakShotPending = false;
              this.statusText = "You accept the table after the break foul.";
              this.prepareNextTurn();
            },
          },
          {
            label: "Cue ball in hand",
            action: () => {
              this.clearPendingDecision();
              this.ballInHand = {
                player: opponent,
                restrictedToHeadString: true,
              };
              this.breakShotPending = false;
              this.statusText = "Cue ball in hand above the head string.";
              this.prepareNextTurn();
            },
          },
        ]);
        return;
      }

      if (!legalBreak) {
        this.addLog(`${this.nameFor(shooter)} makes an illegal break.`);

        if (opponent === "cpu") {
          const option = this.evaluateCpuBreakChoice([
            {
              score: this.evaluateOpenTableForCpu(),
              action: () => {
                this.currentPlayer = opponent;
                this.ballInHand = null;
                this.breakShotPending = false;
                this.statusText = "CPU accepts the table after the illegal break.";
                this.prepareNextTurn();
              },
            },
            {
              score: 68,
              action: () =>
                this.rerackAfterBreak(shooter, "CPU chooses to make the breaker break again."),
            },
          ]);
          option.action();
          return;
        }

        this.currentPlayer = opponent;
        this.setPendingDecision("Illegal break. Choose how to restart the rack.", [
          {
            label: "Accept table",
            action: () => {
              this.clearPendingDecision();
              this.ballInHand = null;
              this.breakShotPending = false;
              this.statusText = "You accept the table after the illegal break.";
              this.prepareNextTurn();
            },
          },
          {
            label: "Make breaker break again",
            action: () => {
              this.clearPendingDecision();
              this.rerackAfterBreak(shooter, "You make the breaker break again.");
            },
          },
        ]);
        return;
      }

      this.breakShotPending = false;
      this.ballInHand = null;
      if (objectBallPocketed) {
        this.currentPlayer = shooter;
        this.statusText = `${this.nameFor(shooter)} makes a legal break. Table open.`;
      } else {
        this.currentPlayer = opponent;
        this.statusText = `Legal break. Table open for ${this.nameFor(opponent)}.`;
      }
      this.prepareNextTurn();
    }

    resolveStandardShot(shot, shooter, opponent) {
      const legalTargets = this.getLegalTargetsFor(shooter);
      const foulReason = this.getStandardFoulReason(shot, legalTargets);
      const foul = Boolean(foulReason);
      const calledShotMade = this.didShotMakeCalledBall(shot);
      const eightBallEvent = shot.pocketEvents.find((event) => event.number === 8);

      if (eightBallEvent) {
        const eightCalledCorrectly =
          shot.calledBall === 8 && shot.calledPocketIndex === eightBallEvent.pocketIndex;
        const readyForEight = this.isOnFinalBlack(shooter);

        let lossReason = "";
        if (foul) {
          lossReason = "pocketing the 8-ball and fouling";
        } else if (!readyForEight) {
          lossReason = "pocketing the 8-ball before clearing the group";
        } else if (!eightCalledCorrectly) {
          lossReason = "pocketing the 8-ball in an uncalled pocket";
        }

        if (lossReason) {
          this.endGame(
            opponent,
            `${this.nameFor(opponent)} wins. ${this.nameFor(shooter)} loses by ${lossReason}.`
          );
          return;
        }

        this.endGame(shooter, `${this.nameFor(shooter)} calls and pockets the 8-ball.`);
        return;
      }

      if (!this.playerGroup && !this.cpuGroup && !foul && calledShotMade && shot.calledBall !== null) {
        const assignedGroup = this.groupForBall(shot.calledBall);
        if (assignedGroup) {
          this.assignGroups(shooter, assignedGroup);
          this.addLog(
            `${this.nameFor(shooter)} claims ${this.labelForGroup(assignedGroup).toLowerCase()}.`
          );
        }
      }

      if (shot.pocketEvents.some((event) => event.number !== 0)) {
        const numbers = shot.pocketEvents
          .filter((event) => event.number !== 0)
          .map((event) => event.number);
        this.addLog(`${this.nameFor(shooter)} pockets ${numbers.join(", ")}.`);
      }

      if (foul) {
        this.addLog(`${this.nameFor(shooter)} fouls. ${foulReason}`);
        this.currentPlayer = opponent;
        this.ballInHand = {
          player: opponent,
          restrictedToHeadString: false,
        };
        this.statusText = `${this.nameFor(shooter)} fouled. ${this.nameFor(opponent)} has cue-ball in hand.`;
      } else if (shot.safety) {
        this.currentPlayer = opponent;
        this.ballInHand = null;
        this.statusText = `${this.nameFor(shooter)} calls safety. ${this.nameFor(opponent)} to shoot.`;
      } else if (calledShotMade) {
        this.currentPlayer = shooter;
        this.ballInHand = null;
        this.statusText = `${this.nameFor(shooter)} pockets the called shot.`;
      } else {
        this.currentPlayer = opponent;
        this.ballInHand = null;
        this.statusText = `Called shot missed. ${this.nameFor(opponent)} to shoot.`;
      }

      this.prepareNextTurn();
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
      if (shot.isBreak) {
        this.resolveBreakShot(shot, shooter, opponent);
        return;
      }

      this.resolveStandardShot(shot, shooter, opponent);
    }

    prepareNextTurn() {
      if (this.winner) {
        this.state = "game-over";
        return;
      }

      if (this.pendingDecision) {
        this.state = "decision";
        return;
      }

      let cpuPlacedFromHand = false;

      if (this.ballInHand && this.ballInHand.player === "player") {
        this.state = "placing-cue-ball";
        this.upcomingShotRestriction = this.ballInHand.restrictedToHeadString;
        this.placementPreview = this.findDefaultPlayerPlacement(
          this.ballInHand.restrictedToHeadString
        );
        this.statusText = this.ballInHand.restrictedToHeadString
          ? "Cue ball in hand above the head string."
          : "Cue ball in hand. Place it anywhere on the table.";
        return;
      }

      if (this.ballInHand && this.ballInHand.player === "cpu") {
        const restrictedToHeadString = this.ballInHand.restrictedToHeadString;
        this.upcomingShotRestriction = restrictedToHeadString;
        const placement = this.findBestCpuPlacement(
          restrictedToHeadString
        );
        this.placeCueBall(placement.x, placement.y);
        this.ballInHand = null;
        cpuPlacedFromHand = true;
        this.addLog(
          this.breakShotPending || restrictedToHeadString
            ? "CPU places the cue ball above the head string."
            : "CPU takes cue-ball in hand."
        );
      }

      if (this.currentPlayer === "cpu") {
        this.playerCall = this.createEmptyCall();
        this.resetShotSetup();
        this.resetShotControls();
        if (!cpuPlacedFromHand) {
          this.upcomingShotRestriction = false;
        }
        this.state = "cpu-thinking";
        this.cpuShotAt = performance.now() + CPU_THINK_TIME_MS;
        this.statusText = this.breakShotPending
          ? "CPU is lining up the break."
          : "CPU is studying the table.";
      } else {
        this.playerCall = this.createEmptyCall();
        this.resetShotSetup();
        this.resetShotControls();
        if (!this.ballInHand) {
          this.upcomingShotRestriction = false;
        }
        this.state = "aim";
        this.statusText = this.breakShotPending
          ? "Loading your suggested break."
          : "Loading your suggested shot.";
        this.autoPlanNextPlayerShot();
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
        return this.isTemporaryEightBallAvailable();
      }

      return this.remainingBallsForGroup(group) === 0;
    }

    getLegalTargetsFor(player) {
      const group = this.groupForPlayer(player);
      if (!group) {
        if (this.isTemporaryEightBallAvailable()) {
          return [8];
        }

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

    isLegalCalledBall(number, player) {
      return this.getLegalTargetsFor(player).includes(number);
    }

    nameFor(player) {
      return player === "player" ? "You" : "CPU";
    }

    evaluateCpuBreakChoice(options) {
      return options.sort((first, second) => second.score - first.score)[0];
    }

    evaluateOpenTableForCpu() {
      const cueBall = this.getCueBall();
      const legalTargets = this.getLegalTargetsFor("cpu");
      const targetBalls = this.balls.filter(
        (ball) => !ball.pocketed && legalTargets.includes(ball.number)
      );

      const pottingOption = this.findCpuPottingOption(targetBalls, cueBall);
      return pottingOption ? pottingOption.confidence * 100 : 25;
    }

    takeCpuTurn() {
      if (this.state !== "cpu-thinking" || this.winner) {
        return;
      }

      if (this.getCueBall().pocketed) {
        const placement = this.findBestCpuPlacement(this.upcomingShotRestriction);
        this.placeCueBall(placement.x, placement.y);
      }

      const choice = this.breakShotPending
        ? this.chooseCpuBreakShot()
        : this.chooseCpuShot();
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

      this.shoot("cpu", direction, finalPower, choice);
      this.statusText = choice.statusText;
      this.addLog(choice.logText);
    }

    chooseCpuBreakShot() {
      const cueBall = this.getCueBall();
      const rackHead = this.balls.find((ball) => ball.number === 1) || this.findRackCenter();
      const biasY = randomBetween(-18, 18);
      return {
        vector: normalize(rackHead.x - cueBall.x, rackHead.y + biasY - cueBall.y),
        power: 900,
        confidence: 0.92,
        calledBall: null,
        calledPocketIndex: null,
        safety: false,
        targetBallNumber: rackHead.number || 1,
        label: "the break",
        statusText: "CPU breaks the rack.",
        logText: "CPU breaks the rack.",
      };
    }

    findCpuPottingOption(targetBalls, cueBall, restrictedPocketIndex = null) {
      const pottingOptions = [];

      for (const targetBall of targetBalls) {
        for (let pocketIndex = 0; pocketIndex < POCKETS.length; pocketIndex += 1) {
          if (restrictedPocketIndex !== null && pocketIndex !== restrictedPocketIndex) {
            continue;
          }

          const pocket = POCKETS[pocketIndex];
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
            targetBallNumber: targetBall.number,
            calledBall: targetBall.number,
            calledPocketIndex: pocketIndex,
            safety: false,
            label: `the ${targetBall.number} to the ${POCKET_LABELS[pocketIndex]}`,
            statusText: `CPU calls the ${targetBall.number} to the ${POCKET_LABELS[pocketIndex]}.`,
            logText: `CPU calls the ${targetBall.number} to the ${POCKET_LABELS[pocketIndex]}.`,
          });
        }
      }

      if (pottingOptions.length === 0) {
        return null;
      }

      pottingOptions.sort((first, second) => second.score - first.score);
      return pottingOptions[0];
    }

    chooseCpuShot() {
      const cueBall = this.getCueBall();
      const legalTargets = this.getLegalTargetsFor("cpu");
      const allTargetBalls = this.balls.filter(
        (ball) => !ball.pocketed && legalTargets.includes(ball.number)
      );
      const restrictedTargets = allTargetBalls.filter((ball) => ball.x >= HEAD_STRING_X);
      const targetBalls =
        this.upcomingShotRestriction && restrictedTargets.length > 0
          ? restrictedTargets
          : allTargetBalls;

      const pottingOption = this.findCpuPottingOption(targetBalls, cueBall);
      if (pottingOption) {
        return pottingOption;
      }

      const safety = this.chooseCpuSafetyShot(targetBalls, cueBall);
      if (safety) {
        return safety;
      }

      const clusterCenter = this.findRackCenter();
      const fallbackTarget = targetBalls[0] || null;
      return {
        vector: normalize(clusterCenter.x - cueBall.x, clusterCenter.y - cueBall.y),
        power: 420,
        confidence: 0.25,
        targetBallNumber: fallbackTarget ? fallbackTarget.number : null,
        calledBall: null,
        calledPocketIndex: null,
        safety: true,
        label: "a containing safety",
        statusText: "CPU calls safety.",
        logText: "CPU calls safety.",
      };
    }

    chooseCpuSafetyShot(targetBalls, cueBall) {
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
          power: clamp(240 + distanceToBall * 0.45, 250, 520),
          confidence,
          score: confidence * 100 - distanceToBall * 0.18,
          targetBallNumber: targetBall.number,
          calledBall: null,
          calledPocketIndex: null,
          safety: true,
          label: `a safety off the ${targetBall.number}`,
          statusText: `CPU calls safety off the ${targetBall.number}.`,
          logText: `CPU calls safety off the ${targetBall.number}.`,
        };

        if (!bestShot || shot.score > bestShot.score) {
          bestShot = shot;
        }
      }

      if (bestShot) {
        return bestShot;
      }

      if (this.upcomingShotRestriction) {
        const crossHeadTarget = {
          x: Math.max(HEAD_STRING_X + 80, TABLE.width * 0.6),
          y: TABLE.height * 0.5 + randomBetween(-120, 120),
        };
        return {
          vector: normalize(crossHeadTarget.x - cueBall.x, crossHeadTarget.y - cueBall.y),
          power: 430,
          confidence: 0.18,
          score: 18,
          targetBallNumber: targetBalls[0] ? targetBalls[0].number : null,
          calledBall: null,
          calledPocketIndex: null,
          safety: true,
          label: "a containing safety up-table",
          statusText: "CPU calls a containing safety.",
          logText: "CPU calls a containing safety.",
        };
      }

      return null;
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

    shoot(shooter, direction, power, choice = null) {
      const cueBall = this.getCueBall();
      const shotChoice =
        choice ||
        (shooter === "player"
          ? {
              calledBall: this.playerCall.ballNumber,
              calledPocketIndex: this.playerCall.pocketIndex,
              safety: this.playerCall.safety,
              spinX: this.shotSpin.x,
              spinY: this.shotSpin.y,
            }
          : {
              calledBall: null,
              calledPocketIndex: null,
              safety: false,
              spinX: 0,
              spinY: 0,
            });

      cueBall.pocketed = false;
      cueBall.vx = direction.x * power;
      cueBall.vy = direction.y * power;
      cueBall.spinX = shotChoice.spinX || 0;
      cueBall.spinY = shotChoice.spinY || 0;
      this.resetShotSetup();
      this.resetShotControls();
      this.state = "balls-moving";
      this.activeShot = {
        shooter,
        isBreak: this.breakShotPending,
        calledBall:
          shotChoice.calledBall === undefined ? null : shotChoice.calledBall,
        calledPocketIndex:
          shotChoice.calledPocketIndex === undefined
            ? null
            : shotChoice.calledPocketIndex,
        safety: Boolean(shotChoice.safety),
        firstHit: null,
        pocketed: [],
        pocketEvents: [],
        cueBallPocketed: false,
        anyRail: false,
        railAfterContact: false,
        railContactBalls: new Set(),
        restrictedToHeadString: this.breakShotPending || this.upcomingShotRestriction,
        cueCrossedHeadString: false,
        cueStartX: cueBall.x,
        firstHitWasAboveHeadString: false,
        cueSpin: {
          x: shotChoice.spinX || 0,
          y: shotChoice.spinY || 0,
        },
      };
      this.upcomingShotRestriction = false;
    }

    getCueBall() {
      return this.balls[0];
    }

    getBallHitAtScreenPoint(screenX, screenY) {
      let best = null;

      for (const ball of this.balls) {
        if (ball.number === 0 || ball.pocketed) {
          continue;
        }

        const projection = this.projectBall(ball);
        if (!projection) {
          continue;
        }

        const hitDistance = distance(screenX, screenY, projection.x, projection.y);
        const maxDistance = projection.radius * 1.2;
        if (hitDistance > maxDistance) {
          continue;
        }

        if (!best || hitDistance < best.distance) {
          best = {
            number: ball.number,
            distance: hitDistance,
          };
        }
      }

      return best;
    }

    getPocketHitAtScreenPoint(screenX, screenY) {
      let best = null;

      for (let pocketIndex = 0; pocketIndex < POCKETS.length; pocketIndex += 1) {
        const pocket = POCKETS[pocketIndex];
        const projection = this.projectWorld(
          this.tableToWorld(pocket.x, pocket.y, SURFACE_Y - 3)
        );
        if (!projection) {
          continue;
        }

        const hitDistance = distance(screenX, screenY, projection.x, projection.y);
        const maxDistance = pocket.radius * projection.scale * 1.45;
        if (hitDistance > maxDistance) {
          continue;
        }

        if (!best || hitDistance < best.distance) {
          best = {
            pocketIndex,
            distance: hitDistance,
          };
        }
      }

      return best;
    }

    handlePointerMove(event) {
      const point = this.getPointerPosition(event);

      this.pointer.screenX = point.x;
      this.pointer.screenY = point.y;
      this.pointer.inside = true;

      if (this.controlDrag) {
        if (this.controlDrag === "spin") {
          this.updateShotSpinFromPoint(point.x, point.y);
        } else if (this.controlDrag === "power") {
          this.updateShotPowerFromPoint(point.y);
        }
      }

      if (this.cameraGesture) {
        const deltaX = point.x - this.cameraGesture.lastScreenX;
        const deltaY = point.y - this.cameraGesture.lastScreenY;
        if (this.isPlayerAimCameraActive()) {
          if (this.cameraGesture.type === "pan") {
            this.adjustPlayerAimCameraPan(deltaX, deltaY);
          } else {
            this.adjustPlayerAimCameraOrbit(deltaX, deltaY);
          }
        } else if (this.cameraGesture.type === "pan") {
          this.panCamera(deltaX, deltaY);
        } else {
          this.orbitCamera(deltaX, deltaY);
        }
        this.cameraGesture.lastScreenX = point.x;
        this.cameraGesture.lastScreenY = point.y;
      } else {
        this.refreshPointerTableCoordinates();
      }
    }

    handlePointerDown(event) {
      const point = this.getPointerPosition(event);
      const tablePoint = this.screenToTable(point.x, point.y);
      const wantsPan =
        event.button === 1 ||
        event.button === 2 ||
        event.altKey ||
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey;
      const cameraGestureType = wantsPan ? "pan" : "orbit";

      this.pointer.screenX = point.x;
      this.pointer.screenY = point.y;
      this.pointer.inside = true;
      this.pointer.tableValid = Boolean(tablePoint);

      if (tablePoint) {
        this.pointer.tableX = tablePoint.x;
        this.pointer.tableY = tablePoint.y;
      }

      if (typeof event.pointerId === "number") {
        try {
          this.canvas.setPointerCapture(event.pointerId);
        } catch (_error) {
          // Ignore unsupported pointer-capture edge cases.
        }
      }

      const canUseShotControls =
        event.button === 0 &&
        this.state === "aim" &&
        this.currentPlayer === "player" &&
        !this.winner;
      if (canUseShotControls) {
        const controlHit = this.hitTestShotControls(point.x, point.y);
        if (controlHit) {
          this.controlDrag = controlHit;
          if (controlHit === "spin") {
            this.updateShotSpinFromPoint(point.x, point.y);
          } else {
            this.updateShotPowerFromPoint(point.y);
          }
          return;
        }
      }

      if (this.state === "placing-cue-ball") {
        if (event.button !== 0) {
          this.startCameraGesture(cameraGestureType, point);
          return;
        }

        if (this.currentPlayer !== "player" || !tablePoint) {
          return;
        }

        const clamped = this.clampPointToTable(tablePoint.x, tablePoint.y);
        const restrictedToHeadString = Boolean(
          this.ballInHand && this.ballInHand.restrictedToHeadString
        );
        if (this.isCuePlacementValid(clamped.x, clamped.y, restrictedToHeadString)) {
          this.placeCueBall(clamped.x, clamped.y);
          this.upcomingShotRestriction = restrictedToHeadString;
          this.ballInHand = null;
          this.state = "aim";
          this.playerCall = this.createEmptyCall();
          this.resetShotSetup();
          this.resetShotControls();
          this.statusText = this.breakShotPending
            ? "Cue ball placed. Loading the suggested break."
            : "Cue ball placed. Loading the suggested shot.";
          this.addLog("You place the cue ball.");
          this.autoPlanNextPlayerShot();
        } else {
          this.statusText = restrictedToHeadString
            ? "That placement must be clear and above the head string."
            : "That placement is blocked. Pick a clearer lane.";
        }
        return;
      }

      if (this.state !== "aim" || this.currentPlayer !== "player" || this.winner) {
        this.startCameraGesture(cameraGestureType, point);
        return;
      }

      const cueBall = this.getCueBall();
      if (cueBall.pocketed || !this.areBallsStill()) {
        this.startCameraGesture(cameraGestureType, point);
        return;
      }

      if (wantsPan) {
        this.startCameraGesture("pan", point);
        return;
      }

      const cueProjection = this.projectBall(cueBall);
      if (!cueProjection) {
        this.startCameraGesture("orbit", point);
        return;
      }

      const cueBallHit =
        distance(point.x, point.y, cueProjection.x, cueProjection.y) <=
        cueProjection.radius * 1.9;

      if (cueBallHit) {
        if (!this.shotSetup.cueSelected) {
          this.selectCueBallForShot();
          return;
        }

        if (!this.isPlayerReadyToShoot()) {
          this.statusText = this.breakShotPending
            ? "Cue ball selected. Click a target ball, set power and spin, then click the cue ball again to break."
            : "Cue ball selected. Click a legal target ball and pocket first.";
          return;
        }

        if (this.shotPower <= 0) {
          this.statusText = "Raise the power above 0% before taking the shot.";
          return;
        }

        const direction = this.getAimDirectionForPlayer();
        if (!direction) {
          this.statusText = "Choose a target direction before taking the shot.";
          return;
        }

        const power = this.getShotSpeedFromControl();
        this.shoot("player", direction, power);
        this.statusText = this.breakShotPending
          ? "Break shot in motion."
          : this.playerCall.safety
            ? "Safety in motion."
            : "Called shot in motion.";
        return;
      }

      const ballHit = this.getBallHitAtScreenPoint(point.x, point.y);
      if (ballHit && this.shotSetup.cueSelected) {
        this.selectTargetBallForShot(ballHit.number);
        return;
      }

      if (!this.breakShotPending && this.shotSetup.cueSelected) {
        const pocketHit = this.getPocketHitAtScreenPoint(point.x, point.y);
        if (pocketHit) {
          this.selectPlayerPocketCall(pocketHit.pocketIndex);
          const targetBall = this.getTargetBallForShot();
          if (targetBall) {
            this.statusText = `Ball ${targetBall.number} to the ${POCKET_LABELS[pocketHit.pocketIndex]} selected. Click the cue ball again to shoot with the current power and spin.`;
          }
          return;
        }
      }

      this.startCameraGesture(cameraGestureType, point);
    }

    handlePointerUp(event) {
      if (typeof event.pointerId === "number") {
        try {
          this.canvas.releasePointerCapture(event.pointerId);
        } catch (_error) {
          // Ignore unsupported pointer-capture edge cases.
        }
      }

      if (this.controlDrag) {
        this.controlDrag = null;
        return;
      }

      if (this.cameraGesture) {
        this.cameraGesture = null;
        return;
      }
    }

    handleWheel(event) {
      event.preventDefault();
      this.pointer.inside = true;
      const point = this.getPointerPosition(event);
      this.pointer.screenX = point.x;
      this.pointer.screenY = point.y;
      if (this.isPlayerAimCameraActive()) {
        this.adjustPlayerAimCameraZoom(event.deltaY);
      } else {
        this.zoomCamera(event.deltaY);
      }
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

    isCuePlacementValid(x, y, restrictedToHeadString = false) {
      if (!this.isPointInsidePlayableArea(x, y, BALL_RADIUS)) {
        return false;
      }

      if (restrictedToHeadString && x >= HEAD_STRING_X) {
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

    findDefaultPlayerPlacement(restrictedToHeadString = false) {
      const defaultX = restrictedToHeadString ? TABLE.width * 0.18 : TABLE.width * 0.25;
      const placement = this.findAnyValidPlacement(
        defaultX,
        TABLE.height * 0.5,
        restrictedToHeadString
      );
      return {
        x: placement.x,
        y: placement.y,
        valid: this.isCuePlacementValid(
          placement.x,
          placement.y,
          restrictedToHeadString
        ),
      };
    }

    findBestCpuPlacement(restrictedToHeadString = false) {
      const legalTargets = this.getLegalTargetsFor("cpu");
      const allCandidateTargets = this.balls.filter(
        (ball) => !ball.pocketed && legalTargets.includes(ball.number)
      );
      const restrictedTargets = allCandidateTargets.filter(
        (ball) => ball.x >= HEAD_STRING_X
      );
      const candidateTargets =
        restrictedToHeadString && restrictedTargets.length > 0
          ? restrictedTargets
          : allCandidateTargets;

      let best = null;

      const maxX = restrictedToHeadString ? HEAD_STRING_X - 14 : TABLE.width * 0.48;
      for (let x = 110; x <= maxX; x += 28) {
        for (let y = 46; y <= TABLE.height - 46; y += 22) {
          if (!this.isCuePlacementValid(x, y, restrictedToHeadString)) {
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

      return this.findAnyValidPlacement(
        restrictedToHeadString ? TABLE.width * 0.18 : TABLE.width * 0.25,
        TABLE.height * 0.5,
        restrictedToHeadString
      );
    }

    findAnyValidPlacement(preferredX, preferredY, restrictedToHeadString = false) {
      const preferred = this.clampPointToTable(preferredX, preferredY);
      if (restrictedToHeadString) {
        preferred.x = Math.min(preferred.x, HEAD_STRING_X - 8);
      }

      if (this.isCuePlacementValid(preferred.x, preferred.y, restrictedToHeadString)) {
        return preferred;
      }

      for (let radius = 0; radius <= 280; radius += 26) {
        for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 8) {
          const candidate = this.clampPointToTable(
            preferred.x + Math.cos(angle) * radius,
            preferred.y + Math.sin(angle) * radius
          );
          if (restrictedToHeadString) {
            candidate.x = Math.min(candidate.x, HEAD_STRING_X - 8);
          }

          if (this.isCuePlacementValid(candidate.x, candidate.y, restrictedToHeadString)) {
            return candidate;
          }
        }
      }

      const maxX = restrictedToHeadString ? Math.floor(HEAD_STRING_X - 8) : TABLE.width - BALL_RADIUS;
      for (let x = BALL_RADIUS; x <= maxX; x += 18) {
        for (let y = BALL_RADIUS; y <= TABLE.height - BALL_RADIUS; y += 18) {
          if (this.isCuePlacementValid(x, y, restrictedToHeadString)) {
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
      this.ui.callLabel.textContent = this.describePlayerCall();
      this.ui.toggleSafetyBtn.textContent = this.playerCall.safety
        ? "Safety: On"
        : "Safety: Off";

      const canEditCall =
        this.currentPlayer === "player" &&
        this.state === "aim" &&
        !this.breakShotPending &&
        !this.pendingDecision;
      this.ui.toggleSafetyBtn.disabled = !canEditCall;
      this.ui.clearCallBtn.disabled =
        !canEditCall ||
        (!this.playerCall.safety &&
          this.playerCall.ballNumber === null &&
          this.playerCall.pocketIndex === null);

      if (this.pendingDecision) {
        this.ui.decisionSection.hidden = false;
        this.ui.decisionPrompt.textContent = this.pendingDecision.prompt;

        const renderKey = JSON.stringify({
          prompt: this.pendingDecision.prompt,
          labels: this.pendingDecision.options.map((option) => option.label),
        });

        if (renderKey !== this.decisionRenderKey) {
          this.ui.decisionButtons.replaceChildren(
            ...this.pendingDecision.options.map((option) => {
              const button = document.createElement("button");
              button.type = "button";
              button.className = "secondary-button";
              button.textContent = option.label;
              button.addEventListener("click", () => option.action());
              return button;
            })
          );
          this.decisionRenderKey = renderKey;
        }
      } else {
        this.ui.decisionSection.hidden = true;
        if (this.decisionRenderKey) {
          this.ui.decisionButtons.replaceChildren();
          this.decisionRenderKey = "";
        }
      }

      let power = 0;
      if (this.currentPlayer === "player" && this.state === "aim") {
        power = this.shotPower;
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

      if (this.state === "aim" && this.currentPlayer === "player" && !this.breakShotPending) {
        this.drawCallOverlay(ctx);
      }

      if (this.state === "aim" && this.currentPlayer === "player") {
        this.drawAimOverlay(ctx);
        this.drawShotControls(ctx);
      }

      if (this.state === "game-over") {
        this.drawWinnerBanner(ctx);
      }
    }

    drawBackdrop(ctx) {
      const roomLight = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
      roomLight.addColorStop(0, "#f6f7f8");
      roomLight.addColorStop(0.62, "#e8ecef");
      roomLight.addColorStop(1, "#d6dee5");
      ctx.fillStyle = roomLight;
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      const backWall = [
        this.projectWorld(
          this.tableToWorld(
            -ROOM.wallInset,
            -ROOM.wallInset,
            ROOM.floorY
          )
        ),
        this.projectWorld(
          this.tableToWorld(
            TABLE.width + ROOM.wallInset,
            -ROOM.wallInset,
            ROOM.floorY
          )
        ),
        this.projectWorld(
          this.tableToWorld(
            TABLE.width + ROOM.wallInset,
            -ROOM.wallInset,
            ROOM.wallTopY
          )
        ),
        this.projectWorld(
          this.tableToWorld(
            -ROOM.wallInset,
            -ROOM.wallInset,
            ROOM.wallTopY
          )
        ),
      ];
      const leftWall = [
        this.projectWorld(
          this.tableToWorld(
            -ROOM.wallInset,
            -ROOM.wallInset,
            ROOM.floorY
          )
        ),
        this.projectWorld(
          this.tableToWorld(
            -ROOM.wallInset,
            TABLE.height + ROOM.wallInset,
            ROOM.floorY
          )
        ),
        this.projectWorld(
          this.tableToWorld(
            -ROOM.wallInset,
            TABLE.height + ROOM.wallInset,
            ROOM.wallTopY
          )
        ),
        this.projectWorld(
          this.tableToWorld(
            -ROOM.wallInset,
            -ROOM.wallInset,
            ROOM.wallTopY
          )
        ),
      ];
      const floor = this.projectRect(
        -ROOM.wallInset,
        -ROOM.wallInset,
        TABLE.width + ROOM.wallInset,
        TABLE.height + ROOM.wallInset + 120,
        ROOM.floorY
      );
      const rug = this.projectRect(
        26,
        34,
        TABLE.width - 26,
        TABLE.height - 34,
        ROOM.floorY + 1.5
      );
      const baseboard = [
        this.projectWorld(
          this.tableToWorld(
            -ROOM.wallInset,
            -ROOM.wallInset + 2,
            ROOM.floorY + 20
          )
        ),
        this.projectWorld(
          this.tableToWorld(
            TABLE.width + ROOM.wallInset,
            -ROOM.wallInset + 2,
            ROOM.floorY + 20
          )
        ),
        this.projectWorld(
          this.tableToWorld(
            TABLE.width + ROOM.wallInset,
            -ROOM.wallInset + 2,
            ROOM.floorY
          )
        ),
        this.projectWorld(
          this.tableToWorld(
            -ROOM.wallInset,
            -ROOM.wallInset + 2,
            ROOM.floorY
          )
        ),
      ];

      const backWallGradient = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
      backWallGradient.addColorStop(0, "#f9fbfc");
      backWallGradient.addColorStop(1, "#e4e8ec");
      this.drawPolygon(ctx, backWall, backWallGradient, "rgba(165, 173, 180, 0.24)", 1);

      const leftWallGradient = ctx.createLinearGradient(0, 0, CANVAS_WIDTH * 0.3, 0);
      leftWallGradient.addColorStop(0, "#dde4e8");
      leftWallGradient.addColorStop(1, "#eef2f4");
      this.drawPolygon(ctx, leftWall, leftWallGradient, "rgba(150, 160, 168, 0.18)", 1);

      const floorGradient = ctx.createLinearGradient(0, CANVAS_HEIGHT * 0.58, 0, CANVAS_HEIGHT);
      floorGradient.addColorStop(0, "#d4bc95");
      floorGradient.addColorStop(0.55, "#b98957");
      floorGradient.addColorStop(1, "#946739");
      this.drawPolygon(ctx, floor, floorGradient);
      this.drawFloorPattern(ctx);

      const rugGradient = ctx.createLinearGradient(0, CANVAS_HEIGHT * 0.5, 0, CANVAS_HEIGHT);
      rugGradient.addColorStop(0, "#f4f5f6");
      rugGradient.addColorStop(1, "#dde1e4");
      this.drawPolygon(ctx, rug, rugGradient, "rgba(148, 154, 160, 0.26)", 1);
      this.drawPolygon(ctx, baseboard, "#f9fbfc");

      const ceilingGlow = ctx.createRadialGradient(
        CANVAS_WIDTH * 0.46,
        CANVAS_HEIGHT * 0.12,
        60,
        CANVAS_WIDTH * 0.46,
        CANVAS_HEIGHT * 0.12,
        380
      );
      ceilingGlow.addColorStop(0, "rgba(255,255,255,0.78)");
      ceilingGlow.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = ceilingGlow;
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      ctx.save();
      ctx.strokeStyle = "rgba(205, 210, 214, 0.35)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(CANVAS_WIDTH * 0.16, 0);
      ctx.lineTo(CANVAS_WIDTH * 0.36, CANVAS_HEIGHT * 0.52);
      ctx.stroke();
      ctx.restore();
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
        64,
        48,
        TABLE.width - 64,
        TABLE.height - 12,
        ROOM.floorY + 2
      );

      this.drawPolygon(ctx, shadow, "rgba(0, 0, 0, 0.15)");
      this.drawPedestalLeg(ctx, TABLE.width * 0.28, TABLE.height * 0.54);
      this.drawPedestalLeg(ctx, TABLE.width * 0.72, TABLE.height * 0.54);

      this.drawPolygon(ctx, leftFace, "#27292c");
      this.drawPolygon(ctx, rightFace, "#171a1d");
      this.drawPolygon(ctx, frontFace, "#111416");

      const railGradient = ctx.createLinearGradient(0, felt[0].y - 40, 0, felt[3].y + 80);
      railGradient.addColorStop(0, "#474b50");
      railGradient.addColorStop(0.38, "#2a2d31");
      railGradient.addColorStop(1, "#111315");
      this.drawPolygon(ctx, outerTop, railGradient, "rgba(255,255,255,0.08)", 1.2);

      const feltGradient = ctx.createLinearGradient(0, felt[0].y, 0, felt[3].y);
      feltGradient.addColorStop(0, "#4ed0ff");
      feltGradient.addColorStop(0.45, "#1ca5e1");
      feltGradient.addColorStop(1, "#1483bf");
      this.drawPolygon(ctx, felt, feltGradient, "rgba(255,255,255,0.16)", 1.2);

      this.drawTableGuides(ctx);
      this.drawPockets(ctx);
      this.drawSightMarks(ctx);
    }

    drawFloorPattern(ctx) {
      const patternHeight = ROOM.floorY + 0.8;

      for (let offset = -500; offset <= TABLE.width + 500; offset += 84) {
        this.drawPolyline(
          ctx,
          [
            this.projectWorld(this.tableToWorld(offset, -ROOM.wallInset, patternHeight)),
            this.projectWorld(
              this.tableToWorld(offset + 360, TABLE.height + ROOM.wallInset, patternHeight)
            ),
          ],
          "rgba(110, 73, 39, 0.16)",
          1
        );
      }

      for (let offset = -260; offset <= TABLE.width + 720; offset += 84) {
        this.drawPolyline(
          ctx,
          [
            this.projectWorld(this.tableToWorld(offset, -ROOM.wallInset, patternHeight)),
            this.projectWorld(
              this.tableToWorld(offset - 340, TABLE.height + ROOM.wallInset, patternHeight)
            ),
          ],
          "rgba(132, 90, 50, 0.12)",
          1
        );
      }
    }

    drawPedestalLeg(ctx, centerX, centerY) {
      const topHeight = TABLE.frameBottomY + 4;
      const bottomHeight = ROOM.floorY + 1;
      const topLeft = this.projectWorld(
        this.tableToWorld(centerX - 40, centerY, topHeight)
      );
      const topRight = this.projectWorld(
        this.tableToWorld(centerX + 40, centerY, topHeight)
      );
      const bottomRight = this.projectWorld(
        this.tableToWorld(centerX + 70, centerY, bottomHeight)
      );
      const bottomLeft = this.projectWorld(
        this.tableToWorld(centerX - 70, centerY, bottomHeight)
      );
      const topEllipse = this.projectCirclePoints(centerX, centerY, 44, topHeight, 24);
      const bottomEllipse = this.projectCirclePoints(centerX, centerY, 72, bottomHeight, 28);
      const legGradient = ctx.createLinearGradient(
        bottomLeft ? bottomLeft.x : 0,
        topLeft ? topLeft.y : 0,
        bottomRight ? bottomRight.x : 0,
        bottomRight ? bottomRight.y : CANVAS_HEIGHT
      );
      legGradient.addColorStop(0, "#3b3f44");
      legGradient.addColorStop(0.45, "#1e2125");
      legGradient.addColorStop(1, "#090b0d");

      this.drawPolygon(ctx, bottomEllipse, "#0c0e10");
      this.drawPolygon(ctx, [topLeft, topRight, bottomRight, bottomLeft], legGradient);
      this.drawPolygon(ctx, topEllipse, "#121416", "rgba(255,255,255,0.08)", 0.8);
    }

    drawTableGuides(ctx) {
      const headX = TABLE.width * 0.25;
      this.drawPolyline(
        ctx,
        [
          this.projectWorld(this.tableToWorld(headX, 24, SURFACE_Y + 0.2)),
            this.projectWorld(this.tableToWorld(headX, TABLE.height - 24, SURFACE_Y + 0.2)),
        ],
        "rgba(255,255,255,0.2)",
        2
      );

      const spot = this.projectCirclePoints(headX, TABLE.height * 0.5, 6, SURFACE_Y + 0.3, 20);
      this.drawPolygon(ctx, spot, "rgba(255,255,255,0.24)");
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
        this.drawPolygon(ctx, ring, "rgba(8, 10, 12, 0.92)");

        const hole = this.projectCirclePoints(
          pocket.x,
          pocket.y,
          pocket.radius,
          SURFACE_Y - 12,
          34
        );
        this.drawPolygon(ctx, hole, "#000000");
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
        this.drawPolygon(ctx, topMark, "rgba(88, 92, 98, 0.82)");
        this.drawPolygon(ctx, bottomMark, "rgba(88, 92, 98, 0.82)");
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
        this.drawPolygon(ctx, leftMark, "rgba(88, 92, 98, 0.82)");
        this.drawPolygon(ctx, rightMark, "rgba(88, 92, 98, 0.82)");
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
        ctx.fillStyle = "rgba(0, 0, 0, 0.18)";
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

    drawCallOverlay(ctx) {
      if (this.playerCall.pocketIndex !== null) {
        const pocket = POCKETS[this.playerCall.pocketIndex];
        const ring = this.projectCirclePoints(
          pocket.x,
          pocket.y,
          pocket.radius + 10,
          SURFACE_Y + 0.4,
          30
        );
        this.drawPolyline(
          ctx,
          [...ring, ring[0]],
          "rgba(255, 222, 120, 0.96)",
          2.4,
          [7, 6]
        );
      }

      if (this.playerCall.ballNumber !== null) {
        const targetBall = this.balls.find(
          (ball) => ball.number === this.playerCall.ballNumber && !ball.pocketed
        );
        const projection = targetBall ? this.projectBall(targetBall) : null;
        if (projection) {
          ctx.save();
          ctx.strokeStyle = "rgba(255, 222, 120, 0.96)";
          ctx.lineWidth = Math.max(1.5, projection.radius * 0.16);
          ctx.setLineDash([8, 6]);
          ctx.beginPath();
          ctx.arc(
            projection.x,
            projection.y,
            projection.radius * 1.28,
            0,
            Math.PI * 2
          );
          ctx.stroke();
          ctx.restore();
        }
      }
    }

    drawShotControls(ctx) {
      const layout = this.getShotControlLayout();
      const knobX = layout.spinCenterX + this.shotSpin.x * layout.knobLimit;
      const knobY = layout.spinCenterY - this.shotSpin.y * layout.knobLimit;
      const fillHeight = layout.powerHeight * this.shotPower;
      const fillY = layout.powerY + layout.powerHeight - fillHeight;

      ctx.save();
      ctx.fillStyle = "rgba(8, 18, 30, 0.58)";
      this.roundRect(ctx, layout.panelX, layout.panelY, layout.panelWidth, layout.panelHeight, 22);
      ctx.fill();

      ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
      ctx.lineWidth = 1;
      this.roundRect(ctx, layout.panelX, layout.panelY, layout.panelWidth, layout.panelHeight, 22);
      ctx.stroke();

      ctx.fillStyle = "rgba(235, 242, 248, 0.9)";
      ctx.font = "700 11px 'Trebuchet MS'";
      ctx.textAlign = "center";
      ctx.fillText("POWER", layout.panelX + layout.panelWidth * 0.5, layout.panelY + 20);
      ctx.fillText("SPIN", layout.panelX + layout.panelWidth * 0.5, layout.spinCenterY + layout.spinRadius + 26);

      ctx.fillStyle = "rgba(255,255,255,0.08)";
      this.roundRect(ctx, layout.powerX, layout.powerY, layout.powerWidth, layout.powerHeight, 12);
      ctx.fill();

      const powerGradient = ctx.createLinearGradient(
        layout.powerX,
        layout.powerY,
        layout.powerX,
        layout.powerY + layout.powerHeight
      );
      powerGradient.addColorStop(0, "#ff835b");
      powerGradient.addColorStop(0.48, "#ffd767");
      powerGradient.addColorStop(1, "#7df3cf");
      ctx.fillStyle = powerGradient;
      this.roundRect(ctx, layout.powerX, fillY, layout.powerWidth, Math.max(fillHeight, 8), 12);
      ctx.fill();

      ctx.strokeStyle = "rgba(255,255,255,0.16)";
      ctx.lineWidth = 1;
      this.roundRect(ctx, layout.powerX, layout.powerY, layout.powerWidth, layout.powerHeight, 12);
      ctx.stroke();

      ctx.fillStyle = "#f2f6fb";
      ctx.font = "700 12px 'Trebuchet MS'";
      ctx.fillText(`${Math.round(this.shotPower * 100)}%`, layout.panelX + layout.panelWidth * 0.5, layout.powerY + layout.powerHeight + 20);

      const sphereGradient = ctx.createRadialGradient(
        layout.spinCenterX - 12,
        layout.spinCenterY - 14,
        8,
        layout.spinCenterX,
        layout.spinCenterY,
        layout.spinRadius
      );
      sphereGradient.addColorStop(0, "#ffffff");
      sphereGradient.addColorStop(1, "#dce5ef");
      ctx.fillStyle = sphereGradient;
      ctx.beginPath();
      ctx.arc(layout.spinCenterX, layout.spinCenterY, layout.spinRadius, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = "rgba(37, 55, 80, 0.26)";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(layout.spinCenterX, layout.spinCenterY, layout.spinRadius, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = "rgba(72, 92, 118, 0.2)";
      ctx.beginPath();
      ctx.moveTo(layout.spinCenterX - layout.spinRadius + 8, layout.spinCenterY);
      ctx.lineTo(layout.spinCenterX + layout.spinRadius - 8, layout.spinCenterY);
      ctx.moveTo(layout.spinCenterX, layout.spinCenterY - layout.spinRadius + 8);
      ctx.lineTo(layout.spinCenterX, layout.spinCenterY + layout.spinRadius - 8);
      ctx.stroke();

      ctx.fillStyle = "#1a2735";
      ctx.beginPath();
      ctx.arc(knobX, knobY, layout.knobRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.48)";
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.restore();
    }

    drawAimOverlay(ctx) {
      const cueBall = this.getCueBall();
      if (cueBall.pocketed) {
        return;
      }

      if (!this.shotSetup.cueSelected) {
        return;
      }

      const direction = this.getAimDirectionForPlayer();

      if (!direction) {
        return;
      }

      const guideDistance = clamp(190 + this.shotPower * 140, 180, 340);

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
        "rgba(255,255,255,0.58)",
        1.9,
        [8, 10]
      );

      const cueProjection = this.projectBall(cueBall);
      if (cueProjection && this.shotSetup.cueSelected) {
        ctx.save();
        ctx.strokeStyle = "rgba(255, 232, 158, 0.95)";
        ctx.lineWidth = Math.max(1.5, cueProjection.radius * 0.16);
        ctx.setLineDash([8, 6]);
        ctx.beginPath();
        ctx.arc(
          cueProjection.x,
          cueProjection.y,
          cueProjection.radius * 1.34,
          0,
          Math.PI * 2
        );
        ctx.stroke();
        ctx.restore();
      }

      const targetBall = this.getTargetBallForShot();
      if (targetBall) {
        const targetProjection = this.projectBall(targetBall);
        if (targetProjection) {
          ctx.save();
          ctx.strokeStyle = "rgba(120, 226, 255, 0.95)";
          ctx.lineWidth = Math.max(1.4, targetProjection.radius * 0.14);
          ctx.setLineDash([7, 6]);
          ctx.beginPath();
          ctx.arc(
            targetProjection.x,
            targetProjection.y,
            targetProjection.radius * 1.28,
            0,
            Math.PI * 2
          );
          ctx.stroke();
          ctx.restore();
        }
      }

      const pull = 28 + this.shotPower * 92;
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
    const modeScreen = document.getElementById("modeScreen");
    const poolApp = document.getElementById("poolApp");
    const pokerApp = document.getElementById("pokerApp");
    const choosePoolBtn = document.getElementById("choosePoolBtn");
    const choosePokerBtn = document.getElementById("choosePokerBtn");
    const backToMenuFromPoolBtn = document.getElementById("backToMenuFromPoolBtn");
    const backToMenuFromPokerBtn = document.getElementById("backToMenuFromPokerBtn");

    let poolGame = null;
    let pokerGame = null;

    const launchPool = () => {
      modeScreen.hidden = true;
      pokerApp.hidden = true;
      poolApp.hidden = false;

      if (!poolGame) {
        poolGame = new PoolGame();
        return;
      }

      poolGame.resetGame();
    };

    const launchPoker = () => {
      modeScreen.hidden = true;
      poolApp.hidden = true;
      pokerApp.hidden = false;

      if (!pokerGame && window.PokerGame) {
        pokerGame = new window.PokerGame();
        return;
      }

      if (pokerGame) {
        pokerGame.resetMatch();
      }
    };

    const showModeMenu = () => {
      modeScreen.hidden = false;
      poolApp.hidden = true;
      pokerApp.hidden = true;
    };

    choosePoolBtn.addEventListener("click", launchPool);
    choosePokerBtn.addEventListener("click", launchPoker);
    backToMenuFromPoolBtn.addEventListener("click", showModeMenu);
    backToMenuFromPokerBtn.addEventListener("click", showModeMenu);
  });
})();
