# QuickBite — Food Ordering Platform

> A cloud-native food ordering platform built as a microservices architecture on Microsoft Azure. Developed for SE4010 Cloud Computing at SLIIT.

[![User Service CI/CD](https://github.com/Dumidu1212/quickbite/actions/workflows/user-service.yml/badge.svg)](https://github.com/Dumidu1212/quickbite/actions/workflows/user-service.yml)
[![Menu Service CI/CD](https://github.com/Dumidu1212/quickbite/actions/workflows/menu-service.yml/badge.svg)](https://github.com/Dumidu1212/quickbite/actions/workflows/menu-service.yml)
[![Order Service CI/CD](https://github.com/Dumidu1212/quickbite/actions/workflows/order-service.yml/badge.svg)](https://github.com/Dumidu1212/quickbite/actions/workflows/order-service.yml)
[![Notify Service CI/CD](https://github.com/Dumidu1212/quickbite/actions/workflows/notify-service.yml/badge.svg)](https://github.com/Dumidu1212/quickbite/actions/workflows/notify-service.yml)
[![Frontend CI/CD](https://github.com/Dumidu1212/quickbite/actions/workflows/frontend.yml/badge.svg)](https://github.com/Dumidu1212/quickbite/actions/workflows/frontend.yml)

---

## Live Application

| Resource | URL |
|---|---|
| **Frontend** | https://lively-mushroom-08d53a100.6.azurestaticapps.net |
| **User Service** | https://user-service.whitestone-78c51921.southeastasia.azurecontainerapps.io |
| **Menu Service** | https://menu-service.whitestone-78c51921.southeastasia.azurecontainerapps.io |
| **Order Service** | https://order-service.whitestone-78c51921.southeastasia.azurecontainerapps.io |
| **Notify Service** | https://notify-service.whitestone-78c51921.southeastasia.azurecontainerapps.io |

---

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Services](#services)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Local Development](#local-development)
- [Environment Variables](#environment-variables)
- [Running Tests](#running-tests)
- [Docker](#docker)
- [CI/CD Pipeline](#cicd-pipeline)
- [Azure Deployment](#azure-deployment)
- [API Reference](#api-reference)
- [Project Structure](#project-structure)

---

## Architecture Overview

QuickBite follows a microservices architecture where each service owns its domain, database, and deployment lifecycle. Services communicate via HTTP (synchronous) and Azure Service Bus (asynchronous).

```
┌─────────────────────────────────────────────────────────────────┐
│                    Azure Static Web Apps                         │
│                     React / Vite Frontend                        │
└──────────┬──────────────┬────────────────┬───────────────────────┘
           │              │                │
    ┌──────▼──────┐ ┌─────▼──────┐ ┌──────▼──────┐
    │ User Service│ │Menu Service│ │Order Service│
    │  Node.js    │ │  FastAPI   │ │  Node.js    │
    │  Port 3001  │ │  Port 8001 │ │  Port 3002  │
    └──────┬──────┘ └─────┬──────┘ └──────┬──────┘
           │              │                │
    ┌──────▼──────┐ ┌─────▼──────┐        │ Azure Service Bus
    │  users-db   │ │  menu-db   │        │  order-events queue
    │ MongoDB     │ │ MongoDB    │        ▼
    │ Atlas       │ │ Atlas      │ ┌──────────────┐
    └─────────────┘ └────────────┘ │Notify Service│
                                   │   FastAPI    │
                             ┌─────▼──────┐       │
                             │  orders-db │       │ SendGrid
                             │ MongoDB    │       ▼
                             │ Atlas      │  Customer Email
                             └────────────┘
```

### Key Design Decisions

| Decision | Choice | Rationale |
|---|---|---|
| JWT verification | Centralised in User service | Avoids sharing JWT_SECRET across services |
| Price calculation | Server-side in Order service | Prevents client-side price manipulation |
| Async messaging | Azure Service Bus | Decouples order creation from notification |
| User data persistence | sessionStorage (not localStorage) | XSS protection — no script access |
| Python base image | Alpine (not Debian) | Eliminates CVE-2025-69720 in ncurses |

---

## Services

### User Service — `Node.js / Express`
Handles authentication and user profile management. Issues JWTs and acts as the central token validator for all other services.

**Endpoints:** `POST /auth/register` · `POST /auth/login` · `GET /auth/validate` · `GET /users/profile` · `PUT /users/profile` · `DELETE /users/profile`

### Menu Service — `Python / FastAPI`
Manages the restaurant catalog and menu items. Seeded with 5 restaurants and 25+ menu items.

**Endpoints:** `GET /restaurants/` · `GET /restaurants/:id` · `GET /restaurants/:id/menu` · `GET /docs`

### Order Service — `Node.js / Express`
Orchestrates the order flow — validates JWT via User service, prices items via Menu service, persists to MongoDB, and publishes events to Azure Service Bus.

**Endpoints:** `POST /orders` · `GET /orders/:id` · `GET /orders/user/:userId` · `GET /orders/admin/all` · `PUT /orders/:id/status`

### Notify Service — `Python / FastAPI`
Consumes `OrderCreated` events from Azure Service Bus and sends order confirmation emails via SendGrid.

**Endpoints:** `GET /health` · `POST /notify/send`

### Frontend — `React / Vite`
Single-page application. Uses JWT stored in memory (not localStorage) for XSS protection.

**Routes:** `/login` · `/restaurants` · `/restaurants/:id/menu` · `/checkout` · `/orders/:id` · `/orders/user/:userId` · `/profile` · `/admin/login` · `/admin/dashboard`

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18, Vite, Tailwind CSS, React Router, React Hook Form, Zod, Axios |
| **API (Node.js)** | Express, Mongoose, jsonwebtoken, bcrypt, helmet, express-validator |
| **API (Python)** | FastAPI 0.110, Motor, Pydantic, uvicorn |
| **Database** | MongoDB Atlas M0 (3 databases: users-db, menu-db, orders-db) |
| **Messaging** | Azure Service Bus (Basic tier, order-events queue) |
| **Email** | SendGrid (transactional, order confirmation) |
| **Containerisation** | Docker, Docker Compose |
| **CI/CD** | GitHub Actions (5 workflows) |
| **Code Quality** | SonarCloud (5 projects), ESLint, Docker Scout |
| **Cloud** | Azure Container Apps, Azure Static Web Apps, Azure API Management |

---

## Prerequisites

Ensure all of these are installed before running locally:

| Tool | Version | Install |
|---|---|---|
| Node.js | ≥ 20 | https://nodejs.org |
| Python | ≥ 3.11 | https://python.org |
| Docker Desktop | ≥ 4.x | https://docker.com |
| Git | any | https://git-scm.com |

You will also need:
- A [MongoDB Atlas](https://cloud.mongodb.com) account with a free M0 cluster
- The connection strings for three databases: `users-db`, `menu-db`, `orders-db`

---

## Local Development

### 1. Clone the repository

```bash
git clone https://github.com/Dumidu1212/quickbite.git
cd quickbite
```

### 2. Configure environment variables

Each service reads from its own `.env` file. Copy the examples and fill in your values:

```bash
# User service
cp user-service/.env.example user-service/.env

# Menu service
cp menu-service/.env.example menu-service/.env

# Order service
cp order-service/.env.example order-service/.env

# Notify service
cp notify-service/.env.example notify-service/.env
```

See [Environment Variables](#environment-variables) for required values.

### 3. Install dependencies

```bash
# Node.js services
cd user-service && npm install && cd ..
cd order-service && npm install && cd ..
cd frontend && npm install && cd ..

# Python services
cd menu-service && python -m venv .venv && .venv/Scripts/activate && pip install -r requirements.txt && cd ..
cd notify-service && python -m venv .venv && .venv/Scripts/activate && pip install -r requirements.txt && cd ..
```

### 4. Seed menu data

```bash
cd menu-service
# Windows
.venv\Scripts\activate
# macOS/Linux
source .venv/bin/activate

python seed.py
cd ..
```

### 5. Start all services

Open five separate terminals:

```bash
# Terminal 1 — User service (port 3001)
cd user-service && npm run dev

# Terminal 2 — Menu service (port 8001)
cd menu-service && .venv/Scripts/activate && uvicorn app.main:app --reload --port 8001

# Terminal 3 — Order service (port 3002)
cd order-service && npm run dev

# Terminal 4 — Notify service (port 8002)
cd notify-service && .venv/Scripts/activate && uvicorn app.main:app --reload --port 8002

# Terminal 5 — Frontend (port 5173)
cd frontend && npm run dev
```

Open `http://localhost:5173` in your browser.

### 6. Verify all services are healthy

```bash
curl http://localhost:3001/health
curl http://localhost:8001/health
curl http://localhost:3002/health
curl http://localhost:8002/health
```

All should return `{"status":"ok",...}`.

---

## Environment Variables

### `user-service/.env`

```env
NODE_ENV=development
USER_SERVICE_PORT=3001
MONGODB_URI_USERS=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/users-db?retryWrites=true&w=majority
JWT_SECRET=your-secret-at-least-32-characters-long
JWT_EXPIRES_IN=24h
BCRYPT_ROUNDS=10
```

### `menu-service/.env`

```env
MONGODB_URI_MENU=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/menu-db?retryWrites=true&w=majority
MENU_SERVICE_PORT=8001
```

### `order-service/.env`

```env
NODE_ENV=development
ORDER_SERVICE_PORT=3002
MONGODB_URI_ORDERS=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/orders-db?retryWrites=true&w=majority
USER_SERVICE_URL=http://localhost:3001
MENU_SERVICE_URL=http://localhost:8001
SERVICEBUS_CONN=
SERVICEBUS_QUEUE_NAME=order-events
ADMIN_KEY=local-admin-key-change-in-production
```

### `notify-service/.env`

```env
SERVICEBUS_CONN=
SERVICEBUS_QUEUE_NAME=order-events
SENDGRID_API_KEY=
INTERNAL_API_KEY=local-internal-key
NOTIFY_SERVICE_PORT=8002
```

> **Note:** `SERVICEBUS_CONN` and `SENDGRID_API_KEY` are optional for local development. The services degrade gracefully without them — orders are still placed and saved, but no emails are sent.

---

## Running Tests

```bash
# User service — Jest (26 tests)
cd user-service && npm test

# Order service — Jest (26 tests)
cd order-service && npm test

# Menu service — pytest (19 tests)
cd menu-service && .venv/Scripts/activate && python -m pytest tests/ -v

# Notify service — pytest (14 tests)
cd notify-service && .venv/Scripts/activate && python -m pytest tests/ -v
```

**Total: 85 tests across all services.**

Both Node.js services use `mongodb-memory-server` — no real database connection required. Python services connect to MongoDB Atlas for integration tests.

---

## Docker

### Build all images

```bash
docker build -t quickbite-user ./user-service
docker build -t quickbite-menu ./menu-service
docker build -t quickbite-order ./order-service
docker build -t quickbite-notify ./notify-service
```

### Run full stack with docker-compose

```bash
docker-compose up
```

All four backend services will start with health checks and correct inter-service networking. The frontend runs separately via `npm run dev` (Vite HMR does not work well in containers).

### Security scanning

```bash
docker scout cves quickbite-user --only-severity critical
docker scout cves quickbite-menu --only-severity critical
docker scout cves quickbite-order --only-severity critical
docker scout cves quickbite-notify --only-severity critical
```

All images target 0 critical CVEs. Python services use `python:3.11-alpine` to avoid CVE-2025-69720 present in all Debian-based Python images.

---

## CI/CD Pipeline

Each service has its own GitHub Actions workflow in `.github/workflows/`. All workflows follow the same pattern:

```
Push / PR to main or dev
        │
        ▼
   ┌─────────┐
   │  Test   │  Jest / pytest with coverage
   └────┬────┘
        │
        ▼
   ┌─────────────────┐
   │  SonarCloud     │  Static analysis + quality gate
   └────────┬────────┘
            │
            ▼ (main branch only)
   ┌─────────────────┐
   │  Docker Build   │  Build + push to Docker Hub
   │  & Push         │
   └─────────────────┘
```

**GitHub Secrets required:**

| Secret | Description |
|---|---|
| `DOCKERHUB_USERNAME` | Docker Hub username |
| `DOCKERHUB_TOKEN` | Docker Hub access token |
| `SONAR_TOKEN` | SonarCloud analysis token |
| `MONGODB_URI_USERS` | Atlas connection string for users-db |
| `MONGODB_URI_MENU` | Atlas connection string for menu-db |
| `MONGODB_URI_ORDERS` | Atlas connection string for orders-db |

---

## Azure Deployment

### Infrastructure

All resources are in resource group `quickbite-rg` (Southeast Asia).

| Resource | Type | Name |
|---|---|---|
| Container Apps Environment | Microsoft.App/managedEnvironments | quickbite-env |
| User Service | Container App | user-service |
| Menu Service | Container App | menu-service |
| Order Service | Container App | order-service |
| Notify Service | Container App | notify-service |
| Frontend | Static Web App | quickbite-frontend |
| Message Queue | Service Bus (Basic) | quickbite-servicebus / order-events |
| API Gateway | API Management (Consumption) | quickbite-apim |
| Logs | Log Analytics Workspace | quickbite-logs |

### Re-deploying a service

```bash
# Build and push updated image
docker build -t dumidu97/quickbite-<service>:latest ./<service>
docker push dumidu97/quickbite-<service>:latest

# Force Azure to pull the new image
az containerapp update \
  --name <service> \
  --resource-group quickbite-rg \
  --image dumidu97/quickbite-<service>:latest
```

### Checking service health

```bash
az containerapp list \
  --resource-group quickbite-rg \
  --query "[].{Name:name, Status:properties.runningStatus}" \
  --output table
```

---

## API Reference

Interactive API documentation is available via Swagger UI on all FastAPI services:

- Menu Service: https://menu-service.whitestone-78c51921.southeastasia.azurecontainerapps.io/docs
- Notify Service: https://notify-service.whitestone-78c51921.southeastasia.azurecontainerapps.io/docs

### Authentication

All protected endpoints require a JWT Bearer token in the `Authorization` header:

```
Authorization: Bearer <token>
```

Obtain a token via `POST /auth/login` or `POST /auth/register`.

### Admin Endpoints

Admin endpoints require the `X-Admin-Key` header:

```
x-admin-key: <admin-key>
```

The admin key is configured via the `ADMIN_KEY` environment variable on the Order service.

---

## Project Structure

```
quickbite/
├── .github/
│   └── workflows/
│       ├── user-service.yml
│       ├── menu-service.yml
│       ├── order-service.yml
│       ├── notify-service.yml
│       ├── frontend.yml
│       └── azure-static-web-apps.yml
│
├── user-service/                   # Node.js / Express — auth & users
│   ├── src/
│   │   ├── app.js
│   │   ├── config/
│   │   ├── controllers/
│   │   ├── middleware/
│   │   ├── models/
│   │   └── routes/
│   ├── tests/
│   ├── Dockerfile
│   └── sonar-project.properties
│
├── menu-service/                   # Python / FastAPI — restaurants & menus
│   ├── app/
│   │   ├── core/
│   │   ├── models/
│   │   ├── routers/
│   │   └── main.py
│   ├── tests/
│   ├── Dockerfile
│   └── sonar-project.properties
│
├── order-service/                  # Node.js / Express — orders & orchestration
│   ├── src/
│   │   ├── app.js
│   │   ├── clients/
│   │   ├── config/
│   │   ├── controllers/
│   │   ├── messaging/
│   │   ├── middleware/
│   │   ├── models/
│   │   └── routes/
│   ├── tests/
│   ├── Dockerfile
│   └── sonar-project.properties
│
├── notify-service/                 # Python / FastAPI — email notifications
│   ├── app/
│   │   ├── core/
│   │   ├── email/
│   │   ├── messaging/
│   │   └── routers/
│   ├── tests/
│   ├── Dockerfile
│   └── sonar-project.properties
│
├── frontend/                       # React / Vite — customer SPA
│   ├── src/
│   │   ├── api/
│   │   ├── components/
│   │   ├── context/
│   │   ├── hooks/
│   │   └── pages/
│   ├── Dockerfile
│   └── sonar-project.properties
│
├── docker-compose.yml
├── Makefile
├── README.md
└── SECURITY.md
```

---

## Contributing

This is an academic project. Branch protection rules require all changes to go through a pull request targeting `dev`, which is then merged to `main` after CI passes.

```
feature/* → dev → main
```

---

## License

Academic use only — SLIIT SE4010 Cloud Computing, 2026.
