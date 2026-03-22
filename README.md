# US Manufacturing Skills Gap Map

A static interactive visualization mapping US county-level numeracy rates against skilled manufacturing labor demand, built with D3.js and TopoJSON. The choropleth layer shows numeracy rates across all US counties while proportional circles indicate labor demand at major manufacturing hubs. Both layers support hover inspection and can be toggled independently.

## Quick Start

Serve the project from the repository root with any static file server:

```
npx serve
```

or

```
python3 -m http.server
```

Then open the local URL printed in your terminal.

## Deploy to GitHub Pages

1. Push this repository to GitHub.
2. Go to **Settings > Pages**.
3. Under **Source**, select the `main` branch and root (`/`) folder.
4. Save. The site will be live at `https://<user>.github.io/<repo>/`.

No build step is required.

## File Structure

```
manufacturing-skills-map/
  index.html            Main page — loads D3, TopoJSON, and the app
  css/styles.css        All layout and map styling
  js/app.js             Application logic: data loading, map rendering, legends, toggles
  data/
    numeracy.json       County-level numeracy rates (keyed by FIPS)
    demand.json         Manufacturing labor demand hotspots
  scripts/
    generate-mock-data.js   Node script that produces the mock data files
```

## Data Files

The files in `data/` ship with mock data and can be swapped with real datasets. Keep the following formats.

### `data/numeracy.json`

A JSON object keyed by five-digit FIPS county code. Each value contains the numeracy rate, county name, and state abbreviation.

```json
{
  "01001": {
    "rate": 42,
    "county": "Autauga",
    "state": "AL"
  },
  "06037": {
    "rate": 58,
    "county": "Los Angeles",
    "state": "CA"
  }
}
```

| Field    | Type   | Description                                |
|----------|--------|--------------------------------------------|
| `rate`   | number | Numeracy rate as a percentage (0--100)     |
| `county` | string | County name                                |
| `state`  | string | Two-letter state abbreviation              |

### `data/demand.json`

A JSON array of manufacturing labor demand locations. Each entry specifies coordinates, a demand figure, and an optional description.

```json
[
  {
    "name": "Detroit MI",
    "lat": 42.3314,
    "lng": -83.0458,
    "demand": 4786,
    "description": "Major auto-manufacturing hub facing acute CNC operator shortages."
  }
]
```

| Field         | Type   | Description                                         |
|---------------|--------|-----------------------------------------------------|
| `name`        | string | Display label for the location                      |
| `lat`         | number | Latitude (decimal degrees)                          |
| `lng`         | number | Longitude (decimal degrees)                         |
| `demand`      | number | Number of open skilled manufacturing positions      |
| `description` | string | Short narrative about the location (optional)       |

## Dependencies

All dependencies are loaded from CDNs at runtime -- no install step is needed:

- [D3.js v7](https://d3js.org/)
- [TopoJSON Client v3](https://github.com/topojson/topojson-client)
- [US Atlas (counties-10m)](https://github.com/topojson/us-atlas) -- fetched at runtime for county and state geometry
