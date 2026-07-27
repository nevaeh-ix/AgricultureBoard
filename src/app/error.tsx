"use client";


// Shows if something goes wrong
export default function Error({

  error,
  reset,

}:{

  error: Error;

  reset: () => void;

}){

  return(

    <main>

      <h1>
        Something went wrong.
      </h1>

      <p>
        {error.message}
      </p>

      <button onClick={reset}>

        Try Again

      </button>

    </main>

  );

}