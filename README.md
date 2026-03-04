# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

## Parc Info — Documentation complète

Application de **gestion du parc informatique** (ASSNAT) : React + TypeScript + Vite, avec une couche API en mémoire (`src/lib/seed.json` + `src/lib/api.ts`).

---

### 1. Structure du projet

```
src/
├── App.tsx              # Routes + layout protégé
├── main.tsx
├── types.ts             # Types partagés (Asset, Assignment, Incident, Repair, HistoryEvent, DashboardStats)
├── lib/
│   ├── api.ts           # API factice (GET/POST/DELETE) + logique métier
│   ├── auth.ts          # Session (localStorage, expiration 30 min)
│   ├── format.ts        # formatDate, assetStatusLabel
│   └── seed.json        # Données initiales (assets, assignments, incidents, repairs, history)
├── pages/
│   ├── Auth.tsx         # Connexion (/login)
│   ├── Dashboard.tsx    # Synthèse (/)
│   ├── Assets.tsx       # Stock (/assets)
│   ├── AssetDetails.tsx # Fiche matériel (/assets/:id)
│   ├── Assignments.tsx   # Affectations (/affectations)
│   ├── Incidents.tsx    # Pannes (/pannes)
│   ├── Workshop.tsx     # Atelier (/atelier)
│   ├── Suppliers.tsx    # Fournisseurs (/fournisseurs) — état local
│   └── MaterialTypes.tsx# Types matériel (/types-materiel) — état local
└── components/
    ├── Layout.tsx       # Sidebar + header + navigation
    ├── Ui.tsx           # Boutons, inputs, table, card, etc.
    ├── Badge.tsx        # StatusBadge
    └── Modal.tsx        # ConfirmModal
```

**Routes :** `/login` (public) ; `/`, `/assets`, `/assets/:id`, `/affectations`, `/pannes`, `/atelier`, `/fournisseurs`, `/types-materiel` (protégées).

---

### 2. Entités et champs

#### Entités persistées (API / seed)

| Entité | Champs | Description |
|--------|--------|-------------|
| **Asset** | `id`, `inventoryNumber` (unique), `type`, `brand`, `model`, `entryDate`, `supplier`, `status`, `createdAt`, `updatedAt` | Matériel du parc (PC, imprimante, switch…). |
| **Assignment** | `id`, `assetId`, `department`, `user`, `startDate`, `endDate` (optionnel), `createdAt` | Affectation d’un matériel à une direction / un utilisateur. |
| **Incident** | `id`, `assetId`, `description`, `reportedAt`, `department`, `status`, `createdAt`, `updatedAt` | Panne signalée sur un matériel. |
| **Repair** | `id`, `incidentId`, `action`, `cost`, `workshopIn`, `workshopOut` (optionnel), `status`, `createdAt`, `updatedAt` | Réparation liée à un incident (atelier). |
| **HistoryEvent** | `id`, `assetId`, `type`, `payload` (JSON), `createdAt` | Trace des événements métier (création, statut, affectation, incident, réparation). |

#### Entités UI uniquement (état local, pas d’API)

| Entité | Champs | Page |
|--------|--------|------|
| **Supplier** | `id`, `name`, `contact`, `address` | Fournisseurs |
| **MaterialType** | `id`, `name`, `description` | Types matériel |

#### Types non persistés (agrégats / session)

| Type | Champs | Usage |
|------|--------|--------|
| **DashboardStats** | `countsByStatus`, `stockVsAssigned` (enStock, affecte), `topDepartmentsIncidents`, `repairsInProgress` | GET `/api/dashboard` |
| **Session** | `user`, `expiresAt` | Auth (localStorage, 30 min) |

---

### 3. Enums et valeurs

| Enum | Valeurs |
|------|---------|
| **AssetStatus** | `EN_STOCK`, `AFFECTE`, `EN_PANNE`, `EN_REPARATION`, `EN_SERVICE`, `HORS_SERVICE` |
| **IncidentStatus** | `OUVERT`, `CLOS` |
| **RepairStatus** | `EN_COURS`, `TERMINE` |
| **HistoryEventType** | `ASSET_CREATED`, `STATUS_CHANGED`, `ASSIGNMENT_CREATED`, `ASSIGNMENT_ENDED`, `INCIDENT_REPORTED`, `REPAIR_STARTED`, `REPAIR_FINISHED` |

---

### 4. Relations entre entités

