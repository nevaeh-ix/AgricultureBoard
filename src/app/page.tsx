import CropForm from "../items/CropForm";
import CropList from "../items/CropList";
import Sidebar from "../items/Sidebar";


// Shows the main page of my application
export default function Home() {

  return (

    <div className="container">


      <h1>
        Agri-Tech Homestead Manager
      </h1>


      <CropForm />


      <CropList />


    </div>

  );

}