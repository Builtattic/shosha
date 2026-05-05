<div align="center">
  <img src="C:\Users\batha\.gemini\antigravity\brain\a60a6e70-8f76-4f68-9544-17a6a3c8edd8\shosha_logo_hero_1777998840035.png" width="200" alt="Shosha Logo" />
  <h1>Shosha</h1>
  <p><strong>Mobile-first investigative dossier system for social reputation scoring.</strong></p>
  
  [![Next.js](https://img.shields.io/badge/Next.js-14-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
  [![Firebase](https://img.shields.io/badge/Firebase-Backend-FFCA28?style=for-the-badge&logo=firebase)](https://firebase.google.com/)
  [![Clerk](https://img.shields.io/badge/Clerk-Auth-6C47FF?style=for-the-badge&logo=clerk)](https://clerk.dev/)
  [![Gemini](https://img.shields.io/badge/Gemini-AI-4285F4?style=for-the-badge&logo=google-gemini)](https://ai.google.dev/)
</div>

---

## 🌟 Overview

Shosha is a high-fidelity investigative platform designed to bring transparency and accountability to social media ecosystems. By combining community-driven reporting with AI-powered adjudication (Gemini), Shosha builds comprehensive "dossiers" for social accounts, calculating a dynamic **Reputation Score** that reflects credibility across multiple platforms.

### 🛡️ Why Shosha?
In an era of digital misinformation, Shosha provides a centralized ledger of truth. Whether you're a journalist, a researcher, or a concerned citizen, Shosha empowers you to audit digital footprints and identify high-impact actors through a structured, evidence-based workflow.

---

## 🚀 Key Features

<div align="center">
  <img src="C:\Users\batha\.gemini\antigravity\brain\a60a6e70-8f76-4f68-9544-17a6a3c8edd8\shosha_dashboard_mockup_1777998859743.png" width="600" alt="Shosha Dashboard Mockup" />
</div>

### 🔍 Investigative Dossiers
Generate deep-dive reports for any handle across **X, Instagram, Facebook, YouTube, TikTok, LinkedIn, Reddit, and Snapchat**. Shosha uses Gemini to discover public evidence and aggregate social metadata into a single, cohesive view.

### ⚖️ Reputation Scoring System
*   **Dynamic Gauges**: Real-time visualization of account credibility.
*   **Multiplier Grids**: Understand how specific behaviors and network effects influence a score.
*   **Community Adjudication**: Align or Oppose reports with evidence-backed reasoning.

### 🏛️ Governance & Audits
*   **Admin Dashboard**: Centralized panel for reviewing high-stakes reports.
*   **Dispute Resolution**: Robust system for handling conflicting evidence and appeals.
*   **Transparency Log**: Every score change is tracked and auditable.

### 📈 Influence & Impact
*   **Ranks**: Rise through the investigative ranks by submitting high-quality, verified reports.
*   **Impact Tracking**: Visualize how your audits help clean up the social ecosystem.
*   **Notifications**: Stay updated on reports you've engaged with.

---

## 🛠️ Technology Stack

- **Core**: [Next.js 14](https://nextjs.org/) (App Router, Server Actions)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/), [Framer Motion](https://www.framer.com/motion/), [Lucide React](https://lucide.dev/)
- **Backend**: [Firebase](https://firebase.google.com/) (Firestore, Storage, Emulators)
- **Authentication**: [Clerk](https://clerk.com/)
- **AI/ML**: [Google Gemini 2.0/2.5](https://ai.google.dev/)
- **Data Viz**: [D3.js](https://d3js.org/)
- **Quality**: [Vitest](https://vitest.dev/), [Playwright](https://playwright.dev/)

---

## ⚙️ Local Setup

### 1. Prerequisites
- **Node.js**: 20.x
- **Java**: 17+ (for Firebase Emulators)
- **Package Manager**: `pnpm`

### 2. Environment Configuration
Copy `.env.example` to `.env` and fill in the following:

```bash
# Clerk Auth
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=...
CLERK_SECRET_KEY=...

# Firebase (Local Emulators)
FIREBASE_PROJECT_ID=shosha-local
FIREBASE_STORAGE_BUCKET=shosha-local.appspot.com

# Gemini AI
GEMINI_API_KEY=...
```

### 3. Installation & Start
```bash
pnpm install
pnpm emulators # Start Firebase backend in background
pnpm seed      # Initialize local data
pnpm dev       # Launch Next.js app
```

---

## 📜 Development Scripts

| Command | Description |
| :--- | :--- |
| `pnpm dev` | Starts the development server |
| `pnpm build` | Creates a production-ready bundle |
| `pnpm test` | Runs unit and integration tests |
| `pnpm e2e` | Executes end-to-end Playwright tests |
| `pnpm emulators` | Starts the local Firebase emulator suite |
| `pnpm seed` | Seeds the database with core data |
| `pnpm seed:public-profiles` | Seeds public profiles for social discovery |

---

<div align="center">
  <p>Built with ❤️ by the Shosha Investigative Team</p>
  <p><i>"Truth in the age of noise."</i></p>
</div>
