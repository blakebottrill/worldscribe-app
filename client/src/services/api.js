/**
 * API utility module for making HTTP requests
 */

const API_BASE_URL = 'http://localhost:5001';

/**
 * Makes a GET request to the specified endpoint
 * @param {string} endpoint - The API endpoint to call
 * @param {Object} options - Additional fetch options
 * @returns {Promise<any>} - The response data
 */
async function get(endpoint, options = {}) {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
    ...options,
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return await response.json();
}

/**
 * Makes a POST request to the specified endpoint
 * @param {string} endpoint - The API endpoint to call
 * @param {Object} data - The data to send
 * @param {Object} options - Additional fetch options
 * @returns {Promise<any>} - The response data
 */
async function post(endpoint, data, options = {}) {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
    ...options,
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return await response.json();
}

/**
 * Makes a PUT request to the specified endpoint
 * @param {string} endpoint - The API endpoint to call
 * @param {Object} data - The data to send
 * @param {Object} options - Additional fetch options
 * @returns {Promise<any>} - The response data
 */
async function put(endpoint, data, options = {}) {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
    ...options,
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return await response.json();
}

/**
 * Makes a DELETE request to the specified endpoint
 * @param {string} endpoint - The API endpoint to call
 * @param {Object} options - Additional fetch options
 * @returns {Promise<any>} - The response data
 */
async function del(endpoint, options = {}) {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
    },
    ...options,
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return await response.json();
}

// Export as named and default methods
const api = {
  get,
  post,
  put,
  delete: del,
};

export default api; 