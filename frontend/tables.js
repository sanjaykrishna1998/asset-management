function loadRecords() {
  const tx = db.transaction(currentType, "readonly");
  tx.objectStore(currentType).getAll().onsuccess = (e) => {
    renderTable(currentType, e.target.result);
  };
}

function renderTable(type, records) {
  let headHTML = "";
  let bodyHTML = "";

  if (type === "assets") {
    // ==== Updated header for new fields ====
    headHTML = `
      <tr>
        <th>Asset ID</th>
        <th>Asset Picture 1</th>
        <th>Asset Picture 2</th>
        <th>Asset Picture 3</th>
        <th>Asset Picture 4</th>
        <th>Synced?</th>
      </tr>`;

    // ==== Updated body ====
    bodyHTML = records.map(r => {
      const pic1 = r.assetPic1?.length ? r.assetPic1.map(n => `<li>${n}</li>`).join("") : "—";
      const pic2 = r.assetPic2?.length ? r.assetPic2.map(n => `<li>${n}</li>`).join("") : "—";
      const pic3 = r.assetPic3?.length ? r.assetPic3.map(n => `<li>${n}</li>`).join("") : "—";
      const pic4 = r.assetPic4?.length ? r.assetPic4.map(n => `<li>${n}</li>`).join("") : "—";

      return `
        <tr>
          <td>${r.assetId || ""}</td>
          <td>${pic1}</td>
          <td>${pic2}</td>
          <td>${pic3}</td>
          <td>${pic4}</td>
          <td>${r.synced ? "✅" : "❌"}</td>
        </tr>
      `;
    }).join("");

  } else if (type === "maintenance") {
    // (unchanged maintenance section)
    headHTML = `
      <tr>
        <th>Board ID</th><th>Status ID</th><th>Item ID</th>
        <th>Problem Description</th><th>Work Note</th>
        <th>Observations</th><th>Actions Taken</th>
        <th>Maintenance Photos</th><th>Supporting Documents</th>
        <th>Parts</th><th>Synced?</th>
      </tr>`;

    bodyHTML = records.map(r => {
      const partsHTML = r.parts && r.parts.length > 0
        ? `<table style="border-collapse:collapse; width:100%; font-size:12px;">
            <tr style="background:#eee;">
              <th>Item ID</th><th>Stock</th><th>Qty</th><th>Inventory ID</th>
            </tr>
            ${r.parts.map(p => `
              <tr>
                <td>${p.itemId || ""}</td>
                <td>${p.stockAvailability || ""}</td>
                <td>${p.requiredQuantity || ""}</td>
                <td>${p.inventoryId || ""}</td>
              </tr>
            `).join("")}
          </table>`
        : "—";

      const photosHTML = r.maintenancePhotos?.length
        ? r.maintenancePhotos.map(name => `<li>${name}</li>`).join("")
        : "—";
      const docsHTML = r.supportingDocuments?.length
        ? r.supportingDocuments.map(name => `<li>${name}</li>`).join("")
        : "—";

      return `
        <tr>
          <td>${r.boardID || ""}</td>
          <td>${r.statusID || ""}</td>
          <td>${r.itemID || ""}</td>
          <td>${r.problemDescription || ""}</td>
          <td>${r.workNote || ""}</td>
          <td>${r.observations || ""}</td>
          <td>${r.actionsTaken || ""}</td>
          <td>${photosHTML}</td>
          <td>${docsHTML}</td>
          <td>${partsHTML}</td>
          <td>${r.synced ? "✅" : "❌"}</td>
        </tr>
      `;
    }).join("");
  }

  document.getElementById("tableHead").innerHTML = headHTML;
  document.getElementById("recordsTable").innerHTML =
    bodyHTML || `<tr><td colspan="20">No records found</td></tr>`;
}
