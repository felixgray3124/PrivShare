export interface FileMetadata {
  cid: string
  name: string
  size: number
  mimeType: string
  encryptedData: string
  iv: string
  shareCode: string
  uploadTime: number
  uploader: string
  // 新增字段
  pieceCid?: string
  fileName?: string
  fileSize?: number
  isEncrypted?: boolean
  encryptionKey?: string
  providerInfo?: any
}

export interface WalletInfo {
  address: string
  chainId: number
  balance?: string
}

export interface UploadProgress {
  stage: 'encrypting' | 'uploading' | 'generating' | 'complete'
  progress: number
  message: string
}

export interface ShareCodeInfo {
  shareCode: string
  fileName: string
  fileSize: number
  uploadTime: number
  expiresAt?: number
}

export interface DownloadInfo {
  shareCode: string
  fileName: string
  fileSize: number
  mimeType: string
  requiresKey: boolean
}

export type TabType = 'upload' | 'download'

export interface AppState {
  wallet: WalletInfo | null
  activeTab: TabType
  uploadedFile: ShareCodeInfo | null
  isUploading: boolean
  isDownloading: boolean
  error: string | null
}
