// Ljuduppspelning för demot.
//
// Riktiga inspelningar saknas ännu (se docs/Ljudkatalog.pdf för sökord till
// Freesound). Om en fil finns på entry.audio spelas den. Finns ingen fil
// spelas ingenting — vi hittar inte på ett eget ljud som inte är det riktiga.
//
// Lägg riktiga klipp i data/audio/<id>.mp3 (id:t finns i data/catalog.json)
// så plockas de upp automatiskt — ingen kodändring krävs.

const NostalgiAudio = (() => {
  function play(entry, { onSource } = {}) {
    let resolved = false;
    const markMissing = () => {
      if (resolved) return;
      resolved = true;
      if (onSource) onSource("missing");
    };

    try {
      const el = new Audio(entry.audio);
      el.addEventListener("error", markMissing, { once: true });
      el.addEventListener(
        "canplay",
        () => {
          if (resolved) return;
          resolved = true;
          el.play();
          if (onSource) onSource("file");
        },
        { once: true }
      );
      el.play().catch(markMissing);
      // Om fetch mot lokal fil blockeras (t.ex. file://) hänger den ofta i
      // readyState 0 utan att någonsin trigga error/canplay — fånga det.
      setTimeout(() => {
        if (!resolved && el.readyState === 0) markMissing();
      }, 350);
    } catch (e) {
      markMissing();
    }
  }

  return { play };
})();
