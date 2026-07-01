const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

// Adds a couple of crops to my database so I have some starting data.
async function main() {
  await prisma.crop.createMany({
    data: [
      {
        name: "Tomatoes",
        plantDate: "2026-06-01",
        harvestDate: "2026-08-01",
        yield: "10"
      },
      {
        name: "Corn",
        plantDate: "2026-06-10",
        harvestDate: "2026-09-01",
        yield: "20"
      }
    ],

    // This keeps the same crops from being added over and over.
    skipDuplicates: true
  });
}

// Runs the seed and closes the database connection when it's done.
main()
  .then(async function () {
    await prisma.$disconnect();
  })

  // If something goes wrong, it prints the error and closes everything.
  .catch(async function (error) {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });