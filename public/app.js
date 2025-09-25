const dbName = "KissflowDB";
let db;

const refreshBtn = document.getElementById("refreshBtn");
refreshBtn.disabled = true; // disabled until DB ready

const req = indexedDB.open(dbName, 1);
req.onupgradeneeded = e => {
  db = e.target.result;
  db.createObjectStore("items", { keyPath: "id", autoIncrement: true });
};
req.onsuccess = e => {
  db = e.target.result;
  loadFromDB();
  refreshBtn.disabled = false; // ✅ enable only when db is ready
};

async function refreshFromAPI() {
  refreshBtn.disabled = true;
  refreshBtn.textContent = "Refreshing…";
  try {
    const res = await fetch("/api/itemids");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const ids = await res.json();

    const tx = db.transaction("items", "readwrite");
    const store = tx.objectStore("items");
    store.clear();
    ids.forEach(id => store.add({ itemId: id }));
    await tx.complete;

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
  const statusEl = document.getElementById("status");
  if (statusEl) statusEl.textContent = msg;
}

refreshBtn.addEventListener("click", refreshFromAPI);
