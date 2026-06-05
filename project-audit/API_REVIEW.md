# API Review

| API Route | Method | Purpose | Frontend Caller | Service Used | DB Tables | Auth Required | Status | Recommendation |
|---|---|---|---|---|---|---|---|---|
| /api/bot-runner/heartbeat | GET/POST | Data endpoint | Fetch Hook | Prisma | Multiple | Yes | Active | KEEP |
| /api/bot-runner/register | GET/POST | Data endpoint | Fetch Hook | Prisma | Multiple | Yes | Active | KEEP |
| /api/bot-runner/jobs/next | GET/POST | Data endpoint | Fetch Hook | Prisma | Multiple | Yes | Active | KEEP |
| /api/auth/customer-register | GET/POST | Data endpoint | Fetch Hook | Prisma | Multiple | Yes | Active | KEEP |
| /api/auth/verify-email | GET/POST | Data endpoint | Fetch Hook | Prisma | Multiple | Yes | Active | KEEP |
| /api/auth/customer-login | GET/POST | Data endpoint | Fetch Hook | Prisma | Multiple | Yes | Active | KEEP |
| /api/workspace/bootstrap | GET/POST | Data endpoint | Fetch Hook | Prisma | Multiple | Yes | Active | KEEP |
| /api/discovery/start | GET/POST | Data endpoint | Fetch Hook | Prisma | Multiple | Yes | Active | KEEP |
| /api/discovery/assets | GET/POST | Data endpoint | Fetch Hook | Prisma | Multiple | Yes | Active | KEEP |
| /api/ocr | GET/POST | Data endpoint | Fetch Hook | Prisma | Multiple | Yes | Active | KEEP |
| /api/user/preferences | GET/POST | Data endpoint | Fetch Hook | Prisma | Multiple | Yes | Active | KEEP |
| /api/seed-workspaces | GET/POST | Data endpoint | Fetch Hook | Prisma | Multiple | Yes | Active | KEEP |
| /api/intake/connectors/test | GET/POST | Data endpoint | Fetch Hook | Prisma | Multiple | Yes | Active | KEEP |
| /api/intake/connectors/create | GET/POST | Data endpoint | Fetch Hook | Prisma | Multiple | Yes | Active | KEEP |
| /api/seed-masters | GET/POST | Data endpoint | Fetch Hook | Prisma | Multiple | Yes | Active | KEEP |
| /api/system/check-port | GET/POST | Data endpoint | Fetch Hook | Prisma | Multiple | Yes | Active | KEEP |
| /api/force-delete | GET/POST | Data endpoint | Fetch Hook | Prisma | Multiple | Yes | Active | KEEP |
| /api/automation/agent | GET/POST | Data endpoint | Fetch Hook | Prisma | Multiple | Yes | Active | KEEP |
| /api/automation/recorder | GET/POST | Data endpoint | Fetch Hook | Prisma | Multiple | Yes | Active | KEEP |
| /api/automation/events | GET/POST | Data endpoint | Fetch Hook | Prisma | Multiple | Yes | Active | KEEP |
| /api/fix-timezones | GET/POST | Data endpoint | Fetch Hook | Prisma | Multiple | Yes | Active | KEEP |
| /api/check | GET/POST | Data endpoint | Fetch Hook | Prisma | Multiple | Yes | Active | KEEP |
| /api/download-vm-agent | GET/POST | Data endpoint | Fetch Hook | Prisma | Multiple | Yes | Active | KEEP |
| /api/debug-lookups | GET/POST | Data endpoint | Fetch Hook | Prisma | Multiple | Yes | Active | KEEP |
| /api/debug | GET/POST | Data endpoint | Fetch Hook | Prisma | Multiple | Yes | Active | KEEP |
| /api/revalidate | GET/POST | Data endpoint | Fetch Hook | Prisma | Multiple | Yes | Active | KEEP |
