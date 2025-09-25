const dbName = "KissflowDB";
let db;

// ---------- IndexedDB setup ----------
const dbReady = new Promise((resolve, reject) => {
  const req = indexedDB.open(dbName, 1);

  req.onupgradeneeded = e => {
    db = e.target.result;
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
dbReady.then(() => {
  loadFromDB();
  refreshBtn.disabled = false;
}).catch(err => console.error("Failed to open DB:", err));

// ---------- Fetch from API & store ----------
async function refreshFromAPI() {
  await dbReady;

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
    console.warn("API fetch failed (offline or error):", err);
    setStatus("Offline: showing cached data");
    await loadFromDB();
  } finally {
    refreshBtn.disabled = false;
    refreshBtn.textContent = "Refresh from API";
  }
}

// ---------- Save Item IDs ----------
function saveItemsToDB(ids) {
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

// ---------- Load cached items ----------
function loadFromDB() {
  return new Promise((resolve, reject) => {
    const tx = db.transaction("items", "readonly");
    const store = tx.objectStore("items");
    const req = store.getAll();

    req.onsuccess = () => {
      const ids = req.result.map(r => r.itemId);
      populateDropdown(ids);
      resolve(ids);
    };

    req.onerror = e => reject(e.target.error);
  });
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
