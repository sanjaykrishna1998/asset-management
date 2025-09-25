const DB_NAME = "KissflowDB";
const DB_VERSION = 3;           // bump version if schema changes
const STORE_NAME = "items";

let db; // will hold database connection

// Open the database
const request = indexedDB.open(DB_NAME, DB_VERSION);

request.onupgradeneeded = e => {
  const upgradeDb = e.target.result;
  if (!upgradeDb.objectStoreNames.contains(STORE_NAME)) {
    upgradeDb.createObjectStore(STORE_NAME, { keyPath: "id", autoIncrement: true });
  }
};

request.onsuccess = e => {
  db = e.target.result;
  console.log("✅ DB opened:", DB_NAME);

  // Enable the button and attach listener only when DB is ready
  const btn = document.getElementById("refreshBtn");
  btn.disabled = false;
  btn.addEventListener("click", fetchItemIds);

  // Load existing data
  loadFromDB();
};

request.onerror = e => {
  console.error("❌ DB open error:", e.target.error);
};

async function fetchItemIds() {
  // db is guaranteed to exist because we add the listener only after onsuccess
  const btn = document.getElementById("refreshBtn");
  btn.disabled = true;
  btn.textContent = "Fetching…";

  try {
    // Replace with your actual endpoint
    const res = await fetch("/api/itemids");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const ids = await res.json(); // expects e.g. ["Item_ID_1", "Item_ID_2"]

    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    store.clear();
    ids.forEach(id => store.add({ itemId: id }));
    tx.oncomplete = () => {
      console.log("✅ Data stored in IndexedDB");
      display(ids);
    };
    tx.onerror = e => console.error("Transaction error:", e.target.error);

  } catch (err) {
    console.error("Fetch/store error:", err);
    alert("Failed to fetch data. See console for details.");
  } finally {
    btn.disabled = false;
    btn.textContent = "Fetch Item_ID_1";
  }
}

function loadFromDB() {
  const tx = db.transaction(STORE_NAME, "readonly");
  const store = tx.objectStore(STORE_NAME);
  const req = store.getAll();
  req.onsuccess = () => {
    const ids = req.result.map(r => r.itemId);
    display(ids);
  };
  req.onerror = e => console.error("Load error:", e.target.error);
}

function display(ids) {
  const list = document.getElementById("itemList");
  list.innerHTML = ids.length
    ? ids.map(id => `<li>${id}</li>`).join("")
    : "<li>No data yet. Click Fetch Item_ID_1.</li>";
}
