"use client";

import { useState } from "react";


// Creates a form to add new crops
export default function CropForm() {


  const [name, setName] = useState("");

  const [plantDate, setPlantDate] = useState("");

  const [harvestDate, setHarvestDate] = useState("");

  const [yieldAmount, setYieldAmount] = useState("");



  // Sends crop information to the database
  async function addCrop() {


    await fetch("/api/crops", {

      method: "POST",

      headers: {

        "Content-Type": "application/json"

      },


      body: JSON.stringify({

        name: name,

        plantDate: plantDate,

        harvestDate: harvestDate,

        yield: yieldAmount

      })

    });



    // Refreshes the page to show the new crop
    window.location.reload();


  }



  return (

    <div>


      <h2>
        Add Crop
      </h2>



      <input

        placeholder="Crop Name"

        value={name}

        onChange={function(event){

          setName(event.target.value);

        }}

      />



      <input

        placeholder="Plant Date"

        value={plantDate}

        onChange={function(event){

          setPlantDate(event.target.value);

        }}

      />



      <input

        placeholder="Harvest Date"

        value={harvestDate}

        onChange={function(event){

          setHarvestDate(event.target.value);

        }}

      />



      <input

        placeholder="Yield"

        value={yieldAmount}

        onChange={function(event){

          setYieldAmount(event.target.value);

        }}

      />



      <button onClick={addCrop}>

        Add Crop

      </button>



    </div>

  );


}