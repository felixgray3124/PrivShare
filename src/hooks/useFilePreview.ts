import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { FileMetadata } from "../lib/fileMetadata";
import { validateShareCode, extractCodeFromShareCode } from "../lib/ipfs-mapping";

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

export type FilePreviewInfo = {
  metadata: FileMetadata | null;
  isValid: boolean;
  error?: string;
};

/**
 * Hook to preview file information from share code
 */
export const useFilePreview = () => {
  const [previewInfo, setPreviewInfo] = useState<FilePreviewInfo | null>(null);

  const mutation = useMutation({
    mutationKey: ["file-preview"],
    mutationFn: async (shareCode: string) => {
      // Validate share code format
      if (!validateShareCode(shareCode)) {
        throw new Error("Invalid share code format");
      }

      // Extract code from share code
      const code = extractCodeFromShareCode(shareCode);
      const headers = getPinataHeaders();
      
      console.log('Preview searching share code:', code);
      
      // Search for files containing this shareCode via Pinata API
      const response = await fetch(`${PINATA_API_URL}/data/pinList?metadata[keyvalues]={"shareCode":{"value":"${code}","op":"eq"}}`, {
        method: 'GET',
        headers
      });
      
      if (!response.ok) {
        throw new Error(`Pinata API error: ${response.status} ${response.statusText}`);
      }
      
      const result = await response.json();
      console.log('Preview search results:', result);
      
      if (result.rows && result.rows.length > 0) {
        // Get complete metadata from IPFS
        const ipfsHash = result.rows[0].ipfs_pin_hash;
        console.log('Found preview IPFS Hash:', ipfsHash);
        
        const dataResponse = await fetch(`${PINATA_GATEWAY_URL}/ipfs/${ipfsHash}`);
        
        if (dataResponse.ok) {
          const mappingData = await dataResponse.json();
          console.log('Retrieved preview mapping data from IPFS:', mappingData);
          
          // pieceCid is at the top level of mappingData, need to set manually to metadata
          const metadata = mappingData.metadata;
          metadata.pieceCid = mappingData.pieceCid;
          
          return {
            metadata: metadata,
            isValid: true,
          };
        } else {
          throw new Error('Unable to get metadata from IPFS');
        }
      } else {
        throw new Error('File not found. The share code may be invalid or the file may have been deleted.');
      }
    },
    onSuccess: (data) => {
      setPreviewInfo(data);
    },
    onError: (error) => {
      setPreviewInfo({
        metadata: null,
        isValid: false,
        error: error.message,
      });
    },
  });

  const previewFile = (shareCode: string) => {
    mutation.mutate(shareCode);
  };

  const clearPreview = () => {
    setPreviewInfo(null);
  };

  return {
    previewFileMutation: mutation,
    previewInfo,
    previewFile,
    clearPreview,
  };
};
