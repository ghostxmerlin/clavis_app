/**
 * APDU (Application Protocol Data Unit) 指令解析与构建
 *
 * 指令格式（hex string）：
 *   [CLA(1B)] [INS(1B)] [P1(1B)] [P2(1B)] [Lc(1B)] [Data(Lc B)] [Le(1B)]
 *
 * 示例：0000000190000104
 *   CLA=00, INS=00, P1=00, P2=01, Lc=90(=144), Data=0001, Le=04
 *   → 等等，这里需要根据实际协议判断。先按原始 hex 透传。
 */

export interface ApduCommand {
  raw: string // 完整 hex 字符串
  bytes: number[] // 字节数组
  timestamp: number
}

export interface ApduResponse {
  raw: string // 完整 hex 字符串
  bytes: number[]
  sw1: number // 状态字1
  sw2: number // 状态字2
  data: string // 去掉 SW 后的数据部分 hex
  timestamp: number
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
  if (bytes.length < 2) {
    return {
      raw: hex,
      bytes,
      sw1: 0,
      sw2: 0,
      data: hex,
      timestamp: Date.now()
    }
  }
  const sw1 = bytes[bytes.length - 2]
  const sw2 = bytes[bytes.length - 1]
  const dataBytes = bytes.slice(0, bytes.length - 2)
  return {
    raw: hex,
    bytes,
    sw1,
    sw2,
    data: bytesToHex(dataBytes),
    timestamp: Date.now()
  }
}

/** 格式化 hex 字符串，每 2 字符加空格 */
export function formatHex(hex: string): string {
  const clean = hex.replace(/\s+/g, '').toUpperCase()
  return clean.replace(/(.{2})/g, '$1 ').trim()
}

/** 解读 SW 状态码 */
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
