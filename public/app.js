const dbName = "KissflowDB";
let db;

const refreshBtn = document.getElementById("refreshBtn");
refreshBtn.disabled = true; // disabled until DB is ready

// ---------- Open IndexedDB ----------
const req = indexedDB.open(dbName, 1);

req.onupgradeneeded = e => {
  db = e.target.result;
  if (!db.objectStoreNames.contains("items")) {
    db.createObjectStore("items", { keyPath: "id", autoIncrement: true });
  }
};

req.onsuccess = e => {
  db = e.target.result;
  loadFromDB();
  refreshBtn.disabled = false; // enable only when db is ready
};

req.onerror = e => {
  console.error("Failed to open IndexedDB:", e.target.error);
};

// ---------- Save items to IndexedDB ----------
function saveItemsToDB(ids) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction("items", "readwrite");
    const store = tx.objectStore("items");

    store.clear(); // clear existing items

    for (const id of ids) {
      store.add({ itemId: id });
    }

    tx.oncomplete = () => resolve();
    tx.onerror = e => reject(e.target.error);
    tx.onabort = e => reject(e.target.error);
  });
}

// ---------- Refresh from API ----------
async function refreshFromAPI() {
  refreshBtn.disabled = true;
  refreshBtn.textContent = "Refreshing…";

  try {
    const res = await fetch("/api/itemids");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const ids = await res.json();

    await saveItemsToDB(ids); // ✅ wait until data is stored

    populateDropdown(ids);
    setStatus("Online: updated from API");
  } catch (err) {
    console.warn("API fetch failed (offline or error):", err);
    setStatus("Offline: showing cached data");
  } finally {
    refreshBtn.disabled = false;
    refreshBtn.textContent = "Refresh from API";
  }
}

// ---------- Load data from IndexedDB ----------
function loadFromDB() {
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
