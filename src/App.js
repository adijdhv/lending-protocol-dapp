import React, { useEffect } from "react";
import Interface from "./components/Interface";

function App() {
  // useEffect(() => {
  //   const connectWallet = async () => {
  //     if (window.ethereum) {
  //       await window.ethereum.request({ method: "eth_requestAccounts" });
  //     }
  //   };
  //   connectWallet();
  // }, []);

  return (
    <div>
      <Interface />
    </div>
  );
}

export default App;
