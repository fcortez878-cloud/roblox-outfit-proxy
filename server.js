const express = require("express");
const fetch = require("node-fetch");

const app = express();
const PORT = process.env.PORT || 3000;

// ================== Bundle Cache ==================
let bundleCache = {}; // assetId(string) -> { bundleId, name }
let bundleInfoCache = {}; // bundleId(string) -> { bundleId, name, assetIds }

// Helper: load bundle info into cache
async function getBundleInfo(bundleId) {
  const key = String(bundleId);
  if (bundleInfoCache[key]) return bundleInfoCache[key];

  const response = await fetch(`https://catalog.roblox.com/v1/bundles/${bundleId}/details`);
  const data = await response.json();

  if (data && data.id) {
    const assetIds = (data.items || [])
      .filter(item => item.type === "Asset")
      .map(item => String(item.id)); // store as string

    // Store mapping for each assetId → bundleId
    assetIds.forEach(id => {
      bundleCache[id] = { bundleId: data.id, name: data.name };
    });

    const info = {
      bundleId: data.id,
      name: data.name,
      description: data.description,
      bundleType: data.bundleType,
      assetIds: assetIds
    };

    bundleInfoCache[key] = info;
    return info;
  }
  return null;
}

// ================== Homepage ==================
app.get("/", (_, res) => {
  res.send("✅ Roblox Outfit Proxy is running! Try /outfits/{userId}, /bundle/{assetId}, /bundle-info/{bundleId}, /limited-price/{assetId}");
});

// ================== 1. Outfits ==================
app.get("/outfits/:userId", async (req, res) => {
  try {
    const userId = req.params.userId;
    const response = await fetch(`https://avatar.roblox.com/v1/users/${userId}/outfits`);
    const data = await response.json();

    if (data && Array.isArray(data.data)) {
      // Filter only saved outfits (not bundles)
      const filtered = data.data.filter(outfit => outfit.source === "UserOutfit");
      res.json({ total: filtered.length, data: filtered });
    } else {
      res.json({ total: 0, data: [] });
    }
  } catch (err) {
    res.status(500).json({ error: err.toString() });
  }
});

// ================== 2. Bundles by AssetId ==================
app.get("/bundle/:assetId", async (req, res) => {
  try {
    const assetId = String(req.params.assetId);

    // 1. Try Roblox API directly
    const response = await fetch(`https://catalog.roblox.com/v1/assets/${assetId}/bundles`);
    const data = await response.json();

    if (Array.isArray(data) && data.length > 0) {
      // Learn from bundle-info
      await getBundleInfo(data[0].bundleId);
      return res.json({ bundleId: data[0].bundleId, name: data[0].name });
    }

    // 2. Fallback: check our cache (string key)
    if (bundleCache[assetId]) {
      return res.json(bundleCache[assetId]);
    }

    res.json({ bundleId: null, note: "No bundles found for this assetId" });
  } catch (err) {
    res.status(500).json({ error: err.toString() });
  }
});

// ================== 3. Bundles by BundleId ==================
app.get("/bundle-info/:bundleId", async (req, res) => {
  try {
    const bundleId = String(req.params.bundleId);
    const info = await getBundleInfo(bundleId);

    if (info) {
      res.json(info);
    } else {
      res.json({ bundleId: null, note: "Bundle not found" });
    }
  } catch (err) {
    res.status(500).json({ error: err.toString() });
  }
});

// ================== 4. Limited Prices ==================
app.get("/limited-price/:assetId", async (req, res) => {
  try {
    const assetId = req.params.assetId;

    // Try live resellers (lowest price currently listed)
    const resellersResp = await fetch(
      `https://economy.roblox.com/v2/assets/${assetId}/resellers?limit=1&sortOrder=Asc`
    );
    const resellers = await resellersResp.json();

    let price = null;
    if (resellers && resellers.data && resellers.data[0] && typeof resellers.data[0].price === "number") {
      price = resellers.data[0].price;
    }

    // Fallback: RAP or lowestResalePrice if no active listings
    if (!price) {
      const resaleResp = await fetch(`https://economy.roblox.com/v1/assets/${assetId}/resale-data`);
      const resale = await resaleResp.json();
      price = resale.lowestResalePrice || resale.recentAveragePrice || null;
    }

    res.json({ price });
  } catch (err) {
    res.status(500).json({ error: err.toString() });
  }
});

// ================== 5. Discord Proxy ==================
app.use(express.json());
app.post("/send-to-discord", async (req, res) => {
  try {
    const webhook = process.env.DISCORD_WEBHOOK;
    if (!webhook) return res.status(400).json({ error: "No Discord webhook set in environment variables" });

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

// ================== Start Server ==================
app.listen(PORT, () => {
  console.log(`✅ Roblox Outfit Proxy running on port ${PORT}`);
});
