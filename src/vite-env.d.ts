/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_WALLETCONNECT_PROJECT_ID: string
  readonly VITE_FILECOIN_NETWORK: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
