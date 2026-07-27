"use client";

import { useEffect, useState } from "react";


// Shows today's weather for the farm
export default function Weather() {

  const [temperature, setTemperature] = useState("");
  const [windSpeed, setWindSpeed] = useState("");
  const [loading, setLoading] = useState(true);



  // Gets the current weather when the page loads
  useEffect(() => {

    getWeather();

  }, []);



  // Gets weather information from Open-Meteo
  async function getWeather() {

    try {

      const response = await fetch(
        "https://api.open-meteo.com/v1/forecast?latitude=35.7796&longitude=-78.6382&current=temperature_2m,wind_speed_10m"
      );

      const data = await response.json();

      setTemperature(data.current.temperature_2m);
      setWindSpeed(data.current.wind_speed_10m);

      setLoading(false);

    } catch (error) {

      console.log(error);

      setLoading(false);

    }

  }



  if (loading) {

    return <p>Loading weather...</p>;

  }



  return (

    <div
      style={{
        border: "2px solid purple",
        borderRadius: "10px",
        padding: "15px",
        marginBottom: "20px"
      }}
    >

      <h2>Current Weather</h2>

      <p>
        Temperature: {temperature} °C
      </p>

      <p>
        Wind Speed: {windSpeed} km/h
      </p>

    </div>

  );

}