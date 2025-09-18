/// <reference types="vite/client" />
import { createConfig, http } from 'wagmi'
import { filecoin, filecoinCalibration } from 'wagmi/chains'
import { injected, metaMask, walletConnect } from 'wagmi/connectors'

// Get WalletConnect Project ID
const getWalletConnectProjectId = () => {
  const projectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID
  
  // Only output debug information in development environment
  if (import.meta.env.DEV) {
    console.log('Environment variables:', {
      VITE_WALLETCONNECT_PROJECT_ID: projectId,
      allEnv: import.meta.env
    })
  }
  
  if (!projectId) {
    throw new Error(
      'VITE_WALLETCONNECT_PROJECT_ID is required. Please set it in your .env.local file'
    )
  }
  
  return projectId
}

export const config = createConfig({
  chains: [filecoinCalibration, filecoin],
  connectors: [
    injected(),
    metaMask(),
    walletConnect({
      projectId: getWalletConnectProjectId(),
    }),
  ],
  transports: {
    [filecoin.id]: http(),
    [filecoinCalibration.id]: http(),
  },
})

declare module 'wagmi' {
  interface Register {
    config: typeof config
  }
}
