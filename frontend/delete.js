function deleteAll() {
  if (!confirm(`⚠️ Delete all ${currentType} records?`)) return;
  const tx = db.transaction(currentType, "readwrite");
  tx.objectStore(currentType).clear().onsuccess = () => {
    alert(`🗑️ All ${currentType} records deleted!`);
    loadRecords();
  };
}
