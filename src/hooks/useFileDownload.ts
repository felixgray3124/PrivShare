import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { decryptFile } from "../lib/encryption";
import { validateShareCode, extractCodeFromShareCode } from "../lib/ipfs-mapping";
import { asPieceCID } from "@filoz/synapse-sdk/piece";

// Pinata API configuration
const PINATA_API_URL = 'https://api.pinata.cloud';
const PINATA_GATEWAY_URL = 'https://gateway.pinata.cloud';

// Get Pinata authentication headers
function getPinataHeaders(): Record<string, string> {
  const jwt = import.meta.env.VITE_PINATA_JWT;
  const apiKey = import.meta.env.VITE_PINATA_API_KEY;
  const apiSecret = import.meta.env.VITE_PINATA_API_SECRET;
  
  if (jwt) {
    return {
      'Authorization': `Bearer ${jwt}`,
      'Content-Type': 'application/json'
    };
  } else if (apiKey && apiSecret) {
    return {
      'pinata_api_key': apiKey,
      'pinata_secret_api_key': apiSecret,
      'Content-Type': 'application/json'
    };
  } else {
    throw new Error('Pinata configuration missing');
  }
}
import { FileMetadata } from "../lib/fileMetadata";

export type DownloadInfo = {
  fileName?: string;
  fileSize?: number;
  pieceCid?: string;
  isDownloading?: boolean;
  isEncrypted?: boolean;
  metadata?: FileMetadata;
};

export type DownloadOptions = {
  shareCode: string;
  encryptionKey?: string;
};

/**
 * Hook to download a file from the Filecoin network using direct provider access.
 * This implementation bypasses Synapse and directly accesses Filecoin storage providers.
 */
