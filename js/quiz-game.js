// Soloquiz — gissa exakt årtal med en reglage-slider. Poäng baseras på
// hur nära du kommer det riktiga året.

const QuizGame = (() => {
  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function pointsForDistance(distance) {
    if (distance === 0) return 100;
    return Math.max(0, Math.round(100 - distance * 5));
  }

  function create({ pool, rounds = 15 }) {
    const deck = shuffle(pool).slice(0, Math.min(rounds, pool.length));
    const state = {
      deck,
      index: 0,
      score: 0,
      lastResult: null,
    };

    function current() {
      return state.deck[state.index] || null;
    }

    function guess(year) {
      const card = current();
      if (!card) return null;
      const distance = Math.abs(card.year - year);
      const points = pointsForDistance(distance);
      state.score += points;
      state.lastResult = { entry: card, guess: year, distance, points };
      return state.lastResult;
    }

    function next() {
      state.index += 1;
      state.lastResult = null;
      return state.index < state.deck.length;
    }

    function isDone() {
      return state.index >= state.deck.length;
    }

    return { state, current, guess, next, isDone };
  }

  return { create };
})();
