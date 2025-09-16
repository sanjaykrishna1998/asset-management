function toggleMenu() {
  document.getElementById("menu").classList.toggle("open");
}
function showForm(type) {
  document.getElementById("assetForm").style.display = type === "asset" ? "grid" : "none";
  document.getElementById("maintenanceForm").style.display = type === "maintenance" ? "grid" : "none";
  document.getElementById("msg").innerText = "";
  toggleMenu();
}
