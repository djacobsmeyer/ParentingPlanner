const XANO_BASE_URL = 'https://xuz0-tsfm-drds.n7.xano.io/api:VHWtgrOF'

export interface XanoShoppingItem {
  id: number
  created_at: string
  user: number
  name: string
  description: string
  priority: 'low' | 'medium' | 'high'
  source_url: string
  status: 'pending' | 'purchased' | 'not needed'
  cost: number
  notes: string
  category: string
}

export interface CreateShoppingItemRequest {
  user: number
  name: string
  description?: string
  priority: 'low' | 'medium' | 'high'
  source_url?: string
  status: 'pending' | 'purchased' | 'not needed'
  cost?: number
  notes?: string
  category: string
}

export interface UpdateShoppingItemRequest extends Partial<CreateShoppingItemRequest> {}

class XanoApiError extends Error {
  constructor(message: string, public status?: number) {
    super(message)
    this.name = 'XanoApiError'
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let errorDetails = response.statusText
    try {
      const errorBody = await response.text()
      if (errorBody) {
        errorDetails = errorBody
      }
    } catch (e) {
      // If we can't read the error body, just use the status text
    }
    const errorMessage = `HTTP ${response.status}: ${errorDetails}`
    throw new XanoApiError(errorMessage, response.status)
  }
  
  try {
    return await response.json()
  } catch (error) {
    throw new XanoApiError('Failed to parse response as JSON')
  }
}

export const xanoApi = {
  async getAllItems(): Promise<XanoShoppingItem[]> {
    try {
      const response = await fetch(`${XANO_BASE_URL}/shopping_item`)
      return handleResponse<XanoShoppingItem[]>(response)
    } catch (error) {
      if (error instanceof XanoApiError) {
        throw error
      }
      throw new XanoApiError(`Failed to fetch items: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  },

  async getItem(id: number): Promise<XanoShoppingItem> {
    try {
      const response = await fetch(`${XANO_BASE_URL}/shopping_item/${id}`)
      return handleResponse<XanoShoppingItem>(response)
    } catch (error) {
      if (error instanceof XanoApiError) {
        throw error
      }
      throw new XanoApiError(`Failed to fetch item ${id}: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  },

  async createItem(item: CreateShoppingItemRequest): Promise<XanoShoppingItem> {
    try {
      const response = await fetch(`${XANO_BASE_URL}/shopping_item`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(item)
      })
      return handleResponse<XanoShoppingItem>(response)
    } catch (error) {
      if (error instanceof XanoApiError) {
        throw error
      }
      throw new XanoApiError(`Failed to create item: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  },

  async updateItem(id: number, updates: UpdateShoppingItemRequest): Promise<XanoShoppingItem> {
    try {
      const response = await fetch(`${XANO_BASE_URL}/shopping_item/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates)
      })
      return handleResponse<XanoShoppingItem>(response)
    } catch (error) {
      if (error instanceof XanoApiError) {
        throw error
      }
      throw new XanoApiError(`Failed to update item ${id}: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  },

  async deleteItem(id: number): Promise<void> {
    try {
      const response = await fetch(`${XANO_BASE_URL}/shopping_item/${id}`, {
        method: 'DELETE'
      })
      
      if (!response.ok) {
        throw new XanoApiError(`HTTP ${response.status}: ${response.statusText}`, response.status)
      }
    } catch (error) {
      if (error instanceof XanoApiError) {
        throw error
      }
      throw new XanoApiError(`Failed to delete item ${id}: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }
}

export { XanoApiError }