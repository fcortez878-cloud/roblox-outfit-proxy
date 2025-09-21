const express = require("express");
const fetch = require("node-fetch");

const app = express();
const PORT = process.env.PORT || 3000;

// Optional: simple home page so / works
app.get("/", (_, res) => {
  res.send("✅ Roblox Outfit Proxy is running. Try /outfits/{userId}, /bundle/{assetId}, /limited-price/{assetId}");
});

// 1) Get user outfits
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

// 2) Bundle lookup
app.get("/bundle/:assetId", async (req, res) => {
  try {
    const assetId = req.params.assetId;
    const response = await fetch(`https://catalog.roblox.com/v1/assets/${assetId}/bundles`);
    const data = await response.json();
    res.json(data[0] || {});
  } catch (err) {
    res.status(500).json({ error: err.toString() });
  }
});

// 3) Limited price — return FLOOR (lowest reseller listing). Fallback to RAP.
app.get("/limited-price/:assetId", async (req, res) => {
  try {
    const assetId = req.params.assetId;

    // First try live resellers (most accurate floor)
    const resellersResp = await fetch(
      `https://economy.roblox.com/v2/assets/${assetId}/resellers?limit=1&sortOrder=Asc`
    );
    const resellers = await resellersResp.json();

    let price = null;
    if (resellers && resellers.data && resellers.data[0] && typeof resellers.data[0].price === "number") {
      price = resellers.data[0].price; // floor price
    }

    // Fallback: RAP/lowest from resale-data if no active listings
    if (!price) {
      const resaleResp = await fetch(`https://economy.roblox.com/v1/assets/${assetId}/resale-data`);
      const resale = await resaleResp.json();
      // Prefer lowestResalePrice if present, otherwise RAP
      price = resale.lowestResalePrice || resale.recentAveragePrice || null;
    }

    res.json({ price });
  } catch (err) {
    res.status(500).json({ error: err.toString() });
  }
});

// 4) Discord proxy
app.use(express.json());
app.post("/send-to-discord", async (req, res) => {
  try {
    const webhook = process.env.DISCORD_WEBHOOK;
    if (!webhook) return res.status(400).json({ error: "No Discord webhook set" });

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

app.listen(PORT, () => {
  console.log(`✅ Roblox Outfit Proxy running on port ${PORT}`);
});
