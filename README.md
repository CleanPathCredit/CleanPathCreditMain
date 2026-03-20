# Clean Path Credit

AI-powered credit repair platform that turns denials into approvals. Built with React, TypeScript, Firebase, and Vite.

## Features

- **AI-Powered Credit Audit** — Intelligently analyzes credit reports to identify negative items, inaccuracies, and dispute opportunities
- **Client Portal** — Secure dashboard with document upload, real-time progress tracking, and two-way messaging
- **Admin CRM** — Full client management dashboard with status tracking, document review, and direct messaging
- **Interactive Quiz Funnel** — Multi-step lead capture with personalized analysis and Calendly integration
- **Bank-Level Security** — Firebase Authentication with strong password requirements and Firestore security rules

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React 19 + TypeScript |
| Build Tool | Vite |
| Styling | Tailwind CSS v4 |
| Auth & Database | Firebase (Auth + Firestore) |
| Animations | Motion (Framer Motion) |
| Icons | Lucide React |
| Routing | React Router v7 |

## Getting Started

### Prerequisites

- Node.js 18+
- A Firebase project with Authentication and Firestore enabled

### Installation

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env.local

# Add your Gemini API key to .env.local
# GEMINI_API_KEY=your_key_here

# Start development server
npm run dev
```

The app runs at `http://localhost:3000`.

## Project Structure

```
src/
├── components/
│   ├── layout/          # Navbar, Footer
│   ├── sections/        # Hero, ValueProp, Details, Proof, CTA, QuizFunnel
│   └── ui/              # Button, HoverCard, GridPattern, etc.
├── contexts/            # AuthContext (auth state management)
├── pages/               # Landing, Login, Register, Dashboard, AdminDashboard, Methodology
├── utils/               # Utility functions (cn helper)
├── firebase.ts          # Firebase initialization
├── App.tsx              # Root component with routing
├── main.tsx             # Entry point
└── index.css            # Global styles & Tailwind config
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server on port 3000 |
| `npm run build` | Production build |
| `npm run preview` | Preview production build |
| `npm run lint` | TypeScript type checking |

## License

All rights reserved © Clean Path Credit.
