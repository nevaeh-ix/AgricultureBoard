"use client";

import { useEffect, useState } from "react";


type Crop = {

  id:number;

  name:string;

  plantDate:string;

  harvestDate:string;

  yield:string;

};



// Displays all crops from the database
export default function CropList() {


  const [crops,setCrops] = useState<Crop[]>([]);



  // Gets crops when the page loads
  useEffect(function(){


    getCrops();


  },[]);



  // Gets all crops from my API
  async function getCrops(){


    const response = await fetch("/api/crops");


    const data = await response.json();


    if(Array.isArray(data)){

      setCrops(data);

    }


  }



  // Deletes a crop from the database
  async function deleteCrop(id:number){


    await fetch(`/api/crops/${id}`, {

      method:"DELETE"

    });



    // Updates the list after deleting
    getCrops();


  }



  return (

    <div>


      <h2>
        Crops
      </h2>



      <div className="grid">


      {crops.map(function(crop){


        return (

          <div className="card" key={crop.id}>


            <h3>
              {crop.name}
            </h3>


            <p>
              Plant Date: {crop.plantDate}
            </p>


            <p>
              Harvest Date: {crop.harvestDate}
            </p>


            <p>
              Yield: {crop.yield}
            </p>



            <button onClick={function(){

              deleteCrop(crop.id);

            }}>

              Delete

            </button>


          </div>

        );


      })}


      </div>


    </div>

  );


}