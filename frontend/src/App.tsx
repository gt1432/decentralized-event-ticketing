import { Routes, Route } from 'react-router-dom'
import { WalletProvider } from './context/WalletContext'
import Layout from './components/Layout'
import LandingPage from './pages/LandingPage'
import EventsPage from './pages/EventsPage'
import EventDetailPage from './pages/EventDetailPage'
import MyTicketsPage from './pages/MyTicketsPage'
import TicketDetailPage from './pages/TicketDetailPage'
import OrganizerDashboard from './pages/OrganizerDashboard'
import ResaleMarketplace from './pages/ResaleMarketplace'
import VerifierDashboard from './pages/VerifierDashboard'
import TransactionHistory from './pages/TransactionHistory'
import NotFound from './pages/NotFound'

export default function App() {
  return (
    <WalletProvider>
      <div className="relative min-h-screen bg-navy-950 overflow-x-hidden">
        {/* Background gradient orbs */}
        <div className="orb orb-purple" aria-hidden="true" />
        <div className="orb orb-blue" aria-hidden="true" />

        <div className="relative z-10">
          <Routes>
            <Route element={<Layout />}>
              <Route path="/" element={<LandingPage />} />
              <Route path="/events" element={<EventsPage />} />
              <Route path="/events/:eventId" element={<EventDetailPage />} />
              <Route path="/my-tickets" element={<MyTicketsPage />} />
              <Route path="/my-tickets/:tokenId" element={<TicketDetailPage />} />
              <Route path="/organizer" element={<OrganizerDashboard />} />
              <Route path="/resale" element={<ResaleMarketplace />} />
              <Route path="/verify" element={<VerifierDashboard />} />
              <Route path="/history" element={<TransactionHistory />} />
              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
        </div>
      </div>
    </WalletProvider>
  )
}
