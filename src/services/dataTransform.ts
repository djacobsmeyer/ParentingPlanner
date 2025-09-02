import { XanoShoppingItem, CreateShoppingItemRequest } from './xanoApi'

export interface ShoppingItem {
  id?: number
  completed: boolean
  item: string
  priority: 'High' | 'Medium' | 'Low' | ''
  preferredSource: string
  sourceUrl: string
  status: 'Not Started' | 'Researching' | 'Found Option' | 'Purchased' | 'Received' | ''
  estimatedCost: string
  notes: string
  category: string
}

export function xanoToLocal(xanoItem: XanoShoppingItem): ShoppingItem {
  return {
    id: xanoItem.id,
    completed: xanoItem.status === 'purchased',
    item: xanoItem.name,
    priority: capitalizeFirst(xanoItem.priority) as ShoppingItem['priority'],
    preferredSource: '', // Keep as empty since we now have separate fields
    sourceUrl: xanoItem.source_url || '',
    status: mapXanoStatusToLocal(xanoItem.status),
    estimatedCost: xanoItem.cost ? `$${xanoItem.cost}` : '',
    notes: xanoItem.notes || '',
    category: xanoItem.category
  }
}

export function localToXano(localItem: ShoppingItem, userId: number = 1): CreateShoppingItemRequest {
  // Don't transform category headers
  if (localItem.category === 'CATEGORY') {
    throw new Error('Cannot transform category header to Xano format')
  }

  // Handle empty priority - default to 'medium' if empty
  const priority = localItem.priority && localItem.priority.trim() 
    ? localItem.priority.toLowerCase() as 'low' | 'medium' | 'high'
    : 'medium'
  
  // Handle empty status - ensure we have a valid status
  const status = localItem.status && localItem.status.trim()
    ? mapLocalStatusToXano(localItem.status, localItem.completed)
    : 'pending'

  return {
    user: userId,
    name: localItem.item || 'Unnamed Item', // Ensure name is not empty
    description: localItem.notes || '', // Use notes as description if available
    priority,
    source_url: localItem.sourceUrl || '',
    status,
    cost: parseFloat(localItem.estimatedCost.replace(/[^0-9.]/g, '')) || 0,
    notes: localItem.notes || '',
    category: localItem.category || 'Other'
  }
}

function capitalizeFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase()
}

function mapXanoStatusToLocal(xanoStatus: 'pending' | 'purchased' | 'not needed'): ShoppingItem['status'] {
  switch (xanoStatus) {
    case 'pending':
      return 'Not Started'
    case 'purchased':
      return 'Purchased'
    case 'not needed':
      return 'Received' // Map to closest equivalent
    default:
      return 'Not Started'
  }
}

function mapLocalStatusToXano(
  localStatus: ShoppingItem['status'], 
  completed: boolean
): 'pending' | 'purchased' | 'not needed' {
  if (completed || localStatus === 'Purchased') {
    return 'purchased'
  }
  
  switch (localStatus) {
    case 'Not Started':
    case 'Researching':
    case 'Found Option':
    case '':
      return 'pending'
    case 'Received':
      return 'not needed'
    default:
      return 'pending'
  }
}

