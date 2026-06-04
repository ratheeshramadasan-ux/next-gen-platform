# RPA Platform Monorepo Slice

This repository now includes a dedicated RPA monorepo scaffold aligned to a universal runner model:

- `apps/web-studio`: Next.js control center for intent submission and workflow viewing
- `apps/orchestrator-api`: Express API that plans workflows and queues jobs
- `packages/shared-contracts`: Shared schemas and TypeScript types
- `packages/sdk`: Thin client for external bot or UI integrations
- `services/bot-runner-dotnet`: Universal .NET worker runtime scaffold
- `services/bot-runner-node`: Optional lightweight Node bootstrap
- `infra/k8s`: Kubernetes deployment manifests
- `db`: Postgres schema and initial migration
- `docker`: Container definitions for orchestrator and runner

## Key Design Choice

The runner is modeled as one core runtime with multiple deployment wrappers:

- VM service for attended automation
- Docker container for portable headless execution
- Kubernetes pod for elastic unattended workloads

## Local Development

1. Install `pnpm` if it is not already available.
2. From the repository root run `pnpm install`.
3. Start the orchestrator with `pnpm --filter @rpa/orchestrator-api dev`.
4. Start the studio with `pnpm --filter @rpa/web-studio dev`.

## Environment Variables

- `OPENAI_API_KEY`: optional, enables live workflow planning
- `OPENAI_MODEL`: planner model override, defaults to `gpt-4.1-mini`
- `REDIS_URL`: Redis connection string for job queueing
- `JOB_QUEUE_NAME`: optional Redis list name
- `ORCHESTRATOR_API_URL`: web studio upstream route target
- `RUNNER_MODE`: `VM`, `DOCKER`, or `K8S`

## Notes

- If `OPENAI_API_KEY` is absent, the orchestrator returns a deterministic fallback workflow so the rest of the stack can still be exercised.
- The existing platform code in this repository was left untouched; this scaffold is additive so you can iterate toward the RPA architecture without destabilizing current services.
