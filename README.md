# VetOptim IA - Base de Données Intelligente

Application Next.js avec IA pour interroger une base de données SQL Server en langage naturel.

## 🚀 Fonctionnalités

- **Indexation automatique** : Scanne et indexe la structure complète de votre base SQL Server
- **Chat IA** : Posez des questions en français, l'IA génère les requêtes SQL automatiquement
- **Résultats en temps réel** : Affichage instantané des données sous forme de tableaux
- **Design moderne** : Interface liquid avec les couleurs VetOptim

## 📦 Technologies

- **Next.js 16** - Framework React
- **Tailwind CSS 4** - Styling
- **Mantine UI** - Composants
- **OpenAI GPT-4** - Génération de requêtes SQL
- **SQL Server** - Base de données source
- **MongoDB** - Stockage du schéma indexé

## ⚙️ Configuration

Créez un fichier `.env.local` avec :

```env
OPENAI_API_KEY=votre_clé_openai
MONGODB_URI=mongodb://...
```

## 🎯 Utilisation

1. **Démarrer l'application** :
```bash
npm run dev
```

2. **Indexer la base** : Cliquez sur "Réindexer" pour scanner toutes les tables

3. **Poser des questions** : Exemples :
   - "Donne moi toutes les personnes qui n'ont pas de contrat"
   - "Liste les projets vieux de plus de 4 mois en Bretagne"
   - "Compte les clients par région"

## 🗄️ Base de données

**SQL Server** :
- Serveur : `v2devsqlserver.database.windows.net`
- Base : `v2dev`
- User : `dbRead` (ReadOnly)

L'indexation récupère :
- Toutes les tables et schémas
- Colonnes avec types et contraintes
- Clés primaires et étrangères
- Nombre de lignes par table
