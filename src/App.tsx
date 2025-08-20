import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardFooter } from './components/ui/card';
import { Button } from './components/ui/button';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from './components/ui/select';
import { H1, H2, Large, Lead, Small } from './components/ui/typography';
import { supabase } from '../utils/supabase'
import { Skeleton } from './components/ui/skeleton';
import { Checkbox } from './components/ui/checkbox';
import { Table, TableBody, TableCaption, TableCell, TableFooter, TableHead, TableHeader, TableRow } from './components/ui/table';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { Slider } from './components/ui/slider';
import { displayPercent } from './lib/format';

const PACK_PRICE = 5; // adjust if needed

//TODO: Insert rarity data for new sets added
//TODO: actually use new pack price data from sets
//TODO: Add table pagination, make sure I'm pulling all cards from set in db

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
  image_url: string;
}

type Rarity = {
  id: string;
  rarity: string;
  probability: number;
  probability_any: number;
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
        .select('id, name, rarity, market_price, image_url')
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
        .select('id, rarity, probability, probability_any')
        .eq('set_id', selectedSetId)
        .order('probability', { ascending: false })

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
      const prob_any = 1 - Math.pow(1 - Number(r.probability_any), packs);
      return {
        rarity: r.rarity,
        probability: prob * 100,
        probability_any: prob_any * 100
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

  // totals for footer
  const selectedTotals = useMemo(() => {
    // default values
    if (selectedCards.size === 0) return { probAll: 0, probAny: 0, totalMarket: 0 };

    const ids = [...selectedCards];

    // collect per-card per-pack probabilities (as numbers)
    const perCardP = ids
      .map((cardId) => {
        const card = cards.find((c) => c.id === cardId);
        if (!card) return null;
        const rarityRow = rarities.find((r) => r.rarity === card.rarity);
        const p = rarityRow ? Number(rarityRow.probability) : 0;
        return p;
      })
      .filter((p) => p !== null && !Number.isNaN(p))
      .map(Number);

    // If any card has zero per-pack probability, probAll will be zero (can't get that card)
    if (perCardP.length === 0) return { probAll: 0, probAny: 0, totalMarket: 0 };

    // 1) Probability of getting at least one copy of each selected card
    //    For each card: q_i = 1 - (1 - p_i)^packs is chance to get that card at least once in `packs`.
    //    Approximate probAll by multiplying q_i (assumes independence).
    const probAll = perCardP.reduce((acc, p) => acc * (1 - Math.pow(1 - p, packs)), 1);

    // 2) Probability of getting at least one of ANY selected card
    //    For a single pack, chance to miss all selected cards = product_i (1 - p_i)
    //    Miss across all packs = (missPerPack)^packs -> probAny = 1 - missAll
    const missPerPack = perCardP.reduce((acc, p) => acc * (1 - p), 1);
    const probAny = 1 - Math.pow(missPerPack, packs);

    // 3) Total market value (sum of market_price)
    const totalMarket = ids.reduce((sum, cardId) => {
      const card = cards.find((c) => c.id === cardId);
      return card ? sum + Number(card.market_price) : sum;
    }, 0);

    return { probAll, probAny, totalMarket };
  }, [packs, selectedCards, cards, rarities]);




  return (
    <div className='grid grid-cols-1 lg:grid-cols-2 gap-6 p-2 justify-center'>
      <Card className='col-span-1 p-8 order-2'>
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
              <TableHead>Pull Rate for Specific Card</TableHead>
              <TableHead className='text-right'>Pull Rate for Any Card</TableHead>
            </TableHeader>
            <TableBody>
              {rarities.map(({ rarity, probability, probability_any }) => (
                <TableRow>
                  <TableCell>{rarity}</TableCell>
                  <TableCell className='text-right'>{displayPercent(probability)}</TableCell>
                  <TableCell className='text-right'>{displayPercent(probability_any)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        }

        {cards.length > 0 && (
          <>
            <H2 className='mt-6'>Cards in this set:</H2>
            <div className='grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-2'>
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
                    hover:bg-accent/20 transition-colors h-full w-full gap-0
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
                  <CardContent className="flex flex-grow px-1">
                    {card.image_url && card.image_url !== "https://tcgplayer-cdn.tcgplayer.com/product/image-missing_in_200x200.jpg" ? (
                      <img
                        src={card.image_url}
                        className="max-h-32 w-auto mb-2 object-contain"
                        alt={card.name}
                      />
                    ) : (
                      <Skeleton className="min-h-26 min-w-20 rounded-md mb-2" />
                    )}
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
            Test
          </Button>
        </div>
      </Card>

      {selectedSetId && <Card className='col-span-1 p-8 h-fit'>

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
          <>
            <H2>Rarity Probability Distribution</H2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={rarityDistribution}>
                <XAxis dataKey="rarity" />
                <YAxis />
                <Tooltip
                  formatter={(value: number, name: string) => {
                    const labelMap: Record<string, string> = {
                      probability: "Probability",
                      probability_any: "Probability Any",
                    };
                    return [displayPercent(value / 100), labelMap[name] || name];
                  }}
                />
                <Bar dataKey="probability" fill="#82c6fa" />
                <Bar dataKey="probability_any" fill="#3dabff" />
              </BarChart>
            </ResponsiveContainer>
          </>
        )}

        {/* Table for selected cards */}
        {selectedCardStats.length > 0 && (
          <>
            <H2>Selected Cards Odds</H2>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Card</TableHead>
                  <TableHead>Rarity</TableHead>
                  <TableHead colSpan={2} className="text-right">Chance</TableHead>
                  <TableHead className="text-right">Market Price</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {selectedCardStats.map(card => (
                  <TableRow key={card.id}>
                    <TableCell>{card.name}</TableCell>
                    <TableCell>{card.rarity}</TableCell>
                    <TableCell colSpan={2} className="text-right">{card.probability.toFixed(2)}%</TableCell>
                    <TableCell className="text-right">${card.market_price}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell>
                    <strong>Total</strong>
                  </TableCell>
                  <TableCell>
                    <strong>Total pack price: </strong>
                    <span>${packs * PACK_PRICE}</span>
                  </TableCell>
                  {/* Probability column: show both "All" and "Any" */}
                  <TableCell colSpan={2} className="text-right">
                    <div className="flex flex-col gap-1">
                      <div>
                        <strong>Pulling every card: </strong>
                        <span>{displayPercent(selectedTotals.probAll)}</span>
                      </div>
                      <div>
                        <strong>Pulling any of the selected: </strong>
                        <span>{displayPercent(selectedTotals.probAny)}</span>
                      </div>
                    </div>
                  </TableCell>
                  {/* total market value */}
                  <TableCell className="text-right">
                    <strong>Total market price: </strong>
                    <span>${selectedTotals.totalMarket.toFixed(2)}</span>
                  </TableCell>
                </TableRow>
              </TableFooter>

            </Table>
          </>
        )}

      </Card>}
    </div >
  );
}

export default App;