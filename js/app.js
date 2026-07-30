// Nostalgispelet — app-koppling: skärmnavigering, rendering och speltrådar
// för Tidslinjen (party-läge) och Soloquizet.

(() => {
  const catalog = window.NOSTALGI_CATALOG;

  let timelineGame = null;
  let quizGame = null;
  let lastGameMode = null; // 'timeline' | 'quiz' — styr vad "Spela igen" gör

  // ---------- Hjälpfunktioner ----------

  function flagBadgesHtml(entry) {
    const badges = [];
    if (entry.flags.includes("verifyYear")) badges.push(`<span class="flag-badge">⚠️ Kontrollera år</span>`);
    if (entry.flags.includes("swedish")) badges.push(`<span class="flag-badge">🇸🇪 Svenskt</span>`);
    if (entry.flags.includes("vanished")) badges.push(`<span class="flag-badge">👻 Har försvunnit</span>`);
    if (entry.recordYourself) badges.push(`<span class="flag-badge">🎙️ Spela in själv</span>`);
    return badges.join("");
  }

  function confidenceDotsHtml(n) {
    let html = "";
    for (let i = 0; i < 5; i++) html += i < n ? `<span class="dot-filled">●</span>` : "○";
    return html;
  }

  function renderMysteryCard(entry, els) {
    els.descEl.textContent = "Ljud: " + entry.description;
    els.flagsEl.innerHTML = flagBadgesHtml(entry);
    if (els.confidenceEl) els.confidenceEl.innerHTML = confidenceDotsHtml(entry.confidence);
    if (entry.searchTerms.length > 0) {
      const query = entry.searchTerms.slice(0, 2).join(" ");
      els.linkEl.href = `https://freesound.org/search/?q=${encodeURIComponent(query)}&f=license%3A%22Creative+Commons+0%22`;
      els.linkEl.hidden = false;
    } else {
      els.linkEl.hidden = true;
    }
    if (els.noteEl) els.noteEl.textContent = "";
  }

  function renderTimelineDom(container, timeline, interactive, onSlotClick) {
    container.innerHTML = "";
    const makeSlot = (idx) => {
      const slot = document.createElement("button");
      slot.type = "button";
      slot.className = "tl-slot";
      slot.textContent = "+";
      slot.disabled = !interactive;
      slot.setAttribute("aria-label", "Placera kortet här");
      if (interactive) slot.addEventListener("click", () => onSlotClick(idx));
      return slot;
    };
    const makeCard = (entry) => {
      const div = document.createElement("div");
      div.className = "tl-card";
      div.innerHTML = `<span class="tl-card__year">${entry.year}</span><span class="tl-card__name">${entry.name}</span>`;
      return div;
    };
    container.appendChild(makeSlot(0));
    timeline.forEach((entry, i) => {
      container.appendChild(makeCard(entry));
      container.appendChild(makeSlot(i + 1));
    });
  }

  function showScreen(id) {
    document.querySelectorAll(".screen").forEach((s) => (s.hidden = s.id !== id));
    document.getElementById("nav").hidden = id === "screen-start";
  }

  // prefix: "mystery" (Tidslinjen) eller "quiz" (Soloquiz)
  function flipCard(prefix, flipped) {
    document.getElementById(`${prefix}-flipcard-inner`).classList.toggle("is-flipped", flipped);
  }

  function setFlipCardBack(prefix, entry, resultClass) {
    document.getElementById(`${prefix}-reveal-year`).textContent = entry.year;
    document.getElementById(`${prefix}-reveal-name`).textContent = entry.name;
    const backEl = document.querySelector(`#${prefix}-flipcard .flip-card__face--back`);
    backEl.classList.remove("is-correct", "is-wrong");
    if (resultClass) backEl.classList.add(resultClass);
  }

  function showGameOver(title, rows) {
    document.getElementById("gameover-title").textContent = title;
    document.getElementById("gameover-standings").innerHTML = rows
      .map(
        (r, i) =>
          `<div class="standing-row ${i === 0 ? "is-winner" : ""}"><span>${r.name}</span><span>${r.points}</span></div>`
      )
      .join("");
    document.getElementById("modal-gameover").hidden = false;
  }

  // ---------- Startskärm ----------

  function renderCatalogStats() {
    const decades = [...new Set(catalog.map((e) => e.decade))].sort((a, b) => a - b);
    const verified = catalog.filter((e) => !e.flags.includes("verifyYear")).length;
    const swedish = catalog.filter((e) => e.flags.includes("swedish")).length;
    const vanished = catalog.filter((e) => e.flags.includes("vanished")).length;
    const recordYourself = catalog.filter((e) => e.recordYourself).length;

    const stats = [
      [`${catalog.length}`, "ljud totalt"],
      [`${decades[0]}–${decades[decades.length - 1]}`, "decennier"],
      [`${verified} (${Math.round((verified / catalog.length) * 100)}%)`, "källkontrollerat årtal"],
      [`${swedish}`, "specifikt svenska ljud"],
      [`${vanished}`, "ljud som helt försvunnit"],
      [`${recordYourself}`, "saknar bibliotek — spela in själv"],
    ];

    document.getElementById("catalog-stats").innerHTML = stats
      .map(([value, label]) => `<li><strong>${value}</strong>${label}</li>`)
      .join("");
  }

  // ---------- Tidslinjen ----------

  function poolFromFilters() {
    let pool = catalog.slice();
    if (document.getElementById("filter-verified").checked) {
      pool = pool.filter((e) => !e.flags.includes("verifyYear"));
    }
    if (document.getElementById("filter-no-record").checked) {
      pool = pool.filter((e) => !e.recordYourself);
    }
    return pool;
  }

  function ensurePlayerInputs() {
    const container = document.getElementById("player-inputs");
    if (container.children.length > 0) return;
    addPlayerInput();
    addPlayerInput();
  }

  function addPlayerInput() {
    const container = document.getElementById("player-inputs");
    if (container.children.length >= 6) return;
    const input = document.createElement("input");
    input.type = "text";
    input.placeholder = `Spelare ${container.children.length + 1}`;
    container.appendChild(input);
  }

  function removePlayerInput() {
    const container = document.getElementById("player-inputs");
    if (container.children.length <= 2) return;
    container.removeChild(container.lastElementChild);
  }

  function renderScoreBoard() {
    const board = document.getElementById("score-board");
    board.innerHTML = timelineGame.state.players
      .map((p, i) => {
        const active = i === timelineGame.state.currentPlayerIndex ? "score-chip--active" : "";
        return `<span class="score-chip ${active}">${p.name}: ${p.points}/${timelineGame.state.targetScore}</span>`;
      })
      .join("");
  }

  function renderTimelineRound() {
    const game = timelineGame;
    document.getElementById("reveal-panel").hidden = true;
    flipCard("mystery", false);
    document.getElementById("turn-player-name").textContent = game.currentPlayer().name;
    document.getElementById("deck-remaining").textContent = game.state.deck.length;
    renderScoreBoard();
    renderMysteryCard(game.state.currentCard, {
      descEl: document.getElementById("mystery-desc"),
      flagsEl: document.getElementById("mystery-flags"),
      confidenceEl: document.getElementById("mystery-confidence"),
      linkEl: document.getElementById("freesound-link"),
      noteEl: document.getElementById("audio-note"),
    });
    renderTimelineDom(document.getElementById("timeline"), game.currentPlayer().timeline, true, handleSlotClick);
  }

  function handleSlotClick(idx) {
    const result = timelineGame.placeCard(idx);
    if (!result) return;
    document.getElementById("reveal-panel").hidden = false;
    const resultEl = document.getElementById("reveal-result");
    resultEl.textContent = result.correct ? "✅ Rätt placerat!" : "❌ Fel placering";
    resultEl.className = "reveal-panel__result " + (result.correct ? "is-correct" : "is-wrong");
    setFlipCardBack("mystery", result.entry, result.correct ? "is-correct" : "is-wrong");
    flipCard("mystery", true);
    renderTimelineDom(document.getElementById("timeline"), timelineGame.currentPlayer().timeline, false, null);
    renderScoreBoard();
    document.getElementById("next-turn").textContent =
      timelineGame.state.overReason === "target-reached" ? "Se resultat 🏆" : "Nästa spelare ➜";
  }

  function finishTimelineGame() {
    const standings = timelineGame.standings();
    const winner = standings[0];
    const title =
      timelineGame.state.overReason === "target-reached"
        ? `🏆 ${winner.name} vinner!`
        : `🏁 Leken tog slut — ${winner.name} vinner!`;
    const rows = standings.map((s) => ({ name: s.name, points: `${s.points} kort` }));
    lastGameMode = "timeline";
    showGameOver(title, rows);
  }

  function handleNextTurn() {
    if (timelineGame.state.overReason === "target-reached") {
      finishTimelineGame();
      return;
    }
    timelineGame.advanceTurn();
    if (timelineGame.state.over) {
      finishTimelineGame();
      return;
    }
    renderTimelineRound();
  }

  // ---------- Soloquiz ----------

  function startQuiz() {
    quizGame = QuizGame.create({ pool: catalog.slice(), rounds: 15 });
    document.getElementById("quiz-total").textContent = quizGame.state.deck.length;
    lastGameMode = "quiz";
    showScreen("screen-quiz");
    renderQuizRound();
  }

  function renderQuizRound() {
    document.getElementById("quiz-reveal-panel").hidden = true;
    document.getElementById("quiz-guess-area").hidden = false;
    flipCard("quiz", false);
    document.getElementById("quiz-score").textContent = quizGame.state.score;
    document.getElementById("quiz-round").textContent = quizGame.state.index + 1;
    const entry = quizGame.current();
    renderMysteryCard(entry, {
      descEl: document.getElementById("quiz-desc"),
      flagsEl: document.getElementById("quiz-flags"),
      linkEl: document.getElementById("quiz-freesound-link"),
      noteEl: document.getElementById("quiz-audio-note"),
    });
    const slider = document.getElementById("quiz-slider");
    slider.value = 1945;
    document.getElementById("quiz-slider-out").textContent = "1945";
  }

  function handleQuizSubmit() {
    const guessYear = parseInt(document.getElementById("quiz-slider").value, 10);
    const result = quizGame.guess(guessYear);
    document.getElementById("quiz-guess-area").hidden = true;
    document.getElementById("quiz-reveal-panel").hidden = false;
    const resultEl = document.getElementById("quiz-reveal-result");
    resultEl.className = "reveal-panel__result " + (result.distance <= 5 ? "is-correct" : "is-wrong");
    resultEl.textContent =
      result.distance === 0
        ? `🎯 Exakt rätt! +${result.points} poäng`
        : `${result.distance} år fel — +${result.points} poäng`;
    setFlipCardBack("quiz", result.entry, result.distance <= 5 ? "is-correct" : "is-wrong");
    flipCard("quiz", true);
    document.getElementById("quiz-score").textContent = quizGame.state.score;
  }

  function finishQuiz() {
    const rows = [
      { name: "Din slutpoäng", points: `${quizGame.state.score} p / ${quizGame.state.deck.length} ljud` },
    ];
    lastGameMode = "quiz";
    showGameOver("🎯 Rundan klar!", rows);
  }

  // ---------- Init & event-koppling ----------

  function init() {
    renderCatalogStats();

    document.getElementById("start-timeline").addEventListener("click", () => {
      ensurePlayerInputs();
      showScreen("screen-timeline-setup");
    });
    document.getElementById("start-quiz").addEventListener("click", startQuiz);
    document.getElementById("start-browse").addEventListener("click", () => {
      showScreen("screen-browse");
      Browse.render(document.getElementById("browse-list"), catalog, "");
    });
    document.getElementById("link-about-audio").addEventListener("click", (e) => {
      e.preventDefault();
      alert(
        "Riktiga ljudfiler saknas ännu i demot. Om en fil finns på data/audio/<id>.mp3 spelas den upp. " +
          "Saknas filen spelas inget alls — sök upp rätt klipp på Freesound (CC0) via länken, eller spela in " +
          "det själv, och lägg filen i data/audio/."
      );
    });

    // Timeline setup
    document.getElementById("add-player").addEventListener("click", addPlayerInput);
    document.getElementById("remove-player").addEventListener("click", removePlayerInput);
    const targetScoreInput = document.getElementById("target-score");
    targetScoreInput.addEventListener("input", () => {
      document.getElementById("target-score-out").textContent = targetScoreInput.value;
    });
    document.getElementById("begin-timeline").addEventListener("click", () => {
      const nameInputs = Array.from(document.querySelectorAll("#player-inputs input"));
      const playerNames = nameInputs.map((inp, i) => inp.value.trim() || `Spelare ${i + 1}`);
      const pool = poolFromFilters();
      const targetScore = parseInt(targetScoreInput.value, 10);
      timelineGame = TimelineGame.create({ playerNames, targetScore, pool });
      lastGameMode = "timeline";
      showScreen("screen-timeline-game");
      renderTimelineRound();
    });

    // Timeline game
    document.getElementById("play-audio").addEventListener("click", () => {
      NostalgiAudio.play(timelineGame.state.currentCard, {
        onSource: (src) => {
          document.getElementById("audio-note").textContent =
            src === "file"
              ? "🔊 Spelar riktig inspelning"
              : "🔇 Ingen inspelning uppladdad ännu — sök på Freesound eller spela in själv";
        },
      });
    });
    document.getElementById("next-turn").addEventListener("click", handleNextTurn);

    // Quiz
    const quizSlider = document.getElementById("quiz-slider");
    quizSlider.addEventListener("input", () => {
      document.getElementById("quiz-slider-out").textContent = quizSlider.value;
    });
    document.getElementById("quiz-play-audio").addEventListener("click", () => {
      NostalgiAudio.play(quizGame.current(), {
        onSource: (src) => {
          document.getElementById("quiz-audio-note").textContent =
            src === "file"
              ? "🔊 Spelar riktig inspelning"
              : "🔇 Ingen inspelning uppladdad ännu — sök på Freesound eller spela in själv";
        },
      });
    });
    document.getElementById("quiz-submit").addEventListener("click", handleQuizSubmit);
    document.getElementById("quiz-next").addEventListener("click", () => {
      if (quizGame.next()) renderQuizRound();
      else finishQuiz();
    });
    document.getElementById("quiz-finish").addEventListener("click", finishQuiz);

    // Browse
    document.getElementById("browse-search").addEventListener("input", (e) => {
      Browse.render(document.getElementById("browse-list"), catalog, e.target.value);
    });

    // Nav / modal
    document.getElementById("nav-home").addEventListener("click", () => showScreen("screen-start"));
    document.getElementById("gameover-again").addEventListener("click", () => {
      document.getElementById("modal-gameover").hidden = true;
      if (lastGameMode === "timeline") showScreen("screen-timeline-setup");
      else startQuiz();
    });
    document.getElementById("gameover-home").addEventListener("click", () => {
      document.getElementById("modal-gameover").hidden = true;
      showScreen("screen-start");
    });

    ensurePlayerInputs();
  }

  document.addEventListener("DOMContentLoaded", init);
})();
