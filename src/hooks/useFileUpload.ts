import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { useAccount } from "wagmi";
import { useSynapse } from "../providers/SynapseProvider";
// import { Synapse } from "@filoz/synapse-sdk";
import { encryptFile, generateKey } from "../lib/encryption";
import { generateRandomShareCode, storeMappingToIPFS } from "../lib/ipfs-mapping";
import { preflightCheck } from "../lib/preflightCheck";

export type UploadedInfo = {
  fileName?: string;
  fileSize?: number;
  pieceCid?: string;
  txHash?: string;
  shareCode?: string;
  encryptionKey?: string;
  isEncrypted?: boolean;
};

export type UploadOptions = {
  file: File;
  isEncrypted: boolean;
  customKey?: string;
};

/**
 * Hook to upload a file to the Filecoin network using Synapse.
 */
export const useFileUpload = () => {
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState("");
  const [uploadedInfo, setUploadedInfo] = useState<UploadedInfo | null>(null);
  const [lastAddress, setLastAddress] = useState<string | undefined>(undefined);
  const { synapse } = useSynapse();
  const { address } = useAccount();

  const mutation = useMutation({
    mutationKey: ["file-upload", address],
    mutationFn: async ({ file, isEncrypted, customKey }: UploadOptions) => {
      if (!synapse) throw new Error("Synapse not available. Please check your wallet connection and try again.");
      if (!address) throw new Error("Wallet not connected. Please connect your wallet to upload files.");
      
      setProgress(0);
      setUploadedInfo(null);
      
      let fileData: Uint8Array;
      let encryptionKey: string | undefined;
      let iv: string | undefined;
      
      if (isEncrypted) {
        setStatus("🔐 Encrypting file...");
        // Use custom key or generate new one
        if (customKey) {
          // Store the original custom key for display
          encryptionKey = customKey;
          if (import.meta.env.DEV) {
            console.log('Using passed key:', { customKey, encryptionKey });
          }
          // Convert to hex format for encryption
          const hexKey = Array.from(customKey, char => char.charCodeAt(0).toString(16).padStart(2, '0')).join('');
          if (import.meta.env.DEV) {
            console.log('Converted to hex key:', hexKey);
          }
          const encryptedResult = await encryptFile(file, hexKey);
          iv = encryptedResult.iv;
          fileData = Uint8Array.from(atob(encryptedResult.encryptedData), c => c.charCodeAt(0));
        } else {
          // This should not happen as frontend generates key first
          encryptionKey = generateKey();
          if (import.meta.env.DEV) {
            console.log('Warning: No key passed, generating random key:', encryptionKey);
          }
          const encryptedResult = await encryptFile(file, encryptionKey);
          iv = encryptedResult.iv;
          fileData = Uint8Array.from(atob(encryptedResult.encryptedData), c => c.charCodeAt(0));
        }
      } else {
        setStatus("📁 Preparing file for upload...");
        // Use original file data
        const arrayBuffer = await file.arrayBuffer();
        fileData = new Uint8Array(arrayBuffer);
      }
      
      setStatus("🔄 Initializing file upload to Filecoin...");
      setProgress(10);

      // Get dataset (for logging purposes)
      await synapse.storage.findDataSets(address);

      setStatus("💰 Checking USDFC balance and storage allowances...");
      setProgress(20);

      // Variable to store provider information
      let selectedProvider: any = null;
      let usableDataSets: any[] = [];

      // Check wallet and network status
      try {
        setStatus("🔍 Checking wallet and network status...");
        
        // Check network connectivity
        const testResponse = await fetch('https://api.calibration.node.glif.io/rpc/v1', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            method: 'Filecoin.ChainHead',
            params: [],
            id: 1
          })
        });
        
        if (!testResponse.ok) {
          console.warn('Network connectivity test failed:', testResponse.status);
          setStatus("⚠️ Network connectivity issues detected, proceeding with caution...");
        } else {
          console.log('Network connectivity test passed');
        }

        // Check wallet balance and existing datasets
        setStatus("🔍 Checking wallet status and existing datasets...");
        const dataSets = await synapse.storage.findDataSets(address);
        console.log('Existing datasets for address:', address, dataSets);
        
        // Check if there are any incomplete datasets
        const incompleteDataSets = dataSets.filter(ds => !ds.isLive || !ds.isManaged);
        if (incompleteDataSets.length > 0) {
          console.warn('Found incomplete datasets:', incompleteDataSets);
          setStatus("⚠️ Found incomplete datasets, this might cause issues. Proceeding with caution...");
        }
        
        // Check if we have any usable datasets
        usableDataSets = dataSets.filter(ds => ds.isLive && ds.isManaged);
        if (usableDataSets.length === 0) {
          console.log('No existing datasets found for new wallet, will let Synapse create one automatically');
          setStatus("ℹ️ No existing datasets found, will create a new one");
        } else {
          console.log('Found existing datasets:', usableDataSets);
          console.log('First dataset details:', {
            clientDataSetId: usableDataSets[0].clientDataSetId,
            pdpVerifierDataSetId: usableDataSets[0].pdpVerifierDataSetId,
            providerId: usableDataSets[0].providerId,
            isLive: usableDataSets[0].isLive,
            isManaged: usableDataSets[0].isManaged
          });
          setStatus(`✅ Found ${usableDataSets.length} existing dataset(s), will use the first one`);
        }
        
        setStatus("✅ Wallet and network status verified");
      } catch (networkError) {
        console.warn('Network/wallet check failed:', networkError);
        setStatus("⚠️ Network/wallet check failed, proceeding with caution...");
      }

      // Preflight check for USDFC balance and allowances
      setStatus("💰 Checking USDFC balance and storage allowances...");
      setProgress(5);
      await preflightCheck(
        file,
        synapse,
        usableDataSets.length === 0, // Include dataset creation fee if no existing datasets
        setStatus,
        setProgress
      );

      // Create storage service with fallback mechanism and retry logic
      let storageService;
      let lastError: Error | null = null;
      
      // Helper function to create storage with retry
      const createStorageWithRetry = async (options: any, retryCount = 0): Promise<any> => {
        const maxRetries = 2;
        const retryDelay = 2000; // 2 seconds
        
        try {
          return await synapse.createStorage(options);
        } catch (error) {
          console.warn(`Storage creation attempt ${retryCount + 1} failed:`, error);
          
          if (retryCount < maxRetries) {
            console.log(`Retrying in ${retryDelay}ms... (attempt ${retryCount + 2}/${maxRetries + 1})`);
            setStatus(`🔄 Retrying storage creation... (attempt ${retryCount + 2}/${maxRetries + 1})`);
            await new Promise(resolve => setTimeout(resolve, retryDelay));
            return createStorageWithRetry(options, retryCount + 1);
          }
          
          throw error;
        }
      };
      
      try {
        // Set up storage service with existing dataset or create new one
        if (usableDataSets.length > 0) {
          setStatus(`🔍 Setting up storage service with existing dataset (ID: ${usableDataSets[0].pdpVerifierDataSetId})...`);
        } else {
          setStatus("🔍 Setting up storage service and creating new dataset...");
        }
        
        // Use existing dataset if available, otherwise let Synapse create a new one
        const storageOptions: any = {
          // If we have usable datasets, try to use the first one
          ...(usableDataSets.length > 0 && { 
            dataSetId: usableDataSets[0].pdpVerifierDataSetId 
          }),
          callbacks: {
            onDataSetResolved: (info: any) => {
              console.log("Dataset resolved:", info);
              if (info.isExisting) {
                setStatus("🔗 Using existing dataset for this provider");
              } else {
                setStatus("🔗 New dataset created for this provider");
              }
              setProgress(30);
            },
            onDataSetCreationStarted: (transactionResponse: any, statusUrl?: string) => {
              console.log("Dataset creation started:", transactionResponse);
              console.log("Dataset creation status URL:", statusUrl);
              setStatus("🏗️ Creating new dataset for selected provider...");
              setProgress(35);
            },
            onDataSetCreationProgress: (status: any) => {
              console.log("Dataset creation progress:", status);
              if (status.transactionSuccess) {
                setStatus(`⛓️ Dataset transaction confirmed on chain`);
                setProgress(45);
              }
              if (status.serverConfirmed) {
                setStatus(`🎉 Dataset ready for this provider! (${Math.round(status.elapsedMs / 1000)}s)`);
                setProgress(50);
              }
            },
            onProviderSelected: (provider: any) => {
              console.log("Storage provider selected:", provider);
              setStatus(`🏪 Selected provider: ${provider.name || `ID ${provider.id}`}`);
              // Store directly to variable
              selectedProvider = provider;
            },
          },
        };
        
        storageService = await createStorageWithRetry(storageOptions);
      } catch (error) {
        console.error("Storage creation failed:", error);
        lastError = error as Error;
        
        // Enhanced error handling with specific guidance
        const errorMessage = lastError?.message || 'Unknown error';
        if (errorMessage.includes('below minimum allowed size')) {
          throw new Error(`Upload failed: File too small. The file must be at least 127 bytes. Please select a larger file.`);
        } else if (errorMessage.includes('exceeds maximum allowed size')) {
          throw new Error(`Upload failed: File too large. The file must be smaller than 200 MiB. Please select a smaller file.`);
        } else if (errorMessage.includes('500') || errorMessage.includes('Internal Server Error')) {
          throw new Error(`Upload failed: Network connection issues. Please check your internet connection and try again. The storage provider returned a server error (500). This might be a temporary network issue.`);
        } else if (errorMessage.includes('exit=[33]') || errorMessage.includes('contract reverted')) {
          throw new Error(`Upload failed: Contract execution failed (Error 33). This often happens with new wallets when creating datasets. The wallet may not have sufficient permissions or there may be network issues. Please try the following: 1) Wait a few minutes and try again, 2) Refresh the page and reconnect your wallet, 3) Check your wallet has sufficient FIL for gas fees, 4) Try using a different wallet, 5) Contact support if the problem persists.`);
        } else if (errorMessage.includes('Data set') && errorMessage.includes('not found')) {
          throw new Error(`Upload failed: Dataset access denied. This wallet cannot access the specified dataset. The system will try to create a new dataset for this wallet. Please try again.`);
        } else {
          throw new Error(`Upload failed: ${errorMessage}. Please try again or contact support if the problem persists.`);
        }
      }

      setStatus("📁 Uploading file to storage provider...");
      setProgress(55);

      // Upload file to storage provider
      const { pieceCid } = await storageService.upload(fileData, {
        onUploadComplete: (piece: any) => {
          setStatus(`📊 File uploaded! Signing msg to add pieces to the dataset`);
          setUploadedInfo((prev) => ({
            ...prev,
            fileName: file.name,
            fileSize: file.size,
            pieceCid: piece.toV1().toString(),
            encryptionKey,
          }));
          setProgress(80);
        },
        onPieceAdded: (transactionResponse: any) => {
          setStatus(
            `🔄 Waiting for transaction to be confirmed on chain${
              transactionResponse ? `(txHash: ${transactionResponse.hash})` : ""
            }`
          );
          if (transactionResponse) {
            console.log("Transaction response:", transactionResponse);
            setUploadedInfo((prev) => ({
              ...prev,
              txHash: transactionResponse?.hash,
            }));
          }
        },
        onPieceConfirmed: () => {
          setStatus("🌳 Data pieces added to dataset successfully");
          setProgress(90);
        },
      });

      // Generate random share code
      const shareCode = generateRandomShareCode();
      
      // Metadata is now completely stored in IPFS
      
      // Store mapping to IPFS
      console.log('Metadata stored to IPFS:', {
        shareCode,
        pieceCid: pieceCid.toV1().toString(),
        isEncrypted,
        encryptionKey,
        iv,
        providerInfo: selectedProvider
      });
      
      await storeMappingToIPFS(shareCode, pieceCid.toV1().toString(), {
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
        isEncrypted: isEncrypted,
        encryptionKey: encryptionKey,
        iv: iv,
        uploader: address,
        uploadTime: Date.now(),
      }, selectedProvider);
      
      setProgress(95);
      console.log('Setting upload info:', {
        fileName: file.name,
        shareCode,
        encryptionKey,
        isEncrypted
      });
      setUploadedInfo((prev) => ({
        ...prev,
        fileName: file.name,
        fileSize: file.size,
        pieceCid: pieceCid.toV1().toString(),
        shareCode,
        encryptionKey,
        isEncrypted,
      }));
    },
    onSuccess: () => {
      setStatus("🎉 File successfully stored on Filecoin!");
      setProgress(100);
    },
    onError: (error) => {
      console.error("Upload failed:", error);
      
      // Parse error message for better user experience
      const errorMessage = error.message || "Unknown error";
      let userFriendlyMessage = "";
      
      if (errorMessage.includes('Network connection issues')) {
        userFriendlyMessage = "🌐 Network Connection Issue\n\nPlease check your internet connection and try again. This might be a temporary network issue.";
      } else if (errorMessage.includes('Contract execution failed')) {
        userFriendlyMessage = "⛓️ Blockchain Transaction Failed\n\nThis usually happens when creating datasets. Please try:\n• Wait a few minutes and try again\n• Refresh the page and reconnect your wallet\n• Ensure your wallet has sufficient FIL for gas fees\n• Try using a different wallet";
      } else if (errorMessage.includes('Dataset access denied')) {
        userFriendlyMessage = "🔒 Dataset Access Denied\n\nThis wallet cannot access the specified dataset. The system will create a new dataset for this wallet. Please try again.";
      } else if (errorMessage.includes('USDFC') || errorMessage.includes('balance')) {
        userFriendlyMessage = "💰 Insufficient Balance\n\nPlease ensure your wallet has sufficient USDFC to pay for storage costs.";
      } else if (errorMessage.includes('Synapse not found')) {
        userFriendlyMessage = "🔧 System Initialization Failed\n\nPlease refresh the page and reconnect your wallet.";
      } else {
        userFriendlyMessage = `❌ Upload Failed\n\n${errorMessage}\n\nPlease try again or contact support.`;
      }
      
      setStatus(`❌ ${userFriendlyMessage}`);
      setProgress(0);
      // Reset uploaded info to allow retry
      setUploadedInfo(null);
    },
  });

  // Detect wallet changes and reset state
  useEffect(() => {
    if (lastAddress && lastAddress !== address) {
      console.log('Wallet address changed from', lastAddress, 'to', address);
      setStatus("🔄 Wallet changed, resetting upload state...");
      setProgress(0);
      setUploadedInfo(null);
      
      // Reset mutation state to allow fresh start
      mutation.reset();
      
      // Small delay to allow state to settle
      setTimeout(() => {
        setStatus("");
      }, 1000);
    }
    setLastAddress(address);
  }, [address, lastAddress, mutation]);

  const handleReset = () => {
    setProgress(0);
    setUploadedInfo(null);
    setStatus("");
  };

  return {
    uploadFileMutation: mutation,
    progress,
    uploadedInfo,
    setUploadedInfo,
    handleReset,
    status,
  };
};
