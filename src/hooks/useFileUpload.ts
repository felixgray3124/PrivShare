import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useAccount } from "wagmi";
import { useSynapse } from "../providers/SynapseProvider";
// import { Synapse } from "@filoz/synapse-sdk";
import { encryptFile, generateKey } from "../lib/encryption";
import { generateRandomShareCode, storeMappingToIPFS } from "../lib/ipfs-mapping";

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

      // 用于存储提供商信息的变量
      let selectedProvider: any = null;

      // Create storage service
      const storageService = await synapse.createStorage({
        callbacks: {
          onDataSetResolved: (info) => {
            console.log("Dataset resolved:", info);
            setStatus("🔗 Existing dataset found and resolved");
            setProgress(30);
          },
          onDataSetCreationStarted: (transactionResponse) => {
            console.log("Dataset creation started:", transactionResponse);
            setStatus("🏗️ Creating new dataset on blockchain...");
            setProgress(35);
          },
          onDataSetCreationProgress: (status) => {
            console.log("Dataset creation progress:", status);
            if (status.transactionSuccess) {
              setStatus(`⛓️ Dataset transaction confirmed on chain`);
              setProgress(45);
            }
            if (status.serverConfirmed) {
              setStatus(`🎉 Dataset ready! (${Math.round(status.elapsedMs / 1000)}s)`);
              setProgress(50);
            }
          },
          onProviderSelected: (provider) => {
            console.log("Storage provider selected:", provider);
            setStatus(`🏪 Storage provider selected`);
            // 直接存储到变量中
            selectedProvider = provider;
          },
        },
      });

      setStatus("📁 Uploading file to storage provider...");
      setProgress(55);

      // Upload file to storage provider
      const { pieceCid } = await storageService.upload(fileData, {
        onUploadComplete: (piece) => {
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
        onPieceAdded: (transactionResponse) => {
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
      setStatus(`❌ Upload failed: ${error.message || "Please try again"}`);
      setProgress(0);
    },
  });

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
