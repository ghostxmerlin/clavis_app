/**
 * CTAP HID 协议帧解析与构建
 *
 * 参考: FIDO CTAP v2.2 §11.2 USB Human Interface Device (USB HID)
 *
 * 初始帧 (64 bytes): CID(4) | CMD(1) | BCNTH(1) | BCNTL(1) | DATA(最多57)
 *   - CMD bit7=1 表示初始帧
 *   - BCNT = 总数据长度
 *
 * 续帧   (64 bytes): CID(4) | SEQ(1) | DATA(最多59)
 *   - SEQ 从 0 递增，bit7=0
 */

// ── CTAP HID 协议常量 ──

export const CTAPHID_PACKET_SIZE = 64
export const CTAPHID_INIT_DATA_SIZE = 57   // 64 - 7
export const CTAPHID_CONT_DATA_SIZE = 59   // 64 - 5
export const CTAPHID_BROADCAST_CID: readonly number[] = [0xff, 0xff, 0xff, 0xff]

/** CTAP HID 命令码（不含 bit7，发送时需 | 0x80） */
export const CTAPHID_CMD = {
  PING: 0x01,
  MSG: 0x03,
  LOCK: 0x04,
  INIT: 0x06,
  WINK: 0x08,
  CBOR: 0x10,
  CANCEL: 0x11,
  KEEPALIVE: 0x3b,
  ERROR: 0x3f,
  VENDOR_FIRST: 0x40,
  VENDOR_LAST: 0x7f
} as const

/** CTAP HID 错误码 */
export const CTAPHID_ERR = {
  INVALID_CMD: 0x01,
  INVALID_PAR: 0x02,
  INVALID_LEN: 0x03,
  INVALID_SEQ: 0x04,
  MSG_TIMEOUT: 0x05,
  CHANNEL_BUSY: 0x06,
  LOCK_REQUIRED: 0x0a,
  INVALID_CHANNEL: 0x0b,
  OTHER: 0x7f
} as const

/** CTAP HID 能力标志 */
export const CTAPHID_CAPABILITY = {
  WINK: 0x01,
  CBOR: 0x04,
  NMSG: 0x08
} as const

/** KEEPALIVE 状态码 */
export const CTAPHID_KEEPALIVE_STATUS = {
  PROCESSING: 1,
  UPNEEDED: 2
} as const

// ── 类型定义 ──

export interface ApduCommand {
  raw: string
  bytes: number[]
  timestamp: number
}

export interface ApduResponse {
  raw: string           // 完整重组后的 hex
  bytes: number[]       // 完整重组后的字节
  frameCount: number    // 收到的帧数
  totalLength: number   // BCNT 声明的总数据长度
  cmd: number           // 响应命令字节（含 bit7）
  data: string          // 纯数据部分 hex（不含帧头）
  dataBytes: number[]   // 纯数据部分字节
  timestamp: number
}

export interface CtapHidInitResult {
  nonce: number[]
  cid: number[]
  cidHex: string
  protocolVersion: number
  majorVersion: number
  minorVersion: number
  buildVersion: number
  capabilities: number
  capabilityNames: string[]
}

export interface ApduLog {
  id: number
  direction: 'send' | 'recv'
  hex: string
  timestamp: number
  error?: string
}

/** 将 hex 字符串转为字节数组 */
export function hexToBytes(hex: string): number[] {
  const clean = hex.replace(/\s+/g, '')
  if (clean.length % 2 !== 0) {
    throw new Error(`Invalid hex string length: ${clean.length}`)
  }
  if (!/^[0-9a-fA-F]*$/.test(clean)) {
    throw new Error('Invalid hex characters')
  }
  const bytes: number[] = []
  for (let i = 0; i < clean.length; i += 2) {
    bytes.push(parseInt(clean.substring(i, i + 2), 16))
  }
  return bytes
}

/** 将字节数组转为 hex 字符串 */
export function bytesToHex(bytes: number[] | Buffer | Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase()
}

/** 构建 APDU 命令 */
export function buildApduCommand(hex: string): ApduCommand {
  const bytes = hexToBytes(hex)
  return {
    raw: hex.toUpperCase().replace(/\s+/g, ''),
    bytes,
    timestamp: Date.now()
  }
}

/** 解析 APDU 响应 */
export function parseApduResponse(bytes: number[]): ApduResponse {
  const hex = bytesToHex(bytes)
  return {
    raw: hex,
    bytes,
    frameCount: 1,
    totalLength: bytes.length,
    cmd: 0,
    data: hex,
    dataBytes: bytes,
    timestamp: Date.now()
  }
}

