# Documentation du projet resak_bulltin

## Présentation générale

**resak_bulltin** est une application mobile (React Native + Expo) permettant la gestion d’élèves, la génération de bulletins scolaires trimestriels, le calcul automatisé des notes, des moyennes, du classement, et l’export des bulletins en PDF. L’application propose une interface moderne, un stockage sécurisé, et une logique algorithmique avancée pour simuler des résultats scolaires réalistes.

---

## Fonctionnalités principales

- Gestion des élèves (ajout, modification, suppression, recherche, corbeille)
- Génération automatique des bulletins pour 5 trimestres
- Calcul des notes, moyennes par matière, moyenne générale, classement
- Export et partage des bulletins en PDF
- Interface claire avec navigation par onglets et thèmes (clair/sombre)
- Stockage sécurisé des données (chiffré)

---

## Structure du projet

```
app.json
App.tsx
index.ts
package.json
src/
  components/
    FloatingTabBar.tsx
  navigation/
    StudentsStack.tsx
  screens/
    BulletinFormScreen.tsx
    ExitScreen.tsx
    PlaceholderScreen.tsx
    StudentFormScreen.tsx
    StudentsListScreen.tsx
    StudentsScreen.tsx
    StudentsSearchScreen.tsx
    StudentsTrashScreen.tsx
    WelcomeScreen.tsx
  storage/
    bulletinsRepo.ts
    configRepo.ts
    secureDb.ts
    studentsRepo.ts
  theme/
    theme.ts
    ThemeProvider.tsx
  types/
    bulletin.ts
    student.ts
  utils/
    id.ts
```

---

## Architecture et navigation

- **App.tsx** : Point d’entrée, configure la navigation (onglets, stack), le thème, et le tab bar personnalisé.
- **FloatingTabBar.tsx** : Barre d’onglets flottante personnalisée.
- **StudentsStack.tsx** : Stack de navigation pour la gestion des élèves et bulletins.
- **Screens** : Chaque écran gère une vue spécifique (liste, formulaire, recherche, corbeille, bulletin, etc).
- **ThemeProvider** : Gestion du thème clair/sombre.

---

## Modèles de données

### Élève (`Student`)
- id, nom, prénom, dateNaissance, classe, anneeScolaire, numeroDansClasse, matricule, numeroPasse, createdAt, updatedAt

### Bulletin (`Bulletin`)
- id, studentId, trimestre, notes (array de `BulletinNote`), appreciation, createdAt, updatedAt

### Note de bulletin (`BulletinNote`)
- id, matiere, type, coefficient, note, n1, n2, exam, signature

---

## Algorithmes principaux

### Génération réaliste des notes
- Utilisation de fonctions utilitaires : randomInt, randomDecimal, clampGrade, formatGrade
- Variation par trimestre, matière, élève, et coefficients
- Décimales contrôlées (.0, .5, .75)

### Création et déduplication des bulletins
- Génération automatique pour chaque trimestre manquant
- Déduplication par (studentId, trimestre)

### Calcul des moyennes
- Moyenne matière pondérée par coefficient
- Moyenne générale du bulletin
- Moyenne annuelle (moyenne des moyennes trimestrielles)

### Classement
- Calcul du rang de l’élève dans la classe pour chaque trimestre
- Attribution d’un verdict final au 5e trimestre (Félicitations, Tableau d’honneur, Encouragements)

---

## Dépendances techniques

- **React Native / Expo** : Framework principal
- **@react-navigation** : Navigation stack et tabs
- **expo-secure-store** : Stockage chiffré des données
- **expo-print / expo-sharing** : Export PDF et partage
- **@expo/vector-icons** : Icônes
- **TypeScript** : Typage statique

---

## Installation et lancement

1. Cloner le dépôt
2. Installer les dépendances :
   ```bash
   npm install
   ```
3. Lancer le projet :
   ```bash
   npm start
   ```
   ou
   ```bash
   expo start
   ```

---

## Pour aller plus loin

- Pour modifier la logique de génération des notes : voir `src/storage/bulletinsRepo.ts` et `PROJECT_ALGORITHMS.md`
- Pour ajuster le barème ou le classement : voir `PROJECT_ALGORITHMS.md`
- Pour personnaliser l’interface : voir les composants dans `src/components/` et les thèmes dans `src/theme/`

---

## Auteurs et licence

Projet développé par [Votre Nom ou Équipe].
Licence : MIT
