import { useState, useEffect } from 'react'
import { Download, File, CheckCircle, AlertCircle, Loader2, Lock, Unlock, Key, Eye, X } from 'lucide-react'
import { useFileDownload } from '../hooks/useFileDownload'
import { useFilePreview } from '../hooks/useFilePreview'

interface FileDownloadProps {
  onDownloadComplete: (fileName: string) => void
  disabled?: boolean
}

export default function FileDownload({ onDownloadComplete, disabled }: FileDownloadProps) {
  const [shareCode, setShareCode] = useState('')
  const [encryptionKey, setEncryptionKey] = useState('')
  
  const { downloadFileMutation, progress, downloadInfo, handleReset, status } = useFileDownload()
  const { isPending: isDownloading, mutateAsync: downloadFile } = downloadFileMutation
  
  const { previewFileMutation, previewInfo, clearPreview } = useFilePreview()
  const { isPending: isPreviewing, mutateAsync: previewFileAsync } = previewFileMutation
  
  // Determine if key input is needed based on preview info
  const showKeyInput = previewInfo?.metadata?.isEncrypted || false

  // Listen for download completion
  useEffect(() => {
    if (downloadInfo?.fileName && !downloadInfo.isDownloading) {
      onDownloadComplete(downloadInfo.fileName)
    }
  }, [downloadInfo, onDownloadComplete])

  const handleDownload = async () => {
    if (disabled || isDownloading || !shareCode.trim()) return
    
    // If file is encrypted but no key provided, show error
    if (showKeyInput && !encryptionKey.trim()) {
      console.error('Encrypted file requires decryption key');
      return;
    }
    
    try {
      console.log('Starting download:', {
        shareCode: shareCode.trim(),
        isEncrypted: showKeyInput,
        encryptionKey: showKeyInput ? encryptionKey : undefined
      });
      
      await downloadFile({ 
        shareCode: shareCode.trim(), 
        encryptionKey: showKeyInput ? encryptionKey : undefined 
      })
    } catch (error) {
      console.error('Download failed:', error)
    }
  }

  const handleShareCodeChange = (value: string) => {
    setShareCode(value)
    // Reset state
    if (downloadInfo) {
      handleReset()
    }
    // Clear preview info
    if (previewInfo) {
      clearPreview()
    }
  }

  const handlePreview = async () => {
    if (!shareCode.trim()) return
    try {
      await previewFileAsync(shareCode.trim())
    } catch (error) {
      console.error('Preview failed:', error)
    }
  }

  const handleKeyInputChange = (value: string) => {
    setEncryptionKey(value)
  }

  // const handleResetAll = () => {
  //   setShareCode('')
  //   setEncryptionKey('')
  //   setShowKeyInput(false)
  //   handleReset()
  // }

  return (
    <div className="w-full space-y-4">
      {/* Share code input */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Share Code
        </label>
        <div className="flex space-x-2">
          <input
            type="text"
            value={shareCode}
            onChange={(e) => handleShareCodeChange(e.target.value)}
            placeholder="Enter share code starting with privshare://"
            disabled={disabled || isDownloading || isPreviewing}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
          />
          <button
            onClick={handlePreview}
            disabled={disabled || isPreviewing || !shareCode.trim()}
            className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            {isPreviewing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Eye className="w-4 h-4" />
            )}
            <span>{isPreviewing ? 'Detecting...' : 'Detect'}</span>
          </button>
        </div>
      </div>

      {/* File preview info */}
      {previewInfo && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <File className="w-5 h-5 text-blue-600" />
              <span className="font-medium text-blue-900">File Information</span>
            </div>
            <button
              onClick={clearPreview}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          
          {previewInfo.isValid && previewInfo.metadata ? (
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <span className="font-medium text-blue-900">{previewInfo.metadata.fileName}</span>
                {previewInfo.metadata.isEncrypted ? (
                  <Lock className="w-4 h-4 text-red-500" />
                ) : (
                  <Unlock className="w-4 h-4 text-green-500" />
                )}
              </div>
              <div className="text-sm text-blue-700 space-y-1">
                <p><strong>File size:</strong> {(previewInfo.metadata.fileSize / 1024).toFixed(2)} KB</p>
                <p><strong>File type:</strong> {previewInfo.metadata.mimeType || 'Unknown'}</p>
                <p><strong>Upload time:</strong> {new Date(previewInfo.metadata.uploadTime).toLocaleString()}</p>
              </div>
              
              {previewInfo.metadata.isEncrypted ? (
                <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded">
                  <div className="flex items-center space-x-2 mb-2">
                    <Key className="w-4 h-4 text-yellow-600" />
                    <span className="font-medium text-yellow-800">This file is encrypted</span>
                  </div>
                  <p className="text-sm text-yellow-700">
                    A decryption key is required to download this file
                  </p>
                </div>
              ) : (
                <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded">
                  <div className="flex items-center space-x-2">
                    <Unlock className="w-4 h-4 text-green-600" />
                    <span className="text-sm text-green-800">This file is not encrypted, can be downloaded directly</span>
                  </div>
                </div>
              )}
              
              <button
                onClick={handleDownload}
                disabled={disabled || isDownloading || (previewInfo.metadata.isEncrypted && !encryptionKey.trim())}
                className="w-full mt-3 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
              >
                {isDownloading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                <span>{isDownloading ? 'Downloading...' : 'Start Download'}</span>
              </button>
            </div>
          ) : (
            <div className="text-red-600 text-sm">
              {previewInfo.error || 'Unable to get file information'}
            </div>
          )}
        </div>
      )}

      {/* File info display - during download */}
      {downloadInfo && (
        <div className="p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center space-x-2 mb-2">
            <File className="w-5 h-5 text-gray-500" />
            <span className="font-medium text-gray-900">{downloadInfo.fileName}</span>
            {downloadInfo.isEncrypted ? (
              <Lock className="w-4 h-4 text-red-500" />
            ) : (
              <Unlock className="w-4 h-4 text-green-500" />
            )}
          </div>
          <div className="text-sm text-gray-600">
            File size: {(downloadInfo.fileSize! / 1024).toFixed(2)} KB
          </div>
        </div>
      )}

      {/* Encryption key input - only shown during preview */}
      {previewInfo?.metadata?.isEncrypted && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Decryption Key
          </label>
          <input
            type="password"
            value={encryptionKey}
            onChange={(e) => handleKeyInputChange(e.target.value)}
            placeholder="Enter decryption key"
            disabled={disabled || isDownloading}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
          />
          <p className="text-xs text-gray-500 mt-1">
            Please enter the decryption key generated during upload
          </p>
        </div>
      )}

      {/* Progress display */}
      {isDownloading && (
        <div className="space-y-2">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-primary-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="text-sm text-gray-500 text-center">
            {progress}% complete
          </div>
          {status && (
            <div className="text-sm text-gray-600 text-center">
              {status}
            </div>
          )}
        </div>
      )}

      {/* Status display */}
      {status && !isDownloading && (
        <div className={`p-3 rounded-md flex items-center space-x-2 ${
          status.includes('success') || status.includes('✅') 
            ? 'bg-green-50 text-green-800 border border-green-200'
            : status.includes('failed') || status.includes('❌')
            ? 'bg-red-50 text-red-800 border border-red-200'
            : 'bg-blue-50 text-blue-800 border border-blue-200'
        }`}>
          {status.includes('success') || status.includes('✅') ? (
            <CheckCircle className="w-5 h-5" />
          ) : status.includes('failed') || status.includes('❌') ? (
            <AlertCircle className="w-5 h-5" />
          ) : (
            <Loader2 className="w-5 h-5 animate-spin" />
          )}
          <span>{status}</span>
        </div>
      )}
    </div>
  )
}