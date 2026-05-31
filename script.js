const cropForm = document.getElementById("cropForm");
const cropList = document.getElementById("cropList");
const alerts = document.getElementById("alerts");

// This holds all of my crop records.
// If I already saved some before, it pulls them back from localStorage.
let crops = JSON.parse(localStorage.getItem("crops")) || [];

// Saves everything so my data does not disappear when I refresh the page.
function saveCrops() {
  localStorage.setItem("crops", JSON.stringify(crops));
}

// Shows all of my saved crops on the page.
function renderCrops() {
  cropList.innerHTML = "";

  if (crops.length === 0) {
    cropList.innerHTML = "<p>I haven't logged any crops yet.</p>";
    return;
  }

  crops.forEach(function (crop, index) {
    const cropItem = document.createElement("article");
    cropItem.className = "crop-item";

    cropItem.innerHTML = `
      <h3>${crop.name}</h3>
      <p><strong>Plant Date:</strong> ${crop.plantDate}</p>
      <p><strong>Expected Harvest:</strong> ${crop.harvestDate}</p>
      <p><strong>Yield:</strong> ${crop.yield} lbs</p>
      <button onclick="deleteCrop(${index})">Delete Crop</button>
    `;

    cropList.appendChild(cropItem);
  });
}

// This is a simple fake weather alert for now.
// Later, this can connect to a real weather API.
function renderAlerts() {
  alerts.innerHTML = "";

  const today = new Date();
  const month = today.getMonth() + 1;

  if (month <= 3 || month >= 11) {
    alerts.innerHTML = `
      <div class="alert-warning">
        🥶 This is a frost warning! I should probably take care of my plants tonight.
      </div>
    `;
  } else {
    alerts.innerHTML = `
      <div class="alert-warning">
        ☀️  Dry alert! It's a pretty hot day outside, let me make sure I water all my plants.
      </div>
    `;
  }
}

// Removes a crop when I click the delete button.
function deleteCrop(index) {
  crops.splice(index, 1);
  saveCrops();
  renderCrops();
}

// When I submit the form, this grabs the values and adds them to my list.
cropForm.addEventListener("submit", function (event) {
  event.preventDefault();

  const crop = {
    name: document.getElementById("cropName").value,
    plantDate: document.getElementById("plantDate").value,
    harvestDate: document.getElementById("harvestDate").value,
    yield: document.getElementById("yieldAmount").value
  };

  crops.push(crop);
  saveCrops();
  renderCrops();
  cropForm.reset();
});

// Runs when the page first opens.
renderCrops();
renderAlerts();