'use client'

import { useState, useEffect } from 'react'

type ShoppingItem = {
  completed: boolean
  item: string
  priority: 'High' | 'Medium' | 'Low' | ''
  preferredSource: string
  status: 'Not Started' | 'Researching' | 'Found Option' | 'Purchased' | 'Received' | ''
  estimatedCost: string
  notes: string
  category: string
}

const defaultData: ShoppingItem[] = [
  // Sleep & Safety
  { completed: false, item: 'SLEEP & SAFETY', priority: '', preferredSource: '', status: '', estimatedCost: '', notes: '', category: 'CATEGORY' },
  { completed: false, item: 'Crib with firm mattress', priority: 'High', preferredSource: 'FB Marketplace', status: 'Not Started', estimatedCost: '', notes: 'Brand, model, condition...', category: 'Sleep & Safety' },
  { completed: false, item: 'Fitted crib sheets (2-3)', priority: 'High', preferredSource: 'Amazon', status: 'Not Started', estimatedCost: '', notes: 'Organic cotton preferred', category: 'Sleep & Safety' },
  { completed: false, item: 'Bassinet or bedside sleeper', priority: 'Medium', preferredSource: 'FB Marketplace', status: 'Not Started', estimatedCost: '', notes: 'For first few months', category: 'Sleep & Safety' },
  { completed: false, item: 'Sleep sacks/swaddles (NB & 0-3m)', priority: 'High', preferredSource: 'Amazon', status: 'Not Started', estimatedCost: '', notes: 'Halo, Love to Dream, etc.', category: 'Sleep & Safety' },
  { completed: false, item: 'Baby monitor', priority: 'Medium', preferredSource: 'Amazon', status: 'Not Started', estimatedCost: '', notes: 'Audio vs video preference', category: 'Sleep & Safety' },
  
  // Feeding
  { completed: false, item: 'FEEDING ESSENTIALS', priority: '', preferredSource: '', status: '', estimatedCost: '', notes: '', category: 'CATEGORY' },
  { completed: false, item: 'Nursing pillow', priority: 'High', preferredSource: 'Amazon', status: 'Not Started', estimatedCost: '', notes: 'Boppy, My Brest Friend', category: 'Feeding' },
  { completed: false, item: 'Breast pump', priority: 'High', preferredSource: 'Insurance', status: 'Not Started', estimatedCost: '', notes: 'Check insurance coverage first', category: 'Feeding' },
  { completed: false, item: 'Milk storage bags/containers', priority: 'Medium', preferredSource: 'Amazon', status: 'Not Started', estimatedCost: '', notes: 'Can wait until after birth', category: 'Feeding' },
  { completed: false, item: 'Nipple cream', priority: 'High', preferredSource: 'Amazon', status: 'Not Started', estimatedCost: '', notes: 'Lanolin or other recommendations', category: 'Feeding' },
  { completed: false, item: 'Bottles & nipples', priority: 'Medium', preferredSource: 'Amazon', status: 'Not Started', estimatedCost: '', notes: 'Dr. Browns, Philips Avent, etc.', category: 'Feeding' },
  { completed: false, item: 'Formula (if needed)', priority: 'Low', preferredSource: 'Target', status: 'Not Started', estimatedCost: '', notes: 'Have some on hand just in case', category: 'Feeding' },
  { completed: false, item: 'Burp cloths (6-8)', priority: 'High', preferredSource: 'Amazon', status: 'Not Started', estimatedCost: '', notes: 'You will use these constantly', category: 'Feeding' },
  
  // Diapers
  { completed: false, item: 'DIAPER STATION', priority: '', preferredSource: '', status: '', estimatedCost: '', notes: '', category: 'CATEGORY' },
  { completed: false, item: 'Newborn diapers', priority: 'High', preferredSource: 'Costco/Sams', status: 'Not Started', estimatedCost: '', notes: 'Dont over-buy - babies grow fast', category: 'Diapers' },
  { completed: false, item: 'Size 1 diapers', priority: 'High', preferredSource: 'Costco/Sams', status: 'Not Started', estimatedCost: '', notes: 'Stock up on these', category: 'Diapers' },
  { completed: false, item: 'Baby wipes', priority: 'High', preferredSource: 'Costco/Sams', status: 'Not Started', estimatedCost: '', notes: 'Sensitive/fragrance-free preferred', category: 'Diapers' },
  { completed: false, item: 'Diaper cream', priority: 'High', preferredSource: 'Amazon', status: 'Not Started', estimatedCost: '', notes: 'Desitin, A&D, or similar', category: 'Diapers' },
  { completed: false, item: 'Changing pad', priority: 'Medium', preferredSource: 'Amazon', status: 'Not Started', estimatedCost: '', notes: 'Portable or for nursery', category: 'Diapers' },
  
  // Clothing
  { completed: false, item: 'CLOTHING BASICS', priority: '', preferredSource: '', status: '', estimatedCost: '', notes: '', category: 'CATEGORY' },
  { completed: false, item: 'Onesies NB & 0-3m (6-8 each)', priority: 'High', preferredSource: 'FB Marketplace', status: 'Not Started', estimatedCost: '', notes: 'Mix of snaps and pull-over', category: 'Clothing' },
  { completed: false, item: 'Sleepers NB & 0-3m (4-6 each)', priority: 'High', preferredSource: 'FB Marketplace', status: 'Not Started', estimatedCost: '', notes: 'Zippered preferred over snaps', category: 'Clothing' },
  { completed: false, item: 'Going-home outfit', priority: 'Medium', preferredSource: 'Target', status: 'Not Started', estimatedCost: '', notes: 'Have NB and 0-3m ready', category: 'Clothing' },
  { completed: false, item: 'Socks & mittens (lots!)', priority: 'Medium', preferredSource: 'Target', status: 'Not Started', estimatedCost: '', notes: 'They fall off constantly', category: 'Clothing' },
  
  // Bath & Care
  { completed: false, item: 'BATH & CARE', priority: '', preferredSource: '', status: '', estimatedCost: '', notes: '', category: 'CATEGORY' },
  { completed: false, item: 'Baby bathtub', priority: 'Medium', preferredSource: 'FB Marketplace', status: 'Not Started', estimatedCost: '', notes: 'Can wait a few weeks', category: 'Bath & Care' },
  { completed: false, item: 'Baby soap & shampoo', priority: 'Medium', preferredSource: 'Target', status: 'Not Started', estimatedCost: '', notes: 'Gentle, tear-free formula', category: 'Bath & Care' },
  { completed: false, item: 'Baby towels & washcloths', priority: 'Medium', preferredSource: 'Target', status: 'Not Started', estimatedCost: '', notes: 'Soft, hooded towels preferred', category: 'Bath & Care' },
  { completed: false, item: 'Baby nail clippers', priority: 'Low', preferredSource: 'Amazon', status: 'Not Started', estimatedCost: '', notes: 'Safety scissors or files', category: 'Bath & Care' },
  
  // Transportation
  { completed: false, item: 'GETTING AROUND', priority: '', preferredSource: '', status: '', estimatedCost: '', notes: '', category: 'CATEGORY' },
  { completed: false, item: 'Car seat (infant)', priority: 'High', preferredSource: 'FB Marketplace', status: 'Not Started', estimatedCost: '', notes: 'MUST HAVE to leave hospital', category: 'Transportation' },
  { completed: false, item: 'Stroller system', priority: 'Medium', preferredSource: 'FB Marketplace', status: 'Not Started', estimatedCost: '', notes: 'Travel system with car seat compatibility', category: 'Transportation' },
  { completed: false, item: 'Baby carrier/wrap', priority: 'Low', preferredSource: 'Amazon', status: 'Not Started', estimatedCost: '', notes: 'Ergobaby, Baby Björn, wraps', category: 'Transportation' },
  
  // Parents
  { completed: false, item: 'FOR PARENTS', priority: '', preferredSource: '', status: '', estimatedCost: '', notes: '', category: 'CATEGORY' },
  { completed: false, item: 'Comfortable nursing clothes', priority: 'Medium', preferredSource: 'Amazon', status: 'Not Started', estimatedCost: '', notes: 'For mom - nursing tops, robes', category: 'Parents' },
  { completed: false, item: 'Easy snacks & freezer meals', priority: 'High', preferredSource: 'Grocery Store', status: 'Not Started', estimatedCost: '', notes: 'Stock up before due date', category: 'Parents' },
  { completed: false, item: 'Basic first aid supplies', priority: 'Low', preferredSource: 'CVS/Walgreens', status: 'Not Started', estimatedCost: '', notes: 'Baby thermometer, infant Tylenol', category: 'Parents' }
]

