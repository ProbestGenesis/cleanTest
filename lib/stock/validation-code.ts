/**
 * Generates a 6-digit numeric validation code
 */
export function generateValidationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

export const generateStockOutValidationCode = generateValidationCode
export const generateStockReturnValidationCode = generateValidationCode
export const generateSaleValidationCode = generateValidationCode
export const generatePurchaseValidationCode = generateValidationCode
