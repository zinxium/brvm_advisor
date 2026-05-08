# BRVM Advisor — Bot d'investissement

Bot d'analyse de la Bourse Régionale des Valeurs Mobilières (Zone UEMOA) avec recherche web en temps réel, propulsé par Claude AI.

---

## Avertissement légal

Les analyses fournies par ce bot sont à titre informatif uniquement et ne constituent pas des conseils financiers certifiés. Consultez un conseiller financier agréé avant tout investissement.

---

## Fonctionnalités

- **Analyse des actions BRVM** : Identifiez les meilleures opportunités d'investissement
- **Suivi en temps réel** : Ticker live avec prix et variations des actions principales
- **Recherche web intégrée** : Accédez aux dernières données et tendances du marché
- **Stratégies personnalisées** : Conseils adaptés à votre budget d'investissement
- **Interface francophone** : Interaction entièrement en français
- **Historique persistant** : Sauvegarde locale de vos conversations

## Actions suivies

Le ticker affiche les principales actions du marché BRVM :
- SGBCI, SNTS, ETIT, BICC, PALM, ONATEL, SAPH, SDCC, SVOC, NSIA

## Stack technologique

- **Framework** : Next.js 14+ (App Router)
- **Langage** : TypeScript
- **API** : Claude (Anthropic)
- **Style** : CSS-in-JS (inline styles)
- **État** : React Hooks (useState, useCallback, useRef)
- **Persistance** : LocalStorage

## Installation

```bash
# Cloner le repository
git clone <repository-url>
cd brvm_advisor

# Installer les dépendances
npm install

# Configurer les variables d'environnement
# Créer un fichier .env.local avec votre clé API Claude
ANTHROPIC_API_KEY=sk-ant-...
```

## Utilisation

```bash
# Démarrer le serveur de développement
npm run dev

# Le bot sera accessible à http://localhost:3000
```

## Utilisation du bot

1. **Questions rapides** : Utilisez les boutons d'actions rapides pour des requêtes prédéfinies
2. **Requêtes personnalisées** : Tapez votre question dans le champ de saisie
3. **Shift+Enter** : Ajouter une nouvelle ligne dans votre message
4. **Enter** : Envoyer votre message

## Limite de débit

Le bot respecte un limite de 5 requêtes par 60 secondes pour éviter les abus API.

---

Voir [CHANGELOG.md](CHANGELOG.md) pour l'historique complet des modifications.
