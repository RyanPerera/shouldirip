import React, { useState } from 'react';

const App: React.FC = () => {
  const [route, setRoute] = useState('HK to Canada');
  const [deliveryType, setDeliveryType] = useState('Home Delivery');
  const [weights, setWeights] = useState<number[]>([1]); // start with 1 package

  const [cost, setCost] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const showPounds = route === 'Canada to HK';

  const handleWeightChange = (index: number, value: number) => {
    const newWeights = [...weights];
    newWeights[index] = value;
    setWeights(newWeights);
  };

  const addPackage = () => {
    setWeights([...weights, 1]); // Default new package weight: 1kg
  };

  const removePackage = (index: number) => {
    setWeights(weights.filter((_, i) => i !== index));
  };

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

      const totalCost = weights.reduce((sum, w) => {
        const pkgCost = w <= 1 ? first : first + Math.ceil(w - 1) * extra;
        return sum + pkgCost;
      }, 0);

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
          <option>Canada to HK</option>
        </select>
      </label>

      <label>
        Delivery Method:
        <select value={deliveryType} onChange={e => setDeliveryType(e.target.value)}>
          <option value="Home Delivery">Home Delivery</option>
          <option value="Pick Up Point">Pick Up Point</option>
          {(route === 'Canada to HK') && <option value="Forward">Forward</option>}
        </select>
      </label>

       <h3>Package Weights ({showPounds ? 'lbs' : 'kg'})</h3>
      {weights.map((w, i) => {
        const displayWeight = w.toFixed(2);

        return (
          <div key={i} style={{ marginBottom: '0.5rem' }}>
            <label>
              Package {i + 1}:
              <input
                type="number"
                min={0.1}
                step={0.1}
                value={displayWeight}
                onChange={e => handleWeightChange(i, parseFloat(e.target.value))}
                style={{ marginLeft: '0.5rem' }}
              />
              <span style={{ marginLeft: '0.25rem' }}>{showPounds ? 'lbs' : 'kg'}</span>
            </label>
            {weights.length > 1 && (
              <button onClick={() => removePackage(i)} style={{ marginLeft: '1rem' }}>Remove</button>
            )}
          </div>
        );
      })}

      <button onClick={addPackage}>Add Package</button>


      <button onClick={calculateShipping}>Calculate Shipping</button>

      {cost !== null && <h2>Shipping Cost: ${cost}</h2>}
      {error && <p style={{ color: 'red' }}>{error}</p>}
    </div>
  );
};

export default App;