"use client";

import { useEffect, useState } from "react";


// Stores the information for each crop
type Crop = {
  id: number;
  name: string;
  plantDate: string;
  harvestDate: string;
  yield: string;
};


// Displays all crops from the database
export default function CropList() {

  const [crops, setCrops] = useState<Crop[]>([]);


  // Gets crops when the page loads
  useEffect(() => {

    async function getCrops() {

      const response = await fetch("/api/crops");

      const data = await response.json();

      // Makes sure I only save crop data when the API returns a list
      if (Array.isArray(data)) {

        setCrops(data);

      }

    }


    getCrops();

  }, []);



  return (
    <div>

      <h2>Crops</h2>


      {crops.map((crop) => (

        <div key={crop.id}>

          <p>Name: {crop.name}</p>

          <p>Plant Date: {crop.plantDate}</p>

          <p>Harvest Date: {crop.harvestDate}</p>

          <p>Yield: {crop.yield}</p>

        </div>

      ))}


    </div>
  );

}