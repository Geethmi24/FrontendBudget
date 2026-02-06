import api from './api'

export const mealService = {
  getMeals: async (params = {}) => {
    const response = await api.get('/meals', { params })
    return response.data
  },

  getMealsByBudget: async (budget, params = {}) => {
    const response = await api.get(`/meals/budget/${budget}`, { params })
    return response.data
  },

  getMeal: async (id) => {
    const response = await api.get(`/meals/${id}`)
    return response.data
  },

  getCategories: async () => {
    const response = await api.get('/meals/categories')
    return response.data
  },

  createMeal: async (mealData) => {
    const response = await api.post('/meals', mealData)
    return response.data
  },

  updateMeal: async (id, mealData) => {
    const response = await api.put(`/meals/${id}`, mealData)
    return response.data
  }
}