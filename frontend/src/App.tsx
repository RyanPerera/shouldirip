import React, { useState } from 'react';
import { Card } from './components/ui/card';
import { Button } from './components/ui/button';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from './components/ui/select';
import { Input } from './components/ui/input';
import { Label } from './components/ui/label';
import { H1, H2 } from './components/ui/typography';

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
    <div className='justify-center flex'>

      <Card className='max-w-3xl p-12'>
        <H1 color='black'>Shipping Calculator</H1>

        <Label>From:</Label>
        <Select >
          <SelectTrigger className='w-full'>
            <SelectValue placeholder="Select Route" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="HK to Canada">HK to Canada</SelectItem>
              <SelectItem value="Canada to HK">Canada to HK</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>

        <Label>Delivery Method:</Label>
        <Select >
          <SelectTrigger className='w-full'>
            <SelectValue placeholder="Select a delivery method" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="Home Delivery">Home Delivery</SelectItem>
              <SelectItem value="Pick Up Point">Pick Up Point</SelectItem>
              {route === 'Canada to HK' && <SelectItem value="Forward">Forward</SelectItem>}
            </SelectGroup>
          </SelectContent>
        </Select>

        <Label>Package Weights ({showPounds ? 'lbs' : 'kg'})</Label>
        {weights.map((w, i) => (

          <div key={i} className='gap-2 flex flex-col'>
            <Label>Package {i + 1}:</Label>
            <div className='flex flex-row gap-1'>
              <Input
                type="number"
                min={0.1}
                step={0.1}
                value={w.toFixed(2)}
                onChange={e => handleWeightChange(i, parseFloat(e.target.value))}
                style={{ marginLeft: '0.5rem', padding: '0.25rem', borderRadius: '4px', border: '1px solid #ccc', width: '60px' }}
              />
              <Label style={{ marginLeft: '0.25rem' }}>{showPounds ? 'lbs' : 'kg'}</Label>
              {weights.length > 1 && (
                <Button onClick={() => removePackage(i)} className='ml-auto'>
                  Remove
                </Button>
              )}
            </div>

          </div>
        ))}

        <div className='justify-between flex'>
          <Button onClick={addPackage}>
            Add Package
          </Button>
          <Button onClick={calculateShipping} >
            Calculate Shipping
          </Button>
        </div>

        {cost !== null && <H2>Shipping Cost: ${cost}</H2>}
        {error && <p >{error}</p>}
      </Card>
    </div>
  );
};

export default App;