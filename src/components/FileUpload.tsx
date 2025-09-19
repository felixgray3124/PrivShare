import React, { useState, useRef, useEffect } from 'react'
import { Upload, Loader2, Lock, Unlock } from 'lucide-react'
import { useFileUpload } from '../hooks/useFileUpload'

interface FileUploadProps {
  onUploadComplete: (shareCode: string, fileName: string, isEncrypted?: boolean, encryptionKey?: string) => void
  disabled?: boolean
}

export default function FileUpload({ onUploadComplete, disabled }: FileUploadProps) {
  const [dragActive, setDragActive] = useState(false)
  const [isEncrypted, setIsEncrypted] = useState(true)
  const [customKey, setCustomKey] = useState('')
  const [useRandomKey, setUseRandomKey] = useState(true)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const { uploadFileMutation, progress, uploadedInfo, status } = useFileUpload()
  const { isPending: isUploading, mutateAsync: uploadFile } = uploadFileMutation

  // Generate random key
  const generateRandomKey = () => {
    const length = Math.floor(Math.random() * 9) + 4 // 4-12 characters
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    let result = ''
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return result
  }

  // Handle key generation
  const handleKeyGeneration = () => {
    if (useRandomKey) {
      setCustomKey(generateRandomKey())
    }
  }

  // Listen for upload completion
  useEffect(() => {
    if (uploadedInfo?.shareCode && uploadedInfo?.fileName) {
      onUploadComplete(
        uploadedInfo.shareCode, 
        uploadedInfo.fileName, 
        uploadedInfo.isEncrypted, 
        uploadedInfo.encryptionKey
      )
    }
  }, [uploadedInfo, onUploadComplete])

  // These functions are now handled in the ShareCodeDisplay component

  // After upload completion, the component will call onUploadComplete via useEffect
  // Then App.tsx will display the ShareCodeDisplay component

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    if (disabled || isUploading) return
    
    const files = e.dataTransfer.files
    if (files && files[0]) {
      handleFile(files[0])
    }
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (disabled || isUploading) return
    
    const files = e.target.files
    if (files && files[0]) {
      handleFile(files[0])
    }
  }

  const handleFile = async (file: File) => {
    if (disabled || isUploading) return
    
    // If encryption is selected but no key, generate one first
    let finalCustomKey = customKey;
    if (isEncrypted && !customKey.trim()) {
      finalCustomKey = generateRandomKey();
      setCustomKey(finalCustomKey);
      if (import.meta.env.DEV) {
        console.log('Frontend generated key:', finalCustomKey);
      }
    }
    
    try {
      await uploadFile({ 
        file, 
        isEncrypted,
        customKey: isEncrypted ? finalCustomKey : undefined
      })
      // Upload completion handling is done by useEffect listening to uploadedInfo changes
    } catch (error) {
      console.error('Upload failed:', error)
      // Don't reset the key here - let user decide whether to retry with same key or generate new one
    }
  }

  const openFileDialog = () => {
    if (disabled || isUploading) return
    fileInputRef.current?.click()
  }

  return (
    <div className="w-full">
      {/* Encryption Options */}
      <div className="mb-4 p-4 bg-gray-50 rounded-lg space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {isEncrypted ? (
              <Lock className="w-5 h-5 text-red-500" />
            ) : (
              <Unlock className="w-5 h-5 text-green-500" />
            )}
            <span className="text-sm font-medium text-gray-700">
              {isEncrypted ? 'File will be encrypted' : 'File will be stored in plain text'}
            </span>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={isEncrypted}
              onChange={(e) => setIsEncrypted(e.target.checked)}
              disabled={isUploading}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
          </label>
        </div>
        
        {isEncrypted && (
          <div className="space-y-3">
            <p className="text-xs text-gray-500">
              File will be encrypted with AES-256, key required for download
            </p>
            
            {/* Key generation options */}
            <div className="space-y-2">
              <div className="flex items-center space-x-4">
                <label className="flex items-center space-x-2">
                  <input
                    type="radio"
                    checked={useRandomKey}
                    onChange={() => setUseRandomKey(true)}
                    disabled={isUploading}
                    className="text-primary-600"
                  />
                  <span className="text-sm text-gray-700">Generate random key</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="radio"
                    checked={!useRandomKey}
                    onChange={() => setUseRandomKey(false)}
                    disabled={isUploading}
                    className="text-primary-600"
                  />
                  <span className="text-sm text-gray-700">Custom key</span>
                </label>
              </div>
              
              {useRandomKey ? (
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={handleKeyGeneration}
                    disabled={isUploading}
                    className="px-3 py-1 text-xs bg-primary-100 text-primary-700 rounded hover:bg-primary-200 disabled:opacity-50"
                  >
                    Generate new key
                  </button>
                  {customKey && (
                    <span className="text-sm text-gray-600">
                      Current key: <span className="font-mono bg-white px-2 py-1 rounded border">{customKey}</span>
                    </span>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <input
                    type="text"
                    value={customKey}
                    onChange={(e) => setCustomKey(e.target.value)}
                    placeholder="Enter 4-12 character key"
                    disabled={isUploading}
                    maxLength={12}
                    minLength={4}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:bg-gray-100"
                  />
                  <p className="text-xs text-gray-500">
                    Key length: {customKey.length}/12 characters
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
        
        {!isEncrypted && (
          <p className="text-xs text-gray-500">
            File will be stored directly, no key required for download
          </p>
        )}
      </div>

      <div
        className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          dragActive
            ? 'border-primary-500 bg-primary-50'
            : 'border-gray-300 hover:border-gray-400'
        } ${disabled || isUploading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={openFileDialog}
      >
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={handleFileInput}
          disabled={disabled || isUploading}
        />
        
        <div className="flex flex-col items-center space-y-4">
          {isUploading ? (
            <>
              <Loader2 className="w-12 h-12 text-primary-600 animate-spin" />
              <div className="text-lg font-medium text-gray-900">
                Uploading file...
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="text-sm text-gray-500">
                {progress}% complete
              </div>
              {status && !status.includes('❌') && (
                <div className="text-sm text-gray-600 text-center">
                  {status}
                </div>
              )}
              {status && status.includes('❌') && (
                <div className="mt-4 space-y-3">
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="text-sm text-red-800 whitespace-pre-line">
                      {status.replace('❌ ', '')}
                    </div>
                  </div>
                  <div className="flex space-x-2 justify-center">
                    <button
                      onClick={() => {
                        setCustomKey('');
                        setUseRandomKey(true);
                        handleKeyGeneration();
                      }}
                      className="px-3 py-1 text-xs bg-red-100 text-red-700 rounded-md hover:bg-red-200 transition-colors"
                    >
                      Generate New Key
                    </button>
                    <button
                      onClick={() => {
                        // Reset upload state to allow retry
                        uploadFileMutation.reset();
                        // Trigger file dialog
                        openFileDialog();
                      }}
                      className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors"
                    >
                      Retry Upload
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <>
              <Upload className="w-12 h-12 text-gray-400" />
              <div className="text-lg font-medium text-gray-900">
                Drag file here or click to select
              </div>
              <div className="text-sm text-gray-500">
                Supports all file types
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}