import { StrictMode, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { Navbar } from './navbar.tsx'
import { Footer } from './footer.tsx'
import { FALLBACK_USD_TO_CAD } from './lib/format'
import type { Currency } from './lib/format'

function Root() {
  const [currency, setCurrency] = useState<Currency>('USD')
  const [usdToCadRate, setUsdToCadRate] = useState(FALLBACK_USD_TO_CAD)

  useEffect(() => {
    async function getExchangeRate() {
      try {
        const response = await fetch('https://api.frankfurter.app/latest?from=USD&to=CAD')
        if (!response.ok) {
          throw new Error(`Rate request failed: ${response.status}`)
        }

        const data = await response.json()
        const nextRate = Number(data?.rates?.CAD)
        if (Number.isFinite(nextRate) && nextRate > 0) {
          setUsdToCadRate(nextRate)
        }
      } catch (error) {
        console.error('Error fetching USD/CAD rate, using fallback:', error)
      }
    }

    getExchangeRate()
  }, [])

  return (
    <div className="flex flex-col min-h-screen min-w-screen">
      <Navbar currency={currency} onCurrencyChange={setCurrency} />
      <main className="flex-grow mt-20">
        <App currency={currency} usdToCadRate={usdToCadRate} />
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
