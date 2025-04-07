import React, { useState } from 'react';

const MapUploadForm = ({ onSuccess }) => {
  const [title, setTitle] = useState('');
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState(null);
  const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

  const handleFileChange = (event) => {
    const selectedFile = event.target.files[0];
    if (selectedFile) {
      if (selectedFile.size > MAX_SIZE_BYTES) {
        setError(`File is too large. Maximum size is ${MAX_SIZE_BYTES / 1024 / 1024}MB.`);
        setFile(null); // Clear the invalid file
        event.target.value = null; // Clear the file input visually
      } else {
        setFile(selectedFile);
        setError(null); // Clear previous errors
      }
    } else {
      setFile(null);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!title || !file) {
      setError('Please provide both a title and a map image file.');
      return;
    }

    setIsUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append('title', title);
    formData.append('mapImage', file); // Key must match upload.single() in backend

    try {
      const response = await fetch('http://localhost:5001/api/maps', {
        method: 'POST',
        body: formData,
        // No Content-Type header needed, browser sets it for FormData
        // TODO: Add Authorization header later
      });

      if (!response.ok) {
         const errorData = await response.json().catch(() => ({ msg: 'Upload failed' }));
         throw new Error(errorData.msg || `HTTP error! status: ${response.status}`);
      }

      // If successful
      setTitle('');
      setFile(null);
      // Clear the file input visually (may need more robust solution)
      if (event.target.elements.mapImageInput) {
          event.target.elements.mapImageInput.value = null;
      }
      onSuccess(); // Notify parent component

    } catch (e) {
      console.error("Failed to upload map:", e);
      setError(`Upload failed: ${e.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div style={{ border: '1px solid #ccc', padding: '20px', margin: '20px 0' }}>
      <h3>Upload New Map</h3>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '10px' }}>
          <label htmlFor="map-title" style={{ marginRight: '10px' }}>Title:</label>
          <input
            type="text"
            id="map-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            disabled={isUploading}
            style={{ width: 'calc(100% - 60px)' }}
          />
        </div>
        <div style={{ marginBottom: '10px' }}>
          <label htmlFor="map-image" style={{ marginRight: '10px' }}>Map Image:</label>
          <input
            type="file"
            id="map-image"
            name="mapImageInput" // Added name for clearing
            accept="image/png, image/jpeg, image/gif" // Basic image types
            onChange={handleFileChange}
            required
            disabled={isUploading}
          />
          <small style={{ display: 'block', marginTop: '5px', color: '#888' }}>Max file size: 10MB</small>
        </div>
        {error && <p style={{ color: 'red' }}>{error}</p>}
        <button type="submit" disabled={isUploading}>
          {isUploading ? 'Uploading...' : 'Upload Map'}
        </button>
      </form>
    </div>
  );
};

export default MapUploadForm; 