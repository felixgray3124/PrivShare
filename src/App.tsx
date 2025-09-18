import { useState } from 'react'
import { Upload, Shield, Zap } from 'lucide-react'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { useAccount } from 'wagmi'
import FileUpload from './components/FileUpload'
import FileDownload from './components/FileDownload'
import ShareCodeDisplay from './components/ShareCodeDisplay'

function App() {
  const { isConnected } = useAccount()
  const [activeTab, setActiveTab] = useState<'upload' | 'download'>('upload')
  const [uploadedFile, setUploadedFile] = useState<{
    shareCode: string
    fileName: string
    isEncrypted?: boolean
    encryptionKey?: string
  } | null>(null)

  const handleUploadComplete = (shareCode: string, fileName: string, isEncrypted?: boolean, encryptionKey?: string) => {
    setUploadedFile({ shareCode, fileName, isEncrypted, encryptionKey })
  }

  const handleDownloadComplete = (fileName: string) => {
    console.log('File download completed:', fileName)
    // You can add other handling here, such as showing notifications
  }

  const handleNewUpload = () => {
    setUploadedFile(null)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-center items-center h-16">
              <div className="flex items-center space-x-3">
                <Shield className="w-8 h-8 text-primary-600" />
                <h1 className="text-xl font-bold text-gray-900">PrivShare</h1>
                <span className="text-sm text-gray-500">Decentralized File Sharing</span>
              </div>
              <div className="absolute right-4">
                <ConnectButton />
              </div>
            </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          {/* Features Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="card text-center">
              <Upload className="w-8 h-8 text-primary-600 mx-auto mb-3" />
              <h3 className="font-semibold text-gray-900 mb-2">Secure Upload</h3>
              <p className="text-sm text-gray-600">
                Files are automatically encrypted and stored on the Filecoin network
              </p>
            </div>
            <div className="card text-center">
              <Shield className="w-8 h-8 text-primary-600 mx-auto mb-3" />
              <h3 className="font-semibold text-gray-900 mb-2">Privacy Protection</h3>
              <p className="text-sm text-gray-600">
                End-to-end encryption, only you and the recipient can access
              </p>
            </div>
            <div className="card text-center">
              <Zap className="w-8 h-8 text-primary-600 mx-auto mb-3" />
              <h3 className="font-semibold text-gray-900 mb-2">Quick Sharing</h3>
              <p className="text-sm text-gray-600">
                Generate unique share codes and share with anyone instantly
              </p>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
            <button
              onClick={() => setActiveTab('upload')}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'upload'
                  ? 'bg-white text-primary-700 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Upload File
            </button>
            <button
              onClick={() => setActiveTab('download')}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'download'
                  ? 'bg-white text-primary-700 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Download File
            </button>
          </div>

          {/* Tab Content */}
          {activeTab === 'upload' ? (
            <div className="space-y-6">
              {!isConnected ? (
                <div className="text-center py-12">
                  <Shield className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h2 className="text-2xl font-semibold text-gray-900 mb-2">
                    Connect Wallet to Upload
                  </h2>
                  <p className="text-gray-600 mb-8">
                    You need to connect your Web3 wallet to upload files to the Filecoin network
                  </p>
                  <div className="flex justify-center">
                    <ConnectButton />
                  </div>
                </div>
              ) : uploadedFile ? (
                <div className="space-y-4">
                  <ShareCodeDisplay
                    shareCode={uploadedFile.shareCode}
                    fileName={uploadedFile.fileName}
                    isEncrypted={uploadedFile.isEncrypted}
                    encryptionKey={uploadedFile.encryptionKey}
                    onDownload={() => {
                      // Switch to download tab
                      setActiveTab('download')
                      // Pre-fill share code
                      const downloadInput = document.querySelector('input[placeholder*="privshare://"]') as HTMLInputElement
                      if (downloadInput) {
                        downloadInput.value = uploadedFile.shareCode
                      }
                    }}
                  />
                  <button
                    onClick={handleNewUpload}
                    className="btn-secondary"
                  >
                    Upload New File
                  </button>
                </div>
              ) : (
                <FileUpload
                  onUploadComplete={handleUploadComplete}
                  disabled={false}
                />
              )}
            </div>
          ) : (
            <FileDownload onDownloadComplete={handleDownloadComplete} />
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center text-sm text-gray-500">
            <p>PrivShare - Decentralized Privacy File Sharing Platform on Filecoin</p>
            <p className="mt-2">
              Files are stored on the Filecoin network, ensuring decentralization and persistence
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default App
