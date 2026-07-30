# Nostalgispelet — ljuddemo

Ett webbaserat demo av ett tidslinje-partyspel byggt på `docs/Ljudkatalog.pdf`:
142 vardagsljud från teknik och prylar, daterade från 1874 (skrivmaskinens
returklocka) till 2017 (fidget spinnerns kullager). Spelet är inspirerat av
"gissa-året"-mekaniken i spel som Hitster, fast med ljud istället för låtar.

## Kör demot

Inga byggverktyg krävs. Starta valfri statisk webbserver i repo-roten och
öppna den i webbläsaren, t.ex.:

```bash
python3 -m http.server 8080
# öppna http://localhost:8080
```

(En vanlig statisk fil-server krävs eftersom sidan laddar flera JS-filer —
att dubbelklicka på `index.html` direkt fungerar inte tillförlitligt i alla
webbläsare.)

## Spellägen

- **Tidslinjen** (2–6 spelare, pass-and-play) — kärnmekaniken. Varje spelare
  bygger sin egen kronologiska tidslinje. På sin tur får man en ledtråd
  ("Ljud: ...") till nästa mysteriumljud och väljer var i tidslinjen det hör
  hemma. Rätt placering ger poäng och kortet stannar kvar; fel placering
  kasserar kortet. Första spelaren till målpoängen vinner.
- **Soloquiz** — 15 slumpade ljud, gissa exakt årtal med ett reglage. Poäng
  baseras på hur nära gissningen ligger det verkliga året.
- **Bläddra i katalogen** — sökbar lista över alla 142 ljud, för referens.

## Om ljuduppspelningen

Riktiga inspelningar finns **inte** i detta demo ännu. Katalogen innehåller
istället engelska sökord tänkta för [Freesound](https://freesound.org) (CC0),
och varje ljudkort har en direktlänk till en färdig Freesound-sökning.

Om en fil läggs i `data/audio/<id>.mp3` (id:t finns i `data/catalog.json`,
t.ex. `1874-skrivmaskinens-returklocka.mp3`) spelas den upp automatiskt —
ingen kodändring krävs. Saknas filen spelas inget alls; kortet visar istället
"🔇 Ingen inspelning uppladdad ännu" och länken till Freesound-sökningen.
Appen hittar aldrig på ett eget ljud som inte är det riktiga.

Fem ljud (märkta 🎙️ "Spela in själv" i katalogen, t.ex. Nokia 3310:ans
knapptryck och SL:s stämpelmaskin) finns inte i något ljudbibliotek och
måste spelas in från grunden.

## Datakällan

`data/catalog_raw.json` är extraherad direkt ur `docs/Ljudkatalog.pdf`.
`data/build_catalog.py` bygger om `data/catalog.json` (källa för verktyg/analys)
och `js/catalog.js` (den globala `NOSTALGI_CATALOG`-variabeln appen använder)
utifrån den. Kör om skriptet om katalogen någonsin uppdateras:

```bash
python3 data/build_catalog.py
```

Varje post har fälten:

| Fält | Betydelse |
|---|---|
| `id` | Stabilt slug-id, används bl.a. för `data/audio/<id>.mp3` |
| `year`, `decade` | Årtal och avrundat decennium |
| `name`, `description` | Svensk titel och ljudbeskrivning |
| `confidence` | 1–5, hur säkert en bra Freesound-matchning finns |
| `flags` | `verifyYear` (osäkert årtal), `swedish` (specifikt svenskt ljud), `vanished` (ljudkällan har försvunnit helt) |
| `searchTerms` | Engelska sökord för Freesound |
| `recordYourself` | `true` om inget bibliotek har ljudet — måste spelas in |
| `audio` | Sökväg där en riktig inspelning kan läggas |

## Nästa steg mot en riktig produkt

- Ladda ner/licensiera riktiga CC0-klipp för de 137 ljud som har sökord, och
  spela in de 5 som saknar bibliotek.
- Källkontrollera de 18 ljud som är märkta "kontrollera år".
- Native/mobilapp eller fysiskt kortspel med QR-koder som länkar till ljud.
- Riktig flerspelarupplevelse (delat rum istället för pass-and-play).
