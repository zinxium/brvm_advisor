# BRVM Advisor — Bot d'investissement

Bot d'analyse de la Bourse Régionale des Valeurs Mobilières (Zone UEMOA) avec recherche web en temps réel, propulsé par Claude AI.

---

## Prérequis (à installer une seule fois)

### 1. Node.js
Télécharge et installe Node.js depuis https://nodejs.org (prends la version LTS).
Vérifie l'installation en ouvrant un terminal et en tapant :
```bash
node --version   # doit afficher v18 ou plus
npm --version    # doit afficher un numéro
```

### 2. Git
Télécharge depuis https://git-scm.com et installe.

### 3. Un compte GitHub
Crée un compte gratuit sur https://github.com si tu n'en as pas.

### 4. Un compte Vercel
Crée un compte gratuit sur https://vercel.com (tu peux te connecter avec GitHub).

### 5. Ta clé Anthropic
Va sur https://console.anthropic.com → API Keys → Create Key.
Copie ta clé (elle commence par `sk-ant-...`). **Ne la partage jamais !**

---

## Lancer le projet en local (sur ton ordinateur)

### Étape 1 : Télécharger le projet

```bash
# Ouvre un terminal, va dans ton dossier de projets
cd ~/Documents

# Clone le projet (remplace YOUR_GITHUB_USERNAME par ton pseudo)
git clone https://github.com/YOUR_GITHUB_USERNAME/brvm-advisor.git

# Entre dans le dossier
cd brvm-advisor
```

> **Si tu n'as pas encore mis le code sur GitHub** : continue à l'étape suivante, tu le feras après.

### Étape 2 : Installer les dépendances

```bash
npm install
```
Patiente ~1 minute, ça télécharge tout ce qu'il faut.

### Étape 3 : Configurer la clé API

Crée un fichier `.env.local` à la racine du projet :
```bash
# Sur Mac/Linux
cp .env.example .env.local

# Sur Windows (PowerShell)
copy .env.example .env.local
```

Ouvre `.env.local` avec ton éditeur de texte et remplace `sk-ant-COLLE_TA_CLE_ICI` par ta vraie clé Anthropic.

### Étape 4 : Lancer le serveur de développement

```bash
npm run dev
```

Ouvre ton navigateur sur http://localhost:3000 — le bot est là !

---

## Déployer sur Vercel (mettre en ligne)

### Étape 1 : Mettre le code sur GitHub

```bash
# Dans le dossier du projet
git init
git add .
git commit -m "Initial commit - BRVM Advisor"

# Sur GitHub.com : crée un nouveau repo public nommé "brvm-advisor"
# Puis connecte ton dossier local à GitHub :
git remote add origin https://github.com/TON_PSEUDO/brvm-advisor.git
git branch -M main
git push -u origin main
```

### Étape 2 : Importer sur Vercel

1. Va sur https://vercel.com/dashboard
2. Clique **"Add New… → Project"**
3. Clique **"Import"** à côté de ton repo `brvm-advisor`
4. Dans la section **"Environment Variables"**, ajoute :
   - **Name** : `ANTHROPIC_API_KEY`
   - **Value** : ta clé `sk-ant-...`
5. Clique **"Deploy"**

Vercel va builder et déployer ton bot en ~1 minute.
Tu recevras un lien comme `https://brvm-advisor-xxx.vercel.app` — c'est ton bot en ligne !

### Mises à jour futures

À chaque fois que tu modifies le code et que tu fais `git push`, Vercel redéploie automatiquement. Zéro config supplémentaire.

---

## Structure du projet

```
brvm-advisor/
├── app/
│   ├── globals.css          ← Variables CSS globales
│   ├── layout.tsx           ← Layout HTML (polices Google Fonts)
│   ├── page.tsx             ← Interface chat React
│   └── api/
│       └── chat/
│           └── route.ts     ← Proxy sécurisé → Anthropic API
├── .env.example             ← Template pour la clé API
├── .env.local               ← Ta vraie clé (JAMAIS sur GitHub)
├── .gitignore               ← Protège .env.local du commit
├── next.config.js
├── package.json
└── tsconfig.json
```

---

## Dépannage

| Problème | Solution |
|---|---|
| `ANTHROPIC_API_KEY manquante` | Vérifie que `.env.local` existe et contient la bonne clé |
| `npm install` échoue | Vérifie que Node.js ≥ 18 est installé |
| Page blanche sur Vercel | Va dans Vercel → ton projet → "Environment Variables" → vérifie la clé |
| Erreur CORS | Normal en local si tu appelles l'API directement — utilise toujours `/api/chat` |

---

## Avertissement légal

Les analyses fournies par ce bot sont à titre informatif uniquement et ne constituent pas des conseils financiers certifiés. Consultez un conseiller financier agréé avant tout investissement.

---

*Built with Next.js + Anthropic Claude + Vercel*
