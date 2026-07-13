import type { Metadata } from "next";
import "./global.css";


export const metadata: Metadata = {
  title: "Agri-Tech Homestead Manager",
  description: "This helps manages crops and different farm information",
};


// Sets up the main layout for the application
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