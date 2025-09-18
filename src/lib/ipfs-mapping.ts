// IPFS + Pinata mapping service

// Pinata API configuration
const PINATA_API_URL = 'https://api.pinata.cloud';
const PINATA_GATEWAY_URL = 'https://gateway.pinata.cloud';

// Helper function to convert BigInt to string for JSON serialization
function convertBigIntToString(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }
  
  if (typeof obj === 'bigint') {
    return obj.toString();
  }
  
  if (Array.isArray(obj)) {
    return obj.map(convertBigIntToString);
  }
  
  if (typeof obj === 'object') {
    const converted: any = {};
    for (const [key, value] of Object.entries(obj)) {
      converted[key] = convertBigIntToString(value);
    }
    return converted;
  }
  
  return obj;
}

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

/**
 * Store share code and CID mapping to IPFS
 */
export async function storeMappingToIPFS(shareCode: string, pieceCid: string, metadata: any, providerInfo?: any) {
  try {
    // Create mapping data
    const mappingData = {
      shareCode,
      pieceCid,
      metadata,
      providerInfo, // 添加提供商信息
      timestamp: Date.now(),
      version: '1.0'
    };
    
    // Convert BigInt to string for JSON serialization
    const serializableData = convertBigIntToString(mappingData);
    
    // Try to upload to IPFS
    const headers = getPinataHeaders();
    
    const response = await fetch(`${PINATA_API_URL}/pinning/pinJSONToIPFS`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        pinataContent: serializableData,
        pinataMetadata: {
          name: `privshare-mapping-${shareCode.replace('privshare://', '')}`,
          keyvalues: {
            shareCode: shareCode.replace('privshare://', ''),
            pieceCid: pieceCid
          }
        }
      })
    });
    
    if (!response.ok) {
      throw new Error(`Pinata API error: ${response.status} ${response.statusText}`);
    }
    
    const result = await response.json();
    console.log('Mapping stored to IPFS:', result);
    
    // Use IPFS completely, no local storage
    
    return {
      ipfsHash: result.IpfsHash,
      shareCode,
      pieceCid
    };
  } catch (error) {
    console.error('Failed to store to IPFS:', error);
    throw error; // Throw error directly, no local storage fallback
  }
}

/**
 * Get mapping data corresponding to share code from IPFS
 */
export async function getMappingFromIPFS(shareCode: string) {
  try {
    const code = extractCodeFromShareCode(shareCode);
    const headers = getPinataHeaders();
    
    console.log('Searching share code:', code);
    
    // Search for files containing this shareCode via Pinata API
    const response = await fetch(`${PINATA_API_URL}/data/pinList?metadata[keyvalues]={"shareCode":{"value":"${code}","op":"eq"}}`, {
      method: 'GET',
      headers
    });
    
    if (!response.ok) {
      throw new Error(`Pinata API error: ${response.status} ${response.statusText}`);
    }
    
    const result = await response.json();
    console.log('Pinata search results:', result);
    
    if (result.rows && result.rows.length > 0) {
      // Found matching mapping, get data from IPFS
      const ipfsHash = result.rows[0].ipfs_pin_hash;
      console.log('Found IPFS Hash:', ipfsHash);
      
      const dataResponse = await fetch(`${PINATA_GATEWAY_URL}/ipfs/${ipfsHash}`);
      
      if (dataResponse.ok) {
        const mappingData = await dataResponse.json();
        console.log('Retrieved mapping data from IPFS:', mappingData);
        return mappingData; // 返回完整的映射数据
      } else {
        console.error('Unable to get data from IPFS Gateway:', dataResponse.status);
      }
    }
    
    console.warn('No corresponding mapping data found');
    return null;
  } catch (error) {
    console.error('Failed to get from IPFS:', error);
    return null;
  }
}

/**
 * Get CID corresponding to share code from IPFS (backward compatibility)
 */
export async function getCidFromIPFS(shareCode: string) {
  const mappingData = await getMappingFromIPFS(shareCode);
  return mappingData?.pieceCid || null;
}

/**
 * Generate random share code
 */
export function generateRandomShareCode(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  
  for (let i = 0; i < 16; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  const formatted = result.match(/.{1,4}/g)?.join('-') || result;
  const shareCode = `privshare://${formatted}`;
  
  // Debug information
  console.log('Generated share code:', {
    raw: result,
    formatted,
    shareCode
  });
  
  return shareCode;
}

/**
 * Validate share code format
 */
export function validateShareCode(shareCode: string): boolean {
  // Support multiple formats:
  // privshare://xxxx-xxxx-xxxx-xxxx (16 characters, 4 groups)
  // privshare://xxxxx-xxxxx-xxxxx-xxxxx (20 characters, 4 groups)
  // privshare://xxxx-xxxx-xxxx-xxxx-... (longer format)
  const pattern = /^privshare:\/\/[a-z0-9]+(-[a-z0-9]+)*$/;
  const isValid = pattern.test(shareCode);
  
  // Debug information
  console.log('Validating share code:', {
    shareCode,
    isValid,
    length: shareCode.length
  });
  
  return isValid;
}

/**
 * Extract code part from share code
 */
export function extractCodeFromShareCode(shareCode: string): string {
  return shareCode.replace('privshare://', '');
}