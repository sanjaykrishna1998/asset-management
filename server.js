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
app.use(express.json());
app.use(cors({ origin: "*" }));

// Serve frontend files
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use(express.static(path.join(__dirname, "./frontend")));

// Kissflow API Details
const KISSFLOW_URL_ASSET =
  "https://development-redkitebpm.kissflow.com/process/2/Ac9wu13v4qNL/Update_Asset_A00";
const KISSFLOW_URL_MAINTENANCE =
  "https://development-redkitebpm.kissflow.com/case/2/Ac9wu13v4qNL/Asset_Maintenance_A00";

const ACCESS_KEY = "Ak038f9c11-bb30-4774-895c-076d8eb06232";
const ACCESS_SECRET = "2CQEVoKKmR-AenZAj6vQnn7FDPfgz8Pu-HM-9KMbCsiFi2BLxxegd2ayYAYsLZLqhxGpiaMRh3Z2kpIn4IwCw";

// Multer for temporary file storage
const upload = multer({ dest: "uploads/" });

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "Server is running" });
});

// Sync Asset

app.post(
  "/sync-asset",
  upload.fields([
    { name: "assetPic1", maxCount: 1 },
    { name: "assetPic2", maxCount: 1 },
    { name: "assetPic3", maxCount: 1 },
    { name: "assetPic4", maxCount: 1 }
  ]),
  async (req, res) => {
    try {
      const { assetId, fieldId1, fieldId2, fieldId3, fieldId4 } = req.body;

      // 1) Create a new process instance
      const createResp = await fetch(`${KISSFLOW_URL_ASSET}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "X-Access-Key-Id": ACCESS_KEY,
          "X-Access-Key-Secret": ACCESS_SECRET
        },
        body: JSON.stringify({ Asset_ID: assetId})
      });

      const createText = await createResp.text();
      let createData;
      try { createData = JSON.parse(createText); }
      catch { createData = { raw: createText }; }

      // Extract instance and activity id
      const instanceId = createData._id || createData.id;
      const activityId = createData._activity_instance_id || createData.activityInstanceId;

      if (!instanceId || !activityId) {
        console.warn("⚠️ Create response missing instance/activity ids:", createData);
        // continue anyway — Kissflow sometimes returns IDs differently. We return the raw createData to the client.
      }

      // Helper to upload a single file to a field
      async function uploadImageToKF(fieldId, fileParamName) {
        const file = req.files?.[fileParamName]?.[0];
        if (!file) return { fieldId, skipped: true };

        // Use formdata-node to send file to Kissflow
        const fd = new FormData();
        const f = await fileFromPath(file.path);
        fd.append("file", f, file.originalname);

        const uploadUrl = `${KISSFLOW_URL_ASSET}/${instanceId}/${activityId}/${fieldId}/image`;
        console.log("⬆️ Uploading to:", uploadUrl);

        const fetchRes = await fetch(uploadUrl, {
          method: "POST",
          headers: {
            "X-Access-Key-Id": ACCESS_KEY,
            "X-Access-Key-Secret": ACCESS_SECRET
            // DO NOT set Content-Type; formdata-node will set it
          },
          body: fd
        });

        const text = await fetchRes.text();
        let json;
        try { json = JSON.parse(text); } catch { json = { raw: text }; }

        // cleanup temp file
        try { fs.unlinkSync(file.path); } catch (e) { /* ignore */ }

        return { fieldId, response: json };
      }

      // 2) Upload the 4 images (sequentially)
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
        uploads
      });
    } catch (err) {
      console.error("❌ /sync-asset error:", err);
      res.status(500).json({ error: err.message });
    }
  }
);

// Sync Maintenance

app.post(
  "/sync-maintenance",
  upload.fields([
    { name: "maintenancePhotos", maxCount: 10 },
    { name: "supportingDocs", maxCount: 10 }, // backend still receives "supportingDocs"
  ]),
  async (req, res) => {
    try {
      const boardID = req.body.boardID;
      if (!boardID) {
        return res.status(400).json({ error: "boardID is required" });
      }

      const statusID = req.body.statusID;

      // ----------------------
      // 1) Update JSON fields
      // ----------------------
      let parts = [];
      if (req.body.parts) {
        try {
          parts = JSON.parse(req.body.parts);
        } catch (e) {
          console.warn("⚠️ Could not parse parts JSON:", req.body.parts, e);
        }
      }

      const partsForKissflow = parts.map(p => ({
        "Item_Name_Offline": p.itemId,
        "Required_Quantity": Number(p.requiredQuantity)
      }));

      const updateResponse = await fetch(
        `${KISSFLOW_URL_MAINTENANCE}/${boardID}/${statusID}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Accept": "application/json",
            "X-Access-Key-Id": ACCESS_KEY,
            "X-Access-Key-Secret": ACCESS_SECRET,
          },
          body: JSON.stringify({
            "Item_ID": req.body.itemID,
            "Problem_Description": req.body.problemDescription,
            "Work_Notes": req.body.workNote,
            "Observations": req.body.observations,
            "Actions_Taken": req.body.actionsTaken,
            "Table::Select_Replacement_Parts": partsForKissflow
          }),
        }
      );

      const updateText = await updateResponse.text();
      let updateData;
      try {
        updateData = JSON.parse(updateText);
      } catch (err) {
        console.error("❌ Failed to parse maintenance update:", err);
        console.log("📝 Raw response:", updateText);
        updateData = { error: "Invalid JSON response", raw: updateText };
      }
      console.log("🛠️ Maintenance JSON Update Response:", updateData);

      // ----------------------
      // 2) Upload Maintenance Photos
      // ----------------------
      let photoData = null;
      if (req.files?.maintenancePhotos) {
        const formData = new FormData();
        for (const file of req.files.maintenancePhotos) {
          const f = await fileFromPath(file.path);
          formData.append("file", f, file.originalname);
        }

        const photoResponse = await fetch(
          `${KISSFLOW_URL_MAINTENANCE}/${boardID}/PostMaintenance_Photos/image`,
          {
            method: "POST",
            headers: {
              "X-Access-Key-Id": ACCESS_KEY,
              "X-Access-Key-Secret": ACCESS_SECRET,
            },
            body: formData,
          }
        );

        const photoText = await photoResponse.text();
        try {
          photoData = JSON.parse(photoText);
        } catch (err) {
          console.error("❌ Failed to parse photo response:", err);
          console.log("📝 Raw photo response:", photoText);
          photoData = { error: "Invalid JSON response", raw: photoText };
        }

        console.log("📸 Photo Upload Response:", photoData);
        req.files.maintenancePhotos.forEach(f => fs.unlinkSync(f.path));
      }

      // ----------------------
      // 3) Upload Supporting Documents
      // ----------------------
      let docData = null;
      if (req.files?.supportingDocs) { // <-- multer receives this field
        const formData = new FormData();
        for (const file of req.files.supportingDocs) {
          const f = await fileFromPath(file.path);
          formData.append("file", f, file.originalname);
        }

        const docResponse = await fetch(
          `${KISSFLOW_URL_MAINTENANCE}/${boardID}/Supporting_Documents/attachment`,
          {
            method: "POST",
            headers: {
              "X-Access-Key-Id": ACCESS_KEY,
              "X-Access-Key-Secret": ACCESS_SECRET,
            },
            body: formData,
          }
        );

        const docText = await docResponse.text();
        try {
          docData = JSON.parse(docText);
        } catch (err) {
          console.error("❌ Failed to parse doc response:", err);
          console.log("📝 Raw doc response:", docText);
          docData = { error: "Invalid JSON response", raw: docText };
        }

        console.log("📎 Document Upload Response:", docData);
        req.files.supportingDocs.forEach(f => fs.unlinkSync(f.path));
      }

      res.json({
        success: true,
        updateData,
        photoData,
        docData
      });

    } catch (err) {
      console.error("❌ Error syncing maintenance:", err);
      res.status(500).json({ error: "Failed to sync maintenance", details: err.message });
    }
  }
);


// Start server
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
