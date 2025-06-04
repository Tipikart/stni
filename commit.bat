@echo off
echo === Initialisation du dépôt Git ===
git init

echo === Ajout de l'origine GitHub ===
git remote add origin https://github.com/Tipikart/stni

echo === Ajout de tous les fichiers ===
git add .

echo === Commit des fichiers ===
git commit -m "Initial commit"

echo === Définition de la branche principale ===
git branch -M main

echo === Push vers GitHub ===
git push -u origin main

pause
