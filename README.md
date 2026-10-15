# Roman merchant house — screen designs

A playable mockup of the website side of a Roman-era trading game that ties into Minecraft (teleporting, an in-game ledger, building).

Open `index.html` (Home), or `guide.html` for the whole game on one page. The **All screens** button in the corner of every page lists every screen.

## What's here

| Page | What it is |
|---|---|
| `index.html` | Home: the morning briefing from your servants, news that reached the city, things awaiting your seal |
| `guide.html` | The whole game on one page |
| `map.html`, `travel.html` | The continent; plan a route and teleport in Minecraft |
| `markets.html`, `auctions.html` | Prices as you heard them; bidding in person or through agents |
| `trade.html`, `contract.html` | Haggling at the stall, by letter, through agents; the sealed contract |
| `business.html`, `counting-desk.html`, `fleet.html`, `ventures.html` | What you own, your money, your ships, opportunities (and the alley) |
| `politics.html`, `war.html`, `family.html`, `household.html` | Power: rulers, the war, your family, your servants |
| `tooltips.html` | Minecraft item hover text |

## How it works

Plain static files, no build step. Each page keeps its markup in a `<template>` with `{{bindings}}`, `<sc-for>` loops and `<sc-if>` blocks; `dc-runtime.js` renders it and re-renders when you click. Images and textures are in `assets/`.

## Putting it online

Settings → Pages → Deploy from a branch → `main` / root. The site appears at `https://<user>.github.io/<repo>/`.
