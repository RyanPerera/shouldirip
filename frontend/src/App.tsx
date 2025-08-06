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
    <div style={{ padding: '1rem', maxWidth: '600px', margin: '0 auto', border: '1px solid #ccc', borderRadius: '8px', backgroundColor: '#f9f9f9', color: 'black' }}>
      <h1 style={{ textAlign: 'center', color: '#333' }}>Shipping Calculator</h1>

      <label style={{ display: 'block', marginBottom: '1rem' }}>
        From:
        <select value={route} onChange={e => setRoute(e.target.value)} style={{ marginLeft: '0.5rem', padding: '0.25rem', borderRadius: '4px', border: '1px solid #ccc' }}>
          <option>HK to Canada</option>
          <option>Canada to HK</option>
        </select>
      </label>

      <label style={{ display: 'block', marginBottom: '1rem' }}>
        Delivery Method:
        <select value={deliveryType} onChange={e => setDeliveryType(e.target.value)} style={{ marginLeft: '0.5rem', padding: '0.25rem', borderRadius: '4px', border: '1px solid #ccc' }}>
          <option value="Home Delivery">Home Delivery</option>
          <option value="Pick Up Point">Pick Up Point</option>
          {route === 'Canada to HK' && <option value="Forward">Forward</option>}
        </select>
      </label>

      <h3 style={{ color: '#333' }}>Package Weights ({showPounds ? 'lbs' : 'kg'})</h3>
      {weights.map((w, i) => (

          <div key={i} style={{ marginBottom: '1rem', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '5px', backgroundColor: '#fff' }}>
            <label style={{ display: 'flex', alignItems: 'center' }}>
              <span style={{ marginRight: '0.5rem' }}>Package {i + 1}:</span>
              <input
                type="number"
                min={0.1}
                step={0.1}
                value={w.toFixed(2)}
                onChange={e => handleWeightChange(i, parseFloat(e.target.value))}
                style={{ marginLeft: '0.5rem', padding: '0.25rem', borderRadius: '4px', border: '1px solid #ccc', width: '60px' }}
              />
              <span style={{ marginLeft: '0.25rem' }}>{showPounds ? 'lbs' : 'kg'}</span>
            </label>
            {weights.length > 1 && (
              <button onClick={() => removePackage(i)} style={{ marginLeft: '1rem', backgroundColor: '#ff4d4d', color: '#333', border: 'none', borderRadius: '4px', padding: '0.25rem 0.5rem', cursor: 'pointer' }}>
                Remove
              </button>
            )}
          </div>
      ))}

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1rem' }}>
        <button onClick={addPackage} style={{ backgroundColor: '#4CAF50', color: '#333', border: 'none', borderRadius: '4px', padding: '0.5rem 1rem', cursor: 'pointer' }}>
          Add Package
        </button>

        <button onClick={calculateShipping} style={{ backgroundColor: '#2196F3', color: '#333', border: 'none', borderRadius: '4px', padding: '0.5rem 1rem', cursor: 'pointer' }}>
          Calculate Shipping
        </button>
      </div>

      {cost !== null && <h2 style={{ textAlign: 'center', color: '#333' }}>Shipping Cost: ${cost}</h2>}
      {error && <p style={{ color: 'red', textAlign: 'center' }}>{error}</p>}
    </div>
  );
};

export default App;