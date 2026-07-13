import { prisma } from "../../../../lib/prisma";
import { NextResponse } from "next/server";



// Updates a crop if I need to change information later
export async function PUT(

  req: Request,

  { params }: { params: Promise<{ id: string }> }

) {


  try {


    const { id } = await params;


    const cropId = Number(id);


    const crop = await req.json();



    const updatedCrop = await prisma.crop.update({

      where: {

        id: cropId

      },


      data: {

        name: crop.name,

        plantDate: crop.plantDate,

        harvestDate: crop.harvestDate,

        yield: crop.yield

      }

    });



    return NextResponse.json({

      message: "Crop updated successfully",

      crop: updatedCrop

    });



  } catch(error) {


    console.log(error);


    return NextResponse.json({

      message: "Crop not found"

    }, {

      status:404

    });


  }

}




// Removes a crop from the database
export async function DELETE(

  req: Request,

  { params }: { params: Promise<{ id: string }> }

) {


  try {


    const { id } = await params;


    const cropId = Number(id);



    // Shows which crop I am deleting
    console.log("Deleting crop:", cropId);



    await prisma.crop.delete({

      where: {

        id: cropId

      }

    });



    return NextResponse.json({

      message:"Crop deleted successfully"

    });



  } catch(error) {


    console.log(error);



    return NextResponse.json({

      message:"Crop not found"

    }, {

      status:404

    });


  }


}