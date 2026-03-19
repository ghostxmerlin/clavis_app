import { BrowserWindow } from 'electron'
import {
  hexToBytes,
  bytesToHex,
  reassembleCtapHidResponse,
  padFrame,
  buildCtapHidFrames,
  parseCtapHidInitResponse,
  ctapHidErrorToString,
  ctapHidCmdName,
  CTAPHID_PACKET_SIZE,
  CTAPHID_BROADCAST_CID,
  CTAPHID_CMD,
  CTAPHID_KEEPALIVE_STATUS,
  type ApduResponse,
  type CtapHidInitResult
} from './apdu-parser'

// Device VID/PID
const TARGET_VENDOR_ID = 0x2f0a
const TARGET_PRODUCT_ID = 0x0f71
const POLL_INTERVAL_MS = 1000

/** 帧读取超时 */
const INIT_FRAME_TIMEOUT_MS = 5000
const CONT_FRAME_TIMEOUT_MS = 2000
/** KEEPALIVE 最大等待次数（每次约 100ms，100 次 ≈ 10s） */
const MAX_KEEPALIVE_COUNT = 100

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

  /** 通过 CTAPHID_INIT 握手分配的通道 ID */
  private allocatedCid: number[] | null = null
  /** CTAPHID_INIT 返回的完整通道信息 */
  private channelInfo: CtapHidInitResult | null = null

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

  /** 获取当前通道信息（供 IPC 查询） */
  getChannelInfo(): { cid: string; info: CtapHidInitResult } | null {
    if (!this.allocatedCid || !this.channelInfo) return null
    return { cid: bytesToHex(this.allocatedCid), info: this.channelInfo }
  }

  // ── 底层帧 IO ──

  /** 写入一帧（自动补零到 64 字节并添加 Report ID 前缀） */
  private writeFrame(frame: number[]): void {
    if (!this.device) throw new Error('Device not connected')
    const padded = padFrame(frame)
    // node-hid write 第一个字节是 Report ID（0x00）
    try {
      this.device.write([0x00, ...padded])
    } catch (err) {
      this.handleDeviceError('Write failed')
      throw new Error(`Write failed: ${err}`)
    }
  }

  /** 读取一帧（64 字节） */
  private readFrame(timeout: number): number[] {
    if (!this.device) throw new Error('Device not connected')
    try {
      const raw = this.device.readTimeout(timeout)
      if (!raw || raw.length === 0) {
        throw new Error('Read timeout - no response from device')
      }
      return Array.from(raw)
    } catch (err) {
      // 区分超时和设备断开
      const msg = String(err)
      if (msg.includes('timeout')) throw err
      this.handleDeviceError('Read failed')
      throw err
    }
  }

  /** 通讯异常时关闭设备并标记断开 */
  private handleDeviceError(context: string): void {
    console.error(`Device error (${context}), marking disconnected`)
    this.isConnected = false
    this.closeDevice()
    this.mainWindow?.webContents.send('device:disconnected')
  }

  // ── CTAP HID 协议响应读取 ──

  /**
   * 读取完整的 CTAP HID 响应（处理 KEEPALIVE 和 ERROR）
   *
   * 按照 FIDO CTAP §11.2 规范：
   * - KEEPALIVE 帧（CMD=0xBB）表示设备仍在处理，需继续等待
   * - ERROR 帧（CMD=0xBF）表示发生错误，需抛出异常
   * - 正常响应：读取初始帧 + 所有续帧
   */
  private readCtapHidResponse(): ApduResponse {
    const frames: number[][] = []
    let keepaliveCount = 0

    // 读初始帧（跳过 KEEPALIVE）
    let firstFrame: number[]
    while (true) {
      try {
        firstFrame = this.readFrame(INIT_FRAME_TIMEOUT_MS)
      } catch (err) {
        throw new Error(`Read response failed: ${err}`)
      }

      const cmd = firstFrame[4]

      // KEEPALIVE（CMD = 0x3B | 0x80 = 0xBB）
      if (cmd === (CTAPHID_CMD.KEEPALIVE | 0x80)) {
        keepaliveCount++
        const status = firstFrame[7]
        const statusText = status === CTAPHID_KEEPALIVE_STATUS.PROCESSING
          ? 'PROCESSING' : status === CTAPHID_KEEPALIVE_STATUS.UPNEEDED
            ? 'UP_NEEDED' : `STATUS_${status}`
        console.log(`  KEEPALIVE #${keepaliveCount}: ${statusText}`)
        if (keepaliveCount > MAX_KEEPALIVE_COUNT) {
          throw new Error('Device timeout: too many KEEPALIVE responses')
        }
        continue
      }

      // ERROR（CMD = 0x3F | 0x80 = 0xBF）
      if (cmd === (CTAPHID_CMD.ERROR | 0x80)) {
        const errorCode = firstFrame[7]
        throw new Error(`CTAPHID_ERROR: ${ctapHidErrorToString(errorCode)}`)
      }

      // 正常初始帧
      break
    }

    frames.push(firstFrame)
    const cmd = firstFrame[4]

    // 检查是否为 CTAP HID 初始帧，读取续帧
    if (cmd & 0x80) {
      const totalLength = (firstFrame[5] << 8) | firstFrame[6]
      const initDataLen = Math.min(totalLength, 57)
      let received = initDataLen

      console.log(`  CTAP HID: ${ctapHidCmdName(cmd)}, BCNT=${totalLength}, initData=${initDataLen}`)

      while (received < totalLength) {
        try {
          const contFrame = this.readFrame(CONT_FRAME_TIMEOUT_MS)

          // 续帧中也可能混入 KEEPALIVE（设备仍在处理但已发出部分数据）
          const contCmd = contFrame[4]
          if (contCmd === (CTAPHID_CMD.KEEPALIVE | 0x80)) {
            console.log('  KEEPALIVE during continuation frames')
            continue
          }
          if (contCmd === (CTAPHID_CMD.ERROR | 0x80)) {
            const errorCode = contFrame[7]
            throw new Error(`CTAPHID_ERROR during read: ${ctapHidErrorToString(errorCode)}`)
          }

          frames.push(contFrame)
          const contDataLen = Math.min(totalLength - received, 59)
          received += contDataLen
        } catch (err) {
          if (String(err).includes('CTAPHID_ERROR')) throw err
          console.warn(`  Continuation frame error at ${received}/${totalLength}: ${err}`)
          break
        }
      }

      console.log(`  Read ${frames.length} frame(s), ${received}/${totalLength} bytes`)
    }

    return reassembleCtapHidResponse(frames)
  }

  // ── CTAP HID 通道初始化 ──

  /**
   * 执行 CTAPHID_INIT 握手（§11.2.9.1.3）
   * 向广播 CID 发送 8 字节随机 nonce，设备返回分配的 CID
   */
  initChannel(): CtapHidInitResult {
    if (!this.device) {
      if (!this.openDevice()) {
        throw new Error('Device not connected or failed to open')
      }
    }

    // 生成 8 字节随机 nonce
    const nonce: number[] = []
    for (let i = 0; i < 8; i++) {
      nonce.push(Math.floor(Math.random() * 256))
    }

    console.log('>>> CTAPHID_INIT: nonce =', bytesToHex(nonce))

    // 构建 INIT 请求帧: 广播 CID + CMD=INIT + DATA=nonce
    const frames = buildCtapHidFrames([...CTAPHID_BROADCAST_CID], CTAPHID_CMD.INIT, nonce)
    this.writeFrame(frames[0])

    // 读取响应
    const response = this.readCtapHidResponse()

    // 解析 INIT 响应
    const initResult = parseCtapHidInitResponse(response.dataBytes)

    // 验证 nonce 匹配
    const nonceMatch = nonce.every((b, i) => b === initResult.nonce[i])
    if (!nonceMatch) {
      throw new Error('CTAPHID_INIT nonce mismatch!')
    }

    this.allocatedCid = [...initResult.cid]
    this.channelInfo = initResult

    console.log(`<<< CTAPHID_INIT: CID=${initResult.cidHex}, ` +
      `proto=${initResult.protocolVersion}, ` +
      `ver=${initResult.majorVersion}.${initResult.minorVersion}.${initResult.buildVersion}, ` +
      `caps=[${initResult.capabilityNames.join(',')}]`)

    return initResult
  }

  // ── 高级发送接口 ──

  /**
   * 发送 CTAP HID 命令（使用已分配的 CID，规范帧格式）
   *
   * @param cmd CTAP HID 命令码（不含 bit7，如 0x10 = CBOR）
   * @param payload 命令数据
   */
  sendCtapHid(cmd: number, payload: number[]): ApduResponse {
    if (!this.device) {
      throw new Error('Device not connected')
    }
    if (!this.allocatedCid) {
      throw new Error('Channel not initialized. Call initChannel() first.')
    }

    console.log(`>>> ${ctapHidCmdName(cmd | 0x80)}: ${payload.length} bytes`)

    // 构建所有帧
    const frames = buildCtapHidFrames(this.allocatedCid, cmd, payload)

    // 依次发送所有帧
    for (const frame of frames) {
      this.writeFrame(frame)
    }

    // 读取响应
    const response = this.readCtapHidResponse()
    console.log(`<<< RECV: ${ctapHidCmdName(response.cmd)}, ${response.totalLength} bytes, ${response.frameCount} frame(s)`)
    return response
  }

  /**
   * 发送原始 hex 指令（调试面板用，帧自动补零到 64 字节）
   * 兼容旧有行为：hex 内容即为帧的完整内容（CID+CMD+BCNT+DATA）
   */
  sendRawHex(hexCommand: string): ApduResponse {
    if (!this.device) {
      if (!this.openDevice()) {
        throw new Error('Device not connected or failed to open')
      }
    }

    const cmdBytes = hexToBytes(hexCommand)

    // 补零到 64 字节
    const paddedFrame = padFrame(cmdBytes)
    console.log('>>> RAW SEND:', bytesToHex(paddedFrame).substring(0, 40), '...')
    this.writeFrame(paddedFrame)

    // 读取响应（带 KEEPALIVE/ERROR 处理）
    const response = this.readCtapHidResponse()
    console.log('<<< RAW RECV:', response.data.substring(0, 80), response.data.length > 80 ? '...' : '')
    return response
  }

  // ── 设备连接管理 ──

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
      this.allocatedCid = null
      this.channelInfo = null
      console.log('HID device closed')
    }
  }

  private checkDevice(): void {
    if (!HID) return

    try {
      const devices = HID.devices()
      const targetDevice = devices.find(
        (d) => d.vendorId === TARGET_VENDOR_ID && d.productId === TARGET_PRODUCT_ID
      )

      if (targetDevice && !this.isConnected) {
        // 设备出现 → 尝试打开
        if (!this.openDevice(targetDevice.path)) {
          return
        }
        this.isConnected = true
        const info: DeviceInfo = {
          manufacturer: targetDevice.manufacturer,
          product: targetDevice.product,
          serialNumber: targetDevice.serialNumber
        }
        console.log('Clavis device connected:', info)

        // 自动执行 CTAPHID_INIT 握手
        try {
          this.initChannel()
          console.log('CTAPHID channel initialized successfully')
        } catch (err) {
          console.warn('CTAPHID_INIT failed (device may still work with raw commands):', err)
        }

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
