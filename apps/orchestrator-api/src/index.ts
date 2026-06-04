import express from "express";
import { runIntentRoute } from "./routes/runIntent.js";
import { governanceInterceptor } from "./lib/governance.js";
import { registerRoute, heartbeatRoute, jobsNextRoute } from "./routes/botRunner.js";

const app = express();
const port = Number(process.env.PORT ?? 3001);

app.use(express.json({ limit: "1mb" }));

// Enforce governance interception
app.use(governanceInterceptor);

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "orchestrator-api" });
});

app.post("/run-intent", runIntentRoute);

// Bot Runner Admission Routes
app.post("/bot-runner/register", registerRoute);
app.post("/bot-runner/heartbeat", heartbeatRoute);
app.post("/bot-runner/jobs/next", jobsNextRoute);

app.listen(port, () => {
  console.log(`Orchestrator running on ${port}`);
});