- **Asset 1 → N Assignment** : un matériel peut avoir plusieurs affectations (historique) ; une affectation concerne un seul matériel.
- **Asset 1 → N Incident** : un matériel peut avoir plusieurs pannes ; un incident concerne un seul matériel.
- **Incident 1 → N Repair** : un incident peut avoir plusieurs réparations ; une réparation est liée à un seul incident.
- **Asset 1 → N HistoryEvent** : tous les événements métier sont tracés par matériel.

*(Supplier et MaterialType sont indépendants en UI ; un futur lien Asset → Supplier / Asset → MaterialType est possible.)*

---

### 5. Cas d’utilisation par page

#### Auth (`/login`)

- Se connecter (identifiant + mot de passe, session 30 min).
- Redirection si déjà connecté ou après login (`?redirect=` ou `/`).
- Pas de vraie authentification serveur (démo).

#### Dashboard (`/`)

- Consulter la synthèse : total matériels, en stock, affectés, réparations en cours.
- Voir la répartition par état (graphique barres + tableau).
- Voir le top des directions par nombre de pannes (graphique barres horizontales).

#### Stock — Assets (`/assets`)

- Ajouter un matériel (numéro d’inventaire généré ou saisi, type, marque, modèle, date d’entrée, fournisseur).
- Lister les matériels avec filtres : recherche texte (inventaire, marque, modèle, fournisseur), type, état.
- Actualiser la liste, réinitialiser les filtres.
- Ouvrir la fiche détail (lien « Historique ») → `/assets/:id`.
- Supprimer un matériel (confirmation) ; suppression en cascade des affectations, incidents, réparations et historique associés.

#### Fiche matériel — AssetDetails (`/assets/:id`)

- Consulter les infos du matériel (inventaire, type, marque, modèle, fournisseur, dates, statut).
- Voir l’affectation actuelle (direction, utilisateur, date de début) ou « Aucune affectation active ».
- Consulter l’historique complet (événements + payload JSON).
- Consulter la liste des affectations passées (direction, utilisateur, début, fin).
- Consulter les incidents et leurs réparations (dates atelier, action, coût, statut).
- Actualiser la fiche.

#### Affectations (`/affectations`)

- Lister les matériels avec affectation active (seuls les matériels non EN_PANNE / EN_REPARATION / HORS_SERVICE sont assignables).
- Créer une affectation : choisir un matériel, saisir direction, utilisateur, date de début ; une nouvelle affectation clôt l’affectation active précédente et met le matériel en `AFFECTE`.
- Clôturer une affectation (« Fin d’affectation ») : `endDate` = aujourd’hui, statut du matériel repasse à `EN_STOCK`.

#### Pannes — Incidents (`/pannes`)

- Signaler une panne : choisir un matériel, direction, date de signalement, description ; le matériel passe en `EN_PANNE`, incident créé en `OUVERT`.
- Consulter la liste des pannes en cours (incidents ouverts avec infos matériel).

#### Atelier — Workshop (`/atelier`)

- Démarrer une réparation : choisir un incident ouvert, date d’entrée atelier, action, coût ; création d’une réparation `EN_COURS`, matériel en `EN_REPARATION`.
- Consulter les réparations en cours (avec incident + matériel).
- Clôturer une réparation : « En service » (matériel → `EN_SERVICE`) ou « Hors service » (matériel → `HORS_SERVICE`) ; incident passé en `CLOS`, réparation `TERMINE`.

#### Fournisseurs (`/fournisseurs`)

- Ajouter / modifier / supprimer un fournisseur (nom, contact, adresse) — état local uniquement.
- Rechercher par nom, contact ou adresse.

#### Types matériel (`/types-materiel`)

- Ajouter / modifier / supprimer un type (libellé, description) — état local uniquement.
- Rechercher par libellé ou description.

---

### 6. Endpoints API (mode seed)

