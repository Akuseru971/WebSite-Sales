# Business Audit App (Express + Vanilla JS)

Mini application locale pour rechercher des entreprises (mock) puis generer un apercu d'optimisation Google Business fiche par fiche.

## Stack

- Node.js
- Express
- HTML / CSS / JavaScript vanilla

## Lancer en local

1. Installer les dependances:

```bash
cd business-audit-app
npm install
```

2. Demarrer le serveur:

```bash
npm start
```

3. Ouvrir dans le navigateur:

```text
http://localhost:3001
```

## Structure

- `server.js`: backend Express + route API `GET /api/search?city=Marseille&type=restaurant`.
- `services/businessSearch.js`: service mock `searchBusinesses(city, type)` remplaçable par Google Places ou Apify.
- `public/index.html`: interface de recherche + liste des resultats.
- `public/preview.html`: page preview optimisee (simulation).
- `public/app.js`: logique frontend (recherche, passer, analyser, preview, generation optimisee).
- `public/style.css`: styles globaux.
