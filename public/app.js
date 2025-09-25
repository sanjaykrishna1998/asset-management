const dbName = "KissflowDB";
let db;
const refreshBtn = document.getElementById("refreshBtn");
refreshBtn.disabled = true;

// ---------- DB Ready Promise ----------
const dbReady = new Promise((resolve, reject) => {
  const request = indexedDB.open(dbName, 1);

  request.onupgradeneeded = e => {
    db = e.target.result;

    // Ensure stores exist
    if (!db.objectStoreNames.contains("items")) {
      db.createObjectStore("items", { keyPath: "id", autoIncrement: true });
    }
    if (!db.objectStoreNames.contains("maintenance")) {
      db.createObjectStore("maintenance", { keyPath: "id", autoIncrement: true });
    }
  };

  request.onsuccess = e => {
    db = e.target.result;

    // Check again that store exists
    if (!db.objectStoreNames.contains("items")) {
      reject(new Error("Items store not found after DB open"));
      return;
    }

    resolve(db);
  };

  request.onerror = e => reject(e.target.error);
});

// ---------- Safe helper: wait for DB ----------
async function withDB() {
  if (db) return db;
  return await dbReady;
}

// ---------- Save items to IndexedDB ----------
async function saveItemsToDB(ids) {
  const db = await withDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("items", "readwrite");
    const store = tx.objectStore("items");

    store.clear();
    ids.forEach(id => store.add({ itemId: id }));

    tx.oncomplete = () => resolve();
    tx.onerror = e => reject(e.target.error);
    tx.onabort = e => reject(e.target.error);
  });
}

// ---------- Load items from IndexedDB ----------
async function loadFromDB() {
  const db = await withDB();

  if (!db.objectStoreNames.contains("items")) {
    console.warn("Items store not found in DB yet.");
    return;
  }

  const tx = db.transaction("items", "readonly");
  const store = tx.objectStore("items");
  const request = store.getAll();

  request.onsuccess = () => {
    const ids = request.result.map(r => r.itemId);
    populateDropdown(ids);
    setStatus(ids.length ? "Loaded cached data" : "No cached data");
  };

  request.onerror = e => {
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

// ---------- Status ----------
function setStatus(msg) {
  const statusEl = document.getElementById("status");
  if (statusEl) statusEl.textContent = msg;
}

// ---------- Event listener ----------
refreshBtn.addEventListener("click", refreshFromAPI);

// ---------- Init ----------
dbReady
  .then(() => loadFromDB())
  .catch(err => console.error("Failed to initialize DB:", err));
