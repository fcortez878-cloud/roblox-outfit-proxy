const express = require("express");
const fetch = require("node-fetch");

const app = express();
const PORT = process.env.PORT || 3000;

// =============== 1. Get user outfits ===============
app.get("/outfits/:userId", async (req, res) => {
  try {
    const userId = req.params.userId;
    const response = await fetch(`https://avatar.roblox.com/v1/users/${userId}/outfits`);
    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.toString() });
  }
});

// =============== 2. Check bundle by assetId ===============
app.get("/bundle/:assetId", async (req, res) => {
  try {
    const assetId = req.params.assetId;
    const response = await fetch(`https://catalog.roblox.com/v1/assets/${assetId}/bundles`);
    const data = await response.json();
    res.json(data[0] || {}); // return first bundle or empty object
  } catch (err) {
    res.status(500).json({ error: err.toString() });
  }
});

// =============== 3. Get limited item price ===============
app.get("/limited-price/:assetId", async (req, res) => {
  try {
    const assetId = req.params.assetId;
    const response = await fetch(`https://economy.roblox.com/v1/assets/${assetId}/resale-data`);
    const data = await response.json();
    res.json({ price: data.recentAveragePrice || null });
  } catch (err) {
    res.status(500).json({ error: err.toString() });
  }
});

// =============== 4. Discord webhook proxy ===============
app.use(express.json());
app.post("/send-to-discord", async (req, res) => {
  try {
    const webhook = process.env.DISCORD_WEBHOOK;
    if (!webhook) {
      return res.status(400).json({ error: "No Discord webhook set in environment variables" });
    }

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

// =============== Start server ===============
app.listen(PORT, () => {
  console.log(`✅ Roblox Outfit Proxy running on port ${PORT}`);
});
