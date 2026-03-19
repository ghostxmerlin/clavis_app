import { useState, useEffect, useCallback } from 'react'
import { useDeviceStatus } from './hooks/useDeviceStatus'
import LockScreen from './components/LockScreen'
import Layout, { type NavPage } from './components/Layout'
import PasswordList from './components/PasswordList'
import FileManager from './components/FileManager'
import UsbDebugPanel from './components/UsbDebugPanel'

function App(): React.JSX.Element {
  const { connected, deviceInfo, toggleMockConnection } = useDeviceStatus()
  const [page, setPage] = useState<NavPage>('passwords')

  // Dev shortcut: Ctrl+Shift+D to toggle mock device connection
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.code === 'KeyD') {
        e.preventDefault()
        toggleMockConnection()
      }
    },
    [toggleMockConnection]
  )

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  if (!connected) {
    return <LockScreen />
  }

  return (
    <Layout page={page} onPageChange={setPage} deviceInfo={deviceInfo}>
      {page === 'passwords' && <PasswordList />}
      {page === 'files' && <FileManager />}
      {page === 'usb-debug' && <UsbDebugPanel />}
    </Layout>
  )
}

export default App

