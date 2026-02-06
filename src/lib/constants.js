// Style statuses
export const STYLE_STATUSES = [
  { value: 'concept', label: 'Concept', color: '#e0e7ff' },
  { value: 'development', label: 'Development', color: '#dbeafe' },
  { value: 'sampling', label: 'Sampling', color: '#fef3c7' },
  { value: 'costing', label: 'Costing', color: '#fce7f3' },
  { value: 'approved', label: 'Approved', color: '#dcfce7' },
  { value: 'production', label: 'Production', color: '#cffafe' },
  { value: 'shipped', label: 'Shipped', color: '#e0e7ff' },
  { value: 'cancelled', label: 'Cancelled', color: '#fee2e2' },
]

// Style categories
export const STYLE_CATEGORIES = [
  'Tops', 'Bottoms', 'Dresses', 'Outerwear', 'Knitwear',
  'Swimwear', 'Activewear', 'Loungewear', 'Accessories', 'Footwear',
]

// Supplier statuses
export const SUPPLIER_STATUSES = [
  { value: 'active', label: 'Active', color: '#dcfce7' },
  { value: 'pending_approval', label: 'Pending Approval', color: '#fef3c7' },
  { value: 'inactive', label: 'Inactive', color: '#f3f4f6' },
  { value: 'blacklisted', label: 'Blacklisted', color: '#fee2e2' },
]

// Product types (for suppliers)
export const PRODUCT_TYPES = [
  'Knits', 'Wovens', 'Denim', 'Leather', 'Outerwear',
  'Swimwear', 'Activewear', 'Accessories', 'Footwear', 'Bags',
]

// Supplier capabilities
export const CAPABILITIES = [
  'Embroidery', 'Printing', 'Washing', 'Dyeing', 'Knitting',
  'Weaving', 'Cutting', 'Sewing', 'Finishing', 'Packaging',
]

// Certifications
export const CERTIFICATIONS = [
  'GOTS', 'OEKO-TEX', 'BSCI', 'WRAP', 'SA8000',
  'Fair Trade', 'GRS', 'BCI', 'ISO 9001', 'ISO 14001',
]

// Material types
export const MATERIAL_TYPES = [
  { value: 'fabric', label: 'Fabric' },
  { value: 'trim', label: 'Trim' },
  { value: 'packaging', label: 'Packaging' },
]

// BOM component types
export const BOM_COMPONENTS = [
  'Shell Fabric', 'Lining', 'Interlining', 'Ribbing',
  'Zipper', 'Button', 'Snap', 'Hook & Eye',
  'Main Label', 'Care Label', 'Size Label', 'Hang Tag',
  'Thread', 'Elastic', 'Drawcord', 'Tape',
  'Polybag', 'Hanger', 'Tissue Paper', 'Box',
]

// Consumption units
export const CONSUMPTION_UNITS = [
  { value: 'yard', label: 'Yard' },
  { value: 'meter', label: 'Meter' },
  { value: 'piece', label: 'Piece' },
  { value: 'set', label: 'Set' },
  { value: 'roll', label: 'Roll' },
]

// Common size runs
export const SIZE_PRESETS = {
  'XS-XL': ['XS', 'S', 'M', 'L', 'XL'],
  'XS-XXL': ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
  'S-XL': ['S', 'M', 'L', 'XL'],
  '0-12': ['0', '2', '4', '6', '8', '10', '12'],
  '24-34': ['24', '25', '26', '27', '28', '29', '30', '31', '32', '33', '34'],
  'One Size': ['OS'],
}

// Sample rounds
export const SAMPLE_ROUNDS = [
  { value: 'proto', label: 'Proto', color: '#818cf8' },
  { value: 'fit', label: 'Fit', color: '#fb923c' },
  { value: 'pp', label: 'Pre-Production', color: '#facc15' },
  { value: 'top', label: 'Top of Production', color: '#34d399' },
  { value: 'shipment', label: 'Shipment', color: '#60a5fa' },
]

// Sample statuses
export const SAMPLE_STATUSES = [
  { value: 'requested', label: 'Requested' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'received', label: 'Received' },
  { value: 'under_review', label: 'Under Review' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'revised', label: 'Revised' },
]

// PO statuses
export const PO_STATUSES = [
  { value: 'draft', label: 'Draft', color: '#f3f4f6' },
  { value: 'issued', label: 'Issued', color: '#dbeafe' },
  { value: 'confirmed', label: 'Confirmed', color: '#dcfce7' },
  { value: 'in_production', label: 'In Production', color: '#cffafe' },
  { value: 'shipped', label: 'Shipped', color: '#e0e7ff' },
  { value: 'received', label: 'Received', color: '#d1fae5' },
  { value: 'cancelled', label: 'Cancelled', color: '#fee2e2' },
]

// People roles
export const ROLES = [
  { value: 'sourcing_manager', label: 'Sourcing Manager' },
  { value: 'production_manager', label: 'Production Manager' },
  { value: 'merchandiser', label: 'Merchandiser' },
  { value: 'qc_manager', label: 'QC Manager' },
  { value: 'technical_designer', label: 'Technical Designer' },
  { value: 'admin', label: 'Admin' },
]

// Currencies
export const CURRENCIES = ['USD', 'EUR', 'GBP', 'CNY', 'BDT', 'VND', 'INR', 'TRY']

// Costing categories
export const COST_CATEGORIES = [
  { key: 'fabric', label: 'Fabric' },
  { key: 'trims', label: 'Trims & Accessories' },
  { key: 'labor', label: 'Labor / CMT' },
  { key: 'washing', label: 'Washing / Finishing' },
  { key: 'printing', label: 'Printing' },
  { key: 'embroidery', label: 'Embroidery' },
  { key: 'packaging', label: 'Packaging' },
  { key: 'other', label: 'Other Costs' },
]

// Compliance test types
export const TEST_TYPES = [
  'Flammability',
  'AZO Dyes',
  'Lead Content',
  'Phthalates',
  'Fiber Content',
  'Care Label Verification',
  'Colorfastness',
  'Shrinkage',
  'Tensile Strength',
  'pH Level',
  'Formaldehyde',
  'Nickel Release',
]

// Compliance test statuses
export const TEST_STATUSES = [
  { value: 'pending', label: 'Pending', color: '#f3f4f6' },
  { value: 'submitted', label: 'Submitted', color: '#dbeafe' },
  { value: 'in_testing', label: 'In Testing', color: '#fef3c7' },
  { value: 'pass', label: 'Pass', color: '#dcfce7' },
  { value: 'fail', label: 'Fail', color: '#fee2e2' },
  { value: 'conditional', label: 'Conditional Pass', color: '#fef3c7' },
]
