#!/bin/bash

echo "🚀 Déploiement RecapGPT Server"
echo "=============================="

# Vérifier que les clés API sont configurées
if [ ! -f .env ]; then
    echo "❌ Fichier .env manquant"
    echo "Copiez env.example vers .env et configurez vos clés API"
    exit 1
fi

echo "📋 Options de déploiement:"
echo "1. Railway (Recommandé)"
echo "2. Render" 
echo "3. Fly.io"
echo "4. Test local"

read -p "Choisissez une option (1-4): " choice

case $choice in
    1)
        echo "🚂 Déploiement Railway..."
        npm install -g @railway/cli
        railway login
        railway up
        ;;
    2)
        echo "🎨 Ouvrez render.com et connectez ce repository"
        echo "Configuration:"
        echo "- Build Command: npm install"
        echo "- Start Command: npm start"
        echo "- Environment: Node"
        ;;
    3)
        echo "✈️ Déploiement Fly.io..."
        flyctl launch
        flyctl deploy
        ;;
    4)
        echo "💻 Test local..."
        npm install
        npm start
        ;;
    *)
        echo "❌ Option invalide"
        ;;
esac 