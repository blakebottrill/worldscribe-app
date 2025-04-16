import api from './api';

/**
 * Calendar API service for handling calendar settings and events
 */
const calendarService = {
  /**
   * Get calendar settings for a world
   * @param {string} worldId - The ID of the world
   * @returns {Promise<Object>} - The calendar settings
   */
  getCalendarSettings: async (worldId) => {
    try {
      const response = await api.get(`/api/worlds/${worldId}/calendar`);
      return response.data;
    } catch (error) {
      console.error('Error fetching calendar settings:', error);
      throw error;
    }
  },

  /**
   * Save calendar settings for a world
   * @param {string} worldId - The ID of the world
   * @param {Object} settings - The calendar settings to save
   * @returns {Promise<Object>} - The updated calendar settings
   */
  saveCalendarSettings: async (worldId, settings) => {
    try {
      const response = await api.put(`/api/worlds/${worldId}/calendar`, settings);
      return response.data;
    } catch (error) {
      console.error('Error saving calendar settings:', error);
      throw error;
    }
  },

  /**
   * Get events for a specific date range
   * @param {string} worldId - The ID of the world
   * @param {Object} startDate - The start date object (year, month, day)
   * @param {Object} endDate - The end date object (year, month, day)
   * @returns {Promise<Array>} - Array of events
   */
  getEvents: async (worldId, startDate, endDate) => {
    try {
      const response = await api.get(`/api/worlds/${worldId}/events`, {
        params: {
          startYear: startDate.year,
          startMonth: startDate.month,
          startDay: startDate.day,
          endYear: endDate.year,
          endMonth: endDate.month,
          endDay: endDate.day
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching events:', error);
      throw error;
    }
  },

  /**
   * Create a new event
   * @param {string} worldId - The ID of the world
   * @param {Object} event - The event to create
   * @returns {Promise<Object>} - The created event
   */
  createEvent: async (worldId, event) => {
    try {
      const response = await api.post(`/api/worlds/${worldId}/events`, event);
      return response.data;
    } catch (error) {
      console.error('Error creating event:', error);
      throw error;
    }
  },

  /**
   * Update an existing event
   * @param {string} worldId - The ID of the world
   * @param {string} eventId - The ID of the event
   * @param {Object} event - The updated event data
   * @returns {Promise<Object>} - The updated event
   */
  updateEvent: async (worldId, eventId, event) => {
    try {
      const response = await api.put(`/api/worlds/${worldId}/events/${eventId}`, event);
      return response.data;
    } catch (error) {
      console.error('Error updating event:', error);
      throw error;
    }
  },

  /**
   * Delete an event
   * @param {string} worldId - The ID of the world
   * @param {string} eventId - The ID of the event
   * @returns {Promise<Object>} - Response data
   */
  deleteEvent: async (worldId, eventId) => {
    try {
      const response = await api.delete(`/api/worlds/${worldId}/events/${eventId}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting event:', error);
      throw error;
    }
  }
};

export default calendarService; 