// File metadata storage and management
export interface FileMetadata {
  id: string
  shareCode: string
  pieceCid: string
  fileName: string
  fileSize: number
  mimeType: string
  isEncrypted: boolean
  encryptionKey?: string
  iv?: string
  uploader: string
  uploadTime: number
  expiresAt?: number
  providerInfo?: any
}

// Metadata is now completely stored in IPFS, no longer using local storage
class FileMetadataStorage {
  // These methods are now just interface compatible, actual data is stored in IPFS
  static saveMetadata(metadata: FileMetadata): void {
    // Metadata is now stored to IPFS via storeMappingToIPFS
    console.log('Metadata will be stored via IPFS:', metadata)
  }
  
  static getMetadata(shareCode: string): FileMetadata | null {
    // Metadata is now retrieved from IPFS via getCidFromIPFS
    console.log('Metadata will be retrieved from IPFS:', shareCode)
    return null
  }
  
  static getAllMetadata(): Record<string, FileMetadata> {
    // No longer support getting all metadata
    console.warn('No longer support getting all metadata, please use IPFS query')
    return {}
  }
  
  static deleteMetadata(_shareCode: string): void {
    // No longer support deleting metadata
    console.warn('No longer support deleting metadata, please manage through Pinata')
  }
  
  static getMetadataByPieceCid(_pieceCid: string): FileMetadata | null {
    // No longer support finding metadata by CID
    console.warn('No longer support finding metadata by CID, please use share code')
    return null
  }
}

export { FileMetadataStorage }
