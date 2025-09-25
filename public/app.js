const dbName = "KissflowDB";
let db;

// ---------- IndexedDB setup ----------
const dbReady = new Promise((resolve, reject) => {
  const req = indexedDB.open(dbName, 1);

  req.onupgradeneeded = e => {
    db = e.target.result;

    // Create stores if not exist
    if (!db.objectStoreNames.contains("items")) {
      db.createObjectStore("items", { keyPath: "id", autoIncrement: true });
    }
    if (!db.objectStoreNames.contains("maintenance")) {
      db.createObjectStore("maintenance", { keyPath: "id", autoIncrement: true });
    }
  };

  req.onsuccess = e => {
    db = e.target.result;
    resolve();
  };

  req.onerror = e => reject(e.target.error);
});

// ---------- Elements ----------
const refreshBtn = document.getElementById("refreshBtn");
refreshBtn.disabled = true;

// ---------- Wait for DB ready ----------
dbReady
  .then(() => {
    // Only call loadFromDB AFTER db is fully ready
    loadFromDB();
    refreshBtn.disabled = false;
  })
  .catch(err => console.error("Failed to open DB:", err));

// ---------- Save Item IDs ----------
function saveItemsToDB(ids) {
  return new Promise((resolve, reject) => {
    if (!db) return reject(new Error("DB not initialized"));
    const tx = db.transaction("items", "readwrite");
    const store = tx.objectStore("items");

    store.clear();
    ids.forEach(id => store.add({ itemId: id }));

    tx.oncomplete = () => resolve();
    tx.onerror = e => reject(e.target.error);
    tx.onabort = e => reject(e.target.error);
  });
}

// ---------- Load cached items ----------
function loadFromDB() {
  if (!db) return; // safety check
  if (!db.objectStoreNames.contains("items")) {
    console.warn("Items store not found in DB yet.");
    return;
  }

  const tx = db.transaction("items", "readonly");
  const store = tx.objectStore("items");
  const req = store.getAll();

  req.onsuccess = () => {
    const ids = req.result.map(r => r.itemId);
    populateDropdown(ids);
    setStatus(ids.length ? "Loaded cached data" : "No cached data");
  };

  req.onerror = e => {
    console.error("Failed to load from IndexedDB", e.target.error);
    setStatus("Error loading cached data");
  };
}

// ---------- Refresh from API ----------
async function refreshFromAPI() {
  refreshBtn.disabled = true;
  refreshBtn.textContent = "Refreshing…";

  try {
    const res = await fetch("/api/itemids");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const ids = await res.json();

    await saveItemsToDB(ids);
    populateDropdown(ids);
    setStatus("Online: updated from API");
  } catch (err) {
    console.warn("API fetch failed:", err);
    await loadFromDB();
    setStatus("Offline: showing cached data");
  } finally {
    refreshBtn.disabled = false;
    refreshBtn.textContent = "Refresh from API";
  }
}

// ---------- Populate dropdown ----------
function populateDropdown(ids) {
  const select = document.getElementById("itemSelect");
  select.innerHTML = "";

  if (ids.length) {
    select.append(new Option("-- Select Item --", ""));
    ids.forEach(id => select.append(new Option(id, id)));
  } else {
    select.append(new Option("No data available", ""));
  }
}

// ---------- Update status ----------
function setStatus(msg) {
  const statusEl = document.getElementById("status");
  if (statusEl) statusEl.textContent = msg;
}

// ---------- Event listeners ----------
refreshBtn.addEventListener("click", refreshFromAPI);
