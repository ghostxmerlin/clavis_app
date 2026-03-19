import { BrowserWindow } from 'electron'

// Placeholder VID/PID - replace with actual device values
const TARGET_VENDOR_ID = 0xffff
const TARGET_PRODUCT_ID = 0x0001
const POLL_INTERVAL_MS = 1000

interface DeviceInfo {
  manufacturer?: string
  product?: string
  serialNumber?: string
}

// Dynamic import for node-hid (may not be available during initial setup)
let HID: typeof import('node-hid') | null = null
try {
  HID = require('node-hid')
} catch {
  console.warn('node-hid not available - USB device detection disabled')
}

export class UsbManager {
  private pollTimer: ReturnType<typeof setInterval> | null = null
  private isConnected = false
  private mainWindow: BrowserWindow | null = null

  setMainWindow(window: BrowserWindow): void {
    this.mainWindow = window
  }

  startPolling(): void {
    if (this.pollTimer) return

    this.pollTimer = setInterval(() => {
      this.checkDevice()
    }, POLL_INTERVAL_MS)

    // Check immediately on start
    this.checkDevice()
  }

  stopPolling(): void {
    if (this.pollTimer) {
      clearInterval(this.pollTimer)
      this.pollTimer = null
    }
  }

  getConnectionStatus(): boolean {
    return this.isConnected
  }

  private checkDevice(): void {
    if (!HID) return

    try {
      const devices = HID.devices()
      const targetDevice = devices.find(
        (d) => d.vendorId === TARGET_VENDOR_ID && d.productId === TARGET_PRODUCT_ID
      )

      if (targetDevice && !this.isConnected) {
        this.isConnected = true
        const info: DeviceInfo = {
          manufacturer: targetDevice.manufacturer,
          product: targetDevice.product,
          serialNumber: targetDevice.serialNumber
        }
        console.log('Clavis device connected:', info)
        this.mainWindow?.webContents.send('device:connected', info)
      } else if (!targetDevice && this.isConnected) {
        this.isConnected = false
        console.log('Clavis device disconnected')
        this.mainWindow?.webContents.send('device:disconnected')
      }
    } catch (err) {
      console.error('Error polling USB devices:', err)
    }
  }

  destroy(): void {
    this.stopPolling()
    this.mainWindow = null
  }
}

export const usbManager = new UsbManager()