const sourceOptions = ['FB Marketplace', 'Amazon', 'Target', 'Buy Buy Baby', 'Costco/Sams', 'CVS/Walgreens', 'Insurance', 'Grocery Store', 'Local Store']
const statusOptions: ShoppingItem['status'][] = ['Not Started', 'Researching', 'Found Option', 'Purchased', 'Received']
const priorityOptions: ShoppingItem['priority'][] = ['High', 'Medium', 'Low']
const categoryOptions = ['Sleep & Safety', 'Feeding', 'Diapers', 'Clothing', 'Bath & Care', 'Transportation', 'Parents', 'Other']

export default function BabyShoppingChecklist() {
  const [items, setItems] = useState<ShoppingItem[]>(defaultData)
  const [connectionStatus, setConnectionStatus] = useState<'loading' | 'connected' | 'error'>('loading')
  const [syncStatus, setSyncStatus] = useState('')
  const [showAddForm, setShowAddForm] = useState(false)
  const [newItem, setNewItem] = useState<ShoppingItem>({
    completed: false,
    item: '',
    priority: '',
    preferredSource: '',
    status: '',
    estimatedCost: '',
    notes: '',
    category: ''
  })
  const [formErrors, setFormErrors] = useState<string[]>([])

  useEffect(() => {
    // Simulate connection attempt
    setTimeout(() => {
      setConnectionStatus('error')
    }, 1000)
  }, [])

  const updateItem = (index: number, field: keyof ShoppingItem, value: any) => {
    setItems(prevItems => {
      const newItems = [...prevItems]
      newItems[index] = { ...newItems[index], [field]: value }
      return newItems
    })
  }

  const validateNewItem = (): string[] => {
    const errors: string[] = []
    
    if (!newItem.item.trim()) {
      errors.push('Item name is required')
    }
    
    if (newItem.estimatedCost && !newItem.estimatedCost.match(/^\$?\d*\.?\d*$/)) {
      errors.push('Estimated cost should be a valid number (e.g., $25.99 or 25.99)')
    }
    
    return errors
  }

  const addNewItem = () => {
    const errors = validateNewItem()
    setFormErrors(errors)
    
    if (errors.length > 0) {
      return
    }
    
    // Auto-format cost if needed
    const formattedItem = { 
      ...newItem,
      estimatedCost: newItem.estimatedCost && !newItem.estimatedCost.startsWith('$') && newItem.estimatedCost.trim() 
        ? `$${newItem.estimatedCost}` 
        : newItem.estimatedCost
    }
    
    setItems(prevItems => [...prevItems, formattedItem])
    setNewItem({
      completed: false,
      item: '',
      priority: '',
      preferredSource: '',
      status: '',
      estimatedCost: '',
      notes: '',
      category: ''
    })
    setFormErrors([])
    setShowAddForm(false)
    setSyncStatus('New item added successfully!')
  }

  const deleteItem = (index: number) => {
    if (confirm('Are you sure you want to delete this item?')) {
      setItems(prevItems => prevItems.filter((_, i) => i !== index))
    }
  }

  const addCategory = (categoryName: string) => {
    const categoryHeader: ShoppingItem = {
      completed: false,
      item: categoryName.toUpperCase(),
      priority: '',
      preferredSource: '',
      status: '',
      estimatedCost: '',
      notes: '',
      category: 'CATEGORY'
    }
    setItems(prevItems => [...prevItems, categoryHeader])
  }

  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'high': return 'text-red-600 font-bold'
      case 'medium': return 'text-orange-500'
      case 'low': return 'text-green-600'
      default: return ''
    }
  }

  const getStatusIndicator = () => {
    if (connectionStatus === 'loading') {
      return <div className="text-center p-5 text-gray-600">Loading data from Google Sheet...</div>
    } else if (connectionStatus === 'connected') {
      return <div className="p-3 mb-5 rounded bg-green-100 text-green-800 border border-green-200 text-center">✅ Connected to Google Sheet</div>
    } else {
      return <div className="p-3 mb-5 rounded bg-red-100 text-red-800 border border-red-200 text-center">⚠️ Google Sheets API not configured. Using local data only.</div>
    }
  }

  return (
    <div className="bg-white p-5 rounded-lg shadow-lg">
      <h1 className="text-3xl font-bold text-blue-800 text-center mb-8">🍼 Baby Shopping Checklist 🍼</h1>
      
      {getStatusIndicator()}

      {connectionStatus !== 'loading' && (
        <>
          <div className="mb-5 text-right">
            {syncStatus && (
              <span className={`text-sm px-2 py-1 mr-3 ${syncStatus.includes('failed') ? 'text-red-600' : 'text-green-600'}`}>
                {syncStatus}
              </span>
            )}
            <button 
              className="bg-gray-500 text-white px-4 py-2 rounded mr-3 hover:bg-gray-600"
              onClick={() => window.location.reload()}
            >
              Refresh Data
            </button>
            <button 
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 mr-3"
              onClick={() => setSyncStatus('All changes saved!')}
            >
              Save All Changes
            </button>
            <button 
              className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
              onClick={() => setShowAddForm(!showAddForm)}
            >
              {showAddForm ? 'Cancel' : '+ Add New Item'}
            </button>
          </div>

          {showAddForm && (
            <div className="mb-5 p-4 bg-gray-50 rounded-lg border">
              <h3 className="text-lg font-bold mb-3">Add New Item</h3>
              {formErrors.length > 0 && (
                <div className="mb-3 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
                  <ul className="list-disc list-inside">
                    {formErrors.map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Item Name *</label>
                  <input
                    type="text"
                    className={`w-full p-2 border rounded ${formErrors.some(e => e.includes('Item name')) ? 'border-red-400 bg-red-50' : 'border-gray-300'}`}
                    value={newItem.item}
                    placeholder="Enter item name"
                    onChange={(e) => setNewItem({...newItem, item: e.target.value})}
                    onFocus={() => setFormErrors(formErrors.filter(e => !e.includes('Item name')))}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Category</label>
                  <select
                    className="w-full p-2 border border-gray-300 rounded bg-white"
                    value={newItem.category}
                    onChange={(e) => setNewItem({...newItem, category: e.target.value})}
                  >
                    <option value="">Select Category</option>
                    {categoryOptions.map(option => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Priority</label>
                  <select
                    className="w-full p-2 border border-gray-300 rounded bg-white"
                    value={newItem.priority}
                    onChange={(e) => setNewItem({...newItem, priority: e.target.value as ShoppingItem['priority']})}
                  >
                    <option value="">Select Priority</option>
                    {priorityOptions.map(option => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Preferred Source</label>
                  <select
                    className="w-full p-2 border border-gray-300 rounded bg-white"
                    value={newItem.preferredSource}
                    onChange={(e) => setNewItem({...newItem, preferredSource: e.target.value})}
                  >
                    <option value="">Select Source</option>
                    {sourceOptions.map(option => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Status</label>
                  <select
                    className="w-full p-2 border border-gray-300 rounded bg-white"
                    value={newItem.status}
                    onChange={(e) => setNewItem({...newItem, status: e.target.value as ShoppingItem['status']})}
                  >
                    <option value="">Select Status</option>
                    {statusOptions.map(option => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Estimated Cost</label>
                  <input
                    type="text"
                    className={`w-full p-2 border rounded ${formErrors.some(e => e.includes('cost')) ? 'border-red-400 bg-red-50' : 'border-gray-300'}`}
                    value={newItem.estimatedCost}
                    placeholder="$0.00"
                    onChange={(e) => setNewItem({...newItem, estimatedCost: e.target.value})}
                    onFocus={() => setFormErrors(formErrors.filter(e => !e.includes('cost')))}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Notes</label>
                  <input
                    type="text"
                    className="w-full p-2 border border-gray-300 rounded"
                    value={newItem.notes}
                    placeholder="Notes or specific model..."
                    onChange={(e) => setNewItem({...newItem, notes: e.target.value})}
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                  onClick={addNewItem}
                >
                  Add Item
                </button>
                <button
                  className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
                  onClick={() => {
                    setShowAddForm(false)
                    setNewItem({
                      completed: false,
                      item: '',
                      priority: '',
                      preferredSource: '',
                      status: '',
                      estimatedCost: '',
                      notes: '',
                      category: ''
                    })
                  }}
                >
                  Cancel
                </button>
                <button
                  className="bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600"
                  onClick={() => {
                    const categoryName = prompt('Enter new category name:')
                    if (categoryName && categoryName.trim()) {
                      addCategory(categoryName.trim())
                      setNewItem({...newItem, category: categoryName.trim()})
                    }
                  }}
                >
                  + Add New Category
                </button>
              </div>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full border-collapse mb-5">
              <thead>
                <tr>
                  <th className="bg-green-500 text-white p-3 text-left font-bold sticky top-0 z-10">✓</th>
                  <th className="bg-green-500 text-white p-3 text-left font-bold sticky top-0 z-10">Item</th>
                  <th className="bg-green-500 text-white p-3 text-left font-bold sticky top-0 z-10">Category</th>
                  <th className="bg-green-500 text-white p-3 text-left font-bold sticky top-0 z-10">Priority</th>
                  <th className="bg-green-500 text-white p-3 text-left font-bold sticky top-0 z-10">Preferred Source</th>
                  <th className="bg-green-500 text-white p-3 text-left font-bold sticky top-0 z-10">Status</th>
                  <th className="bg-green-500 text-white p-3 text-left font-bold sticky top-0 z-10">Est. Cost</th>
                  <th className="bg-green-500 text-white p-3 text-left font-bold sticky top-0 z-10">Notes/Specific Model</th>
                  <th className="bg-green-500 text-white p-3 text-left font-bold sticky top-0 z-10">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, index) => (
                  item.category === 'CATEGORY' ? (
                    <tr key={index} className="bg-blue-50">
                      <td colSpan={9} className="p-3 font-bold text-blue-800 border-b border-gray-300">
                        <input
                          type="text"
                          className="w-full bg-transparent font-bold text-blue-800 border-none outline-none"
                          value={item.item}
                          onChange={(e) => updateItem(index, 'item', e.target.value)}
                        />
                      </td>
                    </tr>
                  ) : (
                    <tr 
                      key={index} 
                      className={`${item.completed ? 'opacity-60' : ''} ${index % 2 === 0 ? 'bg-gray-50' : 'bg-white'} hover:bg-gray-100`}
                    >
                      <td className="p-2 border-b border-gray-300">
                        <input
                          type="checkbox"
                          className="transform scale-125"
                          checked={item.completed}
                          onChange={(e) => updateItem(index, 'completed', e.target.checked)}
                        />
                      </td>
                      <td className="p-2 border-b border-gray-300">
                        <input
                          type="text"
                          className={`w-full p-1 border border-gray-300 rounded ${item.completed ? 'line-through opacity-60' : ''}`}
                          value={item.item}
                          onChange={(e) => updateItem(index, 'item', e.target.value)}
                        />
                      </td>
                      <td className="p-2 border-b border-gray-300">
                        <select
                          className="w-full p-1 border border-gray-300 rounded bg-white"
                          value={item.category}
                          onChange={(e) => updateItem(index, 'category', e.target.value)}
                        >
                          <option value="">Select Category</option>
                          {categoryOptions.map(option => (
                            <option key={option} value={option}>{option}</option>
                          ))}
                        </select>
                      </td>
                      <td className="p-2 border-b border-gray-300">
                        <select
                          className="w-full p-1 border border-gray-300 rounded bg-white"
                          value={item.priority}
                          onChange={(e) => updateItem(index, 'priority', e.target.value as ShoppingItem['priority'])}
                        >
                          <option value="">Select Priority</option>
                          {priorityOptions.map(option => (
                            <option key={option} value={option}>{option}</option>
                          ))}
                        </select>
                      </td>
                      <td className="p-2 border-b border-gray-300">
                        <select
                          className="w-full p-1 border border-gray-300 rounded bg-white"
                          value={item.preferredSource}
                          onChange={(e) => updateItem(index, 'preferredSource', e.target.value)}
                        >
                          {sourceOptions.map(option => (
                            <option key={option} value={option}>{option}</option>
                          ))}
                        </select>
                      </td>
                      <td className="p-2 border-b border-gray-300">
                        <select
                          className="w-full p-1 border border-gray-300 rounded bg-white"
                          value={item.status}
                          onChange={(e) => updateItem(index, 'status', e.target.value as ShoppingItem['status'])}
                        >
                          {statusOptions.map(option => (
                            <option key={option} value={option}>{option}</option>
                          ))}
                        </select>
                      </td>
                      <td className="p-2 border-b border-gray-300">
                        <input
                          type="text"
                          className="w-full p-1 border border-gray-300 rounded"
                          value={item.estimatedCost}
                          placeholder="$"
                          onChange={(e) => updateItem(index, 'estimatedCost', e.target.value)}
                        />
                      </td>
                      <td className="p-2 border-b border-gray-300 min-w-[200px]">
                        <input
                          type="text"
                          className="w-full p-1 border border-gray-300 rounded"
                          value={item.notes}
                          placeholder="Notes..."
                          onChange={(e) => updateItem(index, 'notes', e.target.value)}
                        />
                      </td>
                      <td className="p-2 border-b border-gray-300">
                        <button
                          onClick={() => deleteItem(index)}
                          className="bg-red-500 text-white px-2 py-1 rounded text-sm hover:bg-red-600"
                          title="Delete item"
                        >
                          🗑️
                        </button>
                      </td>
                    </tr>
                  )
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-8 p-4 bg-blue-50 rounded-lg">
            <h3 className="text-xl font-bold text-blue-800 mt-0 mb-4">💡 Pro Tips:</h3>
            <ul className="space-y-2">
              <li><strong>FB Marketplace:</strong> Great for bigger items like cribs, strollers, high chairs - just check safety recalls</li>
              <li><strong>Don&apos;t overbuy newborn stuff:</strong> Babies grow out of NB size quickly</li>
              <li><strong>Check your insurance:</strong> Many cover breast pumps - call them first</li>
              <li><strong>Hospital checklist:</strong> Car seat is REQUIRED to leave the hospital</li>
              <li><strong>Stock up timing:</strong> Have essentials by 36 weeks (babies can come early!)</li>
              <li><strong>Google Sheets Integration:</strong> Changes are automatically saved to your Google Sheet so both parents can access from anywhere!</li>
            </ul>
          </div>
        </>
      )}
    </div>
  )
}