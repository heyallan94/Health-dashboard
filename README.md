# Health-dashboard

Mobile-first fitness and nutrition tracking app built with React + Supabase.

The project focuses on:

* calorie tracking
* meal organization
* hydration tracking
* body progress
* cardio estimation
* gamification
* simple UX for non-technical users

Designed with a custom dark UI inspired by Apple Fitness.

---

# Stack

Frontend:

* React
* React Router
* CSS Modules / Pure CSS

Backend:

* Supabase
* PostgreSQL
* Supabase Auth

Deployment:

* GitHub Pages

---

# Features

## Nutrition Tracking

* Daily calorie tracking
* Protein and carbohydrate tracking
* Dynamic meal creation
* Editable meal titles
* Real-time totals
* Persistent meal history

## Calendar System

* Historical nutrition visualization
* Expandable daily cards
* Mobile-first layout
* Dynamic meal rendering from Supabase data

## Hydration

* Water intake tracking
* Daily persistence

## Cardio / Exercise System (WIP)

* Estimated calorie burn
* MET/TDEE-based calculations
* Exercise history
* Manual calorie adjustment
* Future integration with Home progress system

## Gamification

* Activity streaks
* Consistency-based badges
* Non-exploitable progression system

---

# Project Structure

src/

* components/ → reusable UI components
* pages/ → app pages/features
* services/ → Supabase and external services
* sandbox/ → isolated experimental code (ignored in production)
* assets/ → static assets

Example:

src/pages/

* home/
* calendario/
* kcaldiaria/
* agua/
* metas/
* distintivos/
* login/
* register/

---

# Environment Variables

Create a `.env` file:

```env
REACT_APP_SUPABASE_URL=your_url
REACT_APP_SUPABASE_ANON_KEY=your_key
```

Never commit `.env`.

---

# Running Locally

Install dependencies:

```bash
npm install
```

Start development server:

```bash
npm start
```

Build production version:

```bash
npm run build
```

---

# Deployment

Production deployment is handled with GitHub Pages.

Main branch:

* stable production-ready code

Dev branch:

* active development and testing

---

# Goals

This project was created to:

* study real-world frontend architecture
* build a production-style React application
* practice Supabase integration
* improve mobile-first UI/UX design
* simulate a real SaaS MVP workflow

---

# Current Status

Active development.

Upcoming features:

* smarter cardio calculations
* better dashboard analytics
* progress insights
* improved gamification
* offline support
* PWA support
