// Supported network configuration
export const supportedChains = {
  1: { name: 'Ethereum Mainnet', symbol: 'ETH', decimals: 18 },
  314: { name: 'Filecoin Mainnet', symbol: 'FIL', decimals: 18 },
  314159: { name: 'Filecoin Calibration', symbol: 'tFIL', decimals: 18 }
}

// Connect wallet
export async function connectWallet() {
  if (!window.ethereum) {
    throw new Error('Please install MetaMask or other Web3 wallet')
  }

  try {
    const accounts = await window.ethereum.request({
      method: 'eth_requestAccounts',
    })
    
    const chainId = await window.ethereum.request({
      method: 'eth_chainId',
    })
    
    return {
      address: accounts[0],
      chainId: parseInt(chainId, 16),
    }
  } catch (error) {
    console.error('Wallet connection failed:', error)
    throw error
  }
}

// Switch network
export async function switchNetwork(chainId: number) {
  if (!window.ethereum) {
    throw new Error('Please install MetaMask or other Web3 wallet')
  }

  try {
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: `0x${chainId.toString(16)}` }],
    })
  } catch (error: any) {
    // If network doesn't exist, try to add network
    if (error.code === 4902) {
      const chain = supportedChains[chainId as keyof typeof supportedChains]
      if (chain) {
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [{
            chainId: `0x${chainId.toString(16)}`,
            chainName: chain.name,
            nativeCurrency: {
              name: chain.symbol,
              symbol: chain.symbol,
              decimals: chain.decimals
            },
            rpcUrls: ['https://api.node.glif.io/rpc/v0'],
            blockExplorerUrls: ['https://filfox.info/'],
          }],
        })
      }
    } else {
      throw error
    }
  }
}

// Get account balance
export async function getBalance(address: string, _chainId: number): Promise<string> {
  if (!window.ethereum) {
    throw new Error('Please install MetaMask or other Web3 wallet')
  }

  try {
    const balance = await window.ethereum.request({
      method: 'eth_getBalance',
      params: [address, 'latest']
    })
    
    // Convert wei to ETH
    const balanceInWei = parseInt(balance, 16)
    const balanceInEth = balanceInWei / Math.pow(10, 18)
    return balanceInEth.toFixed(4)
  } catch (error) {
    console.error('Failed to get balance:', error)
    return '0'
  }
}

// Declare global types
declare global {
  interface Window {
    ethereum?: any
  }
}
