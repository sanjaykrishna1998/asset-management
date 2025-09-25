import express from "express";
import fetch from "node-fetch";
import cors from "cors";

const app = express();
app.use(cors());                 // enable CORS
app.use(express.static("public"));

const PORT = 3000;

// Replace with your actual Kissflow API URL & key
const KISSFLOW_URL =
  "https://development-redkitebpm.kissflow.com/form/2/Ac9wu13v4qNL/Item_Master_A00/list";
const ACCESS_KEY = "Ak038f9c11-bb30-4774-895c-076d8eb06232";
const ACCESS_SECRET = "2CQEVoKKmR-AenZAj6vQnn7FDPfgz8Pu-HM-9KMbCsiFi2BLxxegd2ayYAYsLZLqhxGpiaMRh3Z2kpIn4IwCw";

app.get("/api/itemids", async (req, res) => {
  try {
    const resp = await fetch(KISSFLOW_URL, {
      headers: {
        Accept: "application/json",
        "X-Access-Key-Id": ACCESS_KEY,
        "X-Access-Key-Secret": ACCESS_SECRET,
      },
    });

    if (!resp.ok) {
      const text = await resp.text();
      return res.status(resp.status).json({ error: text });
    }

    const data = await resp.json();

    // 🔑 Adjust if Kissflow’s JSON shape is different
    // If the items are at data.items or data.Data, change accordingly.
    const rows = Array.isArray(data.items)
      ? data.items
      : Array.isArray(data)
      ? data
      : data.Data || [];

    // Collect just the Item_ID_1 field
    const itemIds = rows
      .map(r => r.Item_ID_1)
      .filter(Boolean);

    res.json(itemIds);
  } catch (err) {
    console.error("Server error:", err);
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () =>
  console.log(`🚀 Server running at http://localhost:${PORT}`)
);

