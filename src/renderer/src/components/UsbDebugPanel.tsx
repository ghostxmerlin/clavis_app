import { useState, useRef, useEffect } from 'react'
import {
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  Chip,
  IconButton,
  Tooltip
} from '@mui/material'
import SendIcon from '@mui/icons-material/Send'
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'

interface LogEntry {
  id: number
  direction: 'send' | 'recv' | 'error'
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
  const [input, setInput] = useState('0000000190000104')
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [sending, setSending] = useState(false)
  const logEndRef = useRef<HTMLDivElement>(null)
  const nextId = useRef(1)

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [logs])

  const handleSend = async (): Promise<void> => {
    const hex = input.replace(/\s+/g, '')
    if (!hex || hex.length % 2 !== 0 || !/^[0-9a-fA-F]+$/.test(hex)) {
      setLogs((prev) => [
        ...prev,
        { id: nextId.current++, direction: 'error', hex: '', detail: '无效的 hex 字符串', timestamp: Date.now() }
      ])
      return
    }

    // Log the send
    const sendEntry: LogEntry = {
      id: nextId.current++,
      direction: 'send',
      hex: hex.toUpperCase(),
      timestamp: Date.now()
    }
    setLogs((prev) => [...prev, sendEntry])
    setSending(true)

    try {
      const result = await window.clavis.sendApdu(hex)

      if (result.success && result.response) {
        const resp = result.response
        setLogs((prev) => [
          ...prev,
          {
            id: nextId.current++,
            direction: 'recv',
            hex: resp.raw,
            detail: `Data: ${resp.data || '(empty)'}  SW: ${resp.sw1.toString(16).padStart(2, '0').toUpperCase()}${resp.sw2.toString(16).padStart(2, '0').toUpperCase()}`,
            timestamp: Date.now()
          }
        ])
      } else {
        setLogs((prev) => [
          ...prev,
          {
            id: nextId.current++,
            direction: 'error',
            hex: '',
            detail: result.error || '未知错误',
            timestamp: Date.now()
          }
        ])
      }
    } catch (err) {
      setLogs((prev) => [
        ...prev,
        {
          id: nextId.current++,
          direction: 'error',
          hex: '',
          detail: String(err),
          timestamp: Date.now()
        }
      ])
    } finally {
      setSending(false)
    }
  }

  const handleClear = (): void => {
    setLogs([])
  }

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
    if (dir === 'send') return '#1a73e8'
    if (dir === 'recv') return '#1e8e3e'
    return '#d93025'
  }

  const dirLabel = (dir: string): string => {
    if (dir === 'send') return 'TX'
    if (dir === 'recv') return 'RX'
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

      {/* 指令输入区 */}
      <Paper sx={{ p: 2, mb: 2, border: '1px solid', borderColor: 'divider' }}>
        <Typography variant="body2" sx={{ mb: 1, color: 'text.secondary' }}>
          输入 APDU 指令（hex 格式，空格可选）
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
          <TextField
            fullWidth
            size="small"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="00 00 00 01 90 00 01 04"
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
          按 Enter 快速发送 · 预填测试指令：0000000190000104
        </Typography>
      </Paper>

      {/* 收发日志区 */}
      <Paper
        sx={{
          border: '1px solid',
          borderColor: 'divider',
          bgcolor: '#1e1e1e',
          borderRadius: 1,
          overflow: 'hidden'
        }}
      >
        <Box sx={{ p: 1, borderBottom: '1px solid #333', display: 'flex', alignItems: 'center' }}>
          <Typography variant="caption" sx={{ color: '#888', flexGrow: 1 }}>
            通讯日志 · {logs.length} 条记录
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
            <Typography sx={{ color: '#666', textAlign: 'center', py: 4, fontSize: '0.8rem' }}>
              暂无日志，发送指令后将在此显示收发记录
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
                <Typography sx={{ color: '#666', fontSize: '0.75rem', minWidth: 85, flexShrink: 0, pt: 0.2 }}>
                  {formatTime(entry.timestamp)}
                </Typography>
                <Chip
                  label={dirLabel(entry.direction)}
                  size="small"
                  sx={{
                    bgcolor: dirColor(entry.direction),
                    color: '#fff',
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
                        color: entry.direction === 'send' ? '#6cb6ff' : '#7ee787',
                        fontSize: '0.8rem',
                        fontFamily: 'monospace',
                        wordBreak: 'break-all'
                      }}
                    >
                      {formatHex(entry.hex)}
                    </Typography>
                  )}
                  {entry.detail && (
                    <Typography sx={{ color: entry.direction === 'error' ? '#f97583' : '#aaa', fontSize: '0.75rem' }}>
                      {entry.detail}
                    </Typography>
                  )}
                </Box>
                {entry.hex && (
                  <Tooltip title="复制">
                    <IconButton size="small" onClick={() => copyLog(entry)} sx={{ color: '#666' }}>
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
