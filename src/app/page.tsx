import CropList from "../items/CropList";
import CropForm from "../items/CropForm";


// Shows the main page of my application
export default function Home() {

  return (

    <main>

      <h1>
        Agri-Tech Homestead Manager
      </h1>


      <p>
        Manage crops and track farm information.
      </p>


      <CropForm />


      <CropList />


    </main>

  );

}