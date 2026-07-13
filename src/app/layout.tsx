import type { Metadata } from "next";
import "./global.css";


export const metadata: Metadata = {

  title: "Agri-Tech Homestead Manager",

  description: "This helps manages different crops and farm information"

};


// Sets up the main layout for my application
export default function RootLayout({

  children,

}: Readonly<{

  children: React.ReactNode;

}>) {


  return (

    <html lang="en">

      <body>

        {children}

      </body>

    </html>

  );


}