import { StrictMode, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { Navbar } from './navbar.tsx'
import { Footer } from './footer.tsx'
import { FALLBACK_USD_TO_CAD, FALLBACK_USD_TO_JPY } from './lib/format'
import type { Currency } from './lib/format'

function Root() {
  const [currency, setCurrency] = useState<Currency>('USD')
  const [usdToCadRate, setUsdToCadRate] = useState(FALLBACK_USD_TO_CAD)
  const [usdToJpyRate, setUsdToJpyRate] = useState(FALLBACK_USD_TO_JPY)

  useEffect(() => {
    async function getExchangeRate() {
      try {
        const response = await fetch('https://api.frankfurter.app/latest?from=USD&to=CAD,JPY')
        if (!response.ok) {
          throw new Error(`Rate request failed: ${response.status}`)
        }

        const data = await response.json()
        const nextCadRate = Number(data?.rates?.CAD)
        const nextJpyRate = Number(data?.rates?.JPY)

        if (Number.isFinite(nextCadRate) && nextCadRate > 0) {
          setUsdToCadRate(nextCadRate)
        }

        if (Number.isFinite(nextJpyRate) && nextJpyRate > 0) {
          setUsdToJpyRate(nextJpyRate)
        }
      } catch (error) {
        console.error('Error fetching USD exchange rates, using fallback values:', error)
      }
    }

    getExchangeRate()
  }, [])

  return (
    <div className="flex min-h-screen w-full min-w-0 flex-col overflow-x-clip">
      <Navbar currency={currency} onCurrencyChange={setCurrency} />
      <main className="flex-grow mt-20">
        <App currency={currency} usdToCadRate={usdToCadRate} usdToJpyRate={usdToJpyRate} />
      </main>
      <Footer />
    </div>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
)
