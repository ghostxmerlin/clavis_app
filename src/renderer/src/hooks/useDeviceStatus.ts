import { useState, useEffect, useCallback } from 'react'
import type { DeviceStatus } from '../types'

export function useDeviceStatus(): DeviceStatus & { toggleMockConnection: () => void } {
  const [status, setStatus] = useState<DeviceStatus>({ connected: false })

  useEffect(() => {
    // Query initial device status
    window.clavis.getDeviceStatus().then((result) => {
      setStatus({ connected: result.connected })
    })

    // Listen for connect/disconnect events
    const removeConnect = window.clavis.onDeviceConnect((deviceInfo) => {
      setStatus({
        connected: true,
        deviceInfo: deviceInfo as DeviceStatus['deviceInfo']
      })
    })

    const removeDisconnect = window.clavis.onDeviceDisconnect(() => {
      setStatus({ connected: false })
    })

    return () => {
      removeConnect()
      removeDisconnect()
    }
  }, [])

  // Dev helper: toggle mock connection via keyboard shortcut
  const toggleMockConnection = useCallback(() => {
    setStatus((prev) => {
      if (prev.connected) {
        return { connected: false }
      }
      return {
        connected: true,
        deviceInfo: {
          manufacturer: 'Clavis (Mock)',
          product: 'Clavis Password Manager',
          serialNumber: 'DEV-001'
        }
      }
    })
  }, [])

  return { ...status, toggleMockConnection }
}
