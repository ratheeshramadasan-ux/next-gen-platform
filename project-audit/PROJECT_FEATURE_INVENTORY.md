# Project & Feature Inventory

## Folder Structure
| Area | File/Folder | Purpose | Used By | Status | Notes |
|---|---|---|---|---|---|
| Frontend | web/src/app | Next.js App Router | UI | Active | Main app UI |
| Backend | services/ | Microservices | API Gateway | Active | Python/Node services |
| Database | web/prisma | Prisma ORM | web | Active | Contains schema.prisma |

## Features
| Feature | Description | UI Screen | Backend API | DB Tables Used | Status | Missing Pieces |
|---|---|---|---|---|---|---|
| User Mgmt | User handling | /(dashboard)/users | /api/users | User, Role | Partially Built | RBAC incomplete |
| Bot Runner | Execution engine | /dashboard/bots | /api/bots | Bot, Run | Backend Only | UI disconnected |
