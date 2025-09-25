function toggleMenu() {
  document.getElementById("menu").classList.toggle("open");
}

function showForm(type) {
  const assetSection = document.getElementById("assetSection");
  const maintenanceSection = document.getElementById("maintenanceSection");

  if (type === "asset") {
    assetSection.style.display = "block";
    maintenanceSection.style.display = "none";
  } else if (type === "maintenance") {
    assetSection.style.display = "none";
    maintenanceSection.style.display = "block";
  }

  // close menu after clicking a link
  document.getElementById("menu").classList.remove("open");
}


