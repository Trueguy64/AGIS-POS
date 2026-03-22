import PaymentCalculation from "./pages/PaymentCalculation";
import NavBar from "./components/NavBar";
import { useState, useEffect } from 'react';

function App() {
  const [goldPricePerOunce, setGoldPrice] = useState(null); // Null shows it's "loading"
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/api-swissquote/public-quotes/bboquotes/instrument/XAU/USD');
        
        if (!response.ok) throw new Error('Network response was not ok');
        
        const data = await response.json();

        const price = data?.[1]?.spreadProfilePrices?.[1]?.ask;

        if (price) {
          setGoldPrice(price);
          setError(false);
        }
      } catch (err) {
        console.error("Error fetching gold price:", err);
        setError(true);
      }
    };

    fetchData();
    const intervalId = setInterval(fetchData, 60000);
    
    return () => clearInterval(intervalId);
  }, []);

  return (
    <div>
      {/* You can now pass a "loading" state to your NavBar */}
      <NavBar goldPrice={goldPricePerOunce} />
      <PaymentCalculation goldPrice={goldPricePerOunce} />
    </div>
  );
}

export default App