export const useFileDownload = () => {
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState("");
  const [downloadInfo, setDownloadInfo] = useState<DownloadInfo | null>(null);
  
  const mutation = useMutation({
    mutationKey: ["file-download"],
    mutationFn: async ({ shareCode, encryptionKey }: DownloadOptions) => {
      
      setProgress(0);
      setDownloadInfo(null);
      setStatus("🔍 Validating share code...");

      // Validate share code format
      if (!validateShareCode(shareCode)) {
        throw new Error("Invalid share code format");
      }

      setStatus("🔍 Looking up file from Filecoin...");
      setProgress(20);

      // Get complete metadata from IPFS
      const code = extractCodeFromShareCode(shareCode);
      const headers = getPinataHeaders();
      
      console.log('Searching share code metadata:', code);
      
      // Search for files containing this shareCode via Pinata API
      const metadataResponse = await fetch(`${PINATA_API_URL}/data/pinList?metadata[keyvalues]={"shareCode":{"value":"${code}","op":"eq"}}`, {
        method: 'GET',
        headers
      });
      
      let fileMetadata: FileMetadata;
      
      if (metadataResponse.ok) {
        const metadataResult = await metadataResponse.json();
        console.log('Metadata search results:', metadataResult);
        
        if (metadataResult.rows && metadataResult.rows.length > 0) {
          // Get complete metadata from IPFS
          const ipfsHash = metadataResult.rows[0].ipfs_pin_hash;
          console.log('Found metadata IPFS Hash:', ipfsHash);
          
          const dataResponse = await fetch(`${PINATA_GATEWAY_URL}/ipfs/${ipfsHash}`);
          
          if (dataResponse.ok) {
            const mappingData = await dataResponse.json();
            console.log('Retrieved mapping data from IPFS:', mappingData);
            fileMetadata = mappingData.metadata;
            // pieceCid is at the top level of mappingData, need to set manually
            fileMetadata.pieceCid = mappingData.pieceCid;
            // 添加提供商信息
            (fileMetadata as any).providerInfo = mappingData.providerInfo;
            console.log('Extracted metadata:', fileMetadata);
            console.log('Piece CID:', fileMetadata.pieceCid);
            console.log('Provider Info:', (fileMetadata as any).providerInfo);
          } else {
            throw new Error('Unable to get metadata from IPFS');
          }
        } else {
          throw new Error('No corresponding metadata found');
        }
      } else {
        throw new Error('Unable to query metadata');
      }

      // Validate retrieved metadata
      if (!fileMetadata.pieceCid) {
        throw new Error("File not found. The share code may be invalid or the file may have been deleted.");
      }

      setDownloadInfo({
        fileName: fileMetadata.fileName,
        fileSize: fileMetadata.fileSize,
        pieceCid: fileMetadata.pieceCid,
        isEncrypted: fileMetadata.isEncrypted,
        metadata: fileMetadata,
      });

      console.log('Checking encryption status:', {
        isEncrypted: fileMetadata.isEncrypted,
        hasEncryptionKey: !!encryptionKey,
        encryptionKey: encryptionKey
      });
      
      if (fileMetadata.isEncrypted && !encryptionKey) {
        throw new Error("This file is encrypted. Please provide the decryption key.");
      }

      setStatus("📥 Downloading file from Filecoin...");
      setProgress(40);

      console.log('Starting file download from Filecoin:', fileMetadata.pieceCid);

      // Download file from Filecoin using recorded provider info
      const pieceCid = asPieceCID(fileMetadata.pieceCid);
      if (!pieceCid) {
        throw new Error("Invalid PieceCID format");
      }
      
      let fileData: Uint8Array | null = null;
      let lastError: Error | null = null;
      
      // 优先使用记录的提供商信息
      if ((fileMetadata as any).providerInfo?.products?.PDP?.data?.serviceURL) {
        const providerUrl = (fileMetadata as any).providerInfo.products.PDP.data.serviceURL;
        console.log('Using recorded provider:', providerUrl);
        
        try {
          // 尝试从记录的提供商下载
          const downloadUrl = `${providerUrl}/piece/${pieceCid.toString()}`;
          console.log('Attempting download from recorded provider:', downloadUrl);
          
          const response = await fetch(downloadUrl);
          if (response.ok) {
            fileData = new Uint8Array(await response.arrayBuffer());
            console.log(`Successfully downloaded from recorded provider: ${downloadUrl}`);
          } else {
            console.warn(`Recorded provider failed: ${response.status} ${response.statusText}`);
          }
        } catch (error) {
          console.warn('Recorded provider failed:', error);
          lastError = error as Error;
        }
      }
      
      // 如果记录的提供商失败，尝试公共网关
      if (!fileData) {
        console.log('Recorded provider failed, trying public gateways...');
        
        // Known public IPFS/Filecoin gateways
        const knownProviders = [
          "https://ipfs.io",
          "https://cloudflare-ipfs.com", 
          "https://dweb.link",
          "https://gateway.pinata.cloud",
          "https://api.web3.storage",
          "https://ipfs.filebase.io",
          "https://ipfs.eth.aragon.network",
          "https://ipfs.fleek.co",
        ];
        
        // Try to download from each known provider until one succeeds
        for (const providerUrl of knownProviders) {
          try {
            // Try different possible endpoints for the piece
            const possibleEndpoints = [
              `${providerUrl}/ipfs/${pieceCid.toString()}`,
              `${providerUrl}/ipfs/${pieceCid.toString()}?format=raw`,
              `${providerUrl}/api/v0/cat?arg=${pieceCid.toString()}`,
              `${providerUrl}/piece/${pieceCid.toString()}`,
            ];
            
            for (const endpoint of possibleEndpoints) {
              try {
                const response = await fetch(endpoint);
                if (response.ok) {
                  fileData = new Uint8Array(await response.arrayBuffer());
                  console.log(`Successfully downloaded from public gateway: ${endpoint}`);
                  break;
                }
              } catch (error) {
                // Continue to next endpoint
                continue;
              }
            }
            
            if (fileData) {
              break; // Success!
            }
          } catch (error) {
            lastError = error as Error;
            continue; // Try next provider
          }
        }
      }
      
      // If we get here, all providers failed
      if (!fileData) {
        throw new Error(`Failed to download file from any provider. Last error: ${lastError?.message || 'Unknown error'}`);
      }
      
      setStatus("🔓 Processing file...");
      setProgress(70);

      let finalData: Uint8Array;
      
      if (fileMetadata.isEncrypted && encryptionKey) {
        setStatus("🔓 Decrypting file...");
        if (import.meta.env.DEV) {
          console.log('Key handling during download:', {
            originalKey: encryptionKey,
            isHex: /^[0-9a-fA-F]+$/.test(encryptionKey),
            fileMetadataKey: fileMetadata.encryptionKey
          });
        }
        
        // Convert custom key to hex format if needed
        let hexKey = encryptionKey;
        if (!/^[0-9a-fA-F]+$/.test(encryptionKey)) {
          // Convert string to hex
          hexKey = Array.from(encryptionKey, char => char.charCodeAt(0).toString(16).padStart(2, '0')).join('');
          if (import.meta.env.DEV) {
            console.log('Converted hex key:', hexKey);
          }
        }
        
        // Convert Uint8Array to base64 for decryption
        // Use chunking to avoid stack overflow
        let base64Data = '';
        const chunkSize = 8192; // 8KB chunks
        for (let i = 0; i < fileData.length; i += chunkSize) {
          const chunk = fileData.slice(i, i + chunkSize);
          base64Data += String.fromCharCode(...chunk);
        }
        base64Data = btoa(base64Data);
        const decryptedResult = await decryptFile(base64Data, hexKey, fileMetadata.iv || '');
        
        // Convert decrypted base64 back to Uint8Array
        const binaryString = atob(decryptedResult);
        finalData = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          finalData[i] = binaryString.charCodeAt(i);
        }
      } else {
        finalData = fileData;
      }

      setStatus("💾 Preparing download...");
      setProgress(90);

      // Create blob and download
      const blob = new Blob([finalData as unknown as ArrayBuffer], { type: fileMetadata.mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileMetadata.fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setStatus("✅ File downloaded successfully!");
      setProgress(100);

      setDownloadInfo(prev => ({
        ...prev,
        isDownloading: false,
      }));
    },
    onSuccess: () => {
      setStatus("🎉 File downloaded successfully!");
    },
    onError: (error) => {
      console.error("Download failed:", error);
      setStatus(`❌ Download failed: ${error.message || "Please try again"}`);
      setProgress(0);
    },
  });

  const handleReset = () => {
    setProgress(0);
    setDownloadInfo(null);
    setStatus("");
  };

  return {
    downloadFileMutation: mutation,
    progress,
    downloadInfo,
    handleReset,
    status,
  };
};