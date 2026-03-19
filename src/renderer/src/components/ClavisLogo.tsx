import { Box, Typography } from '@mui/material'

const GREEN = '#80C269'

interface ClavisLogoProps {
  /** 文字大小, 默认 '1.5rem' */
  size?: string
}

/**
 * Clavis Logo — 四角装饰框 + CLAVIS 文字
 * 复刻设备启动画面风格: ┌ CLAVIS ┐
 *                       └        ┘
 * 四角为等长短 L 形装饰
 */
export default function ClavisLogo({ size = '1.5rem' }: ClavisLogoProps): React.JSX.Element {
  const borderWidth = 2
  // 角装饰线固定长度，与文字大小成比例
  const cornerLen = `calc(${size} * 0.6)`

  const cornerStyle = {
    position: 'absolute' as const,
    width: cornerLen,
    height: cornerLen,
    borderColor: GREEN,
    borderStyle: 'solid',
    borderWidth: 0
  }

  return (
    <Box
      sx={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        px: '6px',
        py: '6px'
      }}
    >
      {/* 左上角 */}
      <Box sx={{ ...cornerStyle, top: 0, left: 0, borderTopWidth: borderWidth, borderLeftWidth: borderWidth }} />
      {/* 右上角 */}
      <Box sx={{ ...cornerStyle, top: 0, right: 0, borderTopWidth: borderWidth, borderRightWidth: borderWidth }} />
      {/* 左下角 */}
      <Box sx={{ ...cornerStyle, bottom: 0, left: 0, borderBottomWidth: borderWidth, borderLeftWidth: borderWidth }} />
      {/* 右下角 */}
      <Box sx={{ ...cornerStyle, bottom: 0, right: 0, borderBottomWidth: borderWidth, borderRightWidth: borderWidth }} />

      <Typography
        sx={{
          color: GREEN,
          fontSize: size,
          fontWeight: 700,
          letterSpacing: '0.2em',
          lineHeight: 1,
          px: 1,
          py: 0.5,
          fontFamily: 'monospace'
        }}
      >
        CLAVIS
      </Typography>
    </Box>
  )
}
