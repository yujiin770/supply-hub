# SupplyHub API

FastAPI backend for SupplyHub.

## Requirements

- Python 3.11+
- Postgres (asyncpg)

## Setup

1. Create a virtual environment and install deps:

```bash
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
```

2. Configure environment:

```bash
copy .env.example .env
```

3. Run the app:

```bash
uvicorn app.main:app --reload
```

## Migrations (Alembic)

Create a new revision:

```bash
alembic revision --autogenerate -m "init"
```

Apply migrations:

```bash
alembic upgrade head
```

## Health Check

GET /health
