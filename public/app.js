const dbName = "KissflowDB";
let db;

const req = indexedDB.open(dbName, 1);
req.onupgradeneeded = e => {
  db = e.target.result;
  db.createObjectStore("items", { keyPath: "id", autoIncrement: true });
};
req.onsuccess = e => {
  db = e.target.result;
  // ✅ Always load cached data first
  loadFromDB();
};

// ---------- Fetch and store (optional refresh) ----------
async function refreshFromAPI() {
  const btn = document.getElementById("refreshBtn");
  btn.disabled = true;
  btn.textContent = "Refreshing…";
  try {
    const res = await fetch("/api/itemids");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const ids = await res.json();

    // Save to IndexedDB
    const tx = db.transaction("items", "readwrite");
    const store = tx.objectStore("items");
    store.clear();
    ids.forEach(id => store.add({ itemId: id }));
    await tx.done;

    populateDropdown(ids);
    setStatus("Online: updated from API");
  } catch (err) {
    console.warn("API fetch failed (offline or error):", err);
    setStatus("Offline: showing cached data");
    // ❗ No need to repopulate, the cached data is already loaded
  } finally {
    btn.disabled = false;
    btn.textContent = "Refresh from API";
  }
}

// ---------- Load from IndexedDB ----------
function loadFromDB() {
  const tx = db.transaction("items", "readonly");
  const store = tx.objectStore("items");
  const req = store.getAll();
  req.onsuccess = () => {
    const ids = req.result.map(r => r.itemId);
    populateDropdown(ids);
    setStatus(ids.length ? "Loaded cached data" : "No cached data");
  };
}

// ---------- UI helpers ----------
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

function setStatus(msg) {
  document.getElementById("status").textContent = msg;
}


// ---------- Refresh button ----------
document.getElementById("refreshBtn").addEventListener("click", refreshFromAPI);

