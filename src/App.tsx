import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardFooter } from './components/ui/card';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from './components/ui/select';
import { H1, H2, H3, Large, Small } from './components/ui/typography';
import { supabase } from '../utils/supabase'
import { Skeleton } from './components/ui/skeleton';
import { Checkbox } from './components/ui/checkbox';
import { Table, TableBody, TableCaption, TableCell, TableFooter, TableHead, TableHeader, TableRow } from './components/ui/table';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { Slider } from './components/ui/slider';
import { displayPercent } from './lib/format';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from './components/ui/pagination';
import { XIcon } from 'lucide-react';
import { Button } from './components/ui/button';

const allowed_rarities = [
  'Common',
  'Uncommon',
  'Rare',
  'Poké Ball Foil',
  'Double Rare',
  'Ultra Rare',
  'Hyper Rare',
  'Illustration Rare',
  'Master Ball Foil',
  'ACE SPEC Rare',
  'Special Illustration Rare',
  'Black White Rare'
]

type CardSet = {
  id: string;
  name: string;
  pack_price: number;
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
  const [selectedCards, setSelectedCards] = useState<Map<string, Card>>(new Map());


  const [packs, setPacks] = useState(10);
  const [packPrice, setPackPrice] = useState(4.99);

  const [page, setPage] = useState(1)
  const [pageSize] = useState(20)
  const [totalPages, setTotalPages] = useState(0)


  // Fetch sets on mount
  useEffect(() => {
    async function getSets() {
      const { data: setsData, error } = await supabase
        .from('sets')
        .select('id, name, pack_price')

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
    setCards([])

    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    const selectedSet = sets.find(s => s.id === selectedSetId);
    if (selectedSet && selectedSet.pack_price) {
      setPackPrice(selectedSet.pack_price);
    }

    async function getCards() {
      const { data, error } = await supabase
        .from('cards')
        .select('id, name, rarity, market_price, image_url')
        .in('rarity', allowed_rarities)
        .eq('set_id', selectedSetId)
        .range(from, to)
        .order('market_price', { ascending: false })

      if (error) {
        console.error('Error fetching cards:', error.message);
      }

      // Set total pages based on count
      if (data) {
        setCards(data);
        const { count } = await supabase
          .from("cards")
          .select("*", { count: "exact", head: true }) // just count
          .eq("set_id", selectedSetId)

        if (count) {
          setTotalPages(Math.ceil(count / pageSize))
        }
      }

    }

    getCards();
  }, [selectedSetId, sets, page, pageSize]);


  // Fetch rarity distribution whenever a set is selected
  useEffect(() => {
    if (!selectedSetId) return;
    setSelectedCards(new Map())
    setPage(1)

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
  const toggleCard = (card: Card) => {
    setSelectedCards(prev => {
      const newMap = new Map(prev);
      if (newMap.has(card.id)) {
        newMap.delete(card.id);
      } else {
        newMap.set(card.id, card);
      }
      return newMap;
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
    return Array.from(selectedCards.values()).map(card => {
      const rarityRow = rarities.find(r => r.rarity === card.rarity);
      const rarityProb = rarityRow ? Number(rarityRow.probability) : 0; // convert string to number
      const prob = 1 - Math.pow(1 - rarityProb, packs);
      return {
        ...card,
        probability: prob * 100,
        costPacks: packs * packPrice,
      };
    });
  }, [packs, rarities, selectedCards, packPrice]);


  // totals for footer
  // totals for footer
  const selectedTotals = useMemo(() => {
    const selectedArray = Array.from(selectedCards.values()); // full card objects
    if (selectedArray.length === 0) return { probAll: 0, probAny: 0, totalMarket: 0 };

    // per-card probabilities
    const perCardP = selectedArray
      .map(card => {
        const rarityRow = rarities.find(r => r.rarity === card.rarity);
        return rarityRow ? Number(rarityRow.probability) : 0;
      })
      .filter(p => !Number.isNaN(p));

    if (perCardP.length === 0) return { probAll: 0, probAny: 0, totalMarket: 0 };

    // Probability of getting all selected cards
    const probAll = perCardP.reduce((acc, p) => acc * (1 - Math.pow(1 - p, packs)), 1);

    // Probability of getting any selected card
    const missPerPack = perCardP.reduce((acc, p) => acc * (1 - p), 1);
    const probAny = 1 - Math.pow(missPerPack, packs);

    // Total market value
    const totalMarket = selectedArray.reduce((sum, card) => sum + Number(card.market_price), 0);

    return { probAll, probAny, totalMarket };
  }, [packs, selectedCards, rarities]);


  // Helper to generate visible pages with ellipsis
  function getVisiblePages(page: number, totalPages: number, maxPages = 5) {
    const pages: (number | string)[] = [];

    if (totalPages <= maxPages) {
      // Show all pages if total is small
      for (let i = 1; i <= totalPages; i++) pages.push(i);
      return pages;
    }

    // Always show first page
    pages.push(1);

    // Determine left/right window
    const start = Math.max(page - 1, 2);
    const end = Math.min(page + 1, totalPages - 1);

    if (start > 2) pages.push('…');

    for (let i = start; i <= end; i++) pages.push(i);

    if (end < totalPages - 1) pages.push('…');

    // Always show last page
    pages.push(totalPages);

    return pages;
  }


  return (
    <>
      {!selectedSetId ? (
        // Landing state when no set is selected
        <div className="flex flex-col items-center justify-center text-center min-h-[70vh] px-4">
          <H1 color="black" className="mb-4">Save Your Money</H1>
          <p className="max-w-prose mb-6 text-lg text-gray-700">
            Stop paying outrageous market prices for Pokémon TCG packs! This app can help you decide whether it’s actually worth it to buy booster packs, over just buying singles.
            Choose a set below to see pull rates, select your chase cards, and see whether the odds are in your favour.
          </p>
          <Card className="p-8 max-w-md w-full">
            <H3>Select a set to get started</H3>
            <Select onValueChange={setSelectedSetId}>
              <SelectTrigger className="w-full mt-4">
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
          </Card>
        </div>
      ) : (
        <div className='grid grid-cols-1 lg:grid-cols-2 gap-6 p-2 justify-center'>
          <Card className='col-span-1 p-8 order-2'>
            <H1 color='black'>Select a set</H1>

            {/* <Label>From:</Label> */}
            <Select onValueChange={setSelectedSetId} value={selectedSetId}>
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
                  <TableHead className="text-right">Pull Rate for Specific Card</TableHead>
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
                <div className='flex flex-row items-center justify-between border-b-1'>
                  <H2 className='mt-6 border-b-0'>Cards in this set:</H2>
                  {selectedCards.size > 0 && <Button className='w-fit h-fit' onClick={() => setSelectedCards(new Map())}>
                    Clear<XIcon />
                  </Button>}
                </div>
                <div className='grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-2'>
                  {cards.map((card) => (
                    <Card
                      key={card.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => toggleCard(card)}

                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          toggleCard(card);
                        }
                      }}
                      className={`flex flex-col items-center justify-end rounded-lg border p-2
                    hover:bg-accent/20 transition-colors h-full w-full gap-0
                    ${selectedCards.has(card.id)
                          ? 'border-blue-600 bg-blue-50'
                          : 'hover:border-accent-foreground/20'
                        }`}
                    >
                      <Checkbox
                        checked={selectedCards.has(card.id)}
                        onChange={() => toggleCard(card)}
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
            {/* Pagination */}
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious

                    className={`${page <= 1 ? 'pointer-events-none opacity-50' : ''}`}
                    href="#"
                    onClick={(e) => {
                      e.preventDefault()
                      if (page > 1) setPage(page - 1)
                    }}
                  />
                </PaginationItem>

                {/* Page number buttons */}
                {getVisiblePages(page, totalPages).map((p, idx) => (
                  <PaginationItem key={idx}>
                    {typeof p === 'number' ? (
                      <PaginationLink
                        onClick={() => setPage(p)}
                        isActive={p === page}
                      >
                        {p}
                      </PaginationLink>
                    ) : (
                      <span className="px-2 py-1 cursor-default select-none">…</span>
                    )}
                  </PaginationItem>
                ))}


                <PaginationItem>
                  <PaginationNext
                    className={`${page >= totalPages ? 'pointer-events-none opacity-50' : ''}`}
                    href="#"
                    onClick={(e) => {
                      e.preventDefault()
                      if (page < totalPages) setPage(page + 1)
                    }}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </Card>

          {selectedSetId && <Card className='col-span-1 p-8 h-fit'>

            {/* Packs and Pack Price */}
            <div className="my-3 flex flex-col sm:flex-row sm:items-center sm:gap-4">
              {/* Packs */}
              <div className="flex flex-col flex-grow">
                <label className="mb-1 font-medium">Packs to open:</label>
                <div className="flex items-center gap-2">
                  <Slider
                    value={[packs]}
                    min={0}
                    max={2000}
                    step={1}
                    onValueChange={val => setPacks(val[0])}
                    className="flex-1"
                  />
                  <input
                    type="number"
                    min={0}
                    max={2000}
                    value={packs}
                    onChange={(e) => setPacks(Number(e.target.value))}
                    className="w-20 p-1 border rounded"
                  />
                </div>
              </div>

              {/* Pack Price */}
              <div className="flex flex-col mt-4 sm:mt-0">
                <label className="mb-1 font-medium">Price per pack ($):</label>
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  value={packPrice}
                  onChange={(e) => setPackPrice(Number(e.target.value))}
                  className="w-32 p-1 border rounded"
                />
              </div>
            </div>

            {/* Display total cost */}
            <p className="mt-2 font-semibold">
              Total cost: ${(packs * packPrice).toFixed(2)}
            </p>


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
                      <TableHead colSpan={2} className="text-right">Pull Rate</TableHead>
                      <TableHead className="text-right">Market Price</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedCardStats.map(card => (
                      <TableRow key={card.id}>
                        <TableCell>{card.name}</TableCell>
                        <TableCell>{card.rarity}</TableCell>
                        <TableCell colSpan={2} className="text-right">{card.probability.toFixed(2)}%</TableCell>
                        <TableCell className="text-right">${(card.market_price).toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                  <TableFooter>
                    <TableRow>
                      <TableCell>
                        <strong>Total</strong>
                      </TableCell>
                      <TableCell>
                        <strong>Total cost: </strong>
                        <span>${(packs * packPrice).toFixed(2)}</span>
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
      )
      }
    </>
  );
}

export default App;