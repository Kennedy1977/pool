const express = require("express");
const path = require("path");

const app = express();
const port = Number(process.env.PORT) || 3000;
const rootDir = __dirname;

app.disable("x-powered-by");

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.get("/", (_req, res) => {
  res.sendFile(path.join(rootDir, "index.html"));
});

app.get("/pool.js", (_req, res) => {
  res.type("application/javascript");
  res.sendFile(path.join(rootDir, "pool.js"));
});

app.get("/poker.js", (_req, res) => {
  res.type("application/javascript");
  res.sendFile(path.join(rootDir, "poker.js"));
});

app.get("/styles.css", (_req, res) => {
  res.type("text/css");
  res.sendFile(path.join(rootDir, "styles.css"));
});

app.use("/assets", express.static(path.join(rootDir, "assets")));

app.listen(port, () => {
  console.log(`Club Night server running at http://localhost:${port}`);
});