/**
 * 从 CTAP HID 多帧数据中重组出完整响应
 * @param frames 收到的所有原始帧（每帧 64 字节）
 */
export function reassembleCtapHidResponse(frames: number[][]): ApduResponse {
  if (frames.length === 0) {
    return {
      raw: '',
      bytes: [],
      frameCount: 0,
      totalLength: 0,
      cmd: 0,
      data: '',
      dataBytes: [],
      timestamp: Date.now()
    }
  }

  const initFrame = frames[0]
  const cmd = initFrame[4]
  const isInitFrame = (cmd & 0x80) !== 0

  if (!isInitFrame) {
    // 非初始帧格式，原样返回
    const allBytes = frames.flat()
    return {
      raw: bytesToHex(allBytes),
      bytes: allBytes,
      frameCount: frames.length,
      totalLength: allBytes.length,
      cmd,
      data: bytesToHex(allBytes),
      dataBytes: allBytes,
      timestamp: Date.now()
    }
  }

  // CTAP HID 初始帧: CID(4) CMD(1) BCNTH(1) BCNTL(1) DATA(57)
  const totalLength = (initFrame[5] << 8) | initFrame[6]
  const initData = initFrame.slice(7, 7 + Math.min(totalLength, 57))

  // 收集续帧数据: CID(4) SEQ(1) DATA(59)
  const payload = [...initData]
  for (let i = 1; i < frames.length && payload.length < totalLength; i++) {
    const contData = frames[i].slice(5, 5 + Math.min(totalLength - payload.length, 59))
    payload.push(...contData)
  }

  // 截断到声明的长度
  const data = payload.slice(0, totalLength)

  // 构造完整的重组视图：CID + CMD + LEN + DATA
  const cid = initFrame.slice(0, 4)
  const fullBytes = [...cid, cmd, (totalLength >> 8) & 0xff, totalLength & 0xff, ...data]

  return {
    raw: bytesToHex(fullBytes),
    bytes: fullBytes,
    frameCount: frames.length,
    totalLength,
    cmd,
    data: bytesToHex(data),
    dataBytes: data,
    timestamp: Date.now()
  }
}

/** 格式化 hex 字符串，每 2 字符加空格 */
export function formatHex(hex: string): string {
  const clean = hex.replace(/\s+/g, '').toUpperCase()
  return clean.replace(/(.{2})/g, '$1 ').trim()
}

/** 解读 SW 状态码（保留兼容，CTAP 返回可能不含 SW） */
export function swToString(sw1: number, sw2: number): string {
  const sw = (sw1 << 8) | sw2
  switch (sw) {
    case 0x9000:
      return '成功 (9000)'
    case 0x6a82:
      return '文件未找到 (6A82)'
    case 0x6a86:
      return '参数错误 (6A86)'
    case 0x6d00:
      return '指令不支持 (6D00)'
    case 0x6e00:
      return 'CLA 不支持 (6E00)'
    default:
      return `${bytesToHex([sw1, sw2])}`
  }
}

// ── CTAP HID 帧构建 ──

/** 补零到 64 字节 */
export function padFrame(data: number[]): number[] {
  if (data.length >= CTAPHID_PACKET_SIZE) return data.slice(0, CTAPHID_PACKET_SIZE)
  const padded = new Array(CTAPHID_PACKET_SIZE).fill(0)
  for (let i = 0; i < data.length; i++) {
    padded[i] = data[i]
  }
  return padded
}

/** 构建 CTAP HID 初始帧（64 字节） */
export function buildCtapHidInitPacket(cid: readonly number[], cmd: number, payload: number[]): number[] {
  const frame = new Array(CTAPHID_PACKET_SIZE).fill(0)
  frame[0] = cid[0]; frame[1] = cid[1]; frame[2] = cid[2]; frame[3] = cid[3]
  frame[4] = cmd | 0x80
  frame[5] = (payload.length >> 8) & 0xff
  frame[6] = payload.length & 0xff
  const copyLen = Math.min(payload.length, CTAPHID_INIT_DATA_SIZE)
  for (let i = 0; i < copyLen; i++) {
    frame[7 + i] = payload[i]
  }
  return frame
}

/** 构建 CTAP HID 续帧（64 字节） */
export function buildCtapHidContPacket(cid: readonly number[], seq: number, data: number[]): number[] {
  const frame = new Array(CTAPHID_PACKET_SIZE).fill(0)
  frame[0] = cid[0]; frame[1] = cid[1]; frame[2] = cid[2]; frame[3] = cid[3]
  frame[4] = seq & 0x7f
  const copyLen = Math.min(data.length, CTAPHID_CONT_DATA_SIZE)
  for (let i = 0; i < copyLen; i++) {
    frame[5 + i] = data[i]
  }
  return frame
}

