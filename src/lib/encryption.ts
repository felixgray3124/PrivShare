// Generate random key (4-12 character simple string)
export function generateKey(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  const length = Math.floor(Math.random() * 9) + 4 // 4-12 characters
  let result = ''
  
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  
  return result
}

// Generate random IV
export function generateIV(): string {
  const array = new Uint8Array(16)
  crypto.getRandomValues(array)
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('')
}

// Encrypt file
export async function encryptFile(file: File, key: string): Promise<{
  encryptedData: string
  iv: string
  originalName: string
  originalSize: number
  mimeType: string
}> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    
    reader.onload = async () => {
      try {
        const fileData = reader.result as ArrayBuffer
        
        // Generate random IV
        const iv = generateIV()
        const ivArray = new Uint8Array(16)
        for (let i = 0; i < 16; i++) {
          ivArray[i] = parseInt(iv.substr(i * 2, 2), 16)
        }
        
        // Prepare key - convert simple string to hexadecimal
        let hexKey = key
        if (!/^[0-9a-fA-F]+$/.test(key)) {
          // If not hexadecimal, convert to hexadecimal
          hexKey = Array.from(key, char => char.charCodeAt(0).toString(16).padStart(2, '0')).join('')
        }
        
        // Ensure key length is 64 bits (32 bytes)
        while (hexKey.length < 64) {
          hexKey += hexKey // Repeat key until reaching 64 bits
        }
        hexKey = hexKey.substring(0, 64) // Take first 64 bits
        
        const keyArray = new Uint8Array(32)
        for (let i = 0; i < 32; i++) {
          keyArray[i] = parseInt(hexKey.substr(i * 2, 2), 16)
        }
        
        // Use Web Crypto API for encryption
        const cryptoKey = await crypto.subtle.importKey(
          'raw',
          keyArray,
          { name: 'AES-CBC' },
          false,
          ['encrypt']
        )
        
        const encrypted = await crypto.subtle.encrypt(
          { name: 'AES-CBC', iv: ivArray },
          cryptoKey,
          fileData
        )
        
        // Convert to base64 string
        const encryptedArray = new Uint8Array(encrypted)
        // Use chunking to avoid stack overflow
        let encryptedString = ''
        const chunkSize = 8192 // 8KB chunks
        for (let i = 0; i < encryptedArray.length; i += chunkSize) {
          const chunk = encryptedArray.slice(i, i + chunkSize)
          encryptedString += String.fromCharCode(...chunk)
        }
        encryptedString = btoa(encryptedString)
        
        resolve({
          encryptedData: encryptedString,
          iv,
          originalName: file.name,
          originalSize: file.size,
          mimeType: file.type
        })
      } catch (error) {
        reject(error)
      }
    }
    
    reader.onerror = () => reject(reader.error)
    reader.readAsArrayBuffer(file)
  })
}

// Decrypt file
export async function decryptFile(
  encryptedData: string,
  key: string,
  iv: string
): Promise<string> {
  try {
    // Prepare IV
    const ivArray = new Uint8Array(16)
    for (let i = 0; i < 16; i++) {
      ivArray[i] = parseInt(iv.substr(i * 2, 2), 16)
    }
    
    // Prepare key - convert simple string to hexadecimal
    let hexKey = key
    if (!/^[0-9a-fA-F]+$/.test(key)) {
      // If not hexadecimal, convert to hexadecimal
      hexKey = Array.from(key, char => char.charCodeAt(0).toString(16).padStart(2, '0')).join('')
    }
    
    // Ensure key length is 64 bits (32 bytes)
    while (hexKey.length < 64) {
      hexKey += hexKey // Repeat key until reaching 64 bits
    }
    hexKey = hexKey.substring(0, 64) // Take first 64 bits
    
    const keyArray = new Uint8Array(32)
    for (let i = 0; i < 32; i++) {
      keyArray[i] = parseInt(hexKey.substr(i * 2, 2), 16)
    }
    
    // Convert base64 string to ArrayBuffer
    const encryptedArray = Uint8Array.from(atob(encryptedData), c => c.charCodeAt(0))
    
    // Use Web Crypto API for decryption
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyArray,
      { name: 'AES-CBC' },
      false,
      ['decrypt']
    )
    
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-CBC', iv: ivArray },
      cryptoKey,
      encryptedArray
    )
    
    // Convert to base64 string
    const decryptedArray = new Uint8Array(decrypted)
    // Use chunking to avoid stack overflow
    let decryptedString = ''
    const chunkSize = 8192 // 8KB chunks
    for (let i = 0; i < decryptedArray.length; i += chunkSize) {
      const chunk = decryptedArray.slice(i, i + chunkSize)
      decryptedString += String.fromCharCode(...chunk)
    }
    return btoa(decryptedString)
  } catch (error) {
    throw new Error('File decryption failed, please check if the key is correct')
  }
}

// Generate share code
export function generateShareCode(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 5; j++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    if (i < 3) result += '-'
  }
  
  return `privshare://${result}`
}

// Validate share code format
export function validateShareCode(shareCode: string): boolean {
  const pattern = /^privshare:\/\/[a-z0-9]{5}-[a-z0-9]{5}-[a-z0-9]{5}-[a-z0-9]{5}$/
  return pattern.test(shareCode)
}

// Extract code part from share code
export function extractCodeFromShareCode(shareCode: string): string {
  return shareCode.replace('privshare://', '')
}
