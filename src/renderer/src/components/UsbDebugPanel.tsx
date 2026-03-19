import { useState, useRef, useEffect, useCallback } from 'react'
import {
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  Chip,
  IconButton,
  Tooltip,
  Divider
} from '@mui/material'
import SendIcon from '@mui/icons-material/Send'
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import UsbIcon from '@mui/icons-material/Usb'
import InfoIcon from '@mui/icons-material/Info'
import type { CtapChannelInfo } from '../types'

interface LogEntry {
  id: number
  direction: 'send' | 'recv' | 'error' | 'info'
  hex: string
  detail?: string
  timestamp: number
}

function formatTime(ts: number): string {
  const d = new Date(ts)
  return d.toLocaleTimeString('zh-CN', { hour12: false }) + '.' + String(d.getMilliseconds()).padStart(3, '0')
}

function formatHex(hex: string): string {
  return hex.replace(/\s+/g, '').toUpperCase().replace(/(.{2})/g, '$1 ').trim()
}

export default function UsbDebugPanel(): React.JSX.Element {
  const [input, setInput] = useState('')
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [sending, setSending] = useState(false)
  const [channelInfo, setChannelInfo] = useState<{ cid: string; info: CtapChannelInfo } | null>(null)
  const logEndRef = useRef<HTMLDivElement>(null)
  const nextId = useRef(1)

  const addLog = useCallback((direction: LogEntry['direction'], hex: string, detail?: string) => {
    setLogs((prev) => [...prev, { id: nextId.current++, direction, hex, detail, timestamp: Date.now() }])
  }, [])

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [logs])

  // 查询通道信息
  const refreshChannelInfo = useCallback(async () => {
    const info = await window.clavis.ctapChannelInfo()
    setChannelInfo(info)
  }, [])

  useEffect(() => {
    refreshChannelInfo()
  }, [refreshChannelInfo])

  // CTAPHID_INIT 握手
  const handleInit = async (): Promise<void> => {
    setSending(true)
    addLog('info', '', 'CTAPHID_INIT → 广播 CID 0xFFFFFFFF')
    try {
      const result = await window.clavis.ctapInit()
      if (result.success && result.result) {
        const r = result.result
        addLog('recv', '', `通道分配成功: CID=${r.cidHex}, 协议v${r.protocolVersion}, ` +
          `版本${r.majorVersion}.${r.minorVersion}.${r.buildVersion}, 能力=[${r.capabilityNames.join(', ')}]`)
        refreshChannelInfo()
      } else {
        addLog('error', '', result.error || 'INIT 失败')
      }
    } catch (err) {
      addLog('error', '', String(err))
    } finally {
      setSending(false)
    }
  }

  // authenticatorGetInfo (CTAPHID_CBOR, cmd=0x04)
  const handleGetInfo = async (): Promise<void> => {
    setSending(true)
    addLog('send', '04', 'CTAPHID_CBOR → authenticatorGetInfo (0x04)')
    try {
      const result = await window.clavis.ctapSend(0x10, [0x04])
      if (result.success && result.response) {
        const resp = result.response
        addLog('recv', resp.raw,
          `${resp.frameCount} 帧, ${resp.totalLength} 字节, CMD=0x${resp.cmd.toString(16).toUpperCase()}`)
      } else {
        addLog('error', '', result.error || '未知错误')
      }
    } catch (err) {
      addLog('error', '', String(err))
    } finally {
      setSending(false)
    }
  }

  // CTAPHID_PING
  const handlePing = async (): Promise<void> => {
    setSending(true)
    const pingData = [0x01, 0x02, 0x03, 0x04]
    addLog('send', '01020304', 'CTAPHID_PING → 4 bytes echo test')
    try {
      const result = await window.clavis.ctapSend(0x01, pingData)
      if (result.success && result.response) {
        const resp = result.response
        addLog('recv', resp.raw,
          `PING reply: ${resp.frameCount} 帧, ${resp.totalLength} 字节`)
      } else {
        addLog('error', '', result.error || '未知错误')
      }
    } catch (err) {
      addLog('error', '', String(err))
    } finally {
      setSending(false)
    }
  }

  // 原始 hex 发送（帧自动补零到 64 字节）
  const handleSend = async (): Promise<void> => {
    const hex = input.replace(/\s+/g, '')
    if (!hex || hex.length % 2 !== 0 || !/^[0-9a-fA-F]+$/.test(hex)) {
      addLog('error', '', '无效的 hex 字符串')
      return
    }

    addLog('send', hex.toUpperCase())
    setSending(true)

    try {
      const result = await window.clavis.sendApdu(hex)
      if (result.success && result.response) {
        const resp = result.response
        addLog('recv', resp.raw,
          `${resp.frameCount} 帧, ${resp.totalLength} 字节, CMD=0x${resp.cmd.toString(16).toUpperCase()}`)
      } else {
        addLog('error', '', result.error || '未知错误')
      }
    } catch (err) {
      addLog('error', '', String(err))
    } finally {
      setSending(false)
    }
  }

  const handleClear = (): void => { setLogs([]) }

  const copyLog = (entry: LogEntry): void => {
    navigator.clipboard.writeText(entry.hex || entry.detail || '')
  }

  const handleKeyDown = (e: React.KeyboardEvent): void => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const dirColor = (dir: string): string => {
    if (dir === 'send') return '#5A9A42'
    if (dir === 'recv') return '#80C269'
    if (dir === 'info') return '#FFB74D'
    return '#FF5252'
  }

  const dirLabel = (dir: string): string => {
    if (dir === 'send') return 'TX'
    if (dir === 'recv') return 'RX'
    if (dir === 'info') return 'SYS'
    return 'ERR'
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, gap: 2 }}>
        <Typography variant="h5" sx={{ flexGrow: 1 }}>
          USB 指令调试
        </Typography>
        <Tooltip title="清空日志">
          <IconButton onClick={handleClear} size="small">
            <DeleteSweepIcon />
          </IconButton>
        </Tooltip>
      </Box>

      {/* CTAP HID 通道状态 */}
      <Paper sx={{ p: 2, mb: 2, border: '1px solid', borderColor: 'divider' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
          <UsbIcon fontSize="small" color={channelInfo ? 'success' : 'disabled'} />
          <Typography variant="subtitle2">
            CTAP HID 通道
          </Typography>
          {channelInfo ? (
            <Chip label={`CID: ${channelInfo.cid}`} size="small" color="success" variant="outlined"
              sx={{ fontFamily: 'monospace', fontWeight: 700 }} />
          ) : (
            <Chip label="未初始化" size="small" color="warning" variant="outlined" />
          )}
          {channelInfo && (
            <>
              <Chip label={`v${channelInfo.info.protocolVersion}`} size="small" variant="outlined" />
              {channelInfo.info.capabilityNames.map((c) => (
                <Chip key={c} label={c} size="small" variant="outlined" sx={{ fontSize: '0.7rem' }} />
              ))}
            </>
          )}
        </Box>

        {/* CTAP 快捷命令 */}
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Button size="small" variant="outlined" onClick={handleInit} disabled={sending}
            startIcon={<UsbIcon />}>
            初始化通道
          </Button>
          <Button size="small" variant="outlined" onClick={handleGetInfo} disabled={sending || !channelInfo}
            startIcon={<InfoIcon />}>
            GetInfo
          </Button>
          <Button size="small" variant="outlined" onClick={handlePing} disabled={sending || !channelInfo}>
            Ping
          </Button>
        </Box>
      </Paper>

      {/* 原始指令输入区 */}
      <Paper sx={{ p: 2, mb: 2, border: '1px solid', borderColor: 'divider' }}>
        <Typography variant="body2" sx={{ mb: 1, color: 'text.secondary' }}>
          原始 HEX 发送（帧自动补零到 64 字节，不经 CID 重写）
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
          <TextField
            fullWidth
            size="small"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="FFFFFFFF 86 0008 0102030405060708"
            disabled={sending}
            slotProps={{
              input: {
                sx: { fontFamily: 'monospace', fontSize: '0.9rem', letterSpacing: '0.05em' }
              }
            }}
          />
          <Button
            variant="contained"
            onClick={handleSend}
            disabled={sending}
            startIcon={<SendIcon />}
            sx={{ minWidth: 100, whiteSpace: 'nowrap' }}
          >
            {sending ? '发送中...' : '发送'}
          </Button>
        </Box>
        <Typography variant="caption" sx={{ mt: 0.5, color: 'text.secondary', display: 'block' }}>
          按 Enter 快速发送 · 格式: CID(4) CMD(1) BCNTH(1) BCNTL(1) DATA...
        </Typography>
      </Paper>

      <Divider sx={{ mb: 2 }} />

      {/* 收发日志区 */}
      <Paper
        sx={{
          border: '1px solid',
          borderColor: '#2A2A2A',
          bgcolor: '#0A0A0A',
          borderRadius: 1,
          overflow: 'hidden'
        }}
      >
        <Box sx={{ p: 1, borderBottom: '1px solid #1A1A1A', display: 'flex', alignItems: 'center' }}>
          <Typography variant="caption" sx={{ color: '#5A9A42', flexGrow: 1, fontFamily: 'monospace' }}>
            {'>'} 通讯日志 · {logs.length} 条记录
          </Typography>
        </Box>
        <Box
          sx={{
            height: 400,
            overflow: 'auto',
            p: 1,
            fontFamily: 'monospace',
            fontSize: '0.8rem',
            lineHeight: 1.8
          }}
        >
          {logs.length === 0 ? (
            <Typography sx={{ color: '#3A5A2A', textAlign: 'center', py: 4, fontSize: '0.8rem', fontFamily: 'monospace' }}>
              _ 等待指令...
            </Typography>
          ) : (
            logs.map((entry) => (
              <Box
                key={entry.id}
                sx={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 1,
                  py: 0.3,
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.05)' },
                  borderRadius: 0.5,
                  px: 0.5
                }}
              >
                <Typography sx={{ color: '#555', fontSize: '0.75rem', minWidth: 85, flexShrink: 0, pt: 0.2, fontFamily: 'monospace' }}>
                  {formatTime(entry.timestamp)}
                </Typography>
                <Chip
                  label={dirLabel(entry.direction)}
                  size="small"
                  sx={{
                    bgcolor: dirColor(entry.direction),
                    color: '#000',
                    fontWeight: 700,
                    fontSize: '0.65rem',
                    height: 20,
                    minWidth: 36
                  }}
                />
                <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                  {entry.hex && (
                    <Typography
                      sx={{
                        color: entry.direction === 'send' ? '#A3D98F' : '#80C269',
                        fontSize: '0.8rem',
                        fontFamily: 'monospace',
                        wordBreak: 'break-all'
                      }}
                    >
                      {formatHex(entry.hex)}
                    </Typography>
                  )}
                  {entry.detail && (
                    <Typography sx={{ color: entry.direction === 'error' ? '#FF5252' : '#666', fontSize: '0.75rem' }}>
                      {entry.detail}
                    </Typography>
                  )}
                </Box>
                {entry.hex && (
                  <Tooltip title="复制">
                    <IconButton size="small" onClick={() => copyLog(entry)} sx={{ color: '#333' }}>
                      <ContentCopyIcon sx={{ fontSize: 14 }} />
                    </IconButton>
                  </Tooltip>
                )}
              </Box>
            ))
          )}
          <div ref={logEndRef} />
        </Box>
      </Paper>
    </Box>
  )
}
