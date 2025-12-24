import express from "express";
import fetch from "node-fetch";
import cors from "cors";
import path from "path";
import multer from "multer";
import { FormData } from "formdata-node";
import { fileFromPath } from "formdata-node/file-from-path";
import fs from "fs";
import { fileURLToPath } from "url";

const app = express();
const PORT = process.env.PORT || 3000;

// ---------- Middleware ----------
app.use(cors({ origin: "*" }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ---------- Static Frontend ----------
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use(express.static(path.join(__dirname, "frontend"))); // your main frontend
app.use(express.static(path.join(__dirname, "public")));   // optional extra static files

// ---------- Kissflow Credentials ----------
const ACCESS_KEY = "Ak08fe627f-d9b4-4650-bf94-a53d9c88ea2d";
const ACCESS_SECRET = "EtAzPfKWlahxxsEHcUufU6AQ1wK2J6LHv-1sFts09T2T28pLsqPkQqgeBZqsr6AT5Q5Q5WlVKBNU4MqgNurwYw";

const KISSFLOW_URL_ASSET =
  "https://redkitebpm.kissflow.com/process/2/Ac9wEqt1upkI/Update_Asset_Picture_A00";
const KISSFLOW_URL_MAINTENANCE =
  "https://redkitebpm.kissflow.com/case/2/Ac9wEqt1upkI/Asset_Maintenance_A00";
const KISSFLOW_URL_ITEMS =
  "https://redkitebpm.kissflow.com/form/2/Ac9wEqt1upkI/Item_Master_A00/list?page_number=1&page_size=1000";

// ---------- Health Check ----------
app.get("/api/health", (req, res) => res.json({ status: "Server is running" }));

// ---------- Fetch Item IDs ----------
app.get("/api/itemids", async (req, res) => {
  try {
    const resp = await fetch(KISSFLOW_URL_ITEMS, {
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
    const rows = Array.isArray(data.items)
      ? data.items
      : Array.isArray(data)
      ? data
      : data.Data || [];

    const itemIds = rows.map(r => r.Item_ID_1).filter(Boolean);
    res.json(itemIds);
  } catch (err) {
    console.error("❌ /api/itemids error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ---------- Multer Setup ----------
const upload = multer({ dest: "uploads/" });

// ---------- Sync Asset ----------
app.post(
  "/sync-asset",
  upload.fields([
    { name: "assetPic1", maxCount: 1 },
    { name: "assetPic2", maxCount: 1 },
    { name: "assetPic3", maxCount: 1 },
    { name: "assetPic4", maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      const { assetId, fieldId1, fieldId2, fieldId3, fieldId4 } = req.body;

      const createResp = await fetch(`${KISSFLOW_URL_ASSET}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "X-Access-Key-Id": ACCESS_KEY,
          "X-Access-Key-Secret": ACCESS_SECRET,
        },
        body: JSON.stringify({ Asset_ID: assetId }),
      });

      const createText = await createResp.text();
      let createData;
      try {
        createData = JSON.parse(createText);
      } catch {
        createData = { raw: createText };
      }

      const instanceId = createData._id || createData.id;
      const activityId =
        createData._activity_instance_id || createData.activityInstanceId;

      async function uploadImageToKF(fieldId, fileParamName) {
        const file = req.files?.[fileParamName]?.[0];
        if (!file) return { fieldId, skipped: true };

        const fd = new FormData();
        const f = await fileFromPath(file.path);
        fd.append("file", f, file.originalname);

        const uploadUrl = `${KISSFLOW_URL_ASSET}/${instanceId}/${activityId}/${fieldId}/image`;
        const fetchRes = await fetch(uploadUrl, {
          method: "POST",
          headers: {
            "X-Access-Key-Id": ACCESS_KEY,
            "X-Access-Key-Secret": ACCESS_SECRET,
          },
          body: fd,
        });

        const text = await fetchRes.text();
        let json;
        try {
          json = JSON.parse(text);
        } catch {
          json = { raw: text };
        }

        try {
          fs.unlinkSync(file.path);
        } catch {}

        return { fieldId, response: json };
      }

      const uploads = [];
      uploads.push(await uploadImageToKF(fieldId1, "assetPic1"));
      uploads.push(await uploadImageToKF(fieldId2, "assetPic2"));
      uploads.push(await uploadImageToKF(fieldId3, "assetPic3"));
      uploads.push(await uploadImageToKF(fieldId4, "assetPic4"));

      res.json({
        success: true,
        createData,
        instanceId,
        activityId,
        uploads,
      });
    } catch (err) {
      console.error("❌ /sync-asset error:", err);
      res.status(500).json({ error: err.message });
    }
  }
);

// ---------- Sync Maintenance ----------
app.post(
  "/sync-maintenance",
  upload.fields([
    { name: "maintenancePhotos", maxCount: 10 },
    { name: "supportingDocs", maxCount: 10 },
  ]),
  async (req, res) => {
    try {
      const boardID = req.body.boardID;
      if (!boardID) return res.status(400).json({ error: "boardID is required" });

      const statusID = req.body.statusID || "";

      let parts = [];
      if (req.body.parts) {
        try {
          parts = JSON.parse(req.body.parts);
        } catch (e) {
          console.warn("Could not parse parts JSON:", e);
        }
      }

      const partsForKissflow = parts.map(p => ({
        Item_Name_Offline: p.itemId,
        Required_Quantity: Number(p.requiredQuantity),
      }));

      const updateResp = await fetch(
        `${KISSFLOW_URL_MAINTENANCE}/${boardID}/${statusID}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            "X-Access-Key-Id": ACCESS_KEY,
            "X-Access-Key-Secret": ACCESS_SECRET,
          },
          body: JSON.stringify({
            Agents_Email: req.body.usersEmail,
            Work_Notes: req.body.workNote,
            Observations: req.body.observations,
            Actions_Taken: req.body.actionsTaken,
            "Table::Select_Replacement_Parts": partsForKissflow,
          }),
        }
      );

      const updateText = await updateResp.text();
      let updateData;
      try {
        updateData = JSON.parse(updateText);
      } catch {
        updateData = { raw: updateText };
      }

      // ---- Photos ----
      let photoData = null;
      if (req.files?.maintenancePhotos) {
        const fd = new FormData();
        for (const file of req.files.maintenancePhotos) {
          const f = await fileFromPath(file.path);
          fd.append("file", f, file.originalname);
        }
        const photoResp = await fetch(
          `${KISSFLOW_URL_MAINTENANCE}/${boardID}/PostMaintenance_Photos/image`,
          {
            method: "POST",
            headers: {
              "X-Access-Key-Id": ACCESS_KEY,
              "X-Access-Key-Secret": ACCESS_SECRET,
            },
            body: fd,
          }
        );
        const photoText = await photoResp.text();
        try {
          photoData = JSON.parse(photoText);
        } catch {
          photoData = { raw: photoText };
        }
        req.files.maintenancePhotos.forEach(f => fs.unlinkSync(f.path));
      }

      // ---- Supporting Documents ----
      let docData = null;
      if (req.files?.supportingDocs) {
        const fd = new FormData();
        for (const file of req.files.supportingDocs) {
          const f = await fileFromPath(file.path);
          fd.append("file", f, file.originalname);
        }
        const docResp = await fetch(
          `${KISSFLOW_URL_MAINTENANCE}/${boardID}/Supporting_Documents/attachment`,
          {
            method: "POST",
            headers: {
              "X-Access-Key-Id": ACCESS_KEY,
              "X-Access-Key-Secret": ACCESS_SECRET,
            },
            body: fd,
          }
        );
        const docText = await docResp.text();
        try {
          docData = JSON.parse(docText);
        } catch {
          docData = { raw: docText };
        }
        req.files.supportingDocs.forEach(f => fs.unlinkSync(f.path));
      }

      res.json({ success: true, updateData, photoData, docData });
    } catch (err) {
      console.error("❌ /sync-maintenance error:", err);
      res.status(500).json({ error: err.message });
    }
  }
);

// ---------- Start Server ----------
app.listen(PORT, () =>
  console.log(`🚀 Server running on http://localhost:${PORT}`)
);





