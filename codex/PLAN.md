# Page Dédiée “Statistiques Machines”

## Résumé
Créer une nouvelle page séparée du Dashboard pour analyser l’activité des machines par période : semaine, mois, année. La page affichera les machines enregistrées, les mouvements de stock, les réparations et les périodes de forte activité.

## Changements Clés
- Ajouter une nouvelle route front : `/statistiques-machines`.
- Ajouter un item de navigation : **Statistiques machines**.
- Créer une page dédiée `MachinesStatsPage` avec :
  - sélecteur `Semaine / Mois / Année` ;
  - cartes résumé : machines enregistrées, mouvements de stock, réparations, période la plus active ;
  - graphique ECharts multi-séries ;
  - tableau détaillé par période.
- Ne pas intégrer cette section dans `Dashboard.tsx`.

## API Et Données
- Réutiliser et enrichir l’endpoint existant :
  `GET /api/dashboard/machines-stats?granularity=week|month|year`
- Réponse cible :
```ts
type MachinesStatsPoint = {
  periodStart: string
  assetsCreated: number
  assignmentsCreated: number
  loansCreated: number
  loansReturned: number
  repairsStarted: number
  repairsFinished: number
  totalActivity: number
}
```
- Sources :
  - `Asset.entryDate` : machines enregistrées ;
  - `Assignment.startDate` : affectations ;
  - `ScreenLoan.loanDate` : emprunts ;
  - `ScreenLoan.returnedAt` : retours ;
  - `Repair.workshopEntryDate` : réparations démarrées ;
  - `Repair.workshopExitDate` : réparations terminées.
- Aucun changement Prisma/migration nécessaire.

## UI Prévue
- Titre : **Statistiques machines**.
- Boutons de période en haut : `Semaine`, `Mois`, `Année`.
- Graphique principal :
  - axe X = périodes ;
  - séries = enregistrées, affectations, emprunts, retours, réparations démarrées, réparations terminées.
- Tableau :
  `Période | Enregistrées | Affectations | Emprunts | Retours | Réparations démarrées | Réparations terminées | Total activité`
- États UI :
  - chargement ;
  - message “Aucune donnée” ;
  - message erreur si l’API échoue.

## Test Plan
- Backend : vérifier `week`, `month`, `year`, et erreur `400` si valeur invalide.
- Front : vérifier le changement de période recharge les données.
- Vérifier que le graphique et le tableau affichent les mêmes chiffres.
- Vérifier le cas sans données.
- Lancer :
  - `npm run build` dans `it-stock-api` ou au minimum `npx tsc --noEmit` si Prisma est verrouillé ;
  - `npm run build` dans `it-stock-control`.

## Hypothèses
- “Mouvements de stock” = affectations + emprunts + retours.
- “Machines enregistrées” = `Asset.entryDate`, pas `createdAt`.
- “Période la plus active” = période avec le plus grand `totalActivity`.
- La page sera accessible via `/statistiques-machines` et nommée **Statistiques machines** dans le menu.
