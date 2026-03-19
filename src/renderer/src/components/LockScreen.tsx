import { Box, Typography, Paper } from '@mui/material'
import UsbOffIcon from '@mui/icons-material/UsbOff'
import ClavisLogo from './ClavisLogo'

export default function LockScreen(): React.JSX.Element {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        bgcolor: '#0D0D0D',
        WebkitAppRegion: 'drag',
        userSelect: 'none'
      }}
    >
      <Paper
        elevation={0}
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          p: 6,
          borderRadius: 2,
          bgcolor: '#1A1A1A',
          border: '1px solid #2A2A2A',
          maxWidth: 420
        }}
      >
        <Box sx={{ mb: 3 }}>
          <ClavisLogo size="2rem" />
        </Box>

        <Typography
          variant="body1"
          sx={{ mb: 4, color: '#888', textAlign: 'center', lineHeight: 1.6 }}
        >
          请解锁并连接您的 Clavis 设备以继续使用
        </Typography>

        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            color: '#FFB74D',
            bgcolor: 'rgba(255, 183, 77, 0.08)',
            border: '1px solid rgba(255, 183, 77, 0.2)',
            px: 2,
            py: 1,
            borderRadius: 1,
            width: '100%',
            justifyContent: 'center'
          }}
        >
          <UsbOffIcon sx={{ fontSize: 20, color: '#FFB74D' }} />
          <Typography variant="body2" sx={{ color: '#FFB74D' }}>
            设备未连接
          </Typography>
        </Box>

        <Typography
          variant="body2"
          sx={{ mt: 3, color: '#666', textAlign: 'center', fontSize: '0.75rem' }}
        >
          提示：在设备上输入密码解锁后，USB 将自动连接
          <br />
          <Typography
            component="span"
            sx={{ fontSize: '0.75rem', color: '#5A9A42', mt: 0.5, display: 'inline-block' }}
          >
            开发模式：按 Ctrl+Shift+D 可模拟设备连接
          </Typography>
        </Typography>
      </Paper>
    </Box>
  )
}
