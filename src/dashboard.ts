import "dotenv/config";
import express from "express";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { runMetrics, formatDuration } from "./runner.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT ?? 3000;

app.get("/api/metrics", async (req, res) => {
  try {
    const skipCache = req.query.refresh !== undefined;
    const metrics = await runMetrics(undefined, { skipCache });
    res.json(metrics);
  } catch (e) {
    res.status(500).json({ error: String((e as Error).message) });
  }
});

app.get("/", (_req, res) => {
  const html = readFileSync(join(__dirname, "..", "public", "index.html"), "utf-8");
  res.setHeader("Content-Type", "text/html").send(html);
});

app.use(express.static(join(__dirname, "..", "public")));

app.listen(PORT, () => {
  console.log(`PR Metrics dashboard: http://localhost:${PORT}`);
});

export { formatDuration };
