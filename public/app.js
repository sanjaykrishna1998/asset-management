// ----------------------
// IndexedDB Setup
// ----------------------
const DB_NAME = "KissflowDB";
const DB_VERSION = 2;           // bump version to force upgrade if schema changes
const STORE_NAME = "items";

let db;

// Open DB
const request = indexedDB.open(DB_NAME, DB_VERSION);

request.onupgradeneeded = e => {
  const upgradeDb = e.target.result;
  // Create store if it doesn’t exist
  if (!upgradeDb.objectStoreNames.contains(STORE_NAME)) {
    upgradeDb.createObjectStore(STORE_NAME, { keyPath: "id", autoIncrement: true });
  }
};

request.onsuccess = e => {
  db = e.target.result;
  console.log("✅ DB opened:", DB_NAME);
  loadFromDB();
};

request.onerror = e => {
  console.error("❌ DB open error:", e.target.error);
};

// ----------------------
// Fetch from server and store
// ----------------------
async function fetchItemIds() {
  const btn = document.getElementById("refreshBtn");
  btn.disabled = true;
  btn.textContent = "Fetching…";

  try {
    // Example: adjust to your own endpoint that returns e.g. ["Item_ID_1", "Item_ID_1"]
    const res = await fetch("/api/itemids");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const ids = await res.json(); // expects an array of strings

    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    store.clear();                        // clear old data
    ids.forEach(id => store.add({ itemId: id }));
    await tx.done;                         // wait until transaction complete

    display(ids);
  } catch (err) {
    console.error("Fetch/store error:", err);
    alert("Failed to fetch data. Check console for details.");
  } finally {
    btn.disabled = false;
    btn.textContent = "Fetch Item_ID_1";
  }
}

// ----------------------
// Load from IndexedDB on page load
// ----------------------
function loadFromDB() {
  if (!db) return;
  const tx = db.transaction(STORE_NAME, "readonly");
  const store = tx.objectStore(STORE_NAME);
  const req = store.getAll();
  req.onsuccess = () => {
    const ids = req.result.map(r => r.itemId);
    display(ids);
  };
  req.onerror = e => console.error("Load error:", e.target.error);
}

// ----------------------
// Display helper
// ----------------------
function display(ids) {
  const list = document.getElementById("itemList");
  list.innerHTML = ids.length
    ? ids.map(id => `<li>${id}</li>`).join("")
    : "<li>No data yet. Click Fetch Item_ID_1.</li>";
}

// Button listener
document.getElementById("refreshBtn").addEventListener("click", fetchItemIds);
