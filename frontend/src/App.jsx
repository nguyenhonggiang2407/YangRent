import { lazy, Suspense } from 'react'
import { Routes, Route } from 'react-router-dom'
import Header from './components/layout/Header'
import Footer from './components/layout/Footer'
import FloatingWidgets from './components/FloatingWidgets'
import { MapProvider, useMap } from './context/MapContext'
import { ToastHost } from './components/ui'
import Home from './pages/Home'
import RoomList from './pages/RoomList'
import RoomDetail from './pages/RoomDetail'
import Roommates from './pages/Roommates'
import RoommateDetail from './pages/RoommateDetail'
import RoommatePostCreate from './pages/RoommatePostCreate'
import AIRecommend from './pages/AIRecommend'
import Login from './pages/Login'
import Register from './pages/Register'
import Favorites from './pages/Favorites'
import Chat from './pages/Chat'
import Profile from './pages/Profile'
import PostRoom from './pages/PostRoom'
import Dashboard from './pages/Dashboard'
import AdminDashboard from './pages/AdminDashboard'
import NotFound from './pages/NotFound'

// Map Overlay lazy-load (Leaflet + markercluster chỉ tải khi mở bản đồ)
const MapOverlay = lazy(() => import('./components/map/MapOverlay'))

function MapOverlayHost() {
  const { isOpen } = useMap()
  if (!isOpen) return null
  return (
    <Suspense
      fallback={
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-white">
          <div className="flex flex-col items-center gap-3">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-brand-200 border-t-brand-600" />
            <p className="text-sm text-ink-400">Đang tải bản đồ…</p>
          </div>
        </div>
      }
    >
      <MapOverlay />
    </Suspense>
  )
}

export default function App() {
  return (
    <MapProvider>
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="flex-1">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/rooms" element={<RoomList />} />
            <Route path="/rooms/:id" element={<RoomDetail />} />
            <Route path="/roommates" element={<Roommates />} />
            <Route path="/roommates/new" element={<RoommatePostCreate />} />
            <Route path="/roommates/:id" element={<RoommateDetail />} />
            <Route path="/ai-recommend" element={<AIRecommend />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/favorites" element={<Favorites />} />
            <Route path="/chat" element={<Chat />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/post-room" element={<PostRoom />} />
            <Route path="/dashboard/admin" element={<AdminDashboard />} />
            <Route path="/dashboard/:role" element={<Dashboard />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </main>
        <Footer />
        <FloatingWidgets />
        <MapOverlayHost />
        <ToastHost />
      </div>
    </MapProvider>
  )
}
