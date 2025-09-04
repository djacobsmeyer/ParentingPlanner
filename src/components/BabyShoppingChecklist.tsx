'use client'

import { useState, useEffect, useCallback } from 'react'
import { xanoApi, XanoApiError } from '@/services/xanoApi'
import { ShoppingItem, xanoToLocal, localToXano, defaultData } from '@/services/dataTransform'
import UrlThumbnail from './UrlThumbnail'

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
    sourceUrl: '',
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
    sourceUrl: '', 
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
    console.log(`⏲️ debouncedUpdate called for item ID: ${item.id}, delay: ${delay}ms`)
    
    if (!item.id || connectionStatus !== 'connected') {
      console.log(`🚫 debouncedUpdate early return - ID: ${item.id}, connectionStatus: ${connectionStatus}`)
      return
    }
    
    console.log(`⏳ Setting item ${item.id} as pending update`)
    setPendingUpdates(prev => new Set(prev).add(item.id!))
    
    setTimeout(async () => {
      try {
        console.log(`🎬 Starting update for item ${item.id} after ${delay}ms delay`)
        
        // Skip category headers
        if (item.category === 'CATEGORY') {
          console.log(`⏭️ Skipping update: Category header detected for item ${item.id}`)
          setPendingUpdates(prev => {
            const newSet = new Set(prev)
            newSet.delete(item.id!)
            return newSet
          })
          return
        }

        console.log(`🔄 Converting item to Xano format:`, item)
        const xanoData = localToXano(item)
        console.log(`📤 Sending to Xano API:`, xanoData)
        
        try {
          await xanoApi.updateItem(item.id!, xanoData)
          console.log(`✅ Successfully updated item ${item.id} in Xano`)
        } catch (updateError) {
          // If update fails with 400, the item might not exist - try creating it
          if (updateError instanceof Error && updateError.message.includes('400')) {
            console.log(`🔄 Update failed, trying to create item instead...`)
            const createdItem = await xanoApi.createItem(xanoData)
            console.log(`✅ Successfully created item with ID ${createdItem.id} in Xano`)
            
            // Update local state with the real ID from Xano
            setItems(prevItems => {
              const newItems = [...prevItems]
              const itemIndex = newItems.findIndex(i => i === item)
              if (itemIndex !== -1) {
                newItems[itemIndex] = { ...newItems[itemIndex], id: createdItem.id }
              }
              return newItems
            })
          } else {
            throw updateError
          }
        }
        
        setPendingUpdates(prev => {
          const newSet = new Set(prev)
          newSet.delete(item.id!)
          return newSet
        })
        
        setSyncStatus('Saved')
        setTimeout(() => setSyncStatus(''), 2000)
      } catch (error) {
        console.error(`❌ Error updating/creating item ${item.id}:`, error)
        setPendingUpdates(prev => {
          const newSet = new Set(prev)
          newSet.delete(item.id!)
          return newSet
        })
        
        if (error instanceof Error && error.message.includes('category header')) {
          console.log(`🤫 Silent fail for category header`)
          return
        }
        
        setSyncStatus('Save failed')
        setTimeout(() => setSyncStatus(''), 3000)
      }
    }, delay)
  }, [connectionStatus])

  // Debounced create for default items that get edited
  const debouncedCreateItem = useCallback((item: ShoppingItem, itemIndex: number, delay: number = 1500) => {
    if (connectionStatus !== 'connected' || !item.item.trim()) return
    
    setTimeout(async () => {
      try {
        // Skip if item was already created (got an ID) or is empty
        const currentItem = items[itemIndex]
        if (currentItem?.id || !currentItem?.item.trim()) {
          return
        }

        const xanoData = localToXano(item)
        const createdItem = await xanoApi.createItem(xanoData)
        const localItem = xanoToLocal(createdItem)
        
        // Update the item in state with the new ID
        setItems(prevItems => {
          const newItems = [...prevItems]
          if (newItems[itemIndex]) {
            newItems[itemIndex] = localItem
          }
          return newItems
        })
        
        setSyncStatus('Item saved to database')
        setTimeout(() => setSyncStatus(''), 2000)
      } catch (error) {
        console.error('Error creating item:', error)
        setSyncStatus('Failed to save item')
        setTimeout(() => setSyncStatus(''), 3000)
      }
    }, delay)
  }, [connectionStatus, items])

  const updateItem = (index: number, field: keyof ShoppingItem, value: any) => {
    console.log(`🔄 updateItem called - index: ${index}, field: ${field}, value:`, value)
    
    setItems(prevItems => {
      const newItems = [...prevItems]
      const originalItem = { ...newItems[index] }
      const updatedItem = { ...newItems[index], [field]: value }
      newItems[index] = updatedItem
      
      console.log(`📝 Item updated:`, { 
        index, 
        field, 
        originalValue: originalItem[field],
        newValue: value,
        itemId: updatedItem.id,
        itemName: updatedItem.item,
        category: updatedItem.category,
        connectionStatus 
      })
      
      // Skip auto-save for category headers
      if (updatedItem.category === 'CATEGORY') {
        console.log(`⏭️ Skipping auto-save: Category header detected`)
        return newItems
      }

      // Auto-save if connected to database
      if (connectionStatus === 'connected') {
        if (updatedItem.id) {
          // Item exists in API, update it (even if temporarily empty while editing)
          console.log(`🔄 Triggering debouncedUpdate for existing item ID: ${updatedItem.id}`)
          debouncedUpdate(updatedItem)
        } else if (updatedItem.item.trim()) {
          // Item doesn't exist in API yet and has content, create it (debounced)
          console.log(`✨ Triggering debouncedCreateItem for new item: "${updatedItem.item}"`)
          debouncedCreateItem(updatedItem, index)
        } else {
          console.log(`⏸️ No auto-save: Item has no ID and no content yet`)
        }
      } else {
        console.log(`🔌 No auto-save: Not connected to database (status: ${connectionStatus})`)
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
    sourceUrl: '',
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
    sourceUrl: '',
      status: '',
      estimatedCost: '',
      notes: '',
      category: 'CATEGORY'
    }
    setItems(prevItems => [...prevItems, categoryHeader])
  }

  // Group items by category and create dynamic headers
  const getGroupedItems = () => {
    // Filter out any existing category headers and get only real items
    const realItems = items.filter(item => item.category !== 'CATEGORY')
    
    // Group items by category
    const groupedByCategory: { [key: string]: ShoppingItem[] } = {}
    
    realItems.forEach(item => {
      const category = item.category || 'Other'
      if (!groupedByCategory[category]) {
        groupedByCategory[category] = []
      }
      groupedByCategory[category].push(item)
    })
    
    // Create array with headers and items
    const result: (ShoppingItem & { isHeader?: boolean; originalIndex?: number })[] = []
    
    Object.keys(groupedByCategory).forEach(categoryName => {
      // Add category header
      result.push({
        id: undefined,
        completed: false,
        item: categoryName.toUpperCase(),
        priority: '',
        preferredSource: '',
    sourceUrl: '',
        status: '',
        estimatedCost: '',
        notes: '',
        category: 'CATEGORY',
        isHeader: true
      } as ShoppingItem & { isHeader?: boolean })
      
      // Add items in this category
      groupedByCategory[categoryName].forEach(item => {
        const originalIndex = items.findIndex(originalItem => originalItem === item)
        result.push({ ...item, originalIndex })
      })
    })
    
    return result
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
      return (
        <div className="flex items-center justify-center py-4">
          <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent mr-2"></div>
          <span className="text-sm text-gray-600">Loading data...</span>
        </div>
      )
    } else if (connectionStatus === 'connected') {
      return (
        <div className="flex items-center text-sm text-green-700 bg-green-50 px-3 py-2 rounded-md border border-green-200">
          <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
          Connected to database
        </div>
      )
    } else {
      return (
        <div className="flex items-center text-sm text-orange-700 bg-orange-50 px-3 py-2 rounded-md border border-orange-200">
          <div className="w-2 h-2 bg-orange-500 rounded-full mr-2"></div>
          Database connection failed. Using local data only.
        </div>
      )
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
        user: 1,
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
    sourceUrl: '', 
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
    <div className="min-h-screen bg-gray-50">
      {/* Modern Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-2xl font-semibold text-gray-900">Baby Shopping Checklist</h1>
          <p className="text-gray-500 text-sm mt-1">Track your baby essentials with collaborative planning</p>
        </div>
      </div>
      
      {/* Status indicator */}
      <div className="max-w-7xl mx-auto px-6 py-4">
        {getStatusIndicator()}
      </div>

      {connectionStatus !== 'loading' && (
        <>
          {/* Modern Toolbar */}
          <div className="max-w-7xl mx-auto px-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                {/* Left side - Status messages */}
                <div className="flex items-center gap-3">
                  {syncStatus && (
                    <div className={`flex items-center text-sm px-3 py-1.5 rounded-md ${
                      syncStatus.includes('failed') || syncStatus.includes('Failed') 
                        ? 'text-red-700 bg-red-50 border border-red-200' 
                        : 'text-green-700 bg-green-50 border border-green-200'
                    }`}>
                      <div className={`w-1.5 h-1.5 rounded-full mr-2 ${
                        syncStatus.includes('failed') || syncStatus.includes('Failed') ? 'bg-red-500' : 'bg-green-500'
                      }`}></div>
                      {syncStatus}
                    </div>
                  )}
                  {pendingUpdates.size > 0 && (
                    <div className="flex items-center text-sm text-amber-700 bg-amber-50 px-3 py-1.5 rounded-md border border-amber-200">
                      <div className="w-1.5 h-1.5 bg-amber-500 rounded-full mr-2 animate-pulse"></div>
                      Saving {pendingUpdates.size} item{pendingUpdates.size > 1 ? 's' : ''}...
                    </div>
                  )}
                </div>
                
                {/* Right side - Actions */}
                <div className="flex items-center gap-2">
                  <button 
                    className="flex items-center text-sm text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md hover:bg-gray-50 border border-gray-200 transition-colors"
                    onClick={handleRefresh}
                  >
                    <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Refresh
                  </button>
                  <button 
                    className="flex items-center text-sm text-white bg-blue-600 hover:bg-blue-700 px-3 py-2 rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    onClick={handleCreateItem}
                    disabled={connectionStatus !== 'connected'}
                  >
                    <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Quick Add
                  </button>
                  <button 
                    className="flex items-center text-sm text-white bg-green-600 hover:bg-green-700 px-3 py-2 rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    onClick={handleSaveAll}
                    disabled={connectionStatus !== 'connected'}
                  >
                    <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    Save All
                  </button>
                  <button 
                    className="flex items-center text-sm text-white bg-indigo-600 hover:bg-indigo-700 px-3 py-2 rounded-md transition-colors"
                    onClick={() => setShowAddForm(!showAddForm)}
                  >
                    {showAddForm ? (
                      <>
                        <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        Cancel
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        Add Item
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {showAddForm && (
            <div className="max-w-7xl mx-auto px-6 mb-6">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Add New Item</h3>
                  <button 
                    onClick={() => setShowAddForm(false)}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                {formErrors.length > 0 && (
                  <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-800 rounded-lg">
                    <div className="flex items-start">
                      <svg className="w-5 h-5 text-red-400 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div>
                        <h4 className="text-sm font-medium mb-1">Please fix the following errors:</h4>
                        <ul className="text-sm space-y-1">
                          {formErrors.map((error, index) => (
                            <li key={index}>• {error}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Item Name *</label>
                    <input
                      type="text"
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                        formErrors.some(e => e.includes('Item name')) 
                          ? 'border-red-300 bg-red-50 focus:ring-red-500 focus:border-red-500' 
                          : 'border-gray-300'
                      }`}
                      value={newItem.item}
                      placeholder="Enter item name"
                      onChange={(e) => setNewItem({...newItem, item: e.target.value})}
                      onFocus={() => setFormErrors(formErrors.filter(e => !e.includes('Item name')))}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Category</label>
                    <select
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white"
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
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Priority</label>
                    <select
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white"
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
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Preferred Source</label>
                    <select
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white"
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
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Status</label>
                    <select
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white"
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
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Estimated Cost</label>
                    <input
                      type="text"
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                        formErrors.some(e => e.includes('cost')) 
                          ? 'border-red-300 bg-red-50 focus:ring-red-500 focus:border-red-500' 
                          : 'border-gray-300'
                      }`}
                      value={newItem.estimatedCost}
                      placeholder="$0.00"
                      onChange={(e) => setNewItem({...newItem, estimatedCost: e.target.value})}
                      onFocus={() => setFormErrors(formErrors.filter(e => !e.includes('cost')))}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Notes</label>
                    <textarea
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-vertical"
                      value={newItem.notes}
                      placeholder="Notes or specific model..."
                      onChange={(e) => setNewItem({...newItem, notes: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Product URL</label>
                    <input
                      type="url"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      value={newItem.sourceUrl}
                      placeholder="https://example.com/product"
                      onChange={(e) => setNewItem({...newItem, sourceUrl: e.target.value})}
                    />
                    {newItem.sourceUrl && (
                      <div className="mt-2">
                        <UrlThumbnail url={newItem.sourceUrl} />
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex flex-wrap gap-3">
                  <button
                    className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
                    onClick={addNewItem}
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Add Item
                  </button>
                  <button
                    className="flex items-center px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white text-sm font-medium rounded-lg transition-colors"
                    onClick={() => {
                      setShowAddForm(false)
                      setNewItem({
                        completed: false,
                        item: '',
                        priority: '',
                        preferredSource: '',
    sourceUrl: '',
                        status: '',
                        estimatedCost: '',
                        notes: '',
                        category: ''
                      })
                    }}
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Cancel
                  </button>
                  <button
                    className="flex items-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors"
                    onClick={() => {
                      const categoryName = prompt('Enter new category name:')
                      if (categoryName && categoryName.trim()) {
                        addCategory(categoryName.trim())
                        setNewItem({...newItem, category: categoryName.trim()})
                      }
                    }}
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Add Category
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Modern Card-Based Layout */}
          <div className="max-w-7xl mx-auto px-6 pb-8">
            <div className="space-y-8">
              {getGroupedItems().map((item, displayIndex) => (
                (item as any).isHeader ? (
                  <div key={`header-${displayIndex}`} className="mb-6">
                    <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg p-4 shadow-sm">
                      <h3 className="text-white text-lg font-semibold">
                        {item.item}
                      </h3>
                    </div>
                  </div>
                ) : (
                  <div 
                    key={item.id ? `item-${item.id}` : `local-${(item as any).originalIndex}`}
                    className={`bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200 ${
                      item.completed ? 'opacity-75' : ''
                    }`}
                  >
                    <div className="p-5">
                      {/* Header with checkbox and actions */}
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-start gap-3">
                          <div className="relative mt-1">
                            <input
                              type="checkbox"
                              className="w-5 h-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500 transition-colors"
                              checked={item.completed}
                              onChange={(e) => updateItem((item as any).originalIndex, 'completed', e.target.checked)}
                            />
                            {item.id && pendingUpdates.has(item.id) && (
                              <div className="absolute -top-1 -right-1 w-3 h-3 bg-amber-400 border-2 border-white rounded-full animate-pulse"></div>
                            )}
                          </div>
                          <div className="flex-1">
                            <input
                              type="text"
                              className={`text-lg font-medium w-full border-none outline-none bg-transparent resize-none ${
                                item.completed ? 'line-through text-gray-500' : 'text-gray-900'
                              } focus:bg-gray-50 rounded px-2 py-1 -mx-2 -my-1 transition-colors`}
                              value={item.item}
                              onChange={(e) => updateItem((item as any).originalIndex, 'item', e.target.value)}
                              placeholder="Item name..."
                            />
                          </div>
                        </div>
                        <button
                          onClick={() => deleteItem((item as any).originalIndex)}
                          className="text-gray-400 hover:text-red-600 p-1 rounded-md hover:bg-red-50 transition-colors"
                          title="Delete item"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>

                      {/* Content Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                        <div>
                          <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Category</label>
                          <select
                            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50 hover:bg-white transition-colors"
                            value={item.category}
                            onChange={(e) => updateItem((item as any).originalIndex, 'category', e.target.value)}
                          >
                            <option value="">Select Category</option>
                            {categoryOptions.map(option => (
                              <option key={option} value={option}>{option}</option>
                            ))}
                          </select>
                        </div>
                        
                        <div>
                          <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Priority</label>
                          <div className="relative">
                            <select
                              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50 hover:bg-white transition-colors appearance-none"
                              value={item.priority}
                              onChange={(e) => updateItem((item as any).originalIndex, 'priority', e.target.value as ShoppingItem['priority'])}
                            >
                              <option value="">Select Priority</option>
                              {priorityOptions.map(option => (
                                <option key={option} value={option}>{option}</option>
                              ))}
                            </select>
                            {item.priority && (
                              <div className={`absolute right-8 top-1/2 transform -translate-y-1/2 w-2 h-2 rounded-full ${
                                item.priority === 'High' ? 'bg-red-500' : 
                                item.priority === 'Medium' ? 'bg-orange-500' : 'bg-green-500'
                              }`}></div>
                            )}
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Status</label>
                          <div className="relative">
                            <select
                              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50 hover:bg-white transition-colors"
                              value={item.status}
                              onChange={(e) => updateItem((item as any).originalIndex, 'status', e.target.value as ShoppingItem['status'])}
                            >
                              <option value="">Select Status</option>
                              {statusOptions.map(option => (
                                <option key={option} value={option}>{option}</option>
                              ))}
                            </select>
                            {item.status.trim() && (
                              <div className={`absolute right-8 top-1/2 transform -translate-y-1/2 px-2 py-0.5 text-xs rounded-full font-medium pointer-events-none ${
                                item.status === 'Purchased' ? 'bg-green-100 text-green-800' :
                                item.status === 'Received' ? 'bg-blue-100 text-blue-800' :
                                item.status === 'Found Option' ? 'bg-yellow-100 text-yellow-800' :
                                item.status === 'Researching' ? 'bg-orange-100 text-orange-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {item.status}
                              </div>
                            )}
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Est. Cost</label>
                          <input
                            type="text"
                            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50 hover:bg-white transition-colors"
                            value={item.estimatedCost}
                            placeholder="$0.00"
                            onChange={(e) => updateItem((item as any).originalIndex, 'estimatedCost', e.target.value)}
                          />
                        </div>
                      </div>

                      {/* Second Row */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Preferred Source</label>
                          <select
                            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50 hover:bg-white transition-colors"
                            value={item.preferredSource}
                            onChange={(e) => updateItem((item as any).originalIndex, 'preferredSource', e.target.value)}
                          >
                            <option value="">Select Source</option>
                            {sourceOptions.map(option => (
                              <option key={option} value={option}>{option}</option>
                            ))}
                          </select>
                        </div>
                        
                        <div>
                          <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Notes</label>
                          <textarea
                            rows={2}
                            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50 hover:bg-white transition-colors resize-vertical"
                            value={item.notes}
                            placeholder="Notes or specific model..."
                            onChange={(e) => updateItem((item as any).originalIndex, 'notes', e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Product URL</label>
                          <input
                            type="url"
                            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50 hover:bg-white transition-colors"
                            value={item.sourceUrl}
                            placeholder="https://example.com/product"
                            onChange={(e) => updateItem((item as any).originalIndex, 'sourceUrl', e.target.value)}
                          />
                          {item.sourceUrl && (
                            <div className="mt-2">
                              <UrlThumbnail url={item.sourceUrl} className="border-dashed" />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              ))}
            </div>
          </div>

          {/* Pro Tips Section */}
          <div className="max-w-7xl mx-auto px-6 pb-8">
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6">
              <div className="flex items-start gap-3 mb-4">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Pro Tips for Baby Shopping</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-700">
                    <div className="space-y-3">
                      <div className="flex items-start gap-2">
                        <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                        <div><strong className="text-gray-900">FB Marketplace:</strong> Great for bigger items like cribs, strollers, high chairs - just check safety recalls</div>
                      </div>
                      <div className="flex items-start gap-2">
                        <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                        <div><strong className="text-gray-900">Don&apos;t overbuy newborn stuff:</strong> Babies grow out of NB size quickly</div>
                      </div>
                      <div className="flex items-start gap-2">
                        <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                        <div><strong className="text-gray-900">Check your insurance:</strong> Many cover breast pumps - call them first</div>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-start gap-2">
                        <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                        <div><strong className="text-gray-900">Hospital checklist:</strong> Car seat is REQUIRED to leave the hospital</div>
                      </div>
                      <div className="flex items-start gap-2">
                        <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                        <div><strong className="text-gray-900">Stock up timing:</strong> Have essentials by 36 weeks (babies can come early!)</div>
                      </div>
                      <div className="flex items-start gap-2">
                        <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                        <div><strong className="text-gray-900">Database Sync:</strong> Changes are automatically saved so both parents can access from anywhere!</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}