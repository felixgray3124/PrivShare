import { useState } from 'react'
import { Copy, Check, Share2, Download } from 'lucide-react'

interface ShareCodeDisplayProps {
  shareCode: string
  fileName: string
  isEncrypted?: boolean
  encryptionKey?: string
  onDownload?: () => void
}

export default function ShareCodeDisplay({ shareCode, fileName, isEncrypted, encryptionKey, onDownload }: ShareCodeDisplayProps) {
  const [copied, setCopied] = useState(false)

  // Generate share text
  const generateShareText = () => {
    let text = `I shared a file with you via PrivShare, share code: ${shareCode}`
    if (isEncrypted && encryptionKey) {
      // Use original key directly, no conversion needed
      text += `, key: ${encryptionKey}`
    }
    return text
  }

  const copyShareCode = async () => {
    try {
      await navigator.clipboard.writeText(shareCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Copy failed:', error)
    }
  }

  const copyShareText = async () => {
    try {
      await navigator.clipboard.writeText(generateShareText())
      console.log('Share text copied to clipboard')
    } catch (error) {
      console.error('Copy failed:', error)
      // Fallback solution
      const textArea = document.createElement('textarea')
      textArea.value = generateShareText()
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
      console.log('Share text copied to clipboard')
    }
  }

  const shareLink = () => {
    if (navigator.share) {
      navigator.share({
        title: `PrivShare - ${fileName}`,
        text: `Share file via PrivShare: ${fileName}`,
        url: shareCode
      })
    } else {
      copyShareCode()
    }
  }

  return (
    <div className="card">
      <div className="flex items-center space-x-2 mb-4">
        <Share2 className="w-5 h-5 text-primary-600" />
        <h3 className="text-lg font-semibold text-gray-900">File Shared Successfully</h3>
      </div>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            File Name
          </label>
          <div className="text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded-lg">
            {fileName}
          </div>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Share Code
          </label>
          <div className="flex items-center space-x-2">
            <div className="flex-1 bg-gray-50 px-3 py-2 rounded-lg font-mono text-sm text-gray-900 break-all">
              {shareCode}
            </div>
            <button
              onClick={copyShareCode}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Copy share code"
            >
              {copied ? (
                <Check className="w-4 h-4 text-green-600" />
              ) : (
                <Copy className="w-4 h-4 text-gray-600" />
              )}
            </button>
          </div>
        </div>

        {/* Encryption key display */}
        {isEncrypted && encryptionKey && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Encryption Key
            </label>
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <div className="w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
                  <div className="w-2 h-2 bg-white rounded-full"></div>
                </div>
                <span className="font-medium text-yellow-800">This file is encrypted</span>
              </div>
              <p className="text-xs text-yellow-700 mb-2">
                Please save this key, it will be needed to download the file:
              </p>
              <div className="bg-white p-2 rounded border font-mono text-sm break-all">
                {encryptionKey}
              </div>
              <p className="text-xs text-yellow-600 mt-2">
                ⚠️ Please keep this key safe, losing it will make the file undecryptable
              </p>
            </div>
          </div>
        )}

        {/* Share functionality */}
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h4 className="font-medium text-blue-900 mb-2">Share with Friends</h4>
          <div className="bg-white p-3 rounded border text-sm font-mono break-all mb-3">
            {generateShareText()}
          </div>
          <div className="flex space-x-2">
            <button
              onClick={copyShareText}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2"
            >
              <Share2 className="w-4 h-4" />
              <span>Share</span>
            </button>
            <button
              onClick={copyShareCode}
              className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors flex items-center justify-center space-x-2"
            >
              <Copy className="w-4 h-4" />
              <span>Share Code Only</span>
            </button>
          </div>
        </div>
        
        <div className="flex space-x-3">
          <button
            onClick={shareLink}
            className="btn-primary flex items-center space-x-2"
          >
            <Share2 className="w-4 h-4" />
            <span>Share Link</span>
          </button>
          
          {onDownload && (
            <button
              onClick={onDownload}
              className="btn-secondary flex items-center space-x-2"
            >
              <Download className="w-4 h-4" />
              <span>Download File</span>
            </button>
          )}
        </div>
        
        <div className="text-xs text-gray-500 bg-blue-50 p-3 rounded-lg">
          <strong>Tip:</strong> Please keep the share code safe, only those with this code can access your file.
          The file is encrypted and stored on the Filecoin network, ensuring privacy and security.
        </div>
      </div>
    </div>
  )
}
