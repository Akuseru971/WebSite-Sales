# Real Local Business Prospecting App

Prototype V1 en Node.js + Express + HTML/CSS/JS vanilla, branché sur Google Places API (New) pour récupérer des établissements réels.

## Packages à installer

- express
- dotenv

Commande exacte:

```bash
cd business-audit-app
npm install express dotenv
```

## Configuration

1. Copier le fichier d'exemple:

```bash
cp .env.example .env
```

2. Renseigner la clé API dans `.env`:

```env
GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
PORT=3001
```

## Lancement

```bash
npm start
```

Puis ouvrir:

```text
http://localhost:3001
```

## Endpoints backend

- `GET /api/search?city=Marseille&type=restaurant`
- `GET /api/business/:id?city=Marseille`
- `GET /api/photo?name=places/.../photos/...&maxWidthPx=600`

## Fetch frontend vers backend

Recherche:

```javascript
fetch(`/api/search?city=${encodeURIComponent(city)}&type=${encodeURIComponent(type)}`)
```

Détails business (au clic Analyser):

```javascript
fetch(`/api/business/${encodeURIComponent(id)}?city=${encodeURIComponent(city)}`)
```

## Structure projet

- `server.js`
- `.env`
- `.env.example`
- `public/index.html`
- `public/preview.html`
- `public/style.css`
- `public/app.js`
- `public/preview.js`
- `services/googlePlaces.js`

## Notes fonctionnelles

- Données réelles uniquement (Google Places API New), aucun mock.
- Recherche par ville + type de commerce.
- Workflow one-by-one: Passer ou Analyser chaque carte.
- La preview affiche toujours le disclaimer obligatoire en haut.
