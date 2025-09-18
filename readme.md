  # PrivShare – Decentralized Privacy File Sharing

PrivShare is a **Web3-native file sharing platform** built on **Filecoin Onchain Cloud**.  
It empowers users to upload files, generate **secure sharing links**, and distribute them with **privacy, verifiability, and ownership** guaranteed by Filecoin.  

PrivShare aims to become the decentralized alternative to Dropbox or WeTransfer — but with **end-to-end encryption, on-chain verification, and flexible monetization**.

## 🆕 Updates in This Wave

### ✅ Wave 2 Implementation Complete
- **Real Filecoin Integration**: Implemented actual Filecoin storage using Synapse SDK
- **End-to-End Encryption**: Added AES-256 encryption with custom key management
- **IPFS + Pinata Mapping**: Implemented share code to CID mapping using IPFS and Pinata
- **Enhanced UI/UX**: Complete frontend with drag-and-drop upload, file preview, and progress tracking
- **Wallet Integration**: Full Web3 wallet support with RainbowKit and wagmi
- **Share Code System**: Flexible `privshare://` format with IPFS-based metadata storage
- **File Preview**: Users can preview file information before downloading
- **Key Management**: Custom encryption key generation and secure key sharing
- **Production Ready**: Environment configuration, error handling, and deployment setup
- **Internationalization**: Complete English translation of all UI and console output

### 🔧 Technical Improvements
- **Stack Overflow Prevention**: Implemented chunking for large file encryption/decryption
- **Error Handling**: Comprehensive error handling and user feedback
- **Type Safety**: Full TypeScript implementation with proper type definitions
- **Code Quality**: ESLint configuration and code cleanup
- **Performance**: Optimized file processing and memory management
---

## 🚩 Problem

### Centralized risks
Most file-sharing services (Dropbox, Google Drive, OneDrive) are **centralized**:
- Files can be deleted due to censorship, copyright issues, or policy changes.  
- Accounts can be banned without recourse.  
- Users never truly own their files.

### Privacy issues
- Providers have **access to user data**, lacking true end-to-end encryption.  
- Sensitive files are vulnerable to leaks, government requests, or insider misuse.  

### Lack of verifiability
- Users cannot prove whether a file is still stored or retrievable.  
- No cryptographic proof of file persistence exists in traditional systems.  

### No native monetization
- Creators cannot set paywalls or subscriptions.  
- File sharing is either free, or locked behind platforms that take large fees.

👉 These problems create a gap: **people need file sharing that is private, censorship-resistant, verifiable, and flexible.**

---

## ✅ Solution

PrivShare offers **a decentralized, privacy-first file sharing experience**:

- **Upload once → Get a sharing link**  
  Files uploaded through PrivShare generate a unique link. Share it directly with others, no centralized servers needed.

- **End-to-end encryption**  
  Only recipients with the decryption key can access. Even PrivShare cannot read user data.

- **Proof of Data Possession (PDP)**  
  Files remain **provably stored** on Filecoin, cryptographically verifiable by both uploader and recipient.

- **Access control & monetization**  
  - Free & public sharing  
  - Private sharing with decryption keys  
  - Paid access with FilecoinPay: one-time, streaming, or subscriptions

- **Fast retrieval with FilCDN**  
  File downloads are as smooth as centralized services, without compromising decentralization.

👉 **PrivShare = privacy + ownership + verifiability + monetization.**

---

## 🏗 Technical Design

### Architecture Overview
1. User uploads file → Filecoin WarmStorage  
2. System generates a secure sharing link  
3. PDP contracts periodically verify file persistence  
4. Recipient accesses link → FilecoinPay validates access (if required)  
5. FilCDN accelerates delivery  
6. Recipient decrypts locally (if encrypted)

### Core Components
- **Filecoin WarmStorage** → Decentralized storage layer  
- **PDP contracts** → Verifiable storage proofs  
- **FilecoinPay** → Payments and access control  
- **FilCDN** → High-speed retrieval  
- **Frontend dApp** → Upload, manage, and share files via wallet login

---

## 📊 Market Opportunity

The **cloud storage and file-sharing market** is massive:
- Dropbox, Google Drive, and others dominate a **$100B+ market**.  
- Yet, they are **centralized, censorable, and lack monetization**.  

### Growing user demand:
- **Individuals** want privacy-respecting file sharing.  
- **Content creators** want to monetize content directly.  
- **NGOs & activists** need censorship-proof publishing.  
- **Businesses** want global file distribution without compliance risks.  

---

## 📅 Roadmap

- **Wave 1 – Product Design**  
  - Submit design docs & Notion page  
  - Define problems, solutions, architecture  

- **Wave 2 – MVP Build**  
  - File upload, sharing link, WarmStorage integration  
  - PDP verification included  
  - Demo video or live demo  

