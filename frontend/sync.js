// ==========================
// Sync All Unsynced Records
// ==========================
async function syncAll() {
  if (!confirm(`⚠️ Sync all unsynced ${currentType}?`)) return;

  const tx = db.transaction(currentType, "readonly");
  tx.objectStore(currentType).getAll().onsuccess = async (e) => {
    const unsynced = e.target.result.filter(r => !r.synced);
    if (unsynced.length === 0) {
      alert("✅ No unsynced records!");
      return;
    }

    let count = 0;

    for (let record of unsynced) {
      console.log("📤 Syncing:", currentType, record);

      try {
        let result;

        if (currentType === "assets") {
          // -------------------
          // Asset Sync (JSON)
          // -------------------
          const formData = new FormData();
          formData.append("assetId", record.assetId || "");

          // ✅ Replace these with the **actual** Kissflow field IDs for each image
          formData.append("fieldId1", "Asset_Picture_1");
          formData.append("fieldId2", "Asset_Picture_2");
          formData.append("fieldId3", "Asset_Picture_3");
          formData.append("fieldId4", "Asset_Picture_4");

          // Append each picture to its respective field
          const map = [
            { field: "assetPic1", fileKey: "assetPic1" },
            { field: "assetPic2", fileKey: "assetPic2" },
            { field: "assetPic3", fileKey: "assetPic3" },
            { field: "assetPic4", fileKey: "assetPic4" }
          ];

          map.forEach(({ field, fileKey }) => {
            if (record._files?.[fileKey]) {
              Object.entries(record._files[fileKey]).forEach(([name, file]) => {
                // The backend uses the field key to map to each Kissflow field id
                formData.append(fileKey, file, name);
              });
            }
          });

          const response = await fetch("/sync-asset", {
            method: "POST",
            body: formData
          });

          const text = await response.text();
          try {
            result = JSON.parse(text);
          } catch (err) {
            console.error("❌ Failed to parse asset response:", err);
            console.log("📝 Raw response:", text);
            result = { error: "Invalid JSON response", raw: text };
          }

          console.log("📦 Asset sync result:", result);

        } else if (currentType === "maintenance") {
          // -------------------
          // Maintenance Sync (JSON + Photos + Docs)
          // -------------------
          const formData = new FormData();
          formData.append("boardID", record.boardID || "");
          formData.append("statusID", record.statusID || "");
          formData.append("itemID", record.itemID || "");
          formData.append("problemDescription", record.problemDescription || "");
          formData.append("observations", record.observations || "");
          formData.append("actionsTaken", record.actionsTaken || "");
          formData.append("parts", JSON.stringify(record.parts || []));

          // Maintenance Photos
          if (record.maintenancePhotos?.length > 0 && record._files?.photos) {
            record.maintenancePhotos.forEach(name => {
              const fileObj = record._files.photos[name];
              if (fileObj) formData.append("maintenancePhotos", fileObj, name);
            });
          }

          // Supporting Documents
          if (record.supportingDocuments?.length > 0 && record._files?.docs) {
            record.supportingDocuments.forEach(name => {
              const fileObj = record._files.docs[name];
              if (fileObj) formData.append("supportingDocs", fileObj, name);
            });
          }

          console.log("🛠️ Uploading maintenance record:", record.boardID);

          const response = await fetch("/sync-maintenance", {
            method: "POST",
            body: formData
          });

          const text = await response.text();
          try {
            result = JSON.parse(text);
          } catch (err) {
            console.error("❌ Failed to parse maintenance response:", err);
            console.log("📝 Raw response:", text);
            result = { error: "Invalid JSON response", raw: text };
          }

          console.log("🛠️ Maintenance sync result:", result);

          // ✅ Log individual results
          if (result.updateData) console.log("🔹 JSON updated:", result.updateData);
          if (result.photoData) console.log("🔹 Photo uploaded:", result.photoData);
          if (result.docData) console.log("🔹 Doc uploaded:", result.docData);
        }

        // ✅ Mark record as synced in IndexedDB
        record.synced = true;
        const tx2 = db.transaction(currentType, "readwrite");
        tx2.objectStore(currentType).put(record);

        count++;

      } catch (err) {
        console.error("❌ Sync error for record:", record, err);
      }
    }

    alert(`✅ Successfully processed ${count} ${currentType} records!`);
    loadRecords();
  };
}

