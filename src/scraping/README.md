# Nykaa Fashion data scraping

One command scrapes, saves JSON, and imports into MongoDB (add only).

## Run all categories from config

Edit `src/scraping/nykaa/categories.example.json`, then:

```bash
cd BE
npm run scrape:nykaa:all
```

Or:

```bash
npm run scrape:nykaa -- --config src/scraping/nykaa/categories.example.json
```

### Config fields

| Field | Required | Description |
|-------|----------|-------------|
| `categoryFilter` | yes | Nykaa `category_filter` id |
| `categoryName` | yes | DB category name (created if missing) |
| `priceMin` / `priceMax` | yes | Random price range per product |
| `limit` | no | Product count (default **50**) |
| `sort` | no | API sort: `low-to-high` (default) or `high-to-low` |

After the run, a summary prints in the terminal and a report is saved to:

`src/scraping/output/run-report-<timestamp>.json`

## Single category

```bash
npm run scrape:nykaa -- --category-filter 4497 --category tops --price-min 100 --price-max 200 --limit 50 --sort low-to-high
```

## Other flags

| Flag | Description |
|------|-------------|
| `--dry-run` | No DB writes |
| `--json-only` | Only write JSON files |
| `--max-pages` | API pages per category (default 40) |
| `--from-raw` | Use saved API JSON instead of live fetch |
