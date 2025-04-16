import api from './api';

/**
 * Timeline Event API service
 */
const timelineService = {
  /**
   * Get all timeline events (no longer filtered by world)
   * @returns {Promise<Array>} - Array of timeline events
   */
  getAllEvents: async () => {
    try {
      const endpoint = '/api/timeline';
      const response = await api.get(endpoint);
      return response;
    } catch (error) {
      console.error('Error fetching timeline events:', error);
      throw error;
    }
  },

  /**
   * Create a new timeline event
   * @param {Object} eventData - The event data to save (no worldId needed here)
   * @returns {Promise<Object>} - The created timeline event
   */
  createEvent: async (eventData) => {
    try {
      const response = await api.post('/api/timeline', eventData);
      return response;
    } catch (error) {
      console.error('Error creating timeline event:', error);
      throw error;
    }
  },

  /**
   * Update an existing timeline event
   * @param {string} eventId - The ID of the event to update
   * @param {Object} eventData - The updated event data (no worldId needed here)
   * @returns {Promise<Object>} - The updated timeline event
   */
  updateEvent: async (eventId, eventData) => {
    try {
      const response = await api.put(`/api/timeline/${eventId}`, eventData);
      return response;
    } catch (error) {
      console.error('Error updating timeline event:', error);
      throw error;
    }
  },

  /**
   * Delete a timeline event
   * @param {string} eventId - The ID of the event to delete
   * @returns {Promise<Object>} - Confirmation message
   */
  deleteEvent: async (eventId) => {
    try {
      const response = await api.delete(`/api/timeline/${eventId}`);
      return response;
    } catch (error) {
      console.error('Error deleting timeline event:', error);
      throw error;
    }
  },
};

export default timelineService; 