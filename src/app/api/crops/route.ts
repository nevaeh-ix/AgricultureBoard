import { prisma } from "../../../lib/prisma";
import { NextResponse } from "next/server";



// Gets all crops from the database
export async function GET() {


  try {


    const crops = await prisma.crop.findMany({

      orderBy: {

        id: "asc"

      }

    });


    return NextResponse.json(crops);


  } catch(error) {


    console.log(error);


    return NextResponse.json({

      message: "Could not get crops"

    }, {

      status: 500

    });


  }


}



// Adds a new crop to the database
export async function POST(req: Request) {


  try {


    const crop = await req.json();



    // Checks if crop information is missing
    if (!crop.name || !crop.plantDate || !crop.harvestDate || !crop.yield) {


      return NextResponse.json({

        message: "Missing crop information"

      }, {

        status:400

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



    return NextResponse.json({

      message:"Crop added successfully",

      crop:newCrop

    }, {

      status:201

    });



  } catch(error) {


    console.log(error);


    return NextResponse.json({

      message:"Could not add crop"

    }, {

      status:500

    });


  }


}