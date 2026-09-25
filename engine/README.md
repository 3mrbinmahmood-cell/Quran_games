# Quran Games Engine — Beta

This folder is the new web-game platform. Existing HTML games remain untouched while each game is migrated and tested.

## Engine
- Phaser 3.90.0 for the browser game layer.
- Firebase JS SDK 12.19.0 for optional accounts and cloud progress.
- LocalStorage is always used as a local/offline progress copy.

## Authentication design
Registration uses **username + email + password**. Firebase sends an email verification message. Cloud progress writes are allowed only after the email is verified. Google Sign-In is also implemented.

The username is the player's display name. Email/password or Google is the authentication credential. A secure username-only login would require a backend lookup service and is intentionally not implemented as a public username-to-email mapping.

## Firebase setup still required
1. Create a Firebase project and Web App.
2. Enable Authentication > Email/Password.
3. Enable Authentication > Google.
4. Create Cloud Firestore.
5. Copy the Web App configuration into `engine/firebase-config.js`.
6. Deploy the rules from `engine/firestore.rules`.
7. Add the GitHub Pages domain to Firebase Authentication authorized domains.

Until this is done, the engine works in local/offline mode and saves progress in the browser.

## Migration status
- [x] Sarf Light / Kids — Phaser Engine v1; 17 verbs, 578 active conjugation questions, no repeat before each 34-question verb set completes.
- [x] Quran Vocabulary — Multiple Choice — Phaser Engine v1; 5,311 entries, surah/round navigation, wrong-answer review, local/full progress.
- [ ] Quran Vocabulary — Kids
- [x] Matching — Full — shared Phaser matching engine with 1–10 items, direct round jump, and surah progress.
- [x] Matching — Kids — simplified definitions, same full-cycle round engine.
- [x] Istakhraj — Full — 5,311 typed-answer questions with surah/round navigation.
- [x] Istakhraj — Kids — current kids source migrated to the shared Istakhraj engine.
- [ ] Sarf — Full
- [ ] Quranic Nahw

## Progress contract
Every migrated game saves a small JSON document under a stable game ID. The same data is saved locally and, for verified users, under:
`users/{uid}/progress/{gameId}`
