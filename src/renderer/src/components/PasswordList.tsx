import { useState, useEffect } from 'react'
import {
  Box,
  Typography,
  IconButton,
  Fab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Tooltip,
  TextField,
  InputAdornment
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import SearchIcon from '@mui/icons-material/Search'
import VisibilityIcon from '@mui/icons-material/Visibility'
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff'
import type { PasswordEntry } from '../types'
import PasswordForm from './PasswordForm'

export default function PasswordList(): React.JSX.Element {
  const [passwords, setPasswords] = useState<PasswordEntry[]>([])
  const [search, setSearch] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editingEntry, setEditingEntry] = useState<PasswordEntry | null>(null)
  const [visiblePasswords, setVisiblePasswords] = useState<Set<string>>(new Set())

  const loadPasswords = async (): Promise<void> => {
    const data = (await window.clavis.getPasswords()) as PasswordEntry[]
    setPasswords(data)
  }

  useEffect(() => {
    loadPasswords()
  }, [])

  const filtered = passwords.filter(
    (p) =>
      p.title.toLowerCase().includes(search.toLowerCase()) ||
      p.username.toLowerCase().includes(search.toLowerCase())
  )

  const handleAdd = (): void => {
    setEditingEntry(null)
    setFormOpen(true)
  }

  const handleEdit = (entry: PasswordEntry): void => {
    setEditingEntry(entry)
    setFormOpen(true)
  }

  const handleDelete = async (id: string): Promise<void> => {
    await window.clavis.deletePassword(id)
    loadPasswords()
  }

  const handleFormClose = (): void => {
    setFormOpen(false)
    setEditingEntry(null)
  }

  const handleFormSave = async (
    data: Omit<PasswordEntry, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<void> => {
    if (editingEntry) {
      await window.clavis.updatePassword(editingEntry.id, data)
    } else {
      await window.clavis.addPassword(data)
    }
    setFormOpen(false)
    setEditingEntry(null)
    loadPasswords()
  }

  const togglePasswordVisibility = (id: string): void => {
    setVisiblePasswords((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const copyToClipboard = (text: string): void => {
    navigator.clipboard.writeText(text)
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3, gap: 2 }}>
        <Typography variant="h5" sx={{ flexGrow: 1 }}>
          密码条目
        </Typography>
        <TextField
          size="small"
          placeholder="搜索..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ width: 260 }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ fontSize: 20, color: 'text.secondary' }} />
                </InputAdornment>
              )
            }
          }}
        />
      </Box>

      <TableContainer component={Paper} sx={{ border: '1px solid', borderColor: 'divider' }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 600 }}>名称</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>用户名</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>密码</TableCell>
              <TableCell sx={{ fontWeight: 600 }} align="right">
                操作
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                  {search ? '没有匹配的密码条目' : '暂无密码条目，点击右下角 + 添加'}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((entry) => (
                <TableRow key={entry.id} hover>
                  <TableCell>
                    <Typography variant="body1" sx={{ fontWeight: 500 }}>
                      {entry.title}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      {entry.username}
                      <Tooltip title="复制用户名">
                        <IconButton size="small" onClick={() => copyToClipboard(entry.username)}>
                          <ContentCopyIcon sx={{ fontSize: 14 }} />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                        {visiblePasswords.has(entry.id) ? entry.password : '••••••••'}
                      </Typography>
                      <Tooltip title={visiblePasswords.has(entry.id) ? '隐藏密码' : '显示密码'}>
                        <IconButton
                          size="small"
                          onClick={() => togglePasswordVisibility(entry.id)}
                        >
                          {visiblePasswords.has(entry.id) ? (
                            <VisibilityOffIcon sx={{ fontSize: 14 }} />
                          ) : (
                            <VisibilityIcon sx={{ fontSize: 14 }} />
                          )}
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="复制密码">
                        <IconButton size="small" onClick={() => copyToClipboard(entry.password)}>
                          <ContentCopyIcon sx={{ fontSize: 14 }} />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </TableCell>
                  <TableCell align="right">
                    <Tooltip title="编辑">
                      <IconButton size="small" onClick={() => handleEdit(entry)}>
                        <EditIcon sx={{ fontSize: 18 }} />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="删除">
                      <IconButton
                        size="small"
                        onClick={() => handleDelete(entry.id)}
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

      <Fab
        color="primary"
        onClick={handleAdd}
        sx={{ position: 'fixed', bottom: 24, right: 24 }}
      >
        <AddIcon />
      </Fab>

      <PasswordForm
        open={formOpen}
        entry={editingEntry}
        onClose={handleFormClose}
        onSave={handleFormSave}
      />
    </Box>
  )
}
