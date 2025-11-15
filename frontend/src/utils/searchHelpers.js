/**
 * Generic search filter function for filtering arrays based on multiple fields
 * @param {Array} data - Array of objects to filter
 * @param {string} query - Search query string
 * @param {Array<string>} fields - Array of field paths to search (supports nested like 'vendor.name')
 * @returns {Array} - Filtered array
 */
export const filterBySearch = (data, query, fields) => {
  if (!query || !query.trim()) return data

  const lowerQuery = query.toLowerCase().trim()

  return data.filter((item) => {
    return fields.some((field) => {
      const value = getNestedValue(item, field)
      return value?.toString().toLowerCase().includes(lowerQuery)
    })
  })
}

/**
 * Get nested value from object using dot notation
 * @param {object} obj - Object to get value from
 * @param {string} path - Dot-notated path (e.g., 'vendor.name')
 * @returns {any} - Value at path or undefined
 */
const getNestedValue = (obj, path) => {
  if (!path) return undefined
  
  const keys = path.split('.')
  let value = obj

  for (const key of keys) {
    if (value === null || value === undefined) return undefined
    value = value[key]
  }

  return value
}

/**
 * Search configuration for common entities
 */
export const searchConfigs = {
  pi: [
    'pi_number',
    'partner_vendor.vendor_name',
    'partner_vendor.vendor_code',
    'items.medicine.medicine_name',
    'items.medicine.dosage_form',
  ],
  
  eopa: [
    'pi_item.pi.pi_number',
    'pi_item.pi.partner_vendor.vendor_name',
    'pi_item.pi.partner_vendor.vendor_code',
    'pi_item.medicine.medicine_name',
    'pi_item.medicine.dosage_form',
    'eopa_number',
    'vendor.vendor_name',
    'vendor.vendor_code',
  ],
  
  vendor: [
    'vendor_name',
    'vendor_code',
    'vendor_type',
    'contact_person',
    'phone',
    'email',
  ],
  
  product: [
    'product_name',
    'product_code',
    'category',
  ],
  
  medicine: [
    'medicine_name',
    'medicine_code',
    'dosage_form',
    'strength',
    'manufacturer_vendor.vendor_name',
    'rm_vendor.vendor_name',
    'pm_vendor.vendor_name',
  ],
  
  po: [
    'po_number',
    'po_type',
    'vendor.vendor_name',
    'vendor.vendor_code',
  ],
}
