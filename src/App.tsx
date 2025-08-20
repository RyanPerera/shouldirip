import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardFooter } from './components/ui/card';
import { Button } from './components/ui/button';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from './components/ui/select';
import { H1, H2, Large, Small } from './components/ui/typography';
import { supabase } from '../utils/supabase'
import { Skeleton } from './components/ui/skeleton';
import { Checkbox } from './components/ui/checkbox';
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from './components/ui/table';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { Slider } from './components/ui/slider';

const PACK_PRICE = 5; // adjust if needed

//TODO: Add probability_any to rarity_distribution. Specifies odds of pulling ANY card of X rarity
//TODO: Pull pack prices from tcgplayer. Might be best to link the specific pack pages in scraper.js
//TODO: Pull images from tcgplayer and add to cards
//TODO: Add table pagination

const allowed_rarities = ['Poké Ball Foil',
  'Double Rare',
  'Ultra Rare',
  'Illustration Rare',
  'Master Ball Foil',
  'Special Illustration Rare',
  'Black White Rare']

type CardSet = {
  id: string;
  name: string;
}

type Card = {
  id: string;
  name: string;
  rarity: string;
  market_price: number;
}

type Rarity = {
  id: string;
  rarity: string;
  probability: number;
}

function App() {
  const [sets, setSets] = useState<CardSet[]>([]);
  const [selectedSetId, setSelectedSetId] = useState<string | null>(null);
  const [cards, setCards] = useState<Card[]>([]);
  const [rarities, setRarities] = useState<Rarity[]>([]);
  const [selectedCards, setSelectedCards] = useState<Set<string>>(new Set());

  const [packs, setPacks] = useState(10);


  // Fetch sets on mount
  useEffect(() => {
    async function getSets() {
      const { data: setsData, error } = await supabase
        .from('sets')
        .select('id, name');

      if (error) {
        console.error('Error fetching sets:', error.message);
      } else if (setsData) {
        setSets(setsData);
      }
    }

    getSets();
  }, []);

  // Fetch cards whenever a set is selected
  useEffect(() => {
    if (!selectedSetId) return;

    async function getCards() {
      const { data: cardsData, error } = await supabase
        .from('cards')
        .select('id, name, rarity, market_price')
        .in('rarity', allowed_rarities)
        .eq('set_id', selectedSetId)
        .order('market_price', { ascending: false })

      if (error) {
        console.error('Error fetching cards:', error.message);
      } else if (cardsData) {
        setCards(cardsData);
      }
    }

    getCards();
  }, [selectedSetId]);

  // Fetch rarity distribution whenever a set is selected
  useEffect(() => {
    if (!selectedSetId) return;

    async function getRarities() {
      const { data: raritiesData, error } = await supabase
        .from('rarity_distribution')
        .select('id, rarity, probability')
        .eq('set_id', selectedSetId)

      if (error) {
        console.error('Error fetching rarities:', error.message);
      } else if (raritiesData) {
        setRarities(raritiesData);
      }
    }

    getRarities();
  }, [selectedSetId]);


  // Toggle card when selected, add to set
  const toggleCard = (cardId: string) => {
    setSelectedCards(prev => {
      const newSet = new Set(prev);
      if (newSet.has(cardId)) {
        newSet.delete(cardId);
      } else {
        newSet.add(cardId);
      }
      return newSet;
    });
  };

  // computed rarity probabilities for chosen pack count
  const rarityDistribution = useMemo(() => {
    return rarities.map(r => {
      const prob = 1 - Math.pow(1 - Number(r.probability), packs);
      return {
        rarity: r.rarity,
        probability: prob * 100, // %
      };
    });
  }, [packs, rarities]);

  // computed stats for selected cards
  const selectedCardStats = useMemo(() => {
    return cards
      .filter(c => selectedCards.has(c.id))
      .map(card => {
        const rarityProb = rarities.find(r => r.rarity === card.rarity)?.probability || 0;
        const prob = 1 - Math.pow(1 - Number(rarityProb), packs);
        return {
          ...card,
          probability: prob * 100,
          costPacks: packs * PACK_PRICE,
        };
      });
  }, [packs, cards, rarities, selectedCards]);

  return (
    <div className='justify-center flex gap-6'>
      <Card className='max-w-3xl p-12'>
        <H1 color='black'>Select a set</H1>

        {/* <Label>From:</Label> */}
        <Select onValueChange={setSelectedSetId} >
          <SelectTrigger className='w-full'>
            <SelectValue placeholder="Select Set" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {sets.map(({ name, id }) => (
                <SelectItem value={id} key={id}>{name}</SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>

        {rarities.length > 0 &&
          <Table>

            <TableCaption>Note: These pull rates are not guaranteed and are based off of a moderate sample size.</TableCaption>
            <TableHeader className='border-bg-zinc-600 border-b-2'>
              <TableHead>Rarity</TableHead>
              <TableHead className='text-right'>Pull Rate for Specific Card (95% Confidence Interval)</TableHead>
            </TableHeader>
            <TableBody>
              {rarities.map(({ rarity, probability }) => (
                <TableRow>
                  <TableCell>{rarity}</TableCell>
                  <TableCell className='text-right'>{probability}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        }

        {cards.length > 0 && (
          <>
            <H2 className='mt-6'>Cards in this set:</H2>
            <div className='grid grid-cols-5 gap-2'>
              {cards.map((card) => (
                <Card
                  key={card.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => toggleCard(card.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      toggleCard(card.id);
                    }
                  }}
                  className={`cursor-pointer flex flex-col items-center justify-end rounded-lg border p-2
                    hover:bg-accent/20 transition-colors h-full w-full
                    ${selectedCards.has(card.id)
                      ? 'border-blue-600 bg-blue-50'
                      : 'hover:border-accent-foreground/20'
                    }`}
                >
                  <Checkbox
                    checked={selectedCards.has(card.id)}
                    onChange={() => { }}
                    className="sr-only"
                    tabIndex={-1}
                  />
                  <CardContent className='flex flex-grow'>
                    <Skeleton className="h-24 w-18 rounded-md mb-2" />
                  </CardContent>
                  <CardFooter className='flex flex-col p-0 mb-auto flex-grow'>
                    <Large className="text-center text-xs">{card.name}</Large>
                    <Small className="text-center text-xs">{card.rarity}</Small>
                    <Small className="text-center text-xs">${card.market_price}</Small>
                  </CardFooter>
                </Card>
              ))}
            </div>
          </>
        )}

        <div className='justify-end flex'>
          <Button>
            Calculate Shipping
          </Button>
        </div>
      </Card>

      <Card className='max-w-3xl p-12'>

        {/* Packs slider */}
        <div className="my-6">
          <p>Packs to open: {packs}</p>
          <Slider
            defaultValue={[packs]}
            max={100}
            step={1}
            onValueChange={val => setPacks(val[0])}
          />
        </div>

        {/* Chart for rarities */}
        {rarityDistribution.length > 0 && (
          <Card className="p-4 mb-6">
            <H2>Rarity Probability Distribution</H2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={rarityDistribution}>
                <XAxis dataKey="rarity" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="probability" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        )}

        {/* Table for selected cards */}
        {selectedCardStats.length > 0 && (
          <Card className="p-4">
            <H2>Selected Cards Odds</H2>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Card</TableHead>
                  <TableHead>Rarity</TableHead>
                  <TableHead>Chance</TableHead>
                  <TableHead>Pack Cost</TableHead>
                  <TableHead>Market Price</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {selectedCardStats.map(card => (
                  <TableRow key={card.id}>
                    <TableCell>{card.name}</TableCell>
                    <TableCell>{card.rarity}</TableCell>
                    <TableCell>{card.probability.toFixed(2)}%</TableCell>
                    <TableCell>${card.costPacks}</TableCell>
                    <TableCell>${card.market_price}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}

      </Card>
    </div>
  );
}

export default App;