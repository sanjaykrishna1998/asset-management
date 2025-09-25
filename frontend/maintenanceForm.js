let cachedItemIds = [];

// ---------- DB Ready helper ----------
const dbName = "KissflowDB";
let db;

const dbReady = new Promise((resolve, reject) => {
  const request = indexedDB.open(dbName, 2);

  request.onupgradeneeded = e => {
    db = e.target.result;
    if (!db.objectStoreNames.contains("items")) {
      db.createObjectStore("items", { keyPath: "id", autoIncrement: true });
    }
    if (!db.objectStoreNames.contains("maintenance")) {
      db.createObjectStore("maintenance", { keyPath: "id", autoIncrement: true });
    }
  };

  request.onsuccess = e => {
    db = e.target.result;
    resolve(db);
  };

  request.onerror = e => reject(e.target.error);
});

async function withDB() {
  if (db) return db;
  return await dbReady;
}

// ---------- Load cached item IDs ----------
async function loadCachedItems() {
  const db = await withDB();
  const tx = db.transaction("items", "readonly");
  const store = tx.objectStore("items");
  const req = store.getAll();

  req.onsuccess = () => {
    cachedItemIds = req.result.map(r => r.itemId);
    if (document.getElementById("partsBody").children.length === 0) addRow();
  };

  req.onerror = e => {
    console.error("Failed to load cached items:", e.target.error);
    cachedItemIds = [];
  };
}

// ---------- Add row ----------
function addRow() {
  const tbody = document.getElementById("partsBody");
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
    <td style="border:1px solid #ccc;"><input type="number" placeholder="Qty"></td>
  `;
  tbody.appendChild(newRow);
}

// ---------- Remove selected rows ----------
function removeSelectedRows() {
  const tableBody = document.getElementById("partsBody");
  const checkboxes = tableBody.querySelectorAll("input[type='checkbox']:checked");

  if (checkboxes.length === 0) {
    alert("Please select at least one row to remove.");
    return;
  }

  checkboxes.forEach(cb => cb.closest("tr").remove());

  if (tableBody.rows.length === 0) addRow();
}

// ---------- Save maintenance task ----------
async function saveMaintenanceTask(event) {
  event.preventDefault();
  const db = await withDB();

  const photoFiles = Array.from(document.getElementById("maintenancePhotos").files);
  const docFiles = Array.from(document.getElementById("supportingDocs").files);

  const task = {
    boardID: document.getElementById("boardID").value,
    statusID: document.getElementById("statusID").value,
    usersEmail: document.getElementById("usersEmail").value,
    workNote: document.getElementById("workNote").value,
    observations: document.getElementById("observations").value,
    actionsTaken: document.getElementById("actionsTaken").value,
    parts: [],
    synced: false,
    maintenancePhotos: photoFiles.map(f => f.name),
    supportingDocuments: docFiles.map(f => f.name),
    _files: {
      photos: Object.fromEntries(photoFiles.map(f => [f.name, f])),
      docs: Object.fromEntries(docFiles.map(f => [f.name, f])),
    },
  };

  document.querySelectorAll("#partsBody tr").forEach(row => {
    const itemId = row.querySelector("select")?.value || "";
    const qty = row.querySelector("input[placeholder='Qty']")?.value || "";
    if (itemId || qty) task.parts.push({ itemId, requiredQuantity: qty });
  });

  const tx = db.transaction("maintenance", "readwrite");
  tx.objectStore("maintenance").add(task);
  tx.oncomplete = () => {
    document.getElementById("msg").innerText = "✅ Maintenance task saved offline!";
    loadRecords?.();
  };
  tx.onerror = e => console.error("Failed to save task:", e.target.error);

  event.target.reset();
  document.getElementById("partsBody").innerHTML = "";
  addRow();
}

// ---------- Init ----------
document.addEventListener("DOMContentLoaded", async () => {
  await loadCachedItems();

  if (document.getElementById("partsBody").children.length === 0) addRow();

  document.getElementById("maintenanceForm")
    .addEventListener("submit", saveMaintenanceTask);

  document.getElementById("removeRowBtn")
    ?.addEventListener("click", removeSelectedRows);
});
