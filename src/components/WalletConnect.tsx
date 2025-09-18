import { useState, useEffect } from 'react'
import { Wallet, LogOut, Copy, Check } from 'lucide-react'
import { connectWallet, getBalance } from '../lib/wallet'

interface WalletConnectProps {
  onConnect: (address: string, chainId: number) => void
  onDisconnect: () => void
  address?: string
  chainId?: number
}

export default function WalletConnect({ onConnect, onDisconnect, address, chainId }: WalletConnectProps) {
  const [balance, setBalance] = useState<string>('0')
  const [isConnecting, setIsConnecting] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (address && chainId) {
      loadBalance()
    }
  }, [address, chainId])

  const loadBalance = async () => {
    if (!address || !chainId) return
    
    try {
      const balanceWei = await getBalance(address, chainId)
      const balanceEth = (Number(balanceWei) / 1e18).toFixed(4)
      setBalance(balanceEth)
    } catch (error) {
      console.error('Failed to get balance:', error)
    }
  }

  const handleConnect = async () => {
    setIsConnecting(true)
    try {
      const { address, chainId } = await connectWallet()
      onConnect(address, chainId)
    } catch (error) {
      console.error('Connection failed:', error)
      alert('Wallet connection failed, please try again')
    } finally {
      setIsConnecting(false)
    }
  }

  const handleDisconnect = () => {
    onDisconnect()
  }

  const copyAddress = async () => {
    if (address) {
      await navigator.clipboard.writeText(address)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  if (address) {
    return (
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2">
          <Wallet className="w-5 h-5 text-primary-600" />
          <div className="text-sm">
            <div className="font-medium">
              {`${address.slice(0, 6)}...${address.slice(-4)}`}
            </div>
            <div className="text-gray-500">
              {balance} ETH
            </div>
          </div>
        </div>
        
        <button
          onClick={copyAddress}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          title="Copy address"
        >
          {copied ? (
            <Check className="w-4 h-4 text-green-600" />
          ) : (
            <Copy className="w-4 h-4 text-gray-600" />
          )}
        </button>
        
        <button
          onClick={handleDisconnect}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          title="Disconnect"
        >
          <LogOut className="w-4 h-4 text-gray-600" />
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={handleConnect}
      disabled={isConnecting}
      className="btn-primary flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <Wallet className="w-5 h-5" />
      <span>{isConnecting ? 'Connecting...' : 'Connect Wallet'}</span>
    </button>
  )
}
