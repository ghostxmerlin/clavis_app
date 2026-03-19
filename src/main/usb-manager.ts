import { BrowserWindow } from 'electron'
import { hexToBytes, bytesToHex, parseApduResponse, type ApduResponse } from './apdu-parser'

// Device VID/PID
const TARGET_VENDOR_ID = 0x2f0a
const TARGET_PRODUCT_ID = 0x0f71
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
  private device: InstanceType<typeof import('node-hid').HID> | null = null

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

  /** 打开 HID 设备连接 */
  private openDevice(path?: string): boolean {
    if (!HID) return false
    if (this.device) return true
    try {
      if (path) {
        this.device = new HID.HID(path)
      } else {
        this.device = new HID.HID(TARGET_VENDOR_ID, TARGET_PRODUCT_ID)
      }
      console.log('HID device opened')
      return true
    } catch (err) {
      console.error('Failed to open HID device:', err)
      this.device = null
      return false
    }
  }

  /** 关闭 HID 设备连接 */
  private closeDevice(): void {
    if (this.device) {
      try {
        this.device.close()
      } catch {
        // ignore close errors
      }
      this.device = null
      console.log('HID device closed')
    }
  }

  /** 发送 APDU 指令（hex 字符串），返回响应 */
  sendApdu(hexCommand: string): ApduResponse {
    if (!this.device) {
      if (!this.openDevice()) {
        throw new Error('Device not connected or failed to open')
      }
    }

    const cmdBytes = hexToBytes(hexCommand)

    // HID write: 第一个字节是 Report ID（通常为 0x00）
    const writeData = [0x00, ...cmdBytes]
    console.log('>>> SEND:', bytesToHex(cmdBytes))

    try {
      this.device!.write(writeData)
    } catch (err) {
      // 写入失败可能是设备断开
      this.closeDevice()
      throw new Error(`Write failed: ${err}`)
    }

    // 读取响应（超时 5 秒）
    let responseBytes: number[]
    try {
      const raw = this.device!.readTimeout(5000)
      if (!raw || raw.length === 0) {
        throw new Error('Read timeout - no response from device')
      }
      responseBytes = Array.from(raw)
    } catch (err) {
      this.closeDevice()
      throw new Error(`Read failed: ${err}`)
    }

    console.log('<<< RECV:', bytesToHex(responseBytes))
    return parseApduResponse(responseBytes)
  }

  private checkDevice(): void {
    if (!HID) return

    try {
      const devices = HID.devices()
      const targetDevice = devices.find(
        (d) => d.vendorId === TARGET_VENDOR_ID && d.productId === TARGET_PRODUCT_ID
      )

      if (targetDevice && !this.isConnected) {
        // 设备出现 → 标记连接并打开
        this.isConnected = true
        this.openDevice(targetDevice.path)
        const info: DeviceInfo = {
          manufacturer: targetDevice.manufacturer,
          product: targetDevice.product,
          serialNumber: targetDevice.serialNumber
        }
        console.log('Clavis device connected:', info)
        this.mainWindow?.webContents.send('device:connected', info)
      } else if (!targetDevice && this.isConnected) {
        // 设备从列表消失 → 标记断开
        this.isConnected = false
        this.closeDevice()
        console.log('Clavis device disconnected')
        this.mainWindow?.webContents.send('device:disconnected')
      }
    } catch (err) {
      console.error('Error polling USB devices:', err)
    }
  }

  destroy(): void {
    this.stopPolling()
    this.closeDevice()
    this.mainWindow = null
  }
}

export const usbManager = new UsbManager()
