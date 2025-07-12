import React, { useState } from 'react';

const App: React.FC = () => {
  const [route, setRoute] = useState('HK to Canada');
  const [deliveryType, setDeliveryType] = useState('Home Delivery');
  const [weight, setWeight] = useState(1);
  const [cost, setCost] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const calculateShipping = async () => {
    try {
      const query = new URLSearchParams({
        route,
        delivery_type: deliveryType,
      }).toString();

      const response = await fetch(`http://localhost:3000/api/get_shipping_rate?${query}`);
      if (!response.ok) throw new Error('Failed to fetch shipping rate');

      const data = await response.json();
      const first = Number(data.first_cost);
      const extra = Number(data.extra_cost);

      const totalCost = weight <= 1
        ? first
        : first + Math.ceil(weight - 1) * extra;

      setCost(totalCost);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setCost(null);
    }
  };

  return (
    <div>
      <h1>Shipping Calculator</h1>

      <label>
        From:
        <select value={route} onChange={e => setRoute(e.target.value)}>
          <option>HK to Canada</option>
          <option>Within HK</option>
          <option>Canada to HK</option>
          <option>Within Canada</option>
        </select>
      </label>

      <label>
        Delivery Method:
        <select value={deliveryType} onChange={e => setDeliveryType(e.target.value)}>
          <option value="Home Delivery">Home Delivery</option>
          <option value="Pick Up Point">Pick Up Point</option>
          {(route === 'Within HK' || route === 'Canada to HK') && <option value="Forward">Forward</option>}
        </select>
      </label>

      <label>
        Weight (kg):
        <input
          type="number"
          min={0.1}
          step={0.1}
          value={weight}
          onChange={e => setWeight(Number(e.target.value))}
        />
      </label>

      <button onClick={calculateShipping}>Calculate Shipping</button>

      {cost !== null && <h2>Shipping Cost: ${cost}</h2>}
      {error && <p style={{ color: 'red' }}>{error}</p>}
    </div>
  );
};

export default App;