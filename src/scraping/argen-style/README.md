# Argen Style — Nykaa pool scrape

Fetches **one combined Nykaa API** (low → high), fills **price bands** (₹100–₹999, 50 products each), and imports into **Argen Style** only (`storeId` in `pool-config.json`).

## Rules

| Rule | Behavior |
|------|----------|
| No duplicate products | Same Nykaa `id` never used twice across bands |
| No duplicate images | Skips if any image pathname exists in DB or earlier in this run |
| `designedit_image` URLs | Removed; product skipped if no images left |
| Blocklist | Add URLs to `image-blocklist.json` |
| Pakistan / Nykaa text | Product skipped if title/tags contain `pakistan` or `nykaa` |
| Category | From product `categoryId` via `category-map.json` (not random) |
| Price | Random integer inside each band (e.g. ₹100–₹199) |
| Branding | Text uses **Argen Style**, not Casaq |

## API (same as browser)

```
category_filter=10_156_164_3908_4543_5040_57387_647_6498_652_662_69
categoryId=6557
PageSize=36
sort=low-to-high
```

## Run

```bash
cd BE
npm run scrape:argen:pool
```

### Flags

| Flag | Description |
|------|-------------|
| `--json-only` | Save JSON under `src/scraping/output/argen-pool-*.json` only |
| `--dry-run` | Validate filters, no DB writes |
| `--max-pages` | API pages (default 200) |
| `--blocklist` | Custom blocklist JSON path |
| `--config` | Alternate `pool-config.json` |
| `--category-map` | Alternate category id → name map |

## Add blocked images

Edit `image-blocklist.json`:

```json
[
  "https://adn-static1.nykaa.com/.../some-image.jpg"
]
```

Partial path segments also work after normalization.
