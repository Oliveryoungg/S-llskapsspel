#!/usr/bin/env python3
"""
Bygger data/catalog.json och js/catalog.js utifrån data/catalog_raw.json
(som i sin tur extraherades ur docs/Ljudkatalog.pdf).

Kör om katalogen någonsin uppdateras:
    python3 data/build_catalog.py
"""
import json
import re
import unicodedata
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
RAW_PATH = ROOT / "data" / "catalog_raw.json"
JSON_OUT = ROOT / "data" / "catalog.json"
JS_OUT = ROOT / "js" / "catalog.js"

FLAG_LABELS = {
    "KONTROLLERA ÅR": {"key": "verifyYear", "label": "Kontrollera år", "icon": "⚠️"},
    "SVENSKT": {"key": "swedish", "label": "Svenskt", "icon": "🇸🇪"},
    "FÖRSVANN": {"key": "vanished", "label": "Har försvunnit", "icon": "👻"},
}


def slugify(year: int, name: str) -> str:
    ascii_name = unicodedata.normalize("NFKD", name).encode("ascii", "ignore").decode()
    ascii_name = re.sub(r"[^a-zA-Z0-9]+", "-", ascii_name).strip("-").lower()
    return f"{year}-{ascii_name}"


def decade_of(year: int) -> int:
    return (year // 10) * 10


def main() -> None:
    raw = json.loads(RAW_PATH.read_text(encoding="utf-8"))
    seen_ids: dict[str, int] = {}
    entries = []

    for e in raw:
        base_id = slugify(e["year"], e["name"])
        count = seen_ids.get(base_id, 0)
        seen_ids[base_id] = count + 1
        entry_id = base_id if count == 0 else f"{base_id}-{count + 1}"

        flags = []
        for raw_flag in e["flags"]:
            info = FLAG_LABELS[raw_flag]
            flags.append(info["key"])

        entries.append(
            {
                "id": entry_id,
                "year": e["year"],
                "decade": decade_of(e["year"]),
                "name": e["name"],
                "confidence": e["confidence"],
                "flags": flags,
                "description": e["description"],
                "searchTerms": e["searchTerms"],
                "recordYourself": e["recordYourself"],
                "audio": f"data/audio/{entry_id}.mp3",
            }
        )

    entries.sort(key=lambda e: e["year"])

    JSON_OUT.write_text(
        json.dumps(entries, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )

    js_lines = [
        "// Auto-genererad av data/build_catalog.py — redigera inte för hand.",
        "// Källa: docs/Ljudkatalog.pdf",
        "window.NOSTALGI_CATALOG = " + json.dumps(entries, ensure_ascii=False, indent=2) + ";",
        "",
    ]
    JS_OUT.write_text("\n".join(js_lines), encoding="utf-8")

    print(f"Skrev {len(entries)} ljud till {JSON_OUT} och {JS_OUT}")


if __name__ == "__main__":
    main()