// Default data for seeding or fallback
export const defaultData: ShoppingItem[] = [
  // Sleep & Safety
  { completed: false, item: 'SLEEP & SAFETY', priority: '', preferredSource: '', sourceUrl: '', status: '', estimatedCost: '', notes: '', category: 'CATEGORY' },
  { completed: false, item: 'Crib with firm mattress', priority: 'High', preferredSource: 'FB Marketplace', sourceUrl: '', status: 'Not Started', estimatedCost: '', notes: 'Brand, model, condition...', category: 'Sleep & Safety' },
  { completed: false, item: 'Fitted crib sheets (2-3)', priority: 'High', preferredSource: 'Amazon', sourceUrl: '', status: 'Not Started', estimatedCost: '', notes: 'Organic cotton preferred', category: 'Sleep & Safety' },
  { completed: false, item: 'Bassinet or bedside sleeper', priority: 'Medium', preferredSource: 'FB Marketplace', sourceUrl: '', status: 'Not Started', estimatedCost: '', notes: 'For first few months', category: 'Sleep & Safety' },
  { completed: false, item: 'Sleep sacks/swaddles (NB & 0-3m)', priority: 'High', preferredSource: 'Amazon', sourceUrl: '', status: 'Not Started', estimatedCost: '', notes: 'Halo, Love to Dream, etc.', category: 'Sleep & Safety' },
  { completed: false, item: 'Baby monitor', priority: 'Medium', preferredSource: 'Amazon', sourceUrl: '', status: 'Not Started', estimatedCost: '', notes: 'Audio vs video preference', category: 'Sleep & Safety' },
  
  // Feeding
  { completed: false, item: 'FEEDING ESSENTIALS', priority: '', preferredSource: '', status: '', estimatedCost: '', notes: '', category: 'CATEGORY' },
  { completed: false, item: 'Nursing pillow', priority: 'High', preferredSource: 'Amazon', sourceUrl: '', status: 'Not Started', estimatedCost: '', notes: 'Boppy, My Brest Friend', category: 'Feeding' },
  { completed: false, item: 'Breast pump', priority: 'High', preferredSource: 'Insurance', sourceUrl: '', status: 'Not Started', estimatedCost: '', notes: 'Check insurance coverage first', category: 'Feeding' },
  { completed: false, item: 'Milk storage bags/containers', priority: 'Medium', preferredSource: 'Amazon', sourceUrl: '', status: 'Not Started', estimatedCost: '', notes: 'Can wait until after birth', category: 'Feeding' },
  { completed: false, item: 'Nipple cream', priority: 'High', preferredSource: 'Amazon', sourceUrl: '', status: 'Not Started', estimatedCost: '', notes: 'Lanolin or other recommendations', category: 'Feeding' },
  { completed: false, item: 'Bottles & nipples', priority: 'Medium', preferredSource: 'Amazon', sourceUrl: '', status: 'Not Started', estimatedCost: '', notes: 'Dr. Browns, Philips Avent, etc.', category: 'Feeding' },
  { completed: false, item: 'Formula (if needed)', priority: 'Low', preferredSource: 'Target', sourceUrl: '', status: 'Not Started', estimatedCost: '', notes: 'Have some on hand just in case', category: 'Feeding' },
  { completed: false, item: 'Burp cloths (6-8)', priority: 'High', preferredSource: 'Amazon', sourceUrl: '', status: 'Not Started', estimatedCost: '', notes: 'You will use these constantly', category: 'Feeding' },
  
  // Diapers
  { completed: false, item: 'DIAPER STATION', priority: '', preferredSource: '', status: '', estimatedCost: '', notes: '', category: 'CATEGORY' },
  { completed: false, item: 'Newborn diapers', priority: 'High', preferredSource: 'Costco/Sams', sourceUrl: '', status: 'Not Started', estimatedCost: '', notes: 'Dont over-buy - babies grow fast', category: 'Diapers' },
  { completed: false, item: 'Size 1 diapers', priority: 'High', preferredSource: 'Costco/Sams', sourceUrl: '', status: 'Not Started', estimatedCost: '', notes: 'Stock up on these', category: 'Diapers' },
  { completed: false, item: 'Baby wipes', priority: 'High', preferredSource: 'Costco/Sams', sourceUrl: '', status: 'Not Started', estimatedCost: '', notes: 'Sensitive/fragrance-free preferred', category: 'Diapers' },
  { completed: false, item: 'Diaper cream', priority: 'High', preferredSource: 'Amazon', sourceUrl: '', status: 'Not Started', estimatedCost: '', notes: 'Desitin, A&D, or similar', category: 'Diapers' },
  { completed: false, item: 'Changing pad', priority: 'Medium', preferredSource: 'Amazon', sourceUrl: '', status: 'Not Started', estimatedCost: '', notes: 'Portable or for nursery', category: 'Diapers' },
  
  // Clothing
  { completed: false, item: 'CLOTHING BASICS', priority: '', preferredSource: '', status: '', estimatedCost: '', notes: '', category: 'CATEGORY' },
  { completed: false, item: 'Onesies NB & 0-3m (6-8 each)', priority: 'High', preferredSource: 'FB Marketplace', sourceUrl: '', status: 'Not Started', estimatedCost: '', notes: 'Mix of snaps and pull-over', category: 'Clothing' },
  { completed: false, item: 'Sleepers NB & 0-3m (4-6 each)', priority: 'High', preferredSource: 'FB Marketplace', sourceUrl: '', status: 'Not Started', estimatedCost: '', notes: 'Zippered preferred over snaps', category: 'Clothing' },
  { completed: false, item: 'Going-home outfit', priority: 'Medium', preferredSource: 'Target', sourceUrl: '', status: 'Not Started', estimatedCost: '', notes: 'Have NB and 0-3m ready', category: 'Clothing' },
  { completed: false, item: 'Socks & mittens (lots!)', priority: 'Medium', preferredSource: 'Target', sourceUrl: '', status: 'Not Started', estimatedCost: '', notes: 'They fall off constantly', category: 'Clothing' },
  
  // Bath & Care
  { completed: false, item: 'BATH & CARE', priority: '', preferredSource: '', status: '', estimatedCost: '', notes: '', category: 'CATEGORY' },
  { completed: false, item: 'Baby bathtub', priority: 'Medium', preferredSource: 'FB Marketplace', sourceUrl: '', status: 'Not Started', estimatedCost: '', notes: 'Can wait a few weeks', category: 'Bath & Care' },
  { completed: false, item: 'Baby soap & shampoo', priority: 'Medium', preferredSource: 'Target', sourceUrl: '', status: 'Not Started', estimatedCost: '', notes: 'Gentle, tear-free formula', category: 'Bath & Care' },
  { completed: false, item: 'Baby towels & washcloths', priority: 'Medium', preferredSource: 'Target', sourceUrl: '', status: 'Not Started', estimatedCost: '', notes: 'Soft, hooded towels preferred', category: 'Bath & Care' },
  { completed: false, item: 'Baby nail clippers', priority: 'Low', preferredSource: 'Amazon', sourceUrl: '', status: 'Not Started', estimatedCost: '', notes: 'Safety scissors or files', category: 'Bath & Care' },
  
  // Transportation
  { completed: false, item: 'GETTING AROUND', priority: '', preferredSource: '', status: '', estimatedCost: '', notes: '', category: 'CATEGORY' },
  { completed: false, item: 'Car seat (infant)', priority: 'High', preferredSource: 'FB Marketplace', sourceUrl: '', status: 'Not Started', estimatedCost: '', notes: 'MUST HAVE to leave hospital', category: 'Transportation' },
  { completed: false, item: 'Stroller system', priority: 'Medium', preferredSource: 'FB Marketplace', sourceUrl: '', status: 'Not Started', estimatedCost: '', notes: 'Travel system with car seat compatibility', category: 'Transportation' },
  { completed: false, item: 'Baby carrier/wrap', priority: 'Low', preferredSource: 'Amazon', sourceUrl: '', status: 'Not Started', estimatedCost: '', notes: 'Ergobaby, Baby Björn, wraps', category: 'Transportation' },
  
  // Parents
  { completed: false, item: 'FOR PARENTS', priority: '', preferredSource: '', status: '', estimatedCost: '', notes: '', category: 'CATEGORY' },
  { completed: false, item: 'Comfortable nursing clothes', priority: 'Medium', preferredSource: 'Amazon', sourceUrl: '', status: 'Not Started', estimatedCost: '', notes: 'For mom - nursing tops, robes', category: 'Parents' },
  { completed: false, item: 'Easy snacks & freezer meals', priority: 'High', preferredSource: 'Grocery Store', sourceUrl: '', status: 'Not Started', estimatedCost: '', notes: 'Stock up before due date', category: 'Parents' },
  { completed: false, item: 'Basic first aid supplies', priority: 'Low', preferredSource: 'CVS/Walgreens', sourceUrl: '', status: 'Not Started', estimatedCost: '', notes: 'Baby thermometer, infant Tylenol', category: 'Parents' }
]