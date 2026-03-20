import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box
} from '@mui/material'
import type { PasswordEntry } from '../types'

interface PasswordFormProps {
  open: boolean
  entry: PasswordEntry | null
  onClose: () => void
  onSave: (data: Omit<PasswordEntry, 'id' | 'createdAt' | 'updatedAt'>) => void
}

export default function PasswordForm({
  open,
  entry,
  onClose,
  onSave
}: PasswordFormProps): React.JSX.Element {
  const [title, setTitle] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [notes, setNotes] = useState('')

  useEffect(() => {
    if (entry) {
      setTitle(entry.title)
      setUsername(entry.username)
      setPassword(entry.password)
      setNotes(entry.notes || '')
    } else {
      setTitle('')
      setUsername('')
      setPassword('')
      setNotes('')
    }
  }, [entry, open])

  const handleSave = (): void => {
    if (!title.trim() || !username.trim() || !password.trim()) return
    onSave({ title, username, password, notes: notes || undefined })
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{entry ? '编辑密码条目' : '新增密码条目'}</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          <TextField
            label="名称"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            fullWidth
            autoFocus
          />
          <TextField
            label="用户名"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            fullWidth
          />
          <TextField
            label="密码"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            fullWidth
          />
          <TextField
            label="备注"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            fullWidth
            multiline
            rows={3}
          />
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} color="secondary">
          取消
        </Button>
        <Button
          onClick={handleSave}
          variant="contained"
          disabled={!title.trim() || !username.trim() || !password.trim()}
        >
          {entry ? '保存' : '添加'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
