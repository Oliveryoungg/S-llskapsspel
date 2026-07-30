// Tidslinjen — Hitster-liknande partyläge.
//
// Varje spelare bygger sin egen kronologiska tidslinje. På sin tur hör/läser
// man ledtråden till nästa mysteriumljud och väljer VAR i sin tidslinje det
// hör hemma. Rätt gissning = kortet stannar och räknas som poäng. Fel
// gissning = kortet kasseras och turen går vidare. Först till målpoängen vinner.

const TimelineGame = (() => {
  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function create({ playerNames, targetScore, pool }) {
    const deck = shuffle(pool);
    const players = playerNames.map((name) => ({
      name,
      timeline: [],
      points: 0,
    }));

    // Startkort: varje spelare får ett ljud gratis och synligt så att
    // tidslinjen har en referenspunkt från start (som i Hitster).
    players.forEach((p) => {
      if (deck.length > 0) p.timeline.push(deck.pop());
    });

    const state = {
      deck,
      players,
      currentPlayerIndex: 0,
      currentCard: null,
      lastResult: null,
      over: false,
      overReason: null,
      targetScore,
    };

    function drawNext() {
      state.currentCard = state.deck.length > 0 ? state.deck.pop() : null;
      if (!state.currentCard) {
        state.over = true;
        state.overReason = "deck-empty";
      }
    }

    drawNext();

    function currentPlayer() {
      return state.players[state.currentPlayerIndex];
    }

    // slotIndex: 0..timeline.length, dvs. platsen KORTET ska in på
    function placeCard(slotIndex) {
      if (!state.currentCard || state.over) return null;
      const player = currentPlayer();
      const tl = player.timeline;
      const prev = tl[slotIndex - 1];
      const next = tl[slotIndex];
      const card = state.currentCard;
      const correct =
        (!prev || prev.year <= card.year) && (!next || card.year <= next.year);

      if (correct) {
        tl.splice(slotIndex, 0, card);
        player.points += 1;
      }

      state.lastResult = { correct, entry: card, playerIndex: state.currentPlayerIndex };

      if (player.points >= state.targetScore) {
        state.over = true;
        state.overReason = "target-reached";
      }

      return state.lastResult;
    }

    function advanceTurn() {
      if (state.over) return state;
      state.currentPlayerIndex = (state.currentPlayerIndex + 1) % state.players.length;
      state.lastResult = null;
      drawNext();
      return state;
    }

    function standings() {
      return state.players
        .slice()
        .sort((a, b) => b.points - a.points)
        .map((p) => ({ name: p.name, points: p.points, cards: p.timeline.length }));
    }

    return {
      state,
      currentPlayer,
      placeCard,
      advanceTurn,
      standings,
    };
  }

  return { create };
})();
