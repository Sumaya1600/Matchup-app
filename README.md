# MatchUP

A mobile application that matches recreational tennis players based on skill level, availability, geographic proximity, and reliability. Built as a Final Year Project for a BSc Software Engineering degree at the University of Roehampton.

## What it does

MatchUP solves the partner-coordination problem that recreational tennis players face when using existing tools such as Facebook groups or the LTA Find a Partner directory. Users register with their skill level, weekly availability, and location, and the application returns a ranked list of compatible partners with a 0 to 100 compatibility score on each profile. The app also supports real-time chat between matched players, court and venue discovery via the Google Places API, and a reliability score updated after each completed match.

## Tech stack

- **Frontend:** React Native with Expo
- **Backend:** Node.js with Express
- **Database:** PostgreSQL
- **Authentication and messaging:** Firebase (Auth and Firestore)
- **Maps and venue search:** Google Places API
- **Tunnelling for development:** ngrok

## How the matching works

Each candidate is scored using a weighted four-factor algorithm:

- Skill match: up to 40 points
- Availability overlap: up to 30 points
- Geographic proximity (Haversine formula): up to 20 points
- Reliability score: up to 10 points

The total is bounded at 100 and shown to the user on each player card.

## Project structure

matchup/
├── App.js                      # React Native entry point
├── src/
│   ├── components/             # Reusable UI components
│   ├── config/                 # Firebase configuration
│   ├── constants/              # Shared constants and API URL
│   ├── navigation/             # Tab and stack navigators
│   ├── screens/                # All application screens
│   └── services/               # API client
└── matchup-backend/
├── src/
│   ├── index.js            # Express server entry point
│   ├── db/                 # PostgreSQL pool and schema
│   ├── middleware/         # Authentication middleware
│   └── routes/             # API route handlers
└── package.json


## Running the application locally

The application requires three terminals running in parallel.

**Prerequisites:**
- Node.js v18 or higher
- PostgreSQL v14 or higher running locally
- An ngrok account for tunnelling
- The Expo Go app installed on a physical iOS or Android device

**Step 1 — Backend**
cd matchup-backend
npm install
npm run dev

The backend should start on port 3000.

**Step 2 — ngrok tunnel**
ngrok http 3000
Copy the HTTPS URL from the ngrok output and paste it into `src/constants/index.js` as the `API_URL` value.

**Step 3 — Expo**
cd ..
npm install
npx expo start

Scan the QR code in the terminal with Expo Go on your phone.

## Configuration

The backend requires a `.env` file in the `matchup-backend/` folder containing:

PORT=3000
DATABASE_URL=postgresql://postgres:yourpassword@localhost:5432/matchup
FIREBASE_PROJECT_ID=matchup-app-204ff

The frontend requires the API URL set in `src/constants/index.js` to match your active ngrok tunnel.

## Database setup

The schema is defined in `matchup-backend/src/db/schema.sql`. To create the database from scratch:

createdb matchup
psql matchup < matchup-backend/src/db/schema.sql

## Author

Sumayo Mohamed  
University of Roehampton, BSc Software Engineering  
Final Year Project, 2026
