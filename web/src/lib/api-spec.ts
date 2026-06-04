export const apiSpec = {
  openapi: "3.0.0",
  info: {
    title: "Next Gen Platform API",
    version: "1.0.0",
    description: "Enterprise Automation & Orchestration API Documentation",
  },
  servers: [
    {
      url: "/api",
      description: "Local API",
    },
  ],
  tags: [
    { name: "Authentication", description: "User login and registration" },
    { name: "Bot Runner", description: "Agent orchestration and management" },
    { name: "Automation", description: "Workflow execution and recording" },
    { name: "System Utility", description: "Data seeding and environment maintenance" },
  ],
  paths: {
    "/auth/customer-login": {
      post: {
        summary: "Customer login",
        tags: ["Authentication"],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email", "password", "slug"],
                properties: {
                  email: { type: "string" },
                  password: { type: "string" },
                  slug: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "Success" },
          "401": { description: "Unauthorized" },
        },
      },
    },
    "/auth/customer-register": {
      post: {
        summary: "Register new customer organization",
        tags: ["Authentication"],
        responses: {
          "200": { description: "Registration successful" },
        },
      },
    },
    "/auth/verify-email": {
      get: {
        summary: "Verify user email",
        tags: ["Authentication"],
        parameters: [
          { name: "token", in: "query", required: true, schema: { type: "string" } },
        ],
        responses: {
          "200": { description: "Email verified" },
        },
      },
    },
    "/bot-runner/register": {
      post: {
        summary: "Register or activate a bot runner",
        tags: ["Bot Runner"],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["tenantId", "hostname", "fingerprint"],
                properties: {
                  tenantId: { type: "string" },
                  hostname: { type: "string" },
                  fingerprint: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "Runner registered" },
        },
      },
    },
    "/bot-runner/heartbeat": {
      post: {
        summary: "Agent heartbeat signal",
        tags: ["Bot Runner"],
        responses: {
          "200": { description: "Heartbeat recorded" },
        },
      },
    },
    "/bot-runner/jobs/next": {
      get: {
        summary: "Fetch next pending job for agent",
        tags: ["Bot Runner"],
        responses: {
          "200": { description: "Job details or empty" },
        },
      },
    },
    "/automation/agent": {
      post: {
        summary: "Control local automation agent",
        tags: ["Automation"],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["action"],
                properties: {
                  action: { type: "string", enum: ["run", "stop", "status"] },
                  workflowId: { type: "string" },
                  browserType: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "Action executed" },
        },
      },
    },
    "/automation/recorder": {
      post: {
        summary: "Start/Stop browser recorder",
        tags: ["Automation"],
        responses: {
          "200": { description: "Recorder toggled" },
        },
      },
    },
    "/automation/events": {
      get: {
        summary: "Stream recorded events",
        tags: ["Automation"],
        responses: {
          "200": { description: "Event stream" },
        },
      },
    },
    "/seed-masters": {
      post: {
        summary: "Seed reference data (masters)",
        tags: ["System Utility"],
        responses: {
          "200": { description: "Data seeded" },
        },
      },
    },
    "/seed-workspaces": {
      post: {
        summary: "Seed sample workspaces",
        tags: ["System Utility"],
        responses: {
          "200": { description: "Workspaces seeded" },
        },
      },
    },
    "/fix-timezones": {
      get: {
        summary: "Repair inconsistent timezone data",
        tags: ["System Utility"],
        responses: {
          "200": { description: "Timezones fixed" },
        },
      },
    },
    "/debug-lookups": {
      get: {
        summary: "Debug internal lookup tables",
        tags: ["System Utility"],
        responses: {
          "200": { description: "Lookup state" },
        },
      },
    },
    "/revalidate": {
      get: {
        summary: "Clear Next.js cache for a path",
        tags: ["System Utility"],
        parameters: [
          { name: "path", in: "query", required: true, schema: { type: "string" } },
        ],
        responses: {
          "200": { description: "Cache cleared" },
        },
      },
    },
  },
};
