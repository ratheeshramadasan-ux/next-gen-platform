# 🧬 Next Gen Platform

A high-density, enterprise-grade orchestration platform featuring modular Bento-box UI, advanced IAM governance, and a local-first AI Infrastructure registry.

## 🚀 Quick Start (Production Setup)

### 1. Environment Configuration
Ensure your `.env` is configured for the PostgreSQL environment:
```bash
# Database sync
cd web
npx prisma db push
```

### 2. Infrastructure Synchronization
Initialize the identity registers, industry dictionaries, and the AI registry:
```bash
npx prisma db seed
```

### 3. Launch Core
```bash
npm run dev
```

## 🏗️ Core Architecture
- **Framework**: Next.js 16 (Turbopack Powered)
- **UI Engine**: Tailwind CSS + Framer Motion (Glassmorphic High-Density)
- **Data Layer**: PostgreSQL with Prisma ORM
- **AI Stack**: Integrated Ollama/LocalAI Registry
- **Governance**: Hierarchical RBAC (Customer -> Tenant -> User)

## 🛠️ Key Directories
- `src/app/dashboard/control-center`: Super Admin configuration & Master Registry.
- `src/app/dashboard/automation-studio`: Visual workflow designer.
- `src/lib/prisma.ts`: Central database client with "Write Fence" offboarding protection.

## 🔐 Security & Operations
- **Middleware**: Global route protection enabled in `src/middleware.ts`.
- **Audit Logging**: Real-time forensic tracking across all identity nodes.
- **Node Orchestration**: Status monitoring and health-checks for AI compute nodes.

---
© 2026 Next Gen Platform. All rights reserved.
