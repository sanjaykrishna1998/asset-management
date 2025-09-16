document.addEventListener("DOMContentLoaded", function () {
  const assetForm = document.getElementById("assetForm");

  assetForm.addEventListener("submit", function (e) {
    e.preventDefault();

    const assetId = document.getElementById("assetId").value;
    const pic1Files = Array.from(document.getElementById("assetPic1").files);
    const pic2Files = Array.from(document.getElementById("assetPic2").files);
    const pic3Files = Array.from(document.getElementById("assetPic3").files);
    const pic4Files = Array.from(document.getElementById("assetPic4").files);

    // Build asset object with separate fields
    const asset = {
      assetId,
      synced: false,

      // store just file names for quick reference
      assetPic1: pic1Files.map(f => f.name),
      assetPic2: pic2Files.map(f => f.name),
      assetPic3: pic3Files.map(f => f.name),
      assetPic4: pic4Files.map(f => f.name),

      // store actual File objects for later upload
      _files: {
        assetPic1: Object.fromEntries(pic1Files.map(f => [f.name, f])),
        assetPic2: Object.fromEntries(pic2Files.map(f => [f.name, f])),
        assetPic3: Object.fromEntries(pic3Files.map(f => [f.name, f])),
        assetPic4: Object.fromEntries(pic4Files.map(f => [f.name, f]))
      }
    };

    // Save to IndexedDB
    const tx = db.transaction("assets", "readwrite");
    tx.objectStore("assets").add(asset);
    tx.oncomplete = () => {
      document.getElementById("msg").innerText = "✅ Asset saved offline!";     
      assetForm.reset();
    };

    tx.onerror = (err) => {
      console.error("IndexedDB add error:", err);
      alert("Failed to save asset. Check console.");
    };
  });
});
