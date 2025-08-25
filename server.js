import express from "express";
import fetch from "node-fetch";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

const app = express();
const PORT = process.env.PORT || 3000;
app.use(express.json());
app.use(cors({ origin: "*" }));

// Serve frontend files
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use(express.static(path.join(__dirname, "./frontend")));

const KISSFLOW_URL =
  "https://development-redkitebpm.kissflow.com/form/2/Ac9wu13v4qNL/Asset_Details_A00/create/submit";
const ACCESS_KEY = "Ak038f9c11-bb30-4774-895c-076d8eb06232";
const ACCESS_SECRET = "2CQEVoKKmR-AenZAj6vQnn7FDPfgz8Pu-HM-9KMbCsiFi2BLxxegd2ayYAYsLZLqhxGpiaMRh3Z2kpIn4IwCw";

app.get("/api/health", (req, res) => {
  res.json({ status: "Server is running" });
});

app.post("/sync-assets", async (req, res) => {
  try {
    console.log(" Data received from frontend:", req.body);

    const response = await fetch(KISSFLOW_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "X-Access-Key-Id": ACCESS_KEY,
        "X-Access-Key-Secret": ACCESS_SECRET,
      },
      body: JSON.stringify({
            "Untitled_Field": req.body.assetName,
            "Asset_Type": req.body.assetType,
            "Purchase_Date": req.body.purchaseDate,
            "Warranty_Expiry": req.body.warrantyExpiry,
            "Asset_Status": req.body.assetStatus,
            "Asset_Condition": req.body.assetCondition,
      }),
    });

    const data = await response.json();
    console.log("Kissflow API Response:", data);

    res.setHeader("Access-Control-Allow-Origin", "*");
    res.json(data);
  } catch (err) {
    console.error("❌ Error syncing asset:", err);
    res.status(500).json({ error: "Failed to sync asset" });
  }
});

app.listen(PORT, () =>
  console.log(`Server running on port ${PORT}`)
);
