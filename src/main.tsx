import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { Navbar } from './navbar.tsx'
import { Footer } from './footer.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>

    <div className="flex flex-col min-h-screen max-w-full">

      <Navbar />

      <main className="flex-grow mt-20">

        <App />
      </main>
      <Footer />
    </div>
  </StrictMode>,
)
