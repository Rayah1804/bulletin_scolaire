# Résumé des algorithmes et calculs du projet resak_bulltin

Ce document explique les algorithmes principaux utilisés dans l'application : génération de bulletins, calcul des notes, moyennes, classement, déduplication et création de données d'exemple.

---

## 1. Génération de notes pour les bulletins trimestriels

Les bulletins sont générés pour les trimestres 1 à 5. Pour chaque bulletin, les notes de chaque matière sont calculées de façon réaliste.

### 1.1 Fonctions utilitaires

- `randomInt(min, max)`
  - Génère un entier aléatoire entre `min` et `max` inclus.

- `randomDecimal(min, max)`
  - Génère un réel aléatoire entre `min` et `max`.
  - Le résultat est arrondi à une décimale.

- `clampGrade(value)`
  - Limite la note entre 4 et 20.
  - Arrondit la note à une décimale.

- `formatGrade(value)`
  - Transforme la note pour qu'elle ait uniquement `.0`, `.5` ou `.75`.
  - Logique :
    - si la décimale est ≥ 0.75 => `.75`
    - sinon si la décimale est ≥ 0.5 => `.5`
    - sinon si la décimale est ≥ 0.25 => `.5`
    - sinon => `.0`
  - Résultat final formaté en chaîne `fr-FR` avec virgule.

### 1.2 Création de notes variables

La fonction `createVariedBulletinNotes(notes, trimestre, seed)` produit, pour chaque matière, des notes de contrôle et d'examen différentes selon le trimestre et l'élève.

1. Si des notes de base sont déjà fournies (`n1`, `n2`, `exam`), elles sont utilisées comme base. Sinon, on génère des valeurs initiales entre 8 et 16.
2. On calcule une tendance de trimestre :
   - `trend = (trimestre - 1) * 1.2`
   - Cela crée une progression ou une régression selon le trimestre.
3. On calcule un écart matière/élève :
   - `subjectOffset = ((seed + index * 7) % 11 - 5) * 0.3`
   - Cela donne une variation stable par matière et par élève.
4. On ajoute une variation de trimestre :
   - `trimestreVariation = randomDecimal(-2.5, 2.5)`
5. Les notes sont calculées ainsi :
   - `n1 = clampGrade(baseN1 + trimestreVariation + trend + subjectOffset + randomDecimal(-0.8, 0.8))`
   - `n2 = clampGrade(baseN2 + trimestreVariation + trend + subjectOffset / 1.2 + randomDecimal(-0.8, 0.8))`
   - `exam = clampGrade(baseExam + trimestreVariation + trend * 0.8 + subjectOffset / 1.5 + randomDecimal(-0.5, 0.5))`
6. Le résultat final est formaté via `formatGrade(...)`.

### 1.3 Variation réaliste

- Les notes évoluent de manière différente entre trimestres.
- Les variations peuvent être positives ou négatives.
- Les coefficients et l'offset de matière créent des écarts entre disciplines.
- Les décimales sont forcées à `.0`, `.5` ou `.75` pour simuler un barème réaliste.

---

## 2. Création de bulletins de base et variantes

### 2.1 Modèle de bulletin de base

La fonction `createSampleBulletinTemplates(now)` fournit des bulletins d'exemple avec des notes initiales.

Chaque bulletin de base contient :
- un `studentId`
- un ensemble de `notes` avec `matiere`, `coefficient`, `n1`, `n2`, `exam`
- une `appreciation`
- `createdAt` et `updatedAt`

### 2.2 Création d'un bulletin par trimestre

La fonction `createBulletinVariant(baseBulletin, trimestre)` :
1. Calcule une graine stable de l'élève avec `createStableSeed(studentId)`.
2. Ajoute le trimestre à la graine : `studentSeed = seed + trimestre * 7`.
3. Construit un nouveau bulletin :
   - `id = studentId-bulletin-trimestre`
   - `trimestre = trimestre`
   - `notes = createVariedBulletinNotes(baseBulletin.notes, trimestre, studentSeed)`
   - `createdAt` et `updatedAt` mis à jour à maintenant.

---

## 3. Assurer la présence des 5 trimestres

### 3.1 Déduction des bulletins manquants

La fonction `ensureAllTrimesterBulletins(existing)` s'assure qu'un élève a bien les bulletins 1 à 5.

1. On extrait les trimestres déjà présents.
2. Si aucun bulletin n'existe, on retourne une liste vide.
3. On prend le bulletin de base du trimestre 1 si disponible, sinon le premier existant.
4. Pour chaque trimestre de 1 à 5 :
   - si le bulletin existe, on le garde.
   - sinon, on crée un nouveau bulletin avec `createBulletinVariant(baseBulletin, trimestre)`.

### 3.2 Déduplication

La fonction `deduplicateBulletins(bulletins)` enlève les doublons identifiés par :
- `studentId`
- `trimestre`

Elle utilise un `Set<string>` où la clé est `studentId-trimestre`.

---

## 4. Calcul des moyennes et du classement

Ces calculs sont réalisés dans `BulletinFormScreen.tsx`.

