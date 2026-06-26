import "dotenv/config";
import "reflect-metadata";
import express, { Request, Response } from "express";
import { Receiver } from "@upstash/qstash";
import { initializeDatabase } from "./config/database";
import { ScraperService } from "./services/scraper.service";
import { dashboardRouter } from "./dashboard/dashboard.router";
import { config } from "./config/env";

const app = express();

// CORS — allow the React frontend (Vercel) and local dev
app.use((req, res, next) => {
  const origin = req.headers.origin || "";
  if (config.app.frontendUrls.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");
  }
  if (req.method === "OPTIONS") {
    res.sendStatus(204);
    return;
  }
  next();
});

// Raw body for /trigger — QStash HMAC needs the original bytes
app.use("/trigger", express.raw({ type: "*/*" }));

// JSON body for all other routes
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// QStash scraper trigger — registered BEFORE dashboardRouter so requireAuth never intercepts it
const scraperService = new ScraperService();
const receiver = new Receiver({
  currentSigningKey: config.qstash.currentSigningKey,
  nextSigningKey: config.qstash.nextSigningKey,
});

app.get("/health", (_req: Request, res: Response): void => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.post("/trigger", async (req: Request, res: Response): Promise<void> => {
  const signature = req.headers["upstash-signature"];
  if (!signature || typeof signature !== "string") {
    res.status(401).json({ error: "Missing upstash-signature header" });
    return;
  }

  const rawBody = Buffer.isBuffer(req.body)
    ? req.body.toString("utf-8")
    : String(req.body ?? "");
  let isValid = false;
  try {
    isValid = await receiver.verify({
      signature,
      body: rawBody,
      clockTolerance: 5,
    });
  } catch {
    isValid = false;
  }

  if (!isValid) {
    res.status(401).json({ error: "Invalid QStash signature" });
    return;
  }

  res
    .status(200)
    .json({ triggered: true, timestamp: new Date().toISOString() });

  setImmediate(async () => {
    try {
      await scraperService.runPipeline();
    } catch (err) {
      console.error(
        `[${new Date().toISOString()}] [TRIGGER] Pipeline error:`,
        err,
      );
    }
  });
});

app.use("/", dashboardRouter);

async function bootstrap(): Promise<void> {
  await initializeDatabase();
  const { port } = config.app;
  app.listen(port, () => {
    console.log(`[${new Date().toISOString()}] [SERVER] Running on port ${port}`);
  });
}

bootstrap().catch((err) => {
  console.error(`[${new Date().toISOString()}] [BOOTSTRAP] Fatal error:`, err);
  process.exit(1);
});
