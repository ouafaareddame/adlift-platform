<div align="center">

# Adlift Platform

**SaaS Campaign Management Platform**

*A multi-tenant microservices architecture for digital campaign management*

![Spring Boot](https://img.shields.io/badge/Spring_Boot-4.1-6DB33F?style=flat-square&logo=spring-boot&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=black)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-4169E1?style=flat-square&logo=postgresql&logoColor=white)
![RabbitMQ](https://img.shields.io/badge/RabbitMQ-3-FF6600?style=flat-square&logo=rabbitmq&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?style=flat-square&logo=docker&logoColor=white)

</div>

---

## Overview

Adlift Platform is a multi-tenant SaaS application that lets an agency (Adlift) run the digital marketing campaigns of several clients from a single cockpit. Each client operates in a fully isolated workspace, with its own data, users and dashboards. Isolation is enforced through a `tenant_id` carried by the signed JWT and checked by every service.

Main features:

- **Direction overview**: activity, spend and budget alerts across all clients.
- **Client workspaces** created by the Adlift direction, together with their first admin. There is no public sign-up.
- **Campaigns** with a lifecycle, budget tracking, a metrics history and alerts at 80 % and 100 % of the budget.
- **Real email campaigns** sent through [Brevo](https://www.brevo.com). Delivered, open and click figures are synced back automatically.
- **Ad performance simulator** for Ads and Social campaigns. The Meta and Google Ads APIs require validated business accounts.
- **Reports** by period, with CSV export and print-to-PDF.
- **In-app notifications** on every campaign status change, delivered via RabbitMQ.

---

## Architecture

```
adlift-platform/
├── infrastructure/
│   └── api-gateway/          Spring Cloud Gateway, JWT check           :8080
├── services/
│   ├── auth-service/         Auth, JWT, roles, workspaces, members     :8081
│   ├── campaign-service/     Campaigns, metrics, reports, email        :8082
│   └── notification-service/ In-app notifications (RabbitMQ consumer)  :8083
├── frontend/                 React client (Vite)                       :5173
├── scripts/demo/             Demo dataset reset
├── docs/DEMO.md              Demo guide
└── docker-compose.yml        Full orchestration
```

All client traffic goes through the **API Gateway** on port `8080`. The gateway rejects requests without a valid JWT before they reach a service. The frontend only talks to the gateway. Each service owns its own PostgreSQL database.

---

## Tech Stack

| Layer          | Technologies                                                           |
|----------------|------------------------------------------------------------------------|
| Backend        | Spring Boot 4, Spring Security, Spring Cloud Gateway, Spring Data JPA  |
| Messaging      | RabbitMQ                                                               |
| Email          | Brevo transactional API                                                |
| Frontend       | React 19, Vite, Tailwind CSS 4, TanStack Query, Recharts               |
| Database       | PostgreSQL 15 (one instance per service)                               |
| Security       | JWT access token (15 min, silently renewed via `/api/auth/refresh`), RBAC |
| Infrastructure | Docker, Docker Compose                                                 |

---

## User Roles

| Role            | Description                                                                 |
|-----------------|-----------------------------------------------------------------------------|
| `SUPER_ADMIN`   | Adlift direction: global overview, creates and deactivates client workspaces |
| `AGENCY_ADMIN`  | Workspace manager: campaigns, metrics, email sending, members                |
| `CLIENT`        | Read-only access to the workspace's dashboard, campaigns and reports        |

New accounts receive a temporary password. Until it is changed, the JWT carries a `mustChangePassword` flag, and the gateway only allows the password-change routes. Deactivating an account or a workspace revokes access within 15 minutes at most, because every token renewal checks the account again.

---

## Campaign Lifecycle

```
DRAFT  ──►  SCHEDULED  ──►  ACTIVE  ──►  COMPLETED  ──►  ARCHIVED
```

Each status transition publishes an event to RabbitMQ. The Notification Service consumes it and creates in-app notifications for the workspace admins.

Metrics come from one of three sources:

| Campaign                 | Source                                                       |
|--------------------------|--------------------------------------------------------------|
| Email, sent              | Brevo statistics, synced every 5 minutes (read-only)         |
| Ads / Social, active     | Ad simulator (`AD_SIMULATOR_ENABLED`, every 30 s by default) |
| Any other active campaign | Manual entry by an `AGENCY_ADMIN`                           |

---

## Getting Started

**Prerequisites:** Docker with Docker Compose, and Node.js 20+ for the frontend.

1. Create a `.env` file at the project root. It is git-ignored.

   ```env
   JWT_SECRET=<at least 32 random characters>

   # Optional: real email sending
   BREVO_API_KEY=xkeysib-...
   BREVO_SENDER_EMAIL=you@example.com   # must be a verified sender in Brevo
   BREVO_SENDER_NAME=Adlift
   ```

   Without the Brevo variables, the platform still works, but the **Send now** button stays disabled. If IP blocking is enabled in Brevo (*Security → Authorised IPs*), the server's IP must be authorised there.

2. Start the backend:

   ```bash
   docker compose up -d --build
   ```

3. Start the frontend:

   ```bash
   cd frontend
   npm install
   npm run dev
   ```

| Service      | URL                    |
|--------------|------------------------|
| Frontend     | http://localhost:5173  |
| API Gateway  | http://localhost:8080  |
| RabbitMQ UI  | http://localhost:15672 |

Optional settings (in `.env`): `AD_SIMULATOR_ENABLED`, `AD_SIMULATOR_INTERVAL_MS` and `EMAIL_SYNC_INTERVAL_MS`.

> After rebuilding a single service, run `docker restart api-gateway` so the gateway picks up the new container address.

---

## Deployment

`docker-compose.prod.yml` adds the production setup on top of the base file:
- Nginx serves the built frontend and proxies `/api` to the gateway;
- only port 80 is published;
- each service gets a memory limit and restarts automatically.

The whole platform runs on a single VM with about 1.2 GB of RAM in use.

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

---

## Demo Dataset

`scripts/demo/reset-demo.ps1` (PowerShell) erases all data except the direction account. It then recreates 4 client workspaces with their admins and client accounts, 13 campaigns with a realistic metrics history, notifications, and a ready-to-send email draft.

```powershell
.\scripts\demo\reset-demo.ps1 -Recipient you@example.com
```

Accounts, the scenario and the checklist are described in [docs/DEMO.md](docs/DEMO.md).

---

## Branch Strategy

| Branch                         | Purpose                            |
|--------------------------------|------------------------------------|
| `main`                         | Stable, production-ready code      |
| `develop`                      | Integration branch                 |
| `feature/auth-service`         | Auth Service development           |
| `feature/campaign-service`     | Campaign Service development       |
| `feature/notification-service` | Notification Service development   |
| `feature/frontend`             | Frontend development               |

---

## About

Developed as part of the **PFA internship 2025/2026** at ENSIAS (Software Engineering, 2nd year).  
Host organization: **Adlift SARL**, Rabat, Morocco.

**Author:** Reddame Ouafaa — [@ouafaareddame](https://github.com/ouafaareddame)
