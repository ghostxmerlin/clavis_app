import { Box, Typography, Paper } from '@mui/material'
import UsbOffIcon from '@mui/icons-material/UsbOff'
import LockIcon from '@mui/icons-material/Lock'

export default function LockScreen(): React.JSX.Element {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        bgcolor: 'background.default',
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
          borderRadius: 4,
          bgcolor: 'background.paper',
          border: '1px solid',
          borderColor: 'divider',
          maxWidth: 420
        }}
      >
        <Box
          sx={{
            width: 80,
            height: 80,
            borderRadius: '50%',
            bgcolor: '#e8f0fe',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            mb: 3
          }}
        >
          <LockIcon sx={{ fontSize: 40, color: 'primary.main' }} />
        </Box>

        <Typography variant="h4" sx={{ mb: 1, fontWeight: 400, color: 'text.primary' }}>
          Clavis
        </Typography>

        <Typography
          variant="body1"
          sx={{ mb: 4, color: 'text.secondary', textAlign: 'center', lineHeight: 1.6 }}
        >
          请解锁并连接您的 Clavis 设备以继续使用
        </Typography>

        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            color: 'text.secondary',
            bgcolor: '#fff3e0',
            px: 2,
            py: 1,
            borderRadius: 2,
            width: '100%',
            justifyContent: 'center'
          }}
        >
          <UsbOffIcon sx={{ fontSize: 20, color: '#e65100' }} />
          <Typography variant="body2" sx={{ color: '#e65100' }}>
            设备未连接
          </Typography>
        </Box>

        <Typography
          variant="body2"
          sx={{ mt: 3, color: 'text.secondary', textAlign: 'center', fontSize: '0.75rem' }}
        >
          提示：在设备上输入密码解锁后，USB 将自动连接
          <br />
          <Typography
            component="span"
            sx={{ fontSize: '0.75rem', color: 'primary.main', mt: 0.5, display: 'inline-block' }}
          >
            开发模式：按 Ctrl+Shift+D 可模拟设备连接
          </Typography>
        </Typography>
      </Paper>
    </Box>
  )
}
