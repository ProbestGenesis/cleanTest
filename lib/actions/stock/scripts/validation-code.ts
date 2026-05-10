import { customAlphabet } from 'nanoid'

const numericCode = customAlphabet('0123456789', 6)

export function generateStockOutValidationCode(): string {
  return numericCode()
}

export function generateStockReturnValidationCode(): string {
  return numericCode()
}

export function generateSaleValidationCode(): string {
  return numericCode()
}

export function generatePurchaseValidationCode(): string {
  return numericCode()
}
