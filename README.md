# DentFlow 🦷

DentFlow is a modern, premium SaaS workflow management platform tailored specifically for dental clinics. Built with a robust multi-tenant architecture, it enables clinic owners and doctors to manage patient records, consultation history, calendar appointments, billing, and SaaS subscriptions in a highly secure, tenant-isolated environment.

🔗 **Live Application URL:** [dent-flow-seven.vercel.app](https://dent-flow-seven.vercel.app/)

---

## 🚀 Key Features

*   **Multi-Tenant Isolation:** Dynamic tenancy scoping ensures that each clinic's data (patients, appointments, visits, billing) is strictly separated at the database query level.
*   **Unified Visit Log:** Register new/existing patients, record diagnosis and treatments, and schedule next follow-up appointments atomically from a single unified form.
*   **Clinic Calendar:** Real-time interactive schedule using FullCalendar, displaying upcoming appointments (blue) and completed past visits (green) with quick-view popups.
*   **Quick Bill & Installments:** Generate invoices with auto-sequential bill numbers (`INV-XXXXX`), log payment installments (Cash, UPI, Card), track outstanding balances, and export professional invoices as PDFs with patient IDs.
*   **SaaS Subscription & Trials:** Built-in trial periods (default 30 days) and automated grace periods for payments, integrated with Razorpay subscription webhook listeners.
*   **Premium & Responsive UI:** Fully responsive dashboard, grid menus, tables, forms, and timeline interfaces designed to look stunning on both desktop and mobile viewports.

---

## 🛠️ Tech Stack

### Frontend
*   **Framework:** React 19 (TypeScript)
*   **Build Tool:** Vite
*   **UI styling:** Material UI (MUI) & Vanilla CSS
*   **State Management:** TanStack React Query (v5)
*   **Navigation:** React Router Dom (v7)
*   **Calendar:** FullCalendar React SDK
*   **PDF Generation:** jsPDF & jsPDF-AutoTable

### Backend
*   **Framework:** Django 6 & Django REST Framework (DRF)
*   **Auth:** SimpleJWT (JSON Web Tokens)
*   **Database:** PostgreSQL (Production) / SQLite (Local)
*   **Tenancy Scoping:** Custom Django Middleware & Tenant Model Managers

---

## 📂 Project Structure

```text
DentFlow/
├── backend/                  # Django REST API Backend
│   ├── accounts/             # User roles, registration & clinic profiles
│   ├── appointments/         # Patient schedules & follow-ups
│   ├── clinic_calendar/      # Real-time FullCalendar event queries
│   ├── clinics/              # Clinic tenant definitions
│   ├── core/                 # Middleware, base models, JWT Auth & global tests
│   ├── dentflow/             # Django project settings & URL routing
│   ├── patients/             # Patient profiles & sequence generation
│   ├── subscriptions/        # Razorpay integration & SaaS trials
│   ├── visits/               # Consultation logs & billing records
│   └── manage.py
├── frontend/                 # React Vite Frontend SPA
│   ├── public/               # Static public assets
│   ├── src/
│   │   ├── components/       # Shared UI components
│   │   ├── context/          # Authentication & Toast providers
│   │   ├── hooks/            # Axios API query wrappers
│   │   ├── layouts/          # Main application drawer layout
│   │   ├── pages/            # View pages (Dashboard, Patients, Calendar, Billing)
│   │   ├── routes/           # Role-based & Subscription-guarded routing
│   │   ├── services/         # Axios config & base URL setup
│   │   ├── types/            # TypeScript schemas
│   │   └── utils/            # Helper functions (dates, age calculations)
│   ├── package.json
│   └── vite.config.ts
├── render.yaml               # Infrastructure-as-code Render blueprints
└── README.md
```

---

## 💻 Local Development Setup

Follow these steps to run the complete stack locally on your computer.

### Prerequisites
*   Python (version 3.12 or newer)
*   Node.js (version 20 or newer)

---

### 1. Backend Server Setup

Navigate to the `backend/` directory:
```bash
cd backend
```

Create a virtual environment and activate it:
```bash
# On Windows
python -m venv .venv
.venv\Scripts\activate

# On macOS/Linux
python3 -m venv .venv
source .venv/bin/activate
```

Install the dependencies:
```bash
pip install -r requirements.txt
```

Run database migrations:
```bash
python manage.py migrate
```

Start the local Django server:
```bash
python manage.py runserver
```
*The API will run locally at `http://127.0.0.1:8000/api`.*

---

### 2. Frontend SPA Setup

Navigate to the `frontend/` directory:
```bash
cd ../frontend
```

Install npm packages:
```bash
npm install
```

Verify your environment configuration in `frontend/.env.development`:
```text
VITE_API_URL=http://localhost:8000/api
```

Start the Vite dev server:
```bash
npm run dev
```
*The React web app will open at `http://localhost:5173`.*

---

## 🧪 Testing

To run the complete Python/Django backend test suite verifying tenant isolation, webhook events, and security access guards:

```bash
cd backend
python manage.py test
```

---

## ☁️ Deployment

### Backend (Render)
The application is pre-configured with a `render.yaml` blueprint:
*   Deploys the Python Django environment.
*   Provisions a managed PostgreSQL database instance.
*   Automatically executes migrations, gathers static files, and starts Gunicorn.

### Frontend (Vercel)
The React client is optimized for Vercel deployment:
*   Build command: `npm run build`
*   Output Directory: `dist`
*   Includes client-side routing fallback configuration via `vercel.json`.
