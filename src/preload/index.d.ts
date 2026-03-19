import { ElectronAPI } from '@electron-toolkit/preload'
import type { ClavisAPI } from '../renderer/src/types'

declare global {
  interface Window {
    electron: ElectronAPI
    clavis: ClavisAPI
  }
}
