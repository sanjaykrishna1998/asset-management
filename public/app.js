
const dbName = "KissflowDB";
let db;

const request = indexedDB.open(dbName, 1);

request.onupgradeneeded = e => {
  db = e.target.result;
  // keyPath is the property we will actually store: itemId
  if (!db.objectStoreNames.contains("items")) {
    db.createObjectStore("items", { keyPath: "itemId" });
  }
};

request.onsuccess = e => {
  db = e.target.result;
  loadFromDB();  // Load any cached data on page load
};

// ========================
// Fetch from API & store
// ========================
async function fetchItemIds() {
  const btn = document.getElementById("refreshBtn");
  btn.disabled = true;
  btn.textContent = "Fetching…";

  try {
    const res = await fetch("/api/itemids"); // must return JSON array
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const ids = await res.json();  // e.g. ["Item_ID_1", "Item_ID_1", ...]

    // Filter only Item_ID_1 if API sends more
    const filtered = ids.filter(x => x === "Item_ID_1");

    const tx = db.transaction("items", "readwrite");
    const store = tx.objectStore("items");
    store.clear();
    filtered.forEach(itemId => store.put({ itemId }));  // keyPath matches

    tx.oncomplete = () => display(filtered);
    tx.onerror = e => console.error("TX error", e.target.error);
  } catch (err) {
    console.error("Fetch/store error:", err);
    alert("Failed to fetch data. See console for details.");
  } finally {
    btn.disabled = false;
    btn.textContent = "Fetch Item_ID_1";
  }
}

// ========================
// Load from IndexedDB
// ========================
function loadFromDB() {
  const tx = db.transaction("items", "readonly");
  const store = tx.objectStore("items");
  const req = store.getAll();
  req.onsuccess = () => {
    const ids = req.result.map(r => r.itemId);
    display(ids);
  };
}

// ========================
// Render list
// ========================
function display(ids) {
  const list = document.getElementById("itemList");
  list.innerHTML = ids.length
    ? ids.map(id => `<li>${id}</li>`).join("")
    : "<li>No data yet. Click Fetch Item_ID_1.</li>";
}

// Button listener
document.getElementById("refreshBtn").addEventListener("click", fetchItemIds);


