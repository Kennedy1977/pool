(() => {
  const CANVAS_WIDTH = 1280;
  const CANVAS_HEIGHT = 760;

  const CAMERA = {
    position: { x: 0, y: 640, z: -780 },
    target: { x: 0, y: 46, z: 70 },
    fovRadians: (38 * Math.PI) / 180,
    screenX: CANVAS_WIDTH * 0.5,
    screenY: CANVAS_HEIGHT * 0.58,
  };

  const TABLE = {
    outerWidth: 920,
    outerDepth: 500,
    outerRadius: 180,
    raceTrackWidth: 860,
    raceTrackDepth: 442,
    raceTrackRadius: 150,
    feltWidth: 796,
    feltDepth: 382,
    feltRadius: 130,
    topY: 28,
  };

  const STARTING_STACK = 1000;
  const BLINDS = {
    small: 10,
    big: 20,
  };

  const SUITS = ["S", "H", "D", "C"];
  const RANKS = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];
  const RANK_LABELS = {
    2: "2",
    3: "3",
    4: "4",
    5: "5",
    6: "6",
    7: "7",
    8: "8",
    9: "9",
    10: "T",
    11: "J",
    12: "Q",
    13: "K",
    14: "A",
  };
  const SUIT_COLORS = {
    S: "#f2f5fb",
    C: "#9ef0cf",
    H: "#ff7b8f",
    D: "#f6c660",
  };

  const STREET_LABELS = {
    preflop: "Pre-Flop",
    flop: "Flop",
    turn: "Turn",
    river: "River",
    showdown: "Showdown",
    handover: "Hand Over",
  };

  const HAND_CATEGORY_NAMES = [
    "High Card",
    "One Pair",
    "Two Pair",
    "Three of a Kind",
    "Straight",
    "Flush",
    "Full House",
    "Four of a Kind",
    "Straight Flush",
  ];

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function lerp(start, end, amount) {
    return start + (end - start) * amount;
  }

  function randomBetween(min, max) {
    return min + Math.random() * (max - min);
  }

  function shuffle(array) {
    const clone = array.slice();
    for (let index = clone.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(Math.random() * (index + 1));
      const temp = clone[index];
      clone[index] = clone[swapIndex];
      clone[swapIndex] = temp;
    }
    return clone;
  }

  function otherPlayer(player) {
    return player === "player" ? "cpu" : "player";
  }

  function normalize3(vector) {
    const magnitude = Math.hypot(vector.x, vector.y, vector.z) || 1;
    return {
      x: vector.x / magnitude,
      y: vector.y / magnitude,
      z: vector.z / magnitude,
    };
  }

  function subtract3(a, b) {
    return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
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

  function createCamera() {
    const forward = normalize3(subtract3(CAMERA.target, CAMERA.position));
    const right = normalize3(cross3(forward, { x: 0, y: 1, z: 0 }));
    const up = normalize3(cross3(right, forward));

    return {
      ...CAMERA,
      forward,
      right,
      up,
      focalLength: (CANVAS_HEIGHT * 0.5) / Math.tan(CAMERA.fovRadians * 0.5),
    };
  }

  function projectWorld(point, camera) {
    const relative = subtract3(point, camera.position);
    const depth = dot3(relative, camera.forward);
    if (depth <= 1) {
      return null;
    }

    const horizontal = dot3(relative, camera.right);
    const vertical = dot3(relative, camera.up);
    const scale = camera.focalLength / depth;

    return {
      x: camera.screenX + horizontal * scale,
      y: camera.screenY - vertical * scale,
      scale,
      depth,
    };
  }

  function roundedTablePoints(width, depth, radius, y, segmentsPerCorner = 10) {
    const points = [];
    const halfWidth = width * 0.5;
    const halfDepth = depth * 0.5;
    const xLimit = halfWidth - radius;
    const zLimit = halfDepth - radius;
    const cornerAngles = [
      { centerX: xLimit, centerZ: -zLimit, start: -Math.PI * 0.5, end: 0 },
      { centerX: xLimit, centerZ: zLimit, start: 0, end: Math.PI * 0.5 },
      { centerX: -xLimit, centerZ: zLimit, start: Math.PI * 0.5, end: Math.PI },
      { centerX: -xLimit, centerZ: -zLimit, start: Math.PI, end: Math.PI * 1.5 },
    ];

    for (const corner of cornerAngles) {
      for (let step = 0; step <= segmentsPerCorner; step += 1) {
        const amount = step / segmentsPerCorner;
        const angle = lerp(corner.start, corner.end, amount);
        points.push({
          x: corner.centerX + Math.cos(angle) * radius,
          y,
          z: corner.centerZ + Math.sin(angle) * radius,
        });
      }
    }

    return points;
  }

  function compareScoreArrays(first, second) {
    const length = Math.max(first.length, second.length);
    for (let index = 0; index < length; index += 1) {
      const delta = (first[index] || 0) - (second[index] || 0);
      if (delta !== 0) {
        return delta > 0 ? 1 : -1;
      }
    }
    return 0;
  }

  function evaluateFiveCardHand(cards) {
    const ranks = cards.map((card) => card.rank).sort((a, b) => b - a);
    const suitCounts = new Map();
    const rankCounts = new Map();

    for (const card of cards) {
      suitCounts.set(card.suit, (suitCounts.get(card.suit) || 0) + 1);
      rankCounts.set(card.rank, (rankCounts.get(card.rank) || 0) + 1);
    }

    const flush = [...suitCounts.values()].some((count) => count === 5);
    const uniqueRanks = [...new Set(ranks)];
    let straightHigh = 0;

    if (uniqueRanks.length === 5) {
      if (uniqueRanks[0] - uniqueRanks[4] === 4) {
        straightHigh = uniqueRanks[0];
      } else if (
        uniqueRanks[0] === 14 &&
        uniqueRanks[1] === 5 &&
        uniqueRanks[2] === 4 &&
        uniqueRanks[3] === 3 &&
        uniqueRanks[4] === 2
      ) {
        straightHigh = 5;
      }
    }

    const groups = [...rankCounts.entries()]
      .map(([rank, count]) => ({ rank, count }))
      .sort((first, second) => {
        if (second.count !== first.count) {
          return second.count - first.count;
        }
        return second.rank - first.rank;
      });

    let category = 0;
    let score = [];

    if (flush && straightHigh) {
      category = 8;
      score = [straightHigh];
    } else if (groups[0].count === 4) {
      category = 7;
      score = [groups[0].rank, groups[1].rank];
    } else if (groups[0].count === 3 && groups[1].count === 2) {
      category = 6;
      score = [groups[0].rank, groups[1].rank];
    } else if (flush) {
      category = 5;
      score = ranks;
    } else if (straightHigh) {
      category = 4;
      score = [straightHigh];
    } else if (groups[0].count === 3) {
      category = 3;
      const kickers = groups
        .filter((group) => group.count === 1)
        .map((group) => group.rank)
        .sort((a, b) => b - a);
      score = [groups[0].rank, ...kickers];
    } else if (groups[0].count === 2 && groups[1].count === 2) {
      category = 2;
      const highPair = Math.max(groups[0].rank, groups[1].rank);
      const lowPair = Math.min(groups[0].rank, groups[1].rank);
      const kicker = groups.find((group) => group.count === 1).rank;
      score = [highPair, lowPair, kicker];
    } else if (groups[0].count === 2) {
      category = 1;
      const kickers = groups
        .filter((group) => group.count === 1)
        .map((group) => group.rank)
        .sort((a, b) => b - a);
      score = [groups[0].rank, ...kickers];
    } else {
      category = 0;
      score = ranks;
    }

    return {
      category,
      score,
      name: HAND_CATEGORY_NAMES[category],
    };
  }

  function compareEvaluatedHands(first, second) {
    if (first.category !== second.category) {
      return first.category > second.category ? 1 : -1;
    }

    return compareScoreArrays(first.score, second.score);
  }

  function evaluateBestHand(cards) {
    let best = null;

    for (let a = 0; a < cards.length - 4; a += 1) {
      for (let b = a + 1; b < cards.length - 3; b += 1) {
        for (let c = b + 1; c < cards.length - 2; c += 1) {
          for (let d = c + 1; d < cards.length - 1; d += 1) {
            for (let e = d + 1; e < cards.length; e += 1) {
              const candidateCards = [
                cards[a],
                cards[b],
                cards[c],
                cards[d],
                cards[e],
              ];
              const candidate = evaluateFiveCardHand(candidateCards);
              if (!best || compareEvaluatedHands(candidate, best) > 0) {
                best = {
                  ...candidate,
                  cards: candidateCards,
                };
              }
            }
          }
        }
      }
    }

    return best;
  }

  function createDeck() {
    const deck = [];
    for (const suit of SUITS) {
      for (const rank of RANKS) {
        deck.push({ rank, suit });
      }
    }
    return deck;
  }

  function drawRandomCard(cards) {
    const index = Math.floor(Math.random() * cards.length);
    const [card] = cards.splice(index, 1);
    return card;
  }

  function cardLabel(card) {
    return `${RANK_LABELS[card.rank]}${card.suit}`;
  }

  function formatCurrency(value) {
    return `$${Math.round(value)}`;
  }

  function describeMadeHand(bestHand) {
    if (!bestHand) {
      return "No hand yet";
    }

    if (bestHand.category === 1) {
      return `Pair of ${RANK_LABELS[bestHand.score[0]]}s`;
    }

    if (bestHand.category === 2) {
      return `Two Pair ${RANK_LABELS[bestHand.score[0]]}/${RANK_LABELS[bestHand.score[1]]}`;
    }

    if (bestHand.category === 3) {
      return `Trips ${RANK_LABELS[bestHand.score[0]]}`;
    }

    if (bestHand.category === 4) {
      return `Straight to ${RANK_LABELS[bestHand.score[0]]}`;
    }

    if (bestHand.category === 5) {
      return "Flush";
    }

    if (bestHand.category === 6) {
      return `Full House ${RANK_LABELS[bestHand.score[0]]} over ${RANK_LABELS[bestHand.score[1]]}`;
    }

    if (bestHand.category === 7) {
      return `Quads ${RANK_LABELS[bestHand.score[0]]}`;
    }

    if (bestHand.category === 8) {
      return `Straight Flush to ${RANK_LABELS[bestHand.score[0]]}`;
    }

    return `${bestHand.name} ${RANK_LABELS[bestHand.score[0]] || ""}`.trim();
  }

  class PokerGame {
    constructor() {
      this.canvas = document.getElementById("pokerCanvas");
      if (!this.canvas) {
        return;
      }

      this.ctx = this.canvas.getContext("2d");
      this.camera = createCamera();
      this.deck = [];
      this.board = [];
      this.holeCards = {
        player: [],
        cpu: [],
      };
      this.stacks = {
        player: STARTING_STACK,
        cpu: STARTING_STACK,
      };
      this.streetContribution = {
        player: 0,
        cpu: 0,
      };
      this.totalContribution = {
        player: 0,
        cpu: 0,
      };
      this.folded = {
        player: false,
        cpu: false,
      };
      this.showCpuCards = false;
      this.eventLogEntries = [];
      this.pot = 0;
      this.street = "preflop";
      this.dealer = "player";
      this.activePlayer = "player";
      this.currentBet = 0;
      this.raisesThisStreet = 0;
      this.actedThisStreet = new Set();
      this.handOver = false;
      this.matchOver = false;
      this.statusText = "";
      this.actionLabel = "";
      this.handNumber = 0;
      this.lastTimestamp = 0;
      this.time = 0;
      this.cpuTimer = null;

      this.ui = {
        newMatchBtn: document.getElementById("newPokerMatchBtn"),
        foldBtn: document.getElementById("pokerFoldBtn"),
        callBtn: document.getElementById("pokerCallBtn"),
        raiseBtn: document.getElementById("pokerRaiseBtn"),
        nextHandBtn: document.getElementById("pokerNextHandBtn"),
        streetLabel: document.getElementById("pokerStreetLabel"),
        potLabel: document.getElementById("pokerPotLabel"),
        dealerLabel: document.getElementById("pokerDealerLabel"),
        actionLabel: document.getElementById("pokerActionLabel"),
        playerStackLabel: document.getElementById("pokerPlayerStackLabel"),
        cpuStackLabel: document.getElementById("pokerCpuStackLabel"),
        toCallLabel: document.getElementById("pokerToCallLabel"),
        betSizeLabel: document.getElementById("pokerBetSizeLabel"),
        playerCardsLabel: document.getElementById("pokerPlayerCardsLabel"),
        boardLabel: document.getElementById("pokerBoardLabel"),
        cpuCardsLabel: document.getElementById("pokerCpuCardsLabel"),
        statusLabel: document.getElementById("pokerStatusLabel"),
        eventLog: document.getElementById("pokerEventLog"),
      };

      this.bindEvents();
      this.resetMatch();
      requestAnimationFrame((timestamp) => this.animate(timestamp));
    }

    bindEvents() {
      this.ui.newMatchBtn.addEventListener("click", () => this.resetMatch());
      this.ui.foldBtn.addEventListener("click", () => this.handlePlayerFold());
      this.ui.callBtn.addEventListener("click", () => this.handlePlayerCheckCall());
      this.ui.raiseBtn.addEventListener("click", () => this.handlePlayerBetRaise());
      this.ui.nextHandBtn.addEventListener("click", () => {
        if (this.matchOver) {
          this.resetMatch();
          return;
        }

        this.startHand();
      });
    }

    clearCpuTimer() {
      if (this.cpuTimer) {
        clearTimeout(this.cpuTimer);
        this.cpuTimer = null;
      }
    }

    nameFor(player) {
      return player === "player" ? "You" : "CPU";
    }

    addLog(message) {
      this.eventLogEntries.unshift(message);
      this.eventLogEntries = this.eventLogEntries.slice(0, 12);
    }

    describeSeatStrength(player) {
      const cards = this.holeCards[player];
      if (!cards.length) {
        return "Waiting";
      }

      if (this.board.length >= 3) {
        return describeMadeHand(
          evaluateBestHand([...cards, ...this.board])
        );
      }

      return `Hole cards ${this.formatPlayerCards(cards)}`;
    }

    resetMatch() {
      this.clearCpuTimer();
      this.eventLogEntries = [];
      this.stacks = {
        player: STARTING_STACK,
        cpu: STARTING_STACK,
      };
      this.dealer = "player";
      this.handNumber = 0;
      this.matchOver = false;
      this.addLog("New poker match. Blinds are $10 / $20.");
      this.startHand(true);
    }

    startHand(isFreshMatch = false) {
      this.clearCpuTimer();

      if (!isFreshMatch) {
        this.dealer = otherPlayer(this.dealer);
      }

      if (this.stacks.player <= 0 || this.stacks.cpu <= 0) {
        this.finishMatch();
        this.syncUi();
        return;
      }

      this.handNumber += 1;
      this.deck = shuffle(createDeck());
      this.board = [];
      this.holeCards = {
        player: [],
        cpu: [],
      };
      this.folded = {
        player: false,
        cpu: false,
      };
      this.showCpuCards = false;
      this.pot = 0;
      this.street = "preflop";
      this.currentBet = 0;
      this.raisesThisStreet = 0;
      this.actedThisStreet = new Set();
      this.streetContribution = {
        player: 0,
        cpu: 0,
      };
      this.totalContribution = {
        player: 0,
        cpu: 0,
      };
      this.handOver = false;
      this.matchOver = false;

      this.dealHoleCards();

      const smallBlindPlayer = this.dealer;
      const bigBlindPlayer = otherPlayer(this.dealer);
      this.postBlind(smallBlindPlayer, BLINDS.small, "small blind");
      this.postBlind(bigBlindPlayer, BLINDS.big, "big blind");

      this.currentBet = this.streetContribution[bigBlindPlayer];
      this.activePlayer = smallBlindPlayer;
      this.statusText = `${this.nameFor(this.activePlayer)} to act pre-flop.`;
      this.actionLabel = this.activePlayer === "player" ? "Your turn" : "CPU thinking";

      this.addLog(
        `Hand ${this.handNumber}. ${this.nameFor(this.dealer)} has the button.`
      );

      this.syncUi();
      this.maybeScheduleCpu();
    }

    finishMatch() {
      this.handOver = true;
      this.matchOver = true;
      this.showCpuCards = true;

      if (this.stacks.player === this.stacks.cpu) {
        this.statusText = "The match finishes level.";
        this.actionLabel = "Match over";
        this.addLog("The match finishes level.");
        return;
      }

      const winner = this.stacks.player > this.stacks.cpu ? "player" : "cpu";
      this.statusText = `${this.nameFor(winner)} win the poker match.`;
      this.actionLabel = "Match over";
      this.addLog(`${this.nameFor(winner)} win the match.`);
    }

    dealHoleCards() {
      const dealOrder = [
        this.dealer,
        otherPlayer(this.dealer),
        this.dealer,
        otherPlayer(this.dealer),
      ];

      for (const player of dealOrder) {
        this.holeCards[player].push(this.deck.pop());
      }
    }

    postBlind(player, amount, label) {
      const paid = Math.min(amount, this.stacks[player]);
      this.stacks[player] -= paid;
      this.pot += paid;
      this.streetContribution[player] += paid;
      this.totalContribution[player] += paid;
      this.addLog(`${this.nameFor(player)} posts the ${label} of ${formatCurrency(paid)}.`);
    }

    getBetSize() {
      return this.street === "turn" || this.street === "river"
        ? BLINDS.big * 2
        : BLINDS.big;
    }

    getToCall(player) {
      return Math.max(0, this.currentBet - this.streetContribution[player]);
    }

    canPlayerAct(player) {
      return (
        !this.handOver &&
        !this.matchOver &&
        this.activePlayer === player
      );
    }

    canAggress(player) {
      const toCall = this.getToCall(player);
      return (
        this.stacks[player] > toCall &&
        (this.currentBet === 0 || this.raisesThisStreet < 2)
      );
    }

    commitChips(player, amount) {
      const paid = Math.min(amount, this.stacks[player]);
      this.stacks[player] -= paid;
      this.pot += paid;
      this.streetContribution[player] += paid;
      this.totalContribution[player] += paid;
      return paid;
    }

    isAllInSituation() {
      return (
        !this.folded.player &&
        !this.folded.cpu &&
        (this.stacks.player === 0 || this.stacks.cpu === 0)
      );
    }

    isBettingRoundComplete() {
      return (
        this.actedThisStreet.has("player") &&
        this.actedThisStreet.has("cpu") &&
        this.streetContribution.player === this.streetContribution.cpu
      );
    }

    handlePlayerFold() {
      if (!this.canPlayerAct("player") || this.getToCall("player") <= 0) {
        return;
      }

      this.takeAction("player", "fold");
    }

    handlePlayerCheckCall() {
      if (!this.canPlayerAct("player")) {
        return;
      }

      this.takeAction("player", this.getToCall("player") > 0 ? "call" : "check");
    }

    handlePlayerBetRaise() {
      if (!this.canPlayerAct("player") || !this.canAggress("player")) {
        return;
      }

      this.takeAction(
        "player",
        this.currentBet > 0 ? "raise" : "bet"
      );
    }

    takeAction(player, action) {
      if (!this.canPlayerAct(player)) {
        return;
      }

      this.clearCpuTimer();

      const opponent = otherPlayer(player);
      const toCall = this.getToCall(player);

      if (action === "fold") {
        this.folded[player] = true;
        this.addLog(`${this.nameFor(player)} fold.`);
        this.awardPot(
          [opponent],
          `${this.nameFor(opponent)} win the pot after ${this.nameFor(player)} fold.`
        );
        return;
      }

      if (action === "check") {
        if (toCall > 0) {
          return;
        }

        this.addLog(`${this.nameFor(player)} check.`);
        this.actedThisStreet.add(player);

        if (this.isBettingRoundComplete()) {
          this.advanceStreet();
          return;
        }

        this.activePlayer = opponent;
        this.statusText = `${this.nameFor(opponent)} to act.`;
        this.actionLabel = this.activePlayer === "player" ? "Your turn" : "CPU thinking";
        this.syncUi();
        this.maybeScheduleCpu();
        return;
      }

      if (action === "call") {
        const paid = this.commitChips(player, toCall);
        this.addLog(
          `${this.nameFor(player)} call ${formatCurrency(paid)}.`
        );
        this.actedThisStreet.add(player);

        if (this.isAllInSituation()) {
          this.runOutBoardToShowdown();
          return;
        }

        if (this.isBettingRoundComplete()) {
          this.advanceStreet();
          return;
        }

        this.activePlayer = opponent;
        this.statusText = `${this.nameFor(opponent)} to act.`;
        this.actionLabel = this.activePlayer === "player" ? "Your turn" : "CPU thinking";
        this.syncUi();
        this.maybeScheduleCpu();
        return;
      }

      if (action !== "bet" && action !== "raise") {
        return;
      }

      if (!this.canAggress(player)) {
        return;
      }

      const previousBet = this.currentBet;
      const targetBet =
        previousBet === 0
          ? this.getBetSize()
          : this.currentBet + this.getBetSize();
      const paid = this.commitChips(
        player,
        Math.max(0, targetBet - this.streetContribution[player])
      );

      this.currentBet = Math.max(
        this.currentBet,
        this.streetContribution[player]
      );

      if (previousBet > 0 && this.currentBet > previousBet) {
        this.raisesThisStreet += 1;
      }

      this.actedThisStreet = new Set([player]);

      const verb = previousBet > 0 ? "raise" : "bet";
      this.addLog(
        `${this.nameFor(player)} ${verb} to ${formatCurrency(this.currentBet)}.`
      );

      if (this.isAllInSituation() && this.getToCall(opponent) <= 0) {
        this.runOutBoardToShowdown();
        return;
      }

      this.activePlayer = opponent;
      this.statusText = `${this.nameFor(opponent)} to act.`;
      this.actionLabel = this.activePlayer === "player" ? "Your turn" : "CPU thinking";
      this.syncUi();
      this.maybeScheduleCpu();
    }

    advanceStreet() {
      if (this.street === "river") {
        this.showdown();
        return;
      }

      if (this.street === "preflop") {
        this.board.push(this.deck.pop(), this.deck.pop(), this.deck.pop());
        this.street = "flop";
        this.addLog(`Flop: ${this.board.map(cardLabel).join(" ")}.`);
      } else if (this.street === "flop") {
        this.board.push(this.deck.pop());
        this.street = "turn";
        this.addLog(`Turn: ${cardLabel(this.board[this.board.length - 1])}.`);
      } else if (this.street === "turn") {
        this.board.push(this.deck.pop());
        this.street = "river";
        this.addLog(`River: ${cardLabel(this.board[this.board.length - 1])}.`);
      }

      this.streetContribution = {
        player: 0,
        cpu: 0,
      };
      this.currentBet = 0;
      this.raisesThisStreet = 0;
      this.actedThisStreet = new Set();
      this.activePlayer = otherPlayer(this.dealer);
      this.statusText = `${this.nameFor(this.activePlayer)} to act on the ${STREET_LABELS[this.street].toLowerCase()}.`;
      this.actionLabel = this.activePlayer === "player" ? "Your turn" : "CPU thinking";

      this.syncUi();
      this.maybeScheduleCpu();
    }

    runOutBoardToShowdown() {
      while (this.board.length < 5) {
        if (this.board.length === 0) {
          this.board.push(this.deck.pop(), this.deck.pop(), this.deck.pop());
          this.addLog(`Board runs out: flop ${this.board.map(cardLabel).join(" ")}.`);
          continue;
        }

        this.board.push(this.deck.pop());
        const streetName = this.board.length === 4 ? "turn" : "river";
        this.addLog(
          `Board runs out: ${streetName} ${cardLabel(this.board[this.board.length - 1])}.`
        );
      }

      this.street = "showdown";
      this.showdown();
    }

    awardPot(winners, message) {
      if (winners.length === 1) {
        this.stacks[winners[0]] += this.pot;
      } else {
        const split = Math.floor(this.pot / winners.length);
        let remainder = this.pot - split * winners.length;
        for (const winner of winners) {
          this.stacks[winner] += split;
          if (remainder > 0) {
            this.stacks[winner] += 1;
            remainder -= 1;
          }
        }
      }

      this.pot = 0;
      this.handOver = true;
      this.statusText = message;
      this.actionLabel = this.matchOver ? "Match over" : "Hand complete";
      this.showCpuCards = this.street === "showdown";
      this.addLog(message);

      if (this.stacks.player <= 0 || this.stacks.cpu <= 0) {
        this.finishMatch();
      }

      this.syncUi();
    }

    showdown() {
      this.showCpuCards = true;
      const playerBest = evaluateBestHand([...this.holeCards.player, ...this.board]);
      const cpuBest = evaluateBestHand([...this.holeCards.cpu, ...this.board]);
      const comparison = compareEvaluatedHands(playerBest, cpuBest);

      this.addLog(
        `Showdown. You: ${describeMadeHand(playerBest)}. CPU: ${describeMadeHand(cpuBest)}.`
      );

      if (comparison > 0) {
        this.awardPot(
          ["player"],
          `You win with ${describeMadeHand(playerBest)}.`
        );
        return;
      }

      if (comparison < 0) {
        this.awardPot(
          ["cpu"],
          `CPU wins with ${describeMadeHand(cpuBest)}.`
        );
        return;
      }

      this.awardPot(
        ["player", "cpu"],
        `Split pot. Both players show ${describeMadeHand(playerBest)}.`
      );
    }

    estimateCpuEquity(samples = 110) {
      const unseen = createDeck().filter((card) => {
        if (this.holeCards.cpu.some((owned) => owned.rank === card.rank && owned.suit === card.suit)) {
          return false;
        }

        if (this.board.some((boardCard) => boardCard.rank === card.rank && boardCard.suit === card.suit)) {
          return false;
        }

        return true;
      });

      let wins = 0;
      let ties = 0;

      for (let sample = 0; sample < samples; sample += 1) {
        const pool = unseen.slice();
        const opponentCards = [drawRandomCard(pool), drawRandomCard(pool)];
        const runout = this.board.slice();

        while (runout.length < 5) {
          runout.push(drawRandomCard(pool));
        }

        const cpuBest = evaluateBestHand([...this.holeCards.cpu, ...runout]);
        const opponentBest = evaluateBestHand([...opponentCards, ...runout]);
        const comparison = compareEvaluatedHands(cpuBest, opponentBest);

        if (comparison > 0) {
          wins += 1;
        } else if (comparison === 0) {
          ties += 1;
        }
      }

      return (wins + ties * 0.5) / samples;
    }

    chooseCpuAction() {
      const equity = this.estimateCpuEquity(this.street === "preflop" ? 95 : 120);
      const toCall = this.getToCall("cpu");
      const potOdds =
        toCall > 0 ? toCall / Math.max(this.pot + toCall, 1) : 0;
      const canRaise = this.canAggress("cpu");
      const randomFactor = Math.random();

      if (toCall > 0) {
        if (canRaise && equity > 0.74 && randomFactor > 0.22) {
          return "raise";
        }

        if (equity + 0.08 < potOdds && toCall >= this.getBetSize()) {
          return "fold";
        }

        if (canRaise && equity > 0.62 && randomFactor > 0.84) {
          return "raise";
        }

        return "call";
      }

      if (canRaise && (equity > 0.61 || (equity > 0.46 && randomFactor > 0.88))) {
        return "bet";
      }

      return "check";
    }

    maybeScheduleCpu() {
      this.clearCpuTimer();

      if (this.activePlayer !== "cpu" || this.handOver || this.matchOver) {
        return;
      }

      this.cpuTimer = window.setTimeout(() => {
        this.cpuTimer = null;
        const action = this.chooseCpuAction();
        this.takeAction("cpu", action);
      }, 920);
    }

    formatPlayerCards(cards) {
      if (!cards.length) {
        return "-- --";
      }

      return cards.map(cardLabel).join(" ");
    }

    formatBoardCards() {
      const output = [];
      for (let index = 0; index < 5; index += 1) {
        output.push(this.board[index] ? cardLabel(this.board[index]) : "--");
      }
      return output.join(" ");
    }

    syncUi() {
      this.ui.streetLabel.textContent = STREET_LABELS[this.street] || "Pre-Flop";
      this.ui.potLabel.textContent = formatCurrency(this.pot);
      this.ui.dealerLabel.textContent = this.nameFor(this.dealer);
      this.ui.actionLabel.textContent = this.actionLabel || "Waiting";
      this.ui.playerStackLabel.textContent = formatCurrency(this.stacks.player);
      this.ui.cpuStackLabel.textContent = formatCurrency(this.stacks.cpu);
      this.ui.toCallLabel.textContent = formatCurrency(this.getToCall("player"));
      this.ui.betSizeLabel.textContent = formatCurrency(this.getBetSize());
      this.ui.playerCardsLabel.textContent = this.formatPlayerCards(this.holeCards.player);
      this.ui.boardLabel.textContent = this.formatBoardCards();
      this.ui.cpuCardsLabel.textContent = this.showCpuCards
        ? this.formatPlayerCards(this.holeCards.cpu)
        : "Hidden";
      this.ui.statusLabel.textContent = this.statusText;

      this.ui.eventLog.replaceChildren(
        ...this.eventLogEntries.map((entry) => {
          const item = document.createElement("li");
          item.textContent = entry;
          return item;
        })
      );

      const playerTurn = this.canPlayerAct("player");
      const toCall = this.getToCall("player");
      this.ui.foldBtn.disabled = !playerTurn || toCall <= 0;
      this.ui.callBtn.disabled = !playerTurn;
      this.ui.callBtn.textContent = toCall > 0 ? `Call ${formatCurrency(toCall)}` : "Check";

      const aggressiveLabel =
        this.currentBet > 0
          ? `Raise to ${formatCurrency(this.currentBet + this.getBetSize())}`
          : `Bet ${formatCurrency(this.getBetSize())}`;
      this.ui.raiseBtn.textContent = aggressiveLabel;
      this.ui.raiseBtn.disabled = !playerTurn || !this.canAggress("player");

      this.ui.nextHandBtn.hidden = !this.handOver;
      this.ui.nextHandBtn.textContent = this.matchOver ? "New Match" : "Next Hand";
    }

    animate(timestamp) {
      if (!this.lastTimestamp) {
        this.lastTimestamp = timestamp;
      }

      this.time = timestamp;
      this.lastTimestamp = timestamp;
      this.render();
      requestAnimationFrame((nextTimestamp) => this.animate(nextTimestamp));
    }

    drawBackdrop(ctx) {
      const roomLight = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
      roomLight.addColorStop(0, "#17253a");
      roomLight.addColorStop(0.5, "#0f1a2b");
      roomLight.addColorStop(1, "#09111d");
      ctx.fillStyle = roomLight;
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      const glow = ctx.createRadialGradient(
        CANVAS_WIDTH * 0.5,
        CANVAS_HEIGHT * 0.12,
        10,
        CANVAS_WIDTH * 0.5,
        CANVAS_HEIGHT * 0.18,
        CANVAS_HEIGHT * 0.55
      );
      glow.addColorStop(0, "rgba(255, 245, 214, 0.22)");
      glow.addColorStop(0.45, "rgba(102, 255, 212, 0.06)");
      glow.addColorStop(1, "rgba(9, 17, 29, 0)");
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    }

    drawFloor(ctx) {
      ctx.save();
      const floorGradient = ctx.createLinearGradient(0, CANVAS_HEIGHT * 0.54, 0, CANVAS_HEIGHT);
      floorGradient.addColorStop(0, "#1a2434");
      floorGradient.addColorStop(1, "#0a0f17");
      ctx.fillStyle = floorGradient;
      ctx.fillRect(0, CANVAS_HEIGHT * 0.55, CANVAS_WIDTH, CANVAS_HEIGHT * 0.45);

      ctx.strokeStyle = "rgba(255,255,255,0.03)";
      ctx.lineWidth = 1;
      for (let line = 0; line < 18; line += 1) {
        const y = CANVAS_HEIGHT * 0.56 + line * 18;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(CANVAS_WIDTH, y);
        ctx.stroke();
      }
      ctx.restore();
    }

    projectPolygon(points) {
      const projected = [];
      for (const point of points) {
        const view = projectWorld(point, this.camera);
        if (!view) {
          return null;
        }
        projected.push(view);
      }
      return projected;
    }

    drawProjectedPolygon(ctx, points, fillStyle, strokeStyle = null, lineWidth = 1) {
      const projected = this.projectPolygon(points);
      if (!projected) {
        return;
      }

      ctx.save();
      ctx.beginPath();
      ctx.moveTo(projected[0].x, projected[0].y);
      for (let index = 1; index < projected.length; index += 1) {
        ctx.lineTo(projected[index].x, projected[index].y);
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
      ctx.restore();
    }

    drawTable(ctx) {
      const shadow = projectWorld({ x: 0, y: -170, z: 60 }, this.camera);
      if (shadow) {
        ctx.save();
        ctx.fillStyle = "rgba(0,0,0,0.36)";
        ctx.beginPath();
        ctx.ellipse(shadow.x, shadow.y + 42, 340, 84, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      const pedestals = [-220, 220];
      for (const pedestalX of pedestals) {
        this.drawPedestal(ctx, pedestalX, 52);
      }
      this.drawPedestalCrossbar(ctx);

      const outer = roundedTablePoints(
        TABLE.outerWidth,
        TABLE.outerDepth,
        TABLE.outerRadius,
        TABLE.topY,
        14
      );
      const raceTrack = roundedTablePoints(
        TABLE.raceTrackWidth,
        TABLE.raceTrackDepth,
        TABLE.raceTrackRadius,
        TABLE.topY + 2,
        14
      );
      const felt = roundedTablePoints(
        TABLE.feltWidth,
        TABLE.feltDepth,
        TABLE.feltRadius,
        TABLE.topY + 4,
        14
      );

      this.drawProjectedPolygon(
        ctx,
        outer,
        "#0d0f14",
        "rgba(255,255,255,0.12)",
        1.2
      );
      this.drawProjectedPolygon(
        ctx,
        raceTrack,
        "rgba(29, 32, 38, 0.94)",
        "rgba(255,255,255,0.08)",
        1
      );
      this.drawProjectedPolygon(
        ctx,
        felt,
        "#2d8a5a",
        "rgba(212,255,234,0.18)",
        1
      );

      const lineLoop = roundedTablePoints(
        TABLE.feltWidth - 150,
        TABLE.feltDepth - 106,
        TABLE.feltRadius - 42,
        TABLE.topY + 5,
        20
      );
      const projectedLoop = this.projectPolygon(lineLoop);
      if (projectedLoop) {
        ctx.save();
        ctx.strokeStyle = "rgba(235, 252, 243, 0.18)";
        ctx.lineWidth = 1.1;
        ctx.beginPath();
        ctx.moveTo(projectedLoop[0].x, projectedLoop[0].y);
        for (let index = 1; index < projectedLoop.length; index += 1) {
          ctx.lineTo(projectedLoop[index].x, projectedLoop[index].y);
        }
        ctx.closePath();
        ctx.stroke();
        ctx.restore();
      }

      const studs = [
        { x: -320, z: -216 },
        { x: -105, z: -244 },
        { x: 105, z: -244 },
        { x: 320, z: -216 },
        { x: -365, z: 0 },
        { x: 365, z: 0 },
        { x: -320, z: 216 },
        { x: -105, z: 244 },
        { x: 105, z: 244 },
        { x: 320, z: 216 },
      ];

      for (const stud of studs) {
        const projection = projectWorld(
          { x: stud.x, y: TABLE.topY + 6, z: stud.z },
          this.camera
        );
        if (!projection) {
          continue;
        }

        ctx.save();
        ctx.fillStyle = "rgba(224, 230, 236, 0.86)";
        ctx.beginPath();
        ctx.arc(projection.x, projection.y, Math.max(2.4, projection.scale * 8), 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }

    drawPedestal(ctx, x, z) {
      const top = projectWorld({ x, y: -18, z }, this.camera);
      const base = projectWorld({ x, y: -208, z: z + 6 }, this.camera);
      if (!top || !base) {
        return;
      }

      const widthTop = 72 * top.scale;
      const widthBase = 94 * base.scale;
      ctx.save();
      ctx.fillStyle = "#090b10";
      ctx.beginPath();
      ctx.moveTo(top.x - widthTop, top.y);
      ctx.lineTo(top.x + widthTop, top.y);
      ctx.lineTo(base.x + widthBase, base.y);
      ctx.lineTo(base.x - widthBase, base.y);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = "rgba(255,255,255,0.08)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.ellipse(top.x, top.y, widthTop, widthTop * 0.32, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(base.x, base.y, widthBase, widthBase * 0.28, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    drawPedestalCrossbar(ctx) {
      const left = projectWorld({ x: -184, y: -120, z: 84 }, this.camera);
      const right = projectWorld({ x: 184, y: -120, z: 84 }, this.camera);
      if (!left || !right) {
        return;
      }

      ctx.save();
      ctx.strokeStyle = "rgba(198, 208, 214, 0.56)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(left.x, left.y);
      ctx.lineTo(right.x, right.y);
      ctx.stroke();
      ctx.restore();
    }

    cardQuad(centerX, centerZ, width, height, lift, tilt) {
      const halfWidth = width * 0.5;
      const halfHeight = height * 0.5;
      const frontLift = lift + Math.max(0, tilt);
      const backLift = lift + Math.max(0, -tilt);

      return [
        { x: centerX - halfWidth, y: frontLift, z: centerZ - halfHeight },
        { x: centerX + halfWidth, y: frontLift, z: centerZ - halfHeight },
        { x: centerX + halfWidth, y: backLift, z: centerZ + halfHeight },
        { x: centerX - halfWidth, y: backLift, z: centerZ + halfHeight },
      ];
    }

    drawCard(ctx, card, centerX, centerZ, faceUp, tilt = 0, accent = null) {
      const quad = this.cardQuad(centerX, centerZ, 78, 106, TABLE.topY + 16, tilt);
      const projected = this.projectPolygon(quad);
      if (!projected) {
        return;
      }

      const center = projected.reduce(
        (sum, point) => ({
          x: sum.x + point.x,
          y: sum.y + point.y,
        }),
        { x: 0, y: 0 }
      );
      center.x /= projected.length;
      center.y /= projected.length;

      const averageWidth =
        (Math.hypot(projected[1].x - projected[0].x, projected[1].y - projected[0].y) +
          Math.hypot(projected[2].x - projected[3].x, projected[2].y - projected[3].y)) *
        0.5;
      const averageHeight =
        (Math.hypot(projected[3].x - projected[0].x, projected[3].y - projected[0].y) +
          Math.hypot(projected[2].x - projected[1].x, projected[2].y - projected[1].y)) *
        0.5;
      const angle = Math.atan2(
        projected[1].y - projected[0].y,
        projected[1].x - projected[0].x
      );

      ctx.save();
      ctx.translate(center.x, center.y);
      ctx.rotate(angle);

      const width = averageWidth;
      const height = averageHeight;
      const glow = accent || "rgba(255,255,255,0.08)";

      ctx.fillStyle = "rgba(0,0,0,0.2)";
      this.roundRect(ctx, -width * 0.5 + 3, -height * 0.5 + 6, width, height, Math.max(10, width * 0.12));
      ctx.fill();

      if (faceUp) {
        const cardGradient = ctx.createLinearGradient(0, -height * 0.5, 0, height * 0.5);
        cardGradient.addColorStop(0, "#fffef8");
        cardGradient.addColorStop(1, "#efe6d2");
        ctx.fillStyle = cardGradient;
      } else {
        const backGradient = ctx.createLinearGradient(0, -height * 0.5, 0, height * 0.5);
        backGradient.addColorStop(0, "#1f2438");
        backGradient.addColorStop(1, "#0d1221");
        ctx.fillStyle = backGradient;
      }

      this.roundRect(ctx, -width * 0.5, -height * 0.5, width, height, Math.max(10, width * 0.12));
      ctx.fill();

      ctx.strokeStyle = glow;
      ctx.lineWidth = 1.25;
      this.roundRect(ctx, -width * 0.5, -height * 0.5, width, height, Math.max(10, width * 0.12));
      ctx.stroke();

      if (!faceUp) {
        ctx.strokeStyle = "rgba(244, 198, 96, 0.38)";
        ctx.lineWidth = 1;
        this.roundRect(
          ctx,
          -width * 0.34,
          -height * 0.34,
          width * 0.68,
          height * 0.68,
          Math.max(7, width * 0.08)
        );
        ctx.stroke();
        ctx.strokeStyle = "rgba(255,255,255,0.1)";
        for (let line = -2; line <= 2; line += 1) {
          ctx.beginPath();
          ctx.moveTo(-width * 0.28, line * height * 0.1 - height * 0.16);
          ctx.lineTo(width * 0.28, line * height * 0.1 + height * 0.16);
          ctx.stroke();
        }
        ctx.restore();
        return;
      }

      const label = cardLabel(card);
      const textColor = SUIT_COLORS[card.suit];
      ctx.fillStyle = textColor;
      ctx.font = `700 ${Math.max(14, height * 0.2)}px "Trebuchet MS"`;
      ctx.textAlign = "center";
      ctx.fillText(label, 0, height * 0.05);

      ctx.fillStyle = "rgba(15, 25, 38, 0.7)";
      ctx.font = `700 ${Math.max(10, height * 0.12)}px "Trebuchet MS"`;
      ctx.fillText(HAND_CATEGORY_NAMES[0], 0, height * 0.28);
      ctx.restore();
    }

    drawChipStack(ctx, x, z, amount, color, label) {
      const stackCount = clamp(Math.round(amount / 90), 1, 9);
      for (let chip = stackCount - 1; chip >= 0; chip -= 1) {
        const projection = projectWorld(
          { x, y: TABLE.topY + 8 + chip * 4, z },
          this.camera
        );
        if (!projection) {
          continue;
        }

        ctx.save();
        ctx.fillStyle = color;
        ctx.strokeStyle = "rgba(255,255,255,0.2)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.ellipse(
          projection.x,
          projection.y,
          22 * projection.scale,
          7 * projection.scale,
          0,
          0,
          Math.PI * 2
        );
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }

      const labelPoint = projectWorld(
        { x, y: TABLE.topY + 56, z },
        this.camera
      );
      if (!labelPoint) {
        return;
      }

      ctx.save();
      ctx.fillStyle = "#f4f8fb";
      ctx.font = "700 15px 'Trebuchet MS'";
      ctx.textAlign = "center";
      ctx.fillText(label, labelPoint.x, labelPoint.y);
      ctx.restore();
    }

    drawPlayerMarker(ctx, x, z, title, subtitle, active) {
      const marker = projectWorld({ x, y: TABLE.topY + 14, z }, this.camera);
      if (!marker) {
        return;
      }

      ctx.save();
      if (active) {
        ctx.fillStyle = "rgba(255, 214, 118, 0.18)";
        ctx.beginPath();
        ctx.ellipse(marker.x, marker.y + 10, 112, 28, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.fillStyle = "#ffffff";
      ctx.font = "700 15px 'Trebuchet MS'";
      ctx.textAlign = "center";
      ctx.fillText(title, marker.x, marker.y + 6);
      ctx.fillStyle = "rgba(230, 240, 248, 0.72)";
      ctx.font = "600 12px 'Trebuchet MS'";
      ctx.fillText(subtitle, marker.x, marker.y + 24);
      ctx.restore();
    }

    drawDealerButton(ctx) {
      const seat = this.dealer === "player" ? { x: 232, z: -198 } : { x: 232, z: 196 };
      const button = projectWorld({ x: seat.x, y: TABLE.topY + 18, z: seat.z }, this.camera);
      if (!button) {
        return;
      }

      ctx.save();
      ctx.fillStyle = "#efe9d2";
      ctx.beginPath();
      ctx.arc(button.x, button.y, 13, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(0,0,0,0.2)";
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.fillStyle = "#0f1927";
      ctx.font = "700 11px 'Trebuchet MS'";
      ctx.textAlign = "center";
      ctx.fillText("D", button.x, button.y + 4);
      ctx.restore();
    }

    drawCards(ctx) {
      const playerCards = this.holeCards.player;
      const cpuCards = this.holeCards.cpu;
      const boardCards = this.board;

      const playerX = [-62, 62];
      const cpuX = [-62, 62];
      const boardX = [-184, -92, 0, 92, 184];

      for (let index = 0; index < playerCards.length; index += 1) {
        this.drawCard(
          ctx,
          playerCards[index],
          playerX[index],
          -212,
          true,
          14,
          this.activePlayer === "player" && !this.handOver
            ? "rgba(255, 224, 128, 0.28)"
            : null
        );
      }

      for (let index = 0; index < cpuCards.length; index += 1) {
        this.drawCard(
          ctx,
          cpuCards[index],
          cpuX[index],
          224,
          this.showCpuCards,
          -12,
          this.activePlayer === "cpu" && !this.handOver
            ? "rgba(152, 255, 206, 0.28)"
            : null
        );
      }

      for (let index = 0; index < boardX.length; index += 1) {
        if (!boardCards[index]) {
          this.drawCard(ctx, { rank: 14, suit: "S" }, boardX[index], 2, false, 5);
          continue;
        }

        this.drawCard(ctx, boardCards[index], boardX[index], 2, true, 5);
      }
    }

    drawPot(ctx) {
      this.drawChipStack(ctx, 0, 82, Math.max(this.pot, 10), "#ffbf57", formatCurrency(this.pot));

      const labelPoint = projectWorld({ x: 0, y: TABLE.topY + 94, z: 86 }, this.camera);
      if (!labelPoint) {
        return;
      }

      ctx.save();
      ctx.fillStyle = "rgba(250, 251, 255, 0.88)";
      ctx.font = "700 16px 'Trebuchet MS'";
      ctx.textAlign = "center";
      ctx.fillText("POT", labelPoint.x, labelPoint.y);
      ctx.restore();
    }

    drawSeatStacks(ctx) {
      this.drawChipStack(
        ctx,
        -260,
        -156,
        Math.max(this.stacks.player, 10),
        "#5bd8c7",
        formatCurrency(this.stacks.player)
      );
      this.drawChipStack(
        ctx,
        -260,
        186,
        Math.max(this.stacks.cpu, 10),
        "#5ea7ff",
        formatCurrency(this.stacks.cpu)
      );
    }

    drawSeatLabels(ctx) {
      this.drawPlayerMarker(
        ctx,
        0,
        -284,
        "YOU",
        this.describeSeatStrength("player"),
        this.activePlayer === "player" && !this.handOver
      );
      this.drawPlayerMarker(
        ctx,
        0,
        292,
        "CPU",
        this.showCpuCards
          ? this.describeSeatStrength("cpu")
          : "Hidden hand",
        this.activePlayer === "cpu" && !this.handOver
      );
    }

    render() {
      const ctx = this.ctx;
      ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      this.drawBackdrop(ctx);
      this.drawFloor(ctx);
      this.drawTable(ctx);
      this.drawSeatStacks(ctx);
      this.drawPot(ctx);
      this.drawCards(ctx);
      this.drawDealerButton(ctx);
      this.drawSeatLabels(ctx);
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

  window.PokerGame = PokerGame;
})();
