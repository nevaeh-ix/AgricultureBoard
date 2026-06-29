// Sprint 3 beginning
const express = require("express");
const path = require("path");
const { PrismaClient } = require("@prisma/client");

const app = express();
const PORT = 3000;
const prisma = new PrismaClient();

// This lets my server read JSON data
app.use(express.json());

// This shows the requests in the terminal
app.use(function (req, res, next) {
  console.log(req.method, req.url);
  next();
});

// This serves my HTML, CSS, and JS files
app.use(express.static(path.join(__dirname)));

// Sends all of my crops from the database to the browser
app.get("/api/crops", async function (req, res) {
  try {
    const crops = await prisma.crop.findMany({
      orderBy: {
        id: "asc"
      }
    });

    res.json(crops);
  } catch (error) {
    res.status(500).json({
      message: "Could not get crops"
    });
  }
});

// Adds a new crop to the database
app.post("/api/crops", async function (req, res) {
  try {
    const crop = req.body;

    if (!crop.name || !crop.plantDate || !crop.harvestDate || !crop.yield) {
      return res.status(400).json({
        message: "Missing crop information"
      });
    }

    const newCrop = await prisma.crop.create({
      data: {
        name: crop.name,
        plantDate: crop.plantDate,
        harvestDate: crop.harvestDate,
        yield: crop.yield
      }
    });

    res.status(201).json({
      message: "Crop added successfully",
      crop: newCrop
    });
  } catch (error) {
    res.status(500).json({
      message: "Could not add crop"
    });
  }
});

// Updates a crop if I need to change any information later.
app.put("/api/crops/:id", async function (req, res) {
  try {
    const id = Number(req.params.id);
    const crop = req.body;

    const updatedCrop = await prisma.crop.update({
      where: {
        id: id
      },
      data: {
        name: crop.name,
        plantDate: crop.plantDate,
        harvestDate: crop.harvestDate,
        yield: crop.yield
      }
    });

    res.json({
      message: "Crop updated successfully",
      crop: updatedCrop
    });
  } catch (error) {
    res.status(404).json({
      message: "Crop not found"
    });
  }
});

// Removes a crop from the database
app.delete("/api/crops/:id", async function (req, res) {
  try {
    const id = Number(req.params.id);

    await prisma.crop.delete({
      where: {
        id: id
      }
    });

    res.json({
      message: "Crop deleted successfully"
    });
  } catch (error) {
    res.status(404).json({
      message: "Crop not found"
    });
  }
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