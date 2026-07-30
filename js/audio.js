// Ljuduppspelning för demot.
//
// Riktiga inspelningar saknas ännu (se docs/Ljudkatalog.pdf för sökord till
// Freesound). Om en fil finns på entry.audio spelas den. Annars faller vi
// tillbaka på ett syntetiskt "mysteriumljud" som är unikt (men deterministiskt)
// per kort, så spelet fortfarande känns levande innan riktiga klipp finns på plats.
//
// Lägg riktiga klipp i data/audio/<id>.mp3 (id:t finns i data/catalog.json)
// så plockas de upp automatiskt — ingen kodändring krävs.

const NostalgiAudio = (() => {
  let ctx = null;

  function getContext() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      ctx = new AC();
    }
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  }

  function hashString(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return Math.abs(h);
  }

  function playSynth(entry) {
    const audioCtx = getContext();
    const seed = hashString(entry.id);
    const waveforms = ["sine", "triangle", "square", "sawtooth"];
    const waveform = waveforms[seed % waveforms.length];
    const baseFreq = 180 + (seed % 500); // 180–680 Hz
    const noteCount = 2 + (seed % 3); // 2–4 toner
    const now = audioCtx.currentTime;
    const master = audioCtx.createGain();
    master.gain.value = 0.18;
    master.connect(audioCtx.destination);

    let t = now;
    for (let i = 0; i < noteCount; i++) {
      const ratio = [1, 1.25, 1.5, 2, 0.75][(seed >> (i * 3)) % 5];
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = waveform;
      osc.frequency.value = baseFreq * ratio;
      const noteLen = 0.16;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(1, t + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, t + noteLen);
      osc.connect(gain);
      gain.connect(master);
      osc.start(t);
      osc.stop(t + noteLen + 0.02);
      t += noteLen * 0.85;
    }
  }

  function play(entry, { onSource } = {}) {
    let resolved = false;
    const markSynth = () => {
      if (resolved) return;
      resolved = true;
      playSynth(entry);
      if (onSource) onSource("synth");
    };

    try {
      const el = new Audio(entry.audio);
      el.addEventListener("error", markSynth, { once: true });
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
      el.play().catch(markSynth);
      // Om fetch mot lokal fil blockeras (t.ex. file://) hänger den ofta i
      // readyState 0 utan att någonsin trigga error/canplay — fånga det.
      setTimeout(() => {
        if (!resolved && el.readyState === 0) markSynth();
      }, 350);
    } catch (e) {
      markSynth();
    }
  }

  return { play };
})();
