export const PRODUCT_CATEGORY_PREFIXES: Record<string, string> = {
  'Traitement industriel (Produits chimiques)': 'TI',
  'Peintures et accessoires': 'PC',
  'Mécanique - Pneumatique - Machinerie': 'MPM',
  'Froid et Climatisation': 'FC',
  'Accessoires et kits solaire photovoltaïque': 'AKSP',
  'Outillages et Divers': 'OD',
  'Equipement de Protection Individuelle (EPI)': 'EPI',
  'Informatique - Photographie - Télécommunication': 'IPT',
  'Accessoires et consommables de Soudure': 'ACS',
  'Courant fort et faible': 'CFF',
}

export const PRODUCT_CATEGORIES = Object.keys(PRODUCT_CATEGORY_PREFIXES)

export const buildProductCodeFromOccurrence = (category: string, occurrence: number) => {
  const prefix = PRODUCT_CATEGORY_PREFIXES[category]
  if (!prefix || occurrence <= 0 || !Number.isFinite(occurrence)) {
    return ''
  }

  return `${prefix}${String(Math.trunc(occurrence)).padStart(4, '0')}`
}

export const generateProductCode = (category: string, categoriesUntilCurrentRow: string[] = []) => {
  if (!category || !category.trim()) {
    return ''
  }

  const occurrence = categoriesUntilCurrentRow.filter((item) => item === category).length
  return buildProductCodeFromOccurrence(category, occurrence)
}
