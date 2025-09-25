const dbName = "KissflowDB";
const dbVersion = 2; // bump version if needed
let db;

const refreshBtn = document.getElementById("refreshBtn");
refreshBtn.disabled = true;

// ---------- DB Ready ----------
const dbReady = new Promise((resolve, reject) => {
  const request = indexedDB.open(dbName, dbVersion);

  request.onupgradeneeded = e => {
    db = e.target.result;
    console.log("Upgrading DB to version", db.version);

    if (!db.objectStoreNames.contains("items")) {
      db.createObjectStore("items", { keyPath: "id", autoIncrement: true });
      console.log("Created 'items' store");
    }
    if (!db.objectStoreNames.contains("maintenance")) {
      db.createObjectStore("maintenance", { keyPath: "id", autoIncrement: true });
      console.log("Created 'maintenance' store");
    }
  };

  request.onsuccess = e => {
    db = e.target.result;

    db.onversionchange = () => {
      db.close();
      alert("Database is outdated, please reload the page.");
    };

    refreshBtn.disabled = false;
    resolve(db);
  };

  request.onerror = e => reject(e.target.error);
});

// ---------- Safe DB helper ----------
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

    store.clear(); // clear existing items
    for (const id of ids) store.add({ itemId: id });

    tx.oncomplete = () => resolve();
    tx.onerror = e => reject(e.target.error);
    tx.onabort = e => reject(e.target.error);
  });
}

// ---------- Load from DB ----------
async function loadFromDB() {
  const db = await withDB();
  const tx = db.transaction("items", "readonly");
  const store = tx.objectStore("items");
  const req = store.getAll();

  req.onsuccess = () => {
    const ids = req.result.map(r => r.itemId);
    populateDropdown(ids);
    setStatus(ids.length ? "Loaded cached data" : "No cached data");
  };

  req.onerror = e => {
    console.error("Failed to load from DB", e.target.error);
    setStatus("Error loading cached data");
  };
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
    setStatus("Offline: showing cached data");
  } finally {
    refreshBtn.disabled = false;
    refreshBtn.textContent = "Refresh from API";
  }
}

// ---------- Event listeners ----------
refreshBtn.addEventListener("click", refreshFromAPI);

// Load cached data on startup
loadFromDB();
