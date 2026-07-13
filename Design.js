// server.js — deploy this on Glitch (glitch.com/create)
// After deploying, your live clock URL will be:
// https://<your-project-name>.glitch.me/clock.svg

const express = require("express");
const app = express();

app.get("/clock.svg", (req, res) => {
  const timeZone = req.query.timezone || "Asia/Kolkata"; // change default if needed
  const now = new Date();

  const time = now.toLocaleTimeString("en-US", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  const date = now.toLocaleDateString("en-US", {
    timeZone,
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "2-digit",
  });

  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="320" height="70">
  <rect width="320" height="70" rx="10" fill="#0f172a"/>
  <text x="20" y="30" font-family="Segoe UI, sans-serif" font-size="14" fill="#94a3b8">
    Author Local Time
  </text>
  <text x="20" y="55" font-family="Consolas, monospace" font-size="22" fill="#22c55e" font-weight="bold">
    ${time}
  </text>
  <text x="180" y="55" font-family="Segoe UI, sans-serif" font-size="13" fill="#e2e8f0">
    ${date}
  </text>
</svg>`.trim();

  res.set("Content-Type", "image/svg+xml");
  res.set("Cache-Control", "no-cache, no-store, must-revalidate");
  res.send(svg);
});

app.get("/", (req, res) => res.send("Clock service running. Try /clock.svg"));

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log("Your app is listening on port " + listener.address().port);
});
