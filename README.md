# MatchUP 🎾

> A mobile app that matches recreational tennis players by skill level, availability, location and reliability — built as a Final Year Project for BEng Software Engineering at the University of Roehampton.

![React Native](https://img.shields.io/badge/React%20Native-Expo-20232A?logo=react&logoColor=61DAFB)
![Node.js](https://img.shields.io/badge/Node.js-Express-339933?logo=nodedotjs&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Database-4169E1?logo=postgresql&logoColor=white)
![Firebase](https://img.shields.io/badge/Firebase-Auth%20%26%20Messaging-FFCA28?logo=firebase&logoColor=black)

---

## The Problem

Finding a tennis partner is harder than it should be. Existing tools — Facebook groups, the LTA Find a Partner directory — are manual, slow, and give you no way to filter by skill, availability, or how reliable someone actually is. MatchUP fixes that.

---

## What It Does

Users register with their skill level, weekly availability, and location. The app returns a **ranked list of compatible partners**, each with a 0–100 compatibility score. It also supports:

- 💬 **Real-time chat** between matched players (Firebase Firestore)
- 📍 **Court and venue discovery** via the Google Places API
- ⭐ **Reliability scores** — updated automatically after each completed match

---

## Matching Algorithm

Each candidate is scored using a weighted four-factor algorithm:

| Factor | Max Points | Method |
|---|---|---|
| Skill match | 40 | Level comparison |
| Availability overlap | 30 | Weekly schedule matching |
| Geographic proximity | 20 | Haversine formula |
| Reliability score | 10 | Post-match rating history |

Scores are bounded at 100 and displayed on each player card.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React Native with Expo |
| Backend | Node.js with Express |
| Database | PostgreSQL |
| Auth & Messaging | Firebase (Auth + Firestore) |
| Maps & Venues | Google Places API |
| Development tunnelling | ngrok |

---

## Project Structure

```
matchup/
├── App.js                        # React Native entry point
├── src/
│   ├── components/               # Reusable UI components
│   ├── config/                   # Firebase configuration
│   ├── constants/                # Shared constants and API URL
│   ├── navigation/               # Tab and stack navigators
│   ├── screens/                  # All application screens
│   └── services/                 # API client
└── matchup-backend/
    ├── src/
    │   ├── index.js              # Express server entry point
    │   ├── db/                   # PostgreSQL pool and schema
    │   ├── middleware/           # Authentication middleware
    │   └── routes/               # API route handlers
    └── package.json
```

---

## Running Locally

The app requires **three terminals running in parallel**.

**Prerequisites**
- Node.js v18+
- PostgreSQL v14+ running locally
- An ngrok account
- Expo Go installed on a physical iOS or Android device

**Terminal 1 — Backend**
```bash
cd matchup-backend
npm install
npm run dev
```
Backend starts on port 3000.

**Terminal 2 — ngrok tunnel**
```bash
ngrok http 3000
```
Copy the HTTPS URL and paste it into `src/constants/index.js` as the `API_URL` value.

**Terminal 3 — Expo**
```bash
cd ..
npm install
npx expo start
```
Scan the QR code with Expo Go on your phone.

---

## Configuration

**Backend** — create a `.env` file in `matchup-backend/`:
```
PORT=3000
DATABASE_URL=postgresql://postgres:yourpassword@localhost:5432/matchup
FIREBASE_PROJECT_ID=matchup-app-204ff
```

**Frontend** — set `API_URL` in `src/constants/index.js` to match your active ngrok tunnel URL.

---

## Database Setup

The schema is defined in `matchup-backend/src/db/schema.sql`. To create the database from scratch:

```bash
createdb matchup
psql matchup < matchup-backend/src/db/schema.sql
```

---

## What This Demonstrates

- Full-stack mobile development across React Native, Node.js and PostgreSQL
- Custom matching algorithm with weighted multi-factor scoring
- Real-time features using Firebase Auth and Firestore
- Third-party API integration (Google Places)
- End-to-end system design, from database schema to mobile UI

---

## Author

**Sumaya Mohamed** — BEng Software Engineering, University of Roehampton  
[LinkedIn](https://www.linkedin.com/in/sumaya-m-49557b29b/) · [GitHub](https://github.com/Sumaya1600)
