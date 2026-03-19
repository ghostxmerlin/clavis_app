import { useState, useEffect } from 'react'
import {
  Box,
  Typography,
  IconButton,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions
} from '@mui/material'
import UploadFileIcon from '@mui/icons-material/UploadFile'
import DownloadIcon from '@mui/icons-material/Download'
import DeleteIcon from '@mui/icons-material/Delete'
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile'
import type { EncryptedFile } from '../types'

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

export default function FileManager(): React.JSX.Element {
  const [files, setFiles] = useState<EncryptedFile[]>([])
  const [deleteTarget, setDeleteTarget] = useState<EncryptedFile | null>(null)

  const loadFiles = async (): Promise<void> => {
    const data = (await window.clavis.listFiles()) as EncryptedFile[]
    setFiles(data)
  }

  useEffect(() => {
    loadFiles()
  }, [])

  const handleUpload = async (): Promise<void> => {
    const filePath = await window.clavis.showOpenDialog()
    if (!filePath) return
    await window.clavis.uploadFile(filePath)
    loadFiles()
  }

  const handleDownload = async (file: EncryptedFile): Promise<void> => {
    const savePath = await window.clavis.showSaveDialog(file.name.replace('.enc', ''))
    if (!savePath) return
    await window.clavis.downloadFile(file.id, savePath)
  }

  const handleDelete = async (): Promise<void> => {
    if (!deleteTarget) return
    await window.clavis.deleteFile(deleteTarget.id)
    setDeleteTarget(null)
    loadFiles()
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3, gap: 2 }}>
        <Typography variant="h5" sx={{ flexGrow: 1 }}>
          加密文件
        </Typography>
        <Button
          variant="contained"
          startIcon={<UploadFileIcon />}
          onClick={handleUpload}
        >
          上传文件
        </Button>
      </Box>

      <TableContainer component={Paper} sx={{ border: '1px solid', borderColor: 'divider' }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 600 }}>文件名</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>大小</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>上传时间</TableCell>
              <TableCell sx={{ fontWeight: 600 }} align="right">
                操作
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {files.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                  暂无加密文件，点击"上传文件"添加
                </TableCell>
              </TableRow>
            ) : (
              files.map((file) => (
                <TableRow key={file.id} hover>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <InsertDriveFileIcon sx={{ fontSize: 20, color: 'primary.main' }} />
                      <Typography variant="body1" sx={{ fontWeight: 500 }}>
                        {file.name}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                      {formatFileSize(file.size)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                      {formatDate(file.createdAt)}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Tooltip title="下载">
                      <IconButton size="small" onClick={() => handleDownload(file)}>
                        <DownloadIcon sx={{ fontSize: 18 }} />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="删除">
                      <IconButton
                        size="small"
                        onClick={() => setDeleteTarget(file)}
                        color="error"
                      >
                        <DeleteIcon sx={{ fontSize: 18 }} />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Delete confirmation dialog */}
      <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)}>
        <DialogTitle>确认删除</DialogTitle>
        <DialogContent>
          <DialogContentText>
            确定要从设备中删除文件 &quot;{deleteTarget?.name}&quot; 吗？此操作不可恢复。
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDeleteTarget(null)} color="secondary">
            取消
          </Button>
          <Button onClick={handleDelete} variant="contained" color="error">
            删除
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
