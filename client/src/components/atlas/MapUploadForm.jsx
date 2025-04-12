import React, { useState } from 'react';

const MapUploadForm = ({ onSuccess, onClose }) => {
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

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.size > MAX_SIZE_BYTES) {
        setError(`File is too large. Maximum size is ${MAX_SIZE_BYTES / 1024 / 1024}MB.`);
      } else {
        setFile(droppedFile);
        setError(null);
      }
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

  // Modal styles for consistency with other modals
  const modalOverlayStyle = {
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)', display: 'flex',
    justifyContent: 'center', alignItems: 'center', zIndex: 1050,
  };
  
  const modalContentStyle = {
    background: '#fff', color: '#333', padding: '20px',
    borderRadius: '8px', width: '90%', maxWidth: '500px',
    boxShadow: '0 4px 8px rgba(0, 0, 0, 0.2)',
    display: 'flex', flexDirection: 'column',
  };

  const closeButtonStyle = {
    alignSelf: 'flex-end',
    background: 'transparent',
    border: 'none',
    fontSize: '24px',
    cursor: 'pointer',
    margin: '-15px -10px 0 0',
  };

  const formHeaderStyle = {
    marginTop: '0',
    marginBottom: '5px',
    fontSize: '24px',
    fontWeight: 'bold',
  };

  const formSubHeaderStyle = {
    margin: '0 0 20px 0',
    color: '#666',
    fontWeight: 'normal',
  };

  const inputLabelStyle = {
    display: 'block',
    marginBottom: '8px',
    fontWeight: 'bold',
  };

  const inputStyle = {
    width: '100%',
    padding: '10px',
    borderRadius: '4px',
    border: '1px solid #ccc',
    boxSizing: 'border-box',
    fontSize: '16px',
  };

  const dropzoneStyle = {
    border: '2px dashed #ccc',
    borderRadius: '4px',
    padding: '30px',
    textAlign: 'center',
    cursor: 'pointer',
    backgroundColor: '#f9f9f9',
    marginTop: '10px',
  };

  const buttonRowStyle = {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '10px',
    marginTop: '20px',
  };

  const cancelButtonStyle = {
    padding: '10px 20px',
    border: '1px solid #ccc',
    borderRadius: '4px',
    background: 'white',
    cursor: 'pointer',
  };

  const uploadButtonStyle = {
    padding: '10px 20px',
    border: 'none',
    borderRadius: '4px',
    background: '#6c757d',
    color: 'white',
    cursor: 'pointer',
    fontWeight: 'bold',
  };

  return (
    <div style={modalOverlayStyle} onClick={onClose}>
      <div style={modalContentStyle} onClick={e => e.stopPropagation()}>
        <button style={closeButtonStyle} onClick={onClose}>×</button>
        
        <h2 style={formHeaderStyle}>Upload New Map</h2>
        <p style={formSubHeaderStyle}>Add a map to your world atlas. Maps will be used to create interactive locations.</p>
        
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '20px' }}>
            <label htmlFor="map-title" style={inputLabelStyle}>Map Name</label>
            <input
              type="text"
              id="map-title"
              placeholder="Enter map name"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              disabled={isUploading}
              style={inputStyle}
            />
          </div>
          
          <div style={{ marginBottom: '20px' }}>
            <label htmlFor="map-image" style={inputLabelStyle}>Map Image</label>
            
            <div 
              style={dropzoneStyle}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onClick={() => document.getElementById('map-image').click()}
            >
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ marginBottom: '10px' }}>
                  <path d="M12 6v8m0 0l-3-3m3 3l3-3m-9 9h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v10a2 2 0 002 2z" stroke="#6c757d" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <p style={{ margin: '0 0 5px 0' }}>Click to upload or drag and drop</p>
                <p style={{ margin: '0', fontSize: '14px', color: '#666' }}>PNG, JPG or WEBP (max. 10MB)</p>
              </div>
            </div>
            
            <input
              type="file"
              id="map-image"
              name="mapImageInput"
              accept="image/png, image/jpeg, image/jpg, image/webp"
              onChange={handleFileChange}
              required
              disabled={isUploading}
              style={{ display: 'none' }}
            />
            
            {file && (
              <p style={{ marginTop: '10px' }}>Selected file: {file.name}</p>
            )}
          </div>
          
          {error && <p style={{ color: 'red', marginBottom: '15px' }}>{error}</p>}
          
          <div style={buttonRowStyle}>
            <button type="button" onClick={onClose} style={cancelButtonStyle}>
              Cancel
            </button>
            <button type="submit" disabled={isUploading} style={uploadButtonStyle}>
              {isUploading ? 'Uploading...' : 'Upload Map'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default MapUploadForm; 