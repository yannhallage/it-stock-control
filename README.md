# IT Stock Control (ASSNAT)

Front React + TypeScript + Vite pour la gestion du parc informatique.  
Consomme l’API normalisée **`it-stock-api`** (`VITE_API_BASE_URL`, défaut `http://localhost:3000`).

## Démarrage

```bash
npm install
npm run dev
```

Variables : `VITE_API_BASE_URL` (voir `.env`).

Auth : JWT via `POST /api/auth/login` — session locale (`src/lib/auth.ts`).

## Architecture API front

```
src/api/
  endpoints.ts      # chemins API
  http.ts           # fetch + Bearer
  services/         # clients HTTP par domaine
  hooks/            # React hooks
src/lib/asset-labels.ts  # helpers d’affichage (brand/type/department…)
src/types.ts        # types alignés sur le schéma Prisma normalisé
```

## Contrats clés (IDs, pas de strings libres)

| Domaine | Create |
|---------|--------|
| Asset | `categoryId`, `materialTypeId`, `brandId`, `supplierId?`, `locationId?`, `model`, `entryDate` |
| Assignment | `userId`, `departmentId`, `startDate`, `note?` |
| Incident | `description`, `reportedAt`, `departmentId` |
| ScreenLoan | `assetId`, prénom/nom, `departmentId?`, dates |

Les réponses exposent des relations `{ id, name }` (`brand`, `materialType`, `category`, `department`, etc.).

## Routes UI

| Route | Page |
|-------|------|
| `/` | Dashboard |
| `/assets`, `/assets/:id` | Stock + fiche (pièces jointes) |
| `/affectations` | Affectations |
| `/pannes` | Incidents |
| `/atelier` | Réparations |
| `/maintenances` | Maintenances |
| `/mouvements` | Mouvements de stock |
| `/emprunts-materiel` | Emprunts |
| `/statistiques-machines` | Stats |
| `/fournisseurs` | Fournisseurs |
| `/types-materiel` | Types matériel |
| `/departements` | Départements |
| `/categories` | Catégories |
| `/marques` | Marques |
| `/emplacements` | Emplacements |

## Build

```bash
npm run build
```
