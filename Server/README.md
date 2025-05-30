# RecapGPT Server

Serveur Node.js pour transcription vidéo avec OpenAI Whisper et DeepSeek.

## 🚀 Déploiement

### Railway (Recommandé)

```bash
npm install -g @railway/cli
railway login
railway link
railway up
```

### Render

1. Connectez votre repo GitHub à Render
2. Choisissez "Web Service"
3. Build: `npm install`
4. Start: `npm start`

### Fly.io

```bash
flyctl launch
flyctl deploy
```

### Local

```bash
npm install
cp .env.example .env  # Configurez vos clés API
npm start
```

## 📋 Variables d'environnement

```bash
OPENAI_API_KEY=sk-...
DEEPSEEK_API_KEY=sk-...
PORT=3000
```

## 🔗 Endpoints

- `GET /status` - Statut du serveur
- `POST /recap` - Transcription vidéo
- `POST /chat` - Chat avec contexte
- `POST /adapt-recipe` - Adaptation de recettes

## 🎯 Plateformes supportées

✅ YouTube, TikTok, Instagram, Twitter/X, Facebook, Twitch, Vimeo
