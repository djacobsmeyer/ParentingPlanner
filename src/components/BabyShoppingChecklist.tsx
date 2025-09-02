'use client'

import { useState, useEffect, useCallback } from 'react'
import { xanoApi, XanoApiError } from '@/services/xanoApi'
import { ShoppingItem, xanoToLocal, localToXano, defaultData } from '@/services/dataTransform'

const sourceOptions = ['FB Marketplace', 'Amazon', 'Target', 'Buy Buy Baby', 'Costco/Sams', 'CVS/Walgreens', 'Insurance', 'Grocery Store', 'Local Store']
const statusOptions: ShoppingItem['status'][] = ['Not Started', 'Researching', 'Found Option', 'Purchased', 'Received']
const priorityOptions: ShoppingItem['priority'][] = ['High', 'Medium', 'Low']
const categoryOptions = ['Sleep & Safety', 'Feeding', 'Diapers', 'Clothing', 'Bath & Care', 'Transportation', 'Parents', 'Other']

export default function BabyShoppingChecklist() {
  const [items, setItems] = useState<ShoppingItem[]>([])
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
  const [pendingUpdates, setPendingUpdates] = useState<Set<number>>(new Set())

  // Load data from Xano API
  const loadData = useCallback(async () => {
    setConnectionStatus('loading')
    setSyncStatus('')
    
    try {
      const xanoItems = await xanoApi.getAllItems()
      
      if (xanoItems.length === 0) {
        // No data in API, use default data locally but stay connected
        setItems(defaultData)
        setConnectionStatus('connected')
        setSyncStatus('No data found in database. Using default items.')
      } else {
        // Transform Xano data to local format and merge with category headers
        const apiItems = xanoItems.map(xanoToLocal)
        const mergedItems = mergeWithCategoryHeaders(apiItems)
        setItems(mergedItems)
        setConnectionStatus('connected')
        setSyncStatus('')
      }
    } catch (error) {
      console.error('Error loading data:', error)
      setItems(defaultData)
      setConnectionStatus('error')
      
      if (error instanceof XanoApiError) {
        setSyncStatus(`Connection failed: ${error.message}`)
      } else {
        setSyncStatus('Failed to connect to database. Using local data.')
      }
    }
  }, [])

  // Initial data load
  useEffect(() => {
    loadData()
  }, [loadData])

  // Merge API items with category headers from default data
  const mergeWithCategoryHeaders = (apiItems: ShoppingItem[]): ShoppingItem[] => {
    const result: ShoppingItem[] = []
    const categoryHeaders = defaultData.filter(item => item.category === 'CATEGORY')
    
    for (const header of categoryHeaders) {
      result.push(header)
      const categoryItems = apiItems.filter(item => item.category === header.item.replace(/^(.*?) (ESSENTIALS|STATION|BASICS|& CARE|AROUND|PARENTS)$/, '$1').trim())
      result.push(...categoryItems)
    }
    
    // Add any items that don't fit into predefined categories
    const uncategorizedItems = apiItems.filter(item => 
      !categoryHeaders.some(header => {
        const categoryName = header.item.replace(/^(.*?) (ESSENTIALS|STATION|BASICS|& CARE|AROUND|PARENTS)$/, '$1').trim()
        return item.category === categoryName
      })
    )
    
    if (uncategorizedItems.length > 0) {
      result.push({ 
        completed: false, 
        item: 'OTHER ITEMS', 
        priority: '', 
        preferredSource: '', 
        status: '', 
        estimatedCost: '', 
        notes: '', 
        category: 'CATEGORY' 
      })
      result.push(...uncategorizedItems)
    }
    
    return result
  }

  // Debounced update function
  const debouncedUpdate = useCallback((item: ShoppingItem, delay: number = 1000) => {
    if (!item.id || connectionStatus !== 'connected') return
    
    setPendingUpdates(prev => new Set(prev).add(item.id!))
    
    setTimeout(async () => {
      try {
        const xanoData = localToXano(item)
        await xanoApi.updateItem(item.id!, xanoData)
        
        setPendingUpdates(prev => {
          const newSet = new Set(prev)
          newSet.delete(item.id!)
          return newSet
        })
        
        setSyncStatus('Saved')
        setTimeout(() => setSyncStatus(''), 2000)
      } catch (error) {
        console.error('Error updating item:', error)
        setPendingUpdates(prev => {
          const newSet = new Set(prev)
          newSet.delete(item.id!)
          return newSet
        })
        setSyncStatus('Save failed')
        setTimeout(() => setSyncStatus(''), 3000)
      }
    }, delay)
  }, [connectionStatus])

  const updateItem = (index: number, field: keyof ShoppingItem, value: any) => {
    setItems(prevItems => {
      const newItems = [...prevItems]
      const updatedItem = { ...newItems[index], [field]: value }
      newItems[index] = updatedItem
      
      // Auto-save if item has an ID (came from API) and it's not a category header
      if (updatedItem.id && updatedItem.category !== 'CATEGORY') {
        debouncedUpdate(updatedItem)
      }
      
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

  const addNewItem = async () => {
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
    
    if (connectionStatus === 'connected') {
      // Save to database
      try {
        const xanoData = localToXano(formattedItem)
        const createdItem = await xanoApi.createItem(xanoData)
        const localItem = xanoToLocal(createdItem)
        
        setItems(prevItems => [...prevItems, localItem])
        setSyncStatus('New item created and saved!')
      } catch (error) {
        console.error('Error creating item:', error)
        setItems(prevItems => [...prevItems, formattedItem])
        setSyncStatus('Item added locally (not saved to database)')
      }
    } else {
      // Add locally only
      setItems(prevItems => [...prevItems, formattedItem])
      setSyncStatus('New item added locally!')
    }
    
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
    setTimeout(() => setSyncStatus(''), 3000)
  }

  const deleteItem = async (index: number) => {
    if (confirm('Are you sure you want to delete this item?')) {
      const item = items[index]
      
      if (item.id && connectionStatus === 'connected') {
        // Delete from database
        try {
          await xanoApi.deleteItem(item.id)
          setItems(prevItems => prevItems.filter((_, i) => i !== index))
          setSyncStatus('Item deleted!')
          setTimeout(() => setSyncStatus(''), 3000)
        } catch (error) {
          console.error('Error deleting item:', error)
          setSyncStatus('Failed to delete from database')
          setTimeout(() => setSyncStatus(''), 3000)
        }
      } else {
        // Delete locally only
        setItems(prevItems => prevItems.filter((_, i) => i !== index))
      }
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
      return <div className="text-center p-5 text-gray-600">Loading data from database...</div>
    } else if (connectionStatus === 'connected') {
      return <div className="p-3 mb-5 rounded bg-green-100 text-green-800 border border-green-200 text-center">✅ Connected to database</div>
    } else {
      return <div className="p-3 mb-5 rounded bg-red-100 text-red-800 border border-red-200 text-center">⚠️ Database connection failed. Using local data only.</div>
    }
  }

  const handleRefresh = () => {
    loadData()
  }

  const handleSaveAll = async () => {
    if (connectionStatus !== 'connected') {
      setSyncStatus('Not connected to database')
      setTimeout(() => setSyncStatus(''), 3000)
      return
    }

    setSyncStatus('Saving all changes...')
    
    try {
      const savePromises = items
        .filter(item => item.id && item.category !== 'CATEGORY')
        .map(async (item) => {
          const xanoData = localToXano(item)
          return xanoApi.updateItem(item.id!, xanoData)
        })
      
      await Promise.all(savePromises)
      setSyncStatus('All changes saved!')
      setTimeout(() => setSyncStatus(''), 3000)
    } catch (error) {
      console.error('Error saving all items:', error)
      setSyncStatus('Failed to save some items')
      setTimeout(() => setSyncStatus(''), 3000)
    }
  }

  const handleCreateItem = async () => {
    if (connectionStatus !== 'connected') {
      setSyncStatus('Not connected to database')
      setTimeout(() => setSyncStatus(''), 3000)
      return
    }

    setSyncStatus('Creating new item...')

    try {
      const newItemData = {
        name: 'New Item',
        description: 'User added item',
        priority: 'medium' as const,
        source_url: 'Amazon',
        status: 'pending' as const,
        cost: 0,
        notes: 'Add your notes here...',
        category: 'Other'
      }

      const createdItem = await xanoApi.createItem(newItemData)
      const localItem = xanoToLocal(createdItem)
      
      // Add the new item to the "OTHER ITEMS" category
      setItems(prevItems => {
        const newItems = [...prevItems]
        const otherCategoryIndex = newItems.findIndex(item => item.item === 'OTHER ITEMS' && item.category === 'CATEGORY')
        
        if (otherCategoryIndex === -1) {
          // No "OTHER ITEMS" category exists, add it at the end
          newItems.push({ 
            completed: false, 
            item: 'OTHER ITEMS', 
            priority: '', 
            preferredSource: '', 
            status: '', 
            estimatedCost: '', 
            notes: '', 
            category: 'CATEGORY' 
          })
          newItems.push(localItem)
        } else {
          // Insert after the "OTHER ITEMS" header
          newItems.splice(otherCategoryIndex + 1, 0, localItem)
        }
        
        return newItems
      })
      
      setSyncStatus('New item created!')
      setTimeout(() => setSyncStatus(''), 3000)
    } catch (error) {
      console.error('Error creating item:', error)
      setSyncStatus('Failed to create item')
      setTimeout(() => setSyncStatus(''), 3000)
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
              <span className={`text-sm px-2 py-1 mr-3 ${
                syncStatus.includes('failed') || syncStatus.includes('Failed') ? 'text-red-600' : 'text-green-600'
              }`}>
                {syncStatus}
              </span>
            )}
            {pendingUpdates.size > 0 && (
              <span className="text-sm px-2 py-1 mr-3 text-yellow-600">
                Saving {pendingUpdates.size} item{pendingUpdates.size > 1 ? 's' : ''}...
              </span>
            )}
            <button 
              className="bg-gray-500 text-white px-4 py-2 rounded mr-3 hover:bg-gray-600"
              onClick={handleRefresh}
            >
              Refresh Data
            </button>
            <button 
              className="bg-green-500 text-white px-4 py-2 rounded mr-3 hover:bg-green-600 disabled:opacity-50"
              onClick={handleCreateItem}
              disabled={connectionStatus !== 'connected'}
            >
              + Add Item
            </button>
            <button 
              className="bg-blue-500 text-white px-4 py-2 rounded mr-3 hover:bg-blue-600 disabled:opacity-50"
              onClick={handleSaveAll}
              disabled={connectionStatus !== 'connected'}
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
                      key={item.id ? `item-${item.id}` : `local-${index}`}
                      className={`${item.completed ? 'opacity-60' : ''} ${index % 2 === 0 ? 'bg-gray-50' : 'bg-white'} hover:bg-gray-100`}
                    >
                      <td className="p-2 border-b border-gray-300 relative">
                        <input
                          type="checkbox"
                          className="transform scale-125"
                          checked={item.completed}
                          onChange={(e) => updateItem(index, 'completed', e.target.checked)}
                        />
                        {item.id && pendingUpdates.has(item.id) && (
                          <div className="absolute -top-1 -right-1 w-2 h-2 bg-yellow-400 rounded-full"></div>
                        )}
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
              <li><strong>Database Sync:</strong> Changes are automatically saved to the database so both parents can access from anywhere!</li>
            </ul>
          </div>
        </>
      )}
    </div>
  )
}