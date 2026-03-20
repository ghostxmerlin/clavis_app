import { app, shell, BrowserWindow, ipcMain, dialog } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { usbManager } from './usb-manager'
import icon from '../../resources/icon.png?asset'

// ── Mock data store (replace with real USB device communication later) ──
interface PasswordEntry {
  id: string
  title: string
  username: string
  password: string
  notes?: string
  createdAt: number
  updatedAt: number
}

interface EncryptedFile {
  id: string
  name: string
  size: number
  createdAt: number
  updatedAt: number
}

let mockPasswords: PasswordEntry[] = [
  {
    id: '1',
    title: 'GitHub',
    username: 'user@example.com',
    password: '••••••••',
    createdAt: Date.now() - 86400000,
    updatedAt: Date.now() - 86400000
  },
  {
    id: '2',
    title: 'Gmail',
    username: 'user@gmail.com',
    password: '••••••••',
    createdAt: Date.now() - 172800000,
    updatedAt: Date.now() - 172800000
  },
  {
    id: '3',
    title: 'AWS Console',
    username: 'admin',
    password: '••••••••',
    createdAt: Date.now() - 259200000,
    updatedAt: Date.now() - 259200000
  }
]

let mockFiles: EncryptedFile[] = [
  { id: 'f1', name: 'recovery-keys.enc', size: 2048, createdAt: Date.now() - 86400000, updatedAt: Date.now() - 86400000 },
  { id: 'f2', name: 'certificates.enc', size: 15360, createdAt: Date.now() - 172800000, updatedAt: Date.now() - 172800000 }
]

let nextPasswordId = 4
let nextFileId = 3

// ── IPC Handlers ──

function registerIpcHandlers(): void {
  // Password operations
  ipcMain.handle('passwords:list', () => mockPasswords)

  ipcMain.handle('passwords:add', (_, entry) => {
    const now = Date.now()
    const newEntry: PasswordEntry = {
      ...entry,
      id: String(nextPasswordId++),
      createdAt: now,
      updatedAt: now
    }
    mockPasswords.push(newEntry)
    return newEntry
  })

  ipcMain.handle('passwords:update', (_, id: string, updates: Partial<PasswordEntry>) => {
    const index = mockPasswords.findIndex((p) => p.id === id)
    if (index === -1) throw new Error('Password not found')
    mockPasswords[index] = { ...mockPasswords[index], ...updates, updatedAt: Date.now() }
    return mockPasswords[index]
  })

  ipcMain.handle('passwords:delete', (_, id: string) => {
    mockPasswords = mockPasswords.filter((p) => p.id !== id)
  })

  // File operations
  ipcMain.handle('files:list', () => mockFiles)

  ipcMain.handle('files:upload', (_, filePath: string) => {
    const name = filePath.split('/').pop() || filePath.split('\\').pop() || 'unknown'
    const now = Date.now()
    const newFile: EncryptedFile = {
      id: `f${nextFileId++}`,
      name: name + '.enc',
      size: Math.floor(Math.random() * 50000) + 1024,
      createdAt: now,
      updatedAt: now
    }
    mockFiles.push(newFile)
    return newFile
  })

  ipcMain.handle('files:download', (_, _fileId: string, _savePath: string) => {
    // Mock: in real implementation, read from device and write to savePath
    return Promise.resolve()
  })

  ipcMain.handle('files:delete', (_, fileId: string) => {
    mockFiles = mockFiles.filter((f) => f.id !== fileId)
  })

  // Dialog helpers
  ipcMain.handle('dialog:open', async () => {
    const result = await dialog.showOpenDialog({ properties: ['openFile'] })
    if (result.canceled || result.filePaths.length === 0) return null
    return result.filePaths[0]
  })

  ipcMain.handle('dialog:save', async (_, defaultName: string) => {
    const result = await dialog.showSaveDialog({ defaultPath: defaultName })
    if (result.canceled || !result.filePath) return null
    return result.filePath
  })

  // Device status
  ipcMain.handle('device:status', () => ({
    connected: usbManager.getConnectionStatus()
  }))

  // APDU debug: send raw hex command to device (帧自动补零到 64 字节)
  ipcMain.handle('apdu:send', (_, hexCommand: string) => {
    try {
      const response = usbManager.sendRawHex(hexCommand)
      return { success: true, response }
    } catch (err) {
      return { success: false, error: String(err) }
    }
  })

  // CTAP HID: 通道初始化
  ipcMain.handle('ctap:init', () => {
    try {
      const result = usbManager.initChannel()
      return { success: true, result }
    } catch (err) {
      return { success: false, error: String(err) }
    }
  })

  // CTAP HID: 获取通道信息
  ipcMain.handle('ctap:channelInfo', () => {
    return usbManager.getChannelInfo()
  })

  // CTAP HID: 发送 CTAP 命令（使用已分配 CID）
  ipcMain.handle('ctap:send', (_, cmd: number, payload: number[]) => {
    try {
      const response = usbManager.sendCtapHid(cmd, payload)
      return { success: true, response }
    } catch (err) {
      return { success: false, error: String(err) }
    }
  })
}

// ── Window Creation ──

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1024,
    height: 720,
    minWidth: 800,
    minHeight: 600,
    show: false,
    autoHideMenuBar: true,
    titleBarStyle: 'hiddenInset',
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // Connect USB manager to this window
  usbManager.setMainWindow(mainWindow)
  usbManager.startPolling()

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// ── App Lifecycle ──

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.clavis')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  registerIpcHandlers()
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('before-quit', () => {
  usbManager.destroy()
})
