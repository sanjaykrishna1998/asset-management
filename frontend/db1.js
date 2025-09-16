let db, currentType = "assets";
const request = indexedDB.open("AssetDB", 2);

request.onupgradeneeded = (e) => {
  db = e.target.result;
  if (!db.objectStoreNames.contains("assets")) {
    db.createObjectStore("assets", { keyPath: "id", autoIncrement: true });
  }
  if (!db.objectStoreNames.contains("maintenance")) {
    db.createObjectStore("maintenance", { keyPath: "id", autoIncrement: true });
  }
};
request.onsuccess = (e) => { db = e.target.result; loadRecords(); };