/** 将 payload 分帧为 CTAP HID 帧序列 */
export function buildCtapHidFrames(cid: readonly number[], cmd: number, payload: number[]): number[][] {
  const frames: number[][] = []
  frames.push(buildCtapHidInitPacket(cid, cmd, payload))
  let offset = CTAPHID_INIT_DATA_SIZE
  let seq = 0
  while (offset < payload.length) {
    const chunk = payload.slice(offset, offset + CTAPHID_CONT_DATA_SIZE)
    frames.push(buildCtapHidContPacket(cid, seq, chunk))
    offset += CTAPHID_CONT_DATA_SIZE
    seq++
  }
  return frames
}

/** 解析 CTAPHID_INIT 响应数据 */
export function parseCtapHidInitResponse(dataBytes: number[]): CtapHidInitResult {
  if (dataBytes.length < 17) {
    throw new Error(`CTAPHID_INIT response too short: ${dataBytes.length} bytes`)
  }
  const capabilities = dataBytes[16]
  const capabilityNames: string[] = []
  if (capabilities & CTAPHID_CAPABILITY.WINK) capabilityNames.push('WINK')
  if (capabilities & CTAPHID_CAPABILITY.CBOR) capabilityNames.push('CBOR')
  if (capabilities & CTAPHID_CAPABILITY.NMSG) capabilityNames.push('NMSG')
  return {
    nonce: dataBytes.slice(0, 8),
    cid: dataBytes.slice(8, 12),
    cidHex: bytesToHex(dataBytes.slice(8, 12)),
    protocolVersion: dataBytes[12],
    majorVersion: dataBytes[13],
    minorVersion: dataBytes[14],
    buildVersion: dataBytes[15],
    capabilities,
    capabilityNames
  }
}

/** 解读 CTAP HID 错误码 */
export function ctapHidErrorToString(code: number): string {
  switch (code) {
    case CTAPHID_ERR.INVALID_CMD: return 'ERR_INVALID_CMD: 无效命令'
    case CTAPHID_ERR.INVALID_PAR: return 'ERR_INVALID_PAR: 无效参数'
    case CTAPHID_ERR.INVALID_LEN: return 'ERR_INVALID_LEN: 无效长度'
    case CTAPHID_ERR.INVALID_SEQ: return 'ERR_INVALID_SEQ: 序列号错误'
    case CTAPHID_ERR.MSG_TIMEOUT: return 'ERR_MSG_TIMEOUT: 消息超时'
    case CTAPHID_ERR.CHANNEL_BUSY: return 'ERR_CHANNEL_BUSY: 通道忙'
    case CTAPHID_ERR.LOCK_REQUIRED: return 'ERR_LOCK_REQUIRED: 需要通道锁'
    case CTAPHID_ERR.INVALID_CHANNEL: return 'ERR_INVALID_CHANNEL: 无效通道'
    case CTAPHID_ERR.OTHER: return 'ERR_OTHER: 未知错误'
    default: return `UNKNOWN_ERROR (0x${code.toString(16).padStart(2, '0')})`
  }
}

/** 解读 CTAP HID 命令名称 */
export function ctapHidCmdName(cmd: number): string {
  const rawCmd = cmd & 0x7f
  switch (rawCmd) {
    case CTAPHID_CMD.PING: return 'CTAPHID_PING'
    case CTAPHID_CMD.MSG: return 'CTAPHID_MSG'
    case CTAPHID_CMD.LOCK: return 'CTAPHID_LOCK'
    case CTAPHID_CMD.INIT: return 'CTAPHID_INIT'
    case CTAPHID_CMD.WINK: return 'CTAPHID_WINK'
    case CTAPHID_CMD.CBOR: return 'CTAPHID_CBOR'
    case CTAPHID_CMD.CANCEL: return 'CTAPHID_CANCEL'
    case CTAPHID_CMD.KEEPALIVE: return 'CTAPHID_KEEPALIVE'
    case CTAPHID_CMD.ERROR: return 'CTAPHID_ERROR'
    default:
      if (rawCmd >= CTAPHID_CMD.VENDOR_FIRST && rawCmd <= CTAPHID_CMD.VENDOR_LAST)
        return `VENDOR_0x${rawCmd.toString(16)}`
      return `CMD_0x${rawCmd.toString(16)}`
  }
}
