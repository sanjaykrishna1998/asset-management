// ==========================
// Add & Remove Parts Rows
// ==========================

// This array will hold the item IDs fetched from IndexedDB
let cachedItemIds = [];

// Load item IDs from IndexedDB as soon as DOM is ready
document.addEventListener("DOMContentLoaded", async () => {
  // Open the same DB where your /kissflow-items sync stores data
  const openReq = indexedDB.open("KissflowDB", 1);
  openReq.onsuccess = (e) => {
    const idb = e.target.result;
    const tx = idb.transaction("items", "readonly");
    const store = tx.objectStore("items");
    const getAll = store.getAll();

    getAll.onsuccess = () => {
      // each record is { itemId: "…" }
      cachedItemIds = getAll.result.map(r => r.itemId);
      // Make sure at least one row exists *after* we have the item list
      if (document.getElementById("partsBody").children.length === 0) addRow();
    };
  };
});

// Create a <tr> with a dropdown built from cachedItemIds
function addRow() {
  const tbody = document.getElementById("partsBody");

  // Build the <option> list from cachedItemIds
  const options = cachedItemIds.length
    ? cachedItemIds.map(id => `<option value="${id}">${id}</option>`).join("")
    : "<option value=''>-- No items yet --</option>";

  const newRow = document.createElement("tr");
  newRow.innerHTML = `
    <td style="border:1px solid #ccc; text-align:center;">
      <input type="checkbox">
    </td>
    <td style="border:1px solid #ccc;">
      <select>
        <option value="">-- Select Item --</option>
        ${options}
      </select>
    </td>
    <td style="border:1px solid #ccc;"><input type="number" placeholder="Stock"></td>
    <td style="border:1px solid #ccc;"><input type="number" placeholder="Qty"></td>
    <td style="border:1px solid #ccc;"><input type="text" placeholder="Inventory ID"></td>
  `;
  tbody.appendChild(newRow);
}

function removeSelectedRows() {
  const tableBody = document.getElementById("partsBody");
  const checkboxes = tableBody.querySelectorAll("input[type='checkbox']:checked");

  if (checkboxes.length === 0) {
    alert("Please select at least one row to remove.");
    return;
  }

  checkboxes.forEach(cb => cb.closest("tr").remove());

  // Ensure at least one row remains
  if (tableBody.rows.length === 0) {
    addRow();
  }
}

// ==========================
// Handle Maintenance Form Save
// ==========================
document.addEventListener("DOMContentLoaded", function () {
  const maintenanceForm = document.getElementById("maintenanceForm");

  maintenanceForm.addEventListener("submit", function (e) {
    e.preventDefault();

    // Store files in memory for sync
    const photoFiles = Array.from(document.getElementById("maintenancePhotos").files);
    const docFiles = Array.from(document.getElementById("supportingDocs").files);

    // Build task object
    const task = {
      boardID: document.getElementById("boardID").value,
      statusID: document.getElementById("statusID").value,
      itemID: document.getElementById("itemID").value,
      problemDescription: document.getElementById("problemDescription").value,
      workNote: document.getElementById("workNote").value,
      observations: document.getElementById("observations").value,
      actionsTaken: document.getElementById("actionsTaken").value,
      parts: [],
      synced: false,
      maintenancePhotos: photoFiles.map(f => f.name),
      supportingDocuments: docFiles.map(f => f.name),

      // Store actual file objects for later upload
      _files: {
        photos: Object.fromEntries(photoFiles.map(f => [f.name, f])),
        docs: Object.fromEntries(docFiles.map(f => [f.name, f]))
      }
    };

    // Collect parts table rows
    document.querySelectorAll("#partsBody tr").forEach(row => {
      const itemId = row.querySelector("select")?.value || "";
      const stock = row.querySelector("input[placeholder='Stock']")?.value || "";
      const qty   = row.querySelector("input[placeholder='Qty']")?.value || "";
      const invId = row.querySelector("input[placeholder='Inventory ID']")?.value || "";

      if (itemId || qty || stock || invId) {
        task.parts.push({
          itemId,
          stockAvailability: stock,
          requiredQuantity: qty,
          inventoryId: invId
        });
      }
    });

    // Save task into IndexedDB
    const tx = db.transaction("maintenance", "readwrite");
    tx.objectStore("maintenance").add(task);
    tx.oncomplete = () => {
      document.getElementById("msg").innerText = "✅ Maintenance task saved offline!";
      loadRecords?.(); // call if defined elsewhere
    };

    // Reset form and parts table
    this.reset();
    const tbody = document.getElementById("partsBody");
    tbody.innerHTML = "";
    addRow();
  });
});
