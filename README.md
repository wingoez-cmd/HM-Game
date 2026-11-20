# Hospitality Managers Challenge

Jeu de gestion pour Hospitality Managers : dispatcher les tickets des salariés au bon intervenant sur 5 bâtiments.

- `index.html` : le jeu (campagne, chrono, duel)
- `server.js` : sert le jeu et relaie les duels 2 joueurs (WebSocket `/ws`)
- `public/` : icônes, manifeste et service worker de l'app installable (PWA)

Lancer en local : `npm install && npm start` puis http://localhost:3000

## Règles de la campagne (V14)

- **Semaine** = 5 jours (S1 · Lundi … Vendredi).
- **Semaine 1** : plombier, électricien, manutention, propreté. À partir de la **semaine 2**, 2 intervenants changent chaque semaine (arrivent à tour de rôle : serrurier, storiste, sûreté, CVC, informatique) et les 4 boutons changent de place.
- **Ascenseur en panne** : exactement 2 fois par semaine (jours tirés au sort pour la semaine, annoncés dans le brief ; pas de panne le jour 1).
- **Renforts** : on n'embauche plus pour toujours mais **pour une journée** (achetés avant, perdus à la fin de la journée). L'équipe de base reste 1 intervenant par métier.
