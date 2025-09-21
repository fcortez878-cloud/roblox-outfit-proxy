const express = require("express");
const fetch = require("node-fetch");

const app = express();
const PORT = process.env.PORT || 3000;

// 1. Outfits
app.get("/outfits/:userId", async (req, res) => {
  try {
    const response = await fetch(`https://avatar.roblox.com/v1/users/${req.params.userId}/outfits`);
    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.toString() });
  }
});

// 2. Bundles
app.get("/bundle/:assetId", async (req, res) => {
  try {
    const response = await fetch(`https://catalog.roblox.com/v1/assets/${req.params.assetId}/bundles`);
    const data = await response.json();
    res.json(data[0] || {});
  } catch (err) {
    res.status(500).json({ error: err.toString() });
  }
});

// 3. Limited Prices
app.get("/limited-price/:assetId", async (req, res) => {
  try {
    const response = await fetch(`https://economy.roblox.com/v1/assets/${req.params.assetId}/resale-data`);
    const data = await response.json();
    res.json({ price: data.recentAveragePrice || null });
  } catch (err) {
    res.status(500).json({ error: err.toString() });
  }
});

// 4. Discord webhook
app.use(express.json());
app.post("/send-to-discord", async (req, res) => {
  try {
    const webhook = process.env.DISCORD_WEBHOOK;
    if (!webhook) return res.status(400).json({ error: "No webhook set" });

    const response = await fetch(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req.body)
    });
    res.json({ success: true, status: response.status });
  } catch (err) {
    res.status(500).json({ error: err.toString() });
  }
});

app.listen(PORT, () => console.log(`✅ API running on port ${PORT}`));
