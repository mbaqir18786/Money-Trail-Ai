# MoneyTrail AI Monorepo

This repository contains the MoneyTrail AI application composed of three services:

- **frontend**: React + Vite single page application
- **backend**: Node.js + Express API
- **ml-service**: Python FastAPI service

## Getting Started

### Prerequisites

- Node.js and npm
- Python 3.11+ (with `python` available on PATH)

### Install Dependencies

All dependencies have been installed automatically by the setup, but if you need to re-install:

- **Root tools**:
  - `npm install` (installs dev tools like `concurrently`)
- **Frontend**:
  - `cd frontend`
  - `npm install`
- **Backend**:
  - `cd backend`
  - `npm install`
- **ML Service**:
  - `cd ml-service`
  - `python -m venv .venv`
  - `.venv\Scripts\python -m pip install -r requirements.txt`

### Environment Variables

Each service has its own `.env` file:

- `frontend/.env`
- `backend/.env`
- `ml-service/.env`

You can adjust ports and URLs there as needed.

### Development

From the repository root:

```bash
npm run dev
```

This command starts:

- Vite dev server for the React frontend
- Express API backend
- FastAPI ML service

