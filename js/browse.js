// Bläddringsvyn — sökbar lista över hela katalogen, för referens.

const Browse = (() => {
  function flagBadgesHtml(entry) {
    const badges = [];
    if (entry.flags.includes("verifyYear")) badges.push(`<span class="flag-badge">⚠️ Kontrollera år</span>`);
    if (entry.flags.includes("swedish")) badges.push(`<span class="flag-badge">🇸🇪 Svenskt</span>`);
    if (entry.flags.includes("vanished")) badges.push(`<span class="flag-badge">👻 Har försvunnit</span>`);
    if (entry.recordYourself) badges.push(`<span class="flag-badge">🎙️ Spela in själv</span>`);
    return badges.join("");
  }

  function render(container, catalog, query) {
    const q = (query || "").trim().toLowerCase();
    const filtered = !q
      ? catalog
      : catalog.filter((e) => {
          const haystack = [e.name, e.description, ...e.searchTerms].join(" ").toLowerCase();
          return haystack.includes(q) || String(e.year).includes(q);
        });

    if (filtered.length === 0) {
      container.innerHTML = `<p class="fineprint">Inga träffar.</p>`;
      return;
    }

    container.innerHTML = filtered
      .map(
        (e) => `
      <div class="browse-item">
        <span class="browse-item__year">${e.year}</span>
        <div class="browse-item__body">
          <div class="browse-item__name">${e.name}</div>
          <div class="browse-item__desc">${e.description}</div>
          <div class="browse-item__flags">${flagBadgesHtml(e)}</div>
        </div>
      </div>`
      )
      .join("");
  }

  return { render };
})();
