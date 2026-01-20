// IndexedDB setup
const dbName = "KissflowDB";
let db;

const request = indexedDB.open(dbName, 2);
request.onupgradeneeded = e => {
  db = e.target.result;

  if (!db.objectStoreNames.contains("items")) {
    db.createObjectStore("items", {
      keyPath: "id",
      autoIncrement: true
    });
  }
};
request.onsuccess = e => {
  db = e.target.result;
  // Load any existing data on page load
  loadFromDB();
};

async function fetchItemIds() {
  const btn = document.getElementById("refreshBtn");
  btn.disabled = true;
  btn.textContent = "Fetching…";
  try {
    const res = await fetch("/api/itemids");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const ids = await res.json();

    const tx = db.transaction("items", "readwrite");
    const store = tx.objectStore("items");
    store.clear();
    ids.forEach(id => store.add({ itemId: id }));
    await tx.done;

    display(ids);
  } catch (err) {
    console.error("Fetch/store error:", err);
    alert("Failed to fetch data. See console for details.");
  } finally {
    btn.disabled = false;
    btn.textContent = "Fetch Item_ID_1";
  }
}

function loadFromDB() {
  const tx = db.transaction("items", "readonly");
  const store = tx.objectStore("items");
  const req = store.getAll();
  req.onsuccess = () => {
    const ids = req.result.map(r => r.itemId);
    display(ids);
  };
}

function display(ids) {
  const list = document.getElementById("itemList");
  list.innerHTML = ids.length
    ? ids.map(id => `<li>${id}</li>`).join("")
    : "<li>No data yet. Click Fetch Item_ID_1.</li>";
}

document.getElementById("refreshBtn")
        .addEventListener("click", fetchItemIds);


