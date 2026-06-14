const express = require("express");
const path = require("path");

const app = express();
const PORT = 3000;

// This lets my server read JSON data
app.use(express.json());

// This shows the requests in the terminal
app.use(function (req, res, next) {
  console.log(req.method, req.url);
  next();
});

// This serves my HTML, CSS, and JS files
app.use(express.static(path.join(__dirname)));

// This holds my crop records on the server
let crops = [];

// Sends all of my crops to the browser
app.get("/api/crops", function (req, res) {
  res.json(crops);
});

// Adds a new crop to the server
app.post("/api/crops", function (req, res) {
  const crop = req.body;

  if (!crop.name || !crop.plantDate || !crop.harvestDate || !crop.yield) {
    return res.status(400).json({
      message: "Missing crop information"
    });
  }

  crops.push(crop);

  res.status(201).json({
    message: "Crop added successfully",
    crop: crop
  });
});

// Removes a crop from the server
app.delete("/api/crops/:index", function (req, res) {
  const index = Number(req.params.index);

  if (index < 0 || index >= crops.length) {
    return res.status(404).json({
      message: "Crop not found"
    });
  }

  crops.splice(index, 1);

  res.json({
    message: "Crop deleted successfully"
  });
});

// Handles pages or routes that do not exist
app.use(function (req, res) {
  res.status(404).json({
    message: "Page not found"
  });
});

// Starts my server
app.listen(PORT, function () {
  console.log("Server running on port " + PORT);
});