- **Wave 3 – Iteration & Features**  
  - Add encryption  
  - Paid access via FilecoinPay  
  - Improve UX + FilCDN retrieval  
  - Document changes at milestone  

- **Wave 4 – Final Product**  
  - Support for public/private/paid sharing  
  - Polished production dApp  
---
<<<<<<< HEAD

## 🏗 Project Structure

```
PrivShare/
├── src/
│   ├── components/              # React UI Components
│   │   ├── FileUpload.tsx      # File upload interface with drag & drop
│   │   ├── FileDownload.tsx    # File download interface with preview
│   │   ├── ShareCodeDisplay.tsx # Share code and key display
│   │   └── WalletConnect.tsx   # Web3 wallet connection
│   ├── hooks/                   # Custom React hooks
│   │   ├── useFileUpload.ts    # File upload logic with progress
│   │   ├── useFileDownload.ts  # File download logic
│   │   ├── useFilePreview.ts   # File preview functionality
│   │   └── useEthers.ts        # Ethers.js integration
│   ├── lib/                     # Core utilities
│   │   ├── encryption.ts       # AES-256 encryption/decryption
│   │   ├── ipfs-mapping.ts     # IPFS + Pinata mapping service
│   │   ├── fileMetadata.ts     # File metadata management
│   │   ├── wallet.ts           # Wallet connection utilities
│   │   ├── wagmi.ts            # Wagmi configuration
│   │   └── utils.ts            # General utilities
│   ├── providers/               # React context providers
│   │   └── SynapseProvider.tsx # Synapse SDK provider
│   ├── types/                   # TypeScript type definitions
│   │   └── index.ts
│   ├── App.tsx                  # Main application component
│   ├── main.tsx                 # Application entry point
│   └── index.css               # Global styles
├── public/                      # Static assets
├── dist/                        # Production build output
├── package.json                 # Dependencies and scripts
├── vite.config.js              # Vite configuration
├── tailwind.config.js          # Tailwind CSS configuration
├── postcss.config.mjs          # PostCSS configuration
├── tsconfig.json               # TypeScript configuration
└── readme.md                   # Project documentation
```

## 🚀 Deployment Guide

### Prerequisites
- Node.js 18+ 
- pnpm (recommended) or npm
- MetaMask or other Web3 wallet
- Pinata account for IPFS mapping

### Environment Setup

1. **Create environment file**:
```bash
cp .env.example .env.local
```

2. **Configure environment variables**:
```env
# WalletConnect Project ID (required)
VITE_WALLETCONNECT_PROJECT_ID=your_project_id_here

# Pinata Configuration (required for IPFS mapping)
VITE_PINATA_JWT=your_pinata_jwt_here
# OR use API Key + Secret
VITE_PINATA_API_KEY=your_api_key_here
VITE_PINATA_API_SECRET=your_api_secret_here

# Filecoin Network (optional, defaults to calibration)
VITE_FILECOIN_NETWORK=calibration
```

3. **Get test tokens**:
   - **tFIL**: [Filecoin Calibration Faucet](https://faucet.calibnet.chainsafe-fil.io/funds.html)
   - **USDFC**: [USDFC Faucet](https://forest-explorer.chainsafe.dev/faucet/calibnet_usdfc)

### Development

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev

# Build for production
pnpm build

# Preview production build
pnpm preview

# Run linting
pnpm lint
```


## 🛠 Technology Stack

### Frontend
- **React 18** - UI framework with hooks and context
- **TypeScript** - Type-safe JavaScript development
- **Vite** - Fast build tool and development server
- **Tailwind CSS** - Utility-first CSS framework
- **Framer Motion** - Animation library

### Web3 Integration
- **Wagmi** - React hooks for Ethereum
- **Viem** - TypeScript interface for Ethereum
- **RainbowKit** - Wallet connection UI
- **Ethers.js** - Ethereum library for Synapse SDK

### Storage & Encryption
- **Synapse SDK** - Filecoin storage integration
- **Web Crypto API** - Browser-native AES-256 encryption
- **IPFS + Pinata** - Decentralized metadata storage
- **Filecoin WarmStorage** - Decentralized file storage

### Development Tools
- **ESLint** - Code linting and formatting
- **PostCSS** - CSS processing
- **Autoprefixer** - CSS vendor prefixing
- **pnpm** - Fast, disk space efficient package manager

### Build & Deployment
- **Vite** - Build tooling and bundling
- **TypeScript** - Compile-time type checking
- **Tailwind CSS** - CSS purging and optimization

## 🔗 Filecoin Integration

PrivShare is a **full-stack showcase of Filecoin Onchain Cloud**:
- **WarmStorage + PDP** → Tamper-proof, verifiable storage  
- **FilecoinPay** → Paywalled or subscription-based sharing  
- **FilCDN** → Seamless global delivery  
---
=======
>>>>>>> 112f0b84479821d2180d94beb689309994e25837