### 4.1 Conversion de chaîne à note numérique

- `parseNoteValue(value)` convertit une note texte en nombre.
- Remplace `,` par `.` puis parse en nombre.
- Retourne `null` si la valeur n'est pas un nombre valide.

### 4.2 Calcul de la moyenne de matière (MG)

Pour chaque ligne de matière :
- `sum = n1 + n2 + exam`
- `coefficient = Number(row.coefficient) || 1`

Calcul de la moyenne pondérée selon le coefficient :
- coefficient 3 : `MG = sum`
- coefficient 2 : `MG = (sum / 3) * 2`
- coefficient 1 : `MG = sum / 3`

### 4.3 Moyenne générale du bulletin

Dans `useMemo` :
- `total = somme des MG`
- `coeff = somme des coefficients`
- `moyenneGenerale = coeff > 0 ? total / coeff : 0`

### 4.4 Moyenne d'un bulletin stocké

La fonction `averageBulletin(bulletin)` :
- Parcourt chaque note de bulletin.
- Calcule `mg` exactement comme ci-dessus.
- Cumul `total += mg`
- Cumul des `coeff += coefficient`
- Retourne `total / coeff` si `coeff > 0`, sinon `null`.

### 4.5 Classement dans la classe

La fonction `computeRank(trimestreNumber)` effectue :
1. Filtrer `classBulletins` pour le même trimestre.
2. Calculer la moyenne pour chaque bulletin.
3. Trier par moyenne décroissante.
4. Chercher la position de l'élève courant.

Retour :
- `position` dans la classe
- `total` d'élèves ayant une moyenne valide
- `moyenne` de l'élève

### 4.6 Historique des moyennes

- `studentBulletinsSummary` contient tous les bulletins de l'élève triés par trimestre.
- Chaque élément contient la moyenne et le classement du trimestre.

### 4.7 Moyenne annuelle

- `annualAverage` fait la moyenne des moyennes trimestrielles valides.
- Formule : `sum(moyennes trimestrielles) / nombre de trimestres valides`.

---

## 5. Décision finale au trimestre 5

Pour le bulletin final (`trimestre === 5`), l'application calcule un message de classement :
- `moy >= 14` => `Félicitations`
- `12 <= moy < 14` => `Tableau d'honneur`
- sinon => `Encouragements`

---

## 6. Algorithme de générations d'événements de bulletin

### 6.1 Flux de création des données

1. Charger les bulletins existants depuis `secureDb`.
2. Supprimer les doublons avec `deduplicateBulletins`.
3. Compléter les bulletins manquants avec `ensureAllTrimesterBulletins`.
4. Stocker le résultat nettoyé en local.

### 6.2 Reprise d'un bulletin existant

- Si un bulletin existe pour un élève et un trimestre, il est conservé.
- Les bulletins manquants sont générés automatiquement à partir du bulletin de base.

---

## 7. Résumé du pipeline de calcul

Pour chaque élève :
1. Récupérer son bulletin existant ou générer une variante s'il manque des trimestres.
2. Pour chaque matière, calculer `n1`, `n2`, `exam` réalistes et usar des décimales contrôlées.
3. Calculer la moyenne matière pondérée selon le coefficient.
4. Calculer la moyenne générale du bulletin.
5. Calculer le classement dans le groupe pour le trimestre.
6. Pour le trimestre final, ajouter l'historique des moyennes et un verdict final.

---

## 8. Notes complémentaires

- Les coefficients sont traités comme 1, 2 ou 3.
- La logique de notation utilise une fourchette plausible sur 20.
- Les variations par trimestre créent des différences d'un trimestre à l'autre.
- Le format d'affichage français est utilisé : `,` au lieu de `.`.

---

## 9. Exemples d'expressions de calcul

### Exemple de moyenne matière
- Matière coefficient 3 : `MG = n1 + n2 + exam`
- Matière coefficient 2 : `MG = (n1 + n2 + exam) * 2 / 3`
- Matière coefficient 1 : `MG = (n1 + n2 + exam) / 3`

### Exemple de moyenne générale
- Si deux matières coefficient 3 et 2 ont MG 45 et 28 :
  - `total = 45 + 28 = 73`
  - `coeff = 3 + 2 = 5`
  - `moyenneGenerale = 73 / 5 = 14,6`

### Exemple de formatage
- Note calculée 14.83 => `.75` => `14,75`
- Note calculée 13.11 => `.0` => `13,00`
- Note calculée 12.52 => `.5` => `12,50`

---

## 10. Dépendances techniques liées aux calculs

- `expo-secure-store` : stockage chiffré des bulletins
- `@expo/vector-icons` : pas directement lié aux calculs, mais utilisé pour l’interface
- `expo-print` / `expo-sharing` : export PDF du bulletin avec données calculées

---

## 11. Comment utiliser ce document

Ce fichier explique toute la logique de génération et de calcul des bulletins.
- Pour corriger une note ou un écart, modifie `createVariedBulletinNotes`.
- Pour ajuster le barème, modifie `formatGrade`.
- Pour changer le classement, modifie `computeRank` ou `trimestreInfo`.

