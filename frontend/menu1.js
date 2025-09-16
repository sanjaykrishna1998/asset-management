function toggleMenu() {
  document.getElementById("menu").classList.toggle("open");
}
function switchView(type) {
  currentType = type;
  document.getElementById("title").innerText = type === "assets" ? "📦 Assets" : "🛠 Maintenance";
  loadRecords();
  toggleMenu();
}
