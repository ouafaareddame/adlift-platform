<div align="center">

# Adlift Platform

**SaaS Campaign Management Platform**

*A multi-tenant microservices architecture for digital campaign management*

![Spring Boot](https://img.shields.io/badge/Spring_Boot-3.2-6DB33F?style=flat-square&logo=spring-boot&logoColor=white)
![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react&logoColor=black)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-4169E1?style=flat-square&logo=postgresql&logoColor=white)
![RabbitMQ](https://img.shields.io/badge/RabbitMQ-3-FF6600?style=flat-square&logo=rabbitmq&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?style=flat-square&logo=docker&logoColor=white)

</div>

---

## Overview

Adlift Platform is a multi-tenant SaaS application designed to centralize the management of digital marketing campaigns across multiple clients. Each client operates within a fully isolated workspace — with its own data, users, and dashboards — enforced through a `tenant_id` propagated across all services via JWT.

The system is built on a **microservices architecture** to ensure separation of concerns, independent scalability, and long-term maintainability.

---

## Architecture

```
adlift-platform/
├── auth-service/            Auth, JWT, roles, tenant management       :8081
├── campaign-service/        Campaigns, metrics, lifecycle             :8082
├── notification-service/    In-app notifications, email via RabbitMQ  :8083
├── frontend/                React client                              :3000
└── docker-compose.yml       Full orchestration
```

All client traffic is routed through an **API Gateway** (Spring Cloud Gateway) on port `8080`. The frontend communicates exclusively with the gateway and has no direct knowledge of individual services.

---

## Tech Stack

| Layer          | Technologies                                                       |
|----------------|--------------------------------------------------------------------|
| Backend        | Spring Boot 3, Spring Security, Spring Cloud Gateway, Spring Data JPA |
| Messaging      | RabbitMQ                                                           |
| Frontend       | React 18, Tailwind CSS, React Query, Recharts                      |
| Database       | PostgreSQL 15 (one instance per service)                           |
| Security       | JWT — access token (15 min) + refresh token (7 days), RBAC        |
| Infrastructure | Docker, Docker Compose                                             |

---

## User Roles

| Role            | Description                                                    |
|-----------------|----------------------------------------------------------------|
| `SUPER_ADMIN`   | Adlift team — global access across all tenants                 |
| `AGENCY_ADMIN`  | Client manager — full control over their tenant's campaigns    |
| `CLIENT`        | Team member — read access and metrics input on active campaigns |

---

## Campaign Lifecycle

```
DRAFT  ──►  SCHEDULED  ──►  ACTIVE  ──►  COMPLETED  ──►  ARCHIVED
```

Each status transition publishes an event to RabbitMQ, which the Notification Service consumes to trigger in-app notifications and emails.

---

## Getting Started

**Prerequisites:** Docker, Docker Compose, Java 17+, Node.js 18+

```bash
git clone https://github.com/ouafaareddame/adlift-platform.git
cd adlift-platform
docker-compose up --build
```

| Service        | URL                          |
|----------------|------------------------------|
| Frontend       | http://localhost:3000        |
| API Gateway    | http://localhost:8080        |
| RabbitMQ UI    | http://localhost:15672       |

---

## Branch Strategy

| Branch                       | Purpose                            |
|------------------------------|------------------------------------|
| `main`                       | Stable, production-ready code      |
| `develop`                    | Integration branch                 |
| `feature/auth-service`       | Auth Service development           |
| `feature/campaign-service`   | Campaign Service development       |
| `feature/notification-service` | Notification Service development |
| `feature/frontend`           | Frontend development               |

---

## About

Developed as part of the **PFA internship 2025/2026** at ENSIAS (Software Engineering, 2nd year).  
Host organization: **Adlift SARL**, Rabat, Morocco.

**Author:** Reddame Ouafaa — [@ouafaareddame](https://github.com/ouafaareddame)