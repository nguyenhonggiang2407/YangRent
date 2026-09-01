import { createContext, useCallback, useContext, useState } from 'react'

const MapContext = createContext(null)

export function MapProvider({ children }) {
  const [isOpen, setIsOpen] = useState(false)

  const openMap = useCallback(() => setIsOpen(true), [])
  const closeMap = useCallback(() => setIsOpen(false), [])

  return (
    <MapContext.Provider value={{ isOpen, openMap, closeMap }}>
      {children}
    </MapContext.Provider>
  )
}

export function useMap() {
  const ctx = useContext(MapContext)
  if (!ctx) throw new Error('useMap phải được dùng bên trong MapProvider')
  return ctx
}