| Méthode | URL | Corps / paramètres | Rôle |
|---------|-----|--------------------|------|
| GET | `/api/dashboard` | — | Statistiques (countsByStatus, stockVsAssigned, topDepartmentsIncidents, repairsInProgress). |
| GET | `/api/assets` | Query : `q`, `type`, `status`, `with=activeAssignment` | Liste des matériels (filtres, optionnellement avec affectation active). |
| GET | `/api/assets/:id` | — | Détail d’un matériel (assignments, incidents+repairs, history, activeAssignment). |
| POST | `/api/assets` | `inventoryNumber`, `type`, `brand`, `model`, `entryDate`, `supplier` | Créer un matériel (statut EN_STOCK). |
| DELETE | `/api/assets/:id` | — | Supprimer un matériel et les données liées (assignments, incidents, repairs, history). |
| POST | `/api/assets/:id/assignments` | `department`, `user`, `startDate` | Créer une affectation (clôture l’ancienne, statut AFFECTE). |
| POST | `/api/assignments/:id/end` | — | Clôturer une affectation (endDate, statut matériel EN_STOCK). |
| GET | `/api/incidents` | Query : `status`, `with=asset` | Liste des incidents (avec infos matériel si demandé). |
| POST | `/api/assets/:id/incidents` | `department`, `reportedAt`, `description` | Signaler une panne (statut matériel EN_PANNE). |
| GET | `/api/repairs` | Query : `status`, `with=incident` | Liste des réparations (avec incident + asset si demandé). |
| POST | `/api/incidents/:id/repairs` | `action`, `cost`, `workshopIn` | Démarrer une réparation (statut matériel EN_REPARATION). |
| POST | `/api/repairs/:id/finish` | `workshopOut`, `outcome` (`EN_SERVICE` \| `HORS_SERVICE`) | Clôturer une réparation (incident CLOS, statut matériel selon outcome). |

*(Aucun endpoint pour Fournisseurs ni Types matériel — gérés en état local.)*

---

### 7. Schéma Prisma (complet, avec référentiels UI)

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

enum AssetStatus {
  EN_STOCK
  AFFECTE
  EN_PANNE
  EN_REPARATION
  EN_SERVICE
  HORS_SERVICE
}

enum IncidentStatus {
  OUVERT
  CLOS
}

enum RepairStatus {
  EN_COURS
  TERMINE
}

enum HistoryEventType {
  ASSET_CREATED
  STATUS_CHANGED
  ASSIGNMENT_CREATED
  ASSIGNMENT_ENDED
  INCIDENT_REPORTED
  REPAIR_STARTED
  REPAIR_FINISHED
}

model Asset {
  id              Int             @id @default(autoincrement())
  inventoryNumber String          @unique
  type            String
  brand           String
  model           String
  entryDate       DateTime
  supplier        String
  status          AssetStatus     @default(EN_STOCK)
  createdAt       DateTime        @default(now())
  updatedAt       DateTime        @updatedAt

  // relations
  assignments     Assignment[]
  incidents       Incident[]
  history         HistoryEvent[]
}

model Assignment {
  id         Int      @id @default(autoincrement())
  assetId    Int
  asset      Asset    @relation(fields: [assetId], references: [id])
  department String
  user       String
  startDate  DateTime
  endDate    DateTime?
  createdAt  DateTime @default(now())

  @@index([assetId])
}

model Incident {
  id          Int            @id @default(autoincrement())
  assetId     Int
  asset       Asset          @relation(fields: [assetId], references: [id])
  description String
  reportedAt  DateTime
  department  String
  status      IncidentStatus @default(OUVERT)
  createdAt   DateTime       @default(now())
  updatedAt   DateTime       @updatedAt

  repairs     Repair[]

  @@index([assetId])
  @@index([status])
}

model Repair {
  id          Int          @id @default(autoincrement())
  incidentId  Int
  incident    Incident     @relation(fields: [incidentId], references: [id])
  action      String
  cost        Float
  workshopIn  DateTime
  workshopOut DateTime?
  status      RepairStatus @default(EN_COURS)
  createdAt   DateTime     @default(now())
  updatedAt   DateTime     @updatedAt

  @@index([incidentId])
  @@index([status])
}

model HistoryEvent {
  id        Int              @id @default(autoincrement())
  assetId   Int
  asset     Asset            @relation(fields: [assetId], references: [id])
  type      HistoryEventType
  payload   Json
  createdAt DateTime         @default(now())

  @@index([assetId])
  @@index([type])
}

model Supplier {
  id      Int    @id @default(autoincrement())
  name    String
  contact String?
  address String?
}

model MaterialType {
  id          Int    @id @default(autoincrement())
  name        String
  description String?
}
```

*(Les modèles `Supplier` et `MaterialType` correspondent aux écrans Fournisseurs et Types matériel ; ils ne sont pas encore branchés à l’API. Pour lier `Asset` à un fournisseur ou un type, ajouter `supplierId` / `materialTypeId` et les relations.)*

Ce schéma couvre l’ensemble des entités utilisées par l’application et sert de base pour brancher une base de données relationnelle via Prisma.

---

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
