import { prisma } from "../../../../lib/prisma";
import { NextResponse } from "next/server";


// Updates a crop if I need to change information later
export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {

  try {

    const id = Number(params.id);
    const crop = await req.json();


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


    return NextResponse.json({

      message: "Crop updated successfully",
      crop: updatedCrop

    });


  } catch (error) {

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
  { params }: { params: { id: string } }
) {

  try {

    const id = Number(params.id);


    await prisma.crop.delete({

      where:{
        id:id
      }

    });


    return NextResponse.json({

      message:"Crop deleted successfully"

    });


  } catch(error){

    return NextResponse.json({

      message:"Crop not found"

    },{
      status:404
    });

  }

}