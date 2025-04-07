import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import MapList from '../components/atlas/MapList';
import MapUploadForm from '../components/atlas/MapUploadForm';
import MapView from '../components/atlas/MapView';
import ArticleLinkModal from '../components/common/ArticleLinkModal';

const AtlasPage = () => {
  const [maps, setMaps] = useState([]);
  const [articles, setArticles] = useState([]);
  const [selectedMap, setSelectedMap] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [mapRefreshKey, setMapRefreshKey] = useState(0);
  const [pinsLocked, setPinsLocked] = useState(true);
  const [showArticleLinkModal, setShowArticleLinkModal] = useState(false);
  const [linkModalCurrentId, setLinkModalCurrentId] = useState(null);
  const [linkTargetPinId, setLinkTargetPinId] = useState(null);
  const [linkTargetPinCoords, setLinkTargetPinCoords] = useState(null);
  const navigate = useNavigate();

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
       const [mapsResponse, articlesResponse] = await Promise.all([
         fetch('http://localhost:5001/api/maps'),
         fetch('http://localhost:5001/api/articles')
       ]);
      if (!mapsResponse.ok) throw new Error('Failed to fetch maps');
      if (!articlesResponse.ok) throw new Error('Failed to fetch articles');
      const mapsData = await mapsResponse.json();
      const articlesData = await articlesResponse.json();
      setMaps(mapsData);
      setArticles(articlesData);
    } catch (error) {
      setError(error.message);
      console.error("Failed to fetch Atlas data:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleMapSelect = (map) => {
    console.log("Selected map:", map);
    setSelectedMap(map);
    setShowUploadForm(false);
  };

  const handleUploadSuccess = () => {
    setShowUploadForm(false);
    fetchData();
  };

  const handleToggleUpload = () => {
    setShowUploadForm(!showUploadForm);
    if (!showUploadForm) {
      setSelectedMap(null);
    }
  };

  const handlePinClick = (articleId) => {
    if (!articleId) return;
    console.log("Pin clicked, navigating to article ID:", articleId);
    navigate(`/wiki`, { state: { selectedArticleId: articleId } });
  };

  const handleDeleteMap = async (mapId) => {
    if (!mapId) return;

    if (window.confirm('Are you sure you want to delete this map and all its pins?')) {
      setError(null);
      try {
        const response = await fetch(`http://localhost:5001/api/maps/${mapId}`, {
          method: 'DELETE',
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ msg: 'Failed to delete map' }));
          throw new Error(errorData.msg || `HTTP error! status: ${response.status}`);
        }

        console.log('Map deleted successfully');
        setSelectedMap(null);
        fetchData();

      } catch (e) {
        console.error("Failed to delete map:", e);
        setError(`Failed to delete map: ${e.message}`);
      }
    }
  };

  const handleDeletePin = async (pinId) => {
    if (!selectedMap || !pinId) return;

    if (window.confirm('Are you sure you want to delete this pin?')) {
      setError(null);
      try {
        const response = await fetch(`http://localhost:5001/api/maps/${selectedMap._id}/pins/${pinId}`, {
          method: 'DELETE',
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ msg: 'Failed to delete pin' }));
          throw new Error(errorData.msg || `HTTP error! status: ${response.status}`);
        }

        console.log('Pin deleted successfully');
        setMapRefreshKey(prev => prev + 1);

      } catch (e) {
        console.error("Failed to delete pin:", e);
        setError(`Failed to delete pin: ${e.message}`);
      }
    }
  };

  const handleUpdatePinPosition = async (pinId, newCoords) => {
     if (!pinId || !selectedMap || !newCoords) {
        console.error("Missing data needed to update pin position.");
        setError("Error updating pin position: Missing required data.");
        return;
    }

    console.log(`Updating pin ${pinId} position to:`, newCoords);
    setError(null);

    try {
      const response = await fetch(`http://localhost:5001/api/maps/${selectedMap._id}/pins/${pinId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ x: newCoords.x, y: newCoords.y }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ msg: 'Failed to update pin position' }));
        throw new Error(errorData.msg || `HTTP error! status: ${response.status}`);
      }

      const updatedPin = await response.json();
      console.log("Pin position updated successfully, server response:", updatedPin);
      
      setMapRefreshKey(prev => prev + 1);

    } catch (e) {
        console.error("Failed to update pin position:", e);
        setError(`Failed to update pin position: ${e.message}`);
    }
  };

  const handleShowPinLinkModal = (context) => {
      console.log("Showing link modal with context:", context);
      if (context.pin) {
          setLinkTargetPinId(context.pin._id);
          setLinkModalCurrentId(context.pin.article?._id || null);
          setLinkTargetPinCoords(null);
      } else if (context.coords) {
          setLinkTargetPinId(null);
          setLinkModalCurrentId(null);
          setLinkTargetPinCoords(context.coords);
      } else {
          console.error("Invalid context for showing link modal");
          return;
      }
      setShowArticleLinkModal(true);
  };

  const handleModalSelectArticle = async (selectedArticle) => {
      const articleId = selectedArticle?._id || null;
      console.log(`Article selected (or unlinked): ${articleId}, Target Pin ID: ${linkTargetPinId}, Target Coords:`, linkTargetPinCoords);
      
      setError(null);
      setShowArticleLinkModal(false);

      try {
          let response;
          if (linkTargetPinId) {
              response = await fetch(`http://localhost:5001/api/maps/${selectedMap._id}/pins/${linkTargetPinId}`, {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ articleId }),
              });
          } else if (linkTargetPinCoords) {
              response = await fetch(`http://localhost:5001/api/maps/${selectedMap._id}/pins`, {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ ...linkTargetPinCoords, articleId }),
              });
          } else {
              throw new Error("Modal selection handler called without target context.");
          }

          if (!response.ok) {
              const errorData = await response.json().catch(() => ({ msg: 'Failed to update pin link' }));
              throw new Error(errorData.msg || `HTTP error! status: ${response.status}`);
          }

          console.log("Pin link updated/created successfully");
          setMapRefreshKey(prev => prev + 1);

      } catch (e) {
          console.error("Failed to save pin link:", e);
          setError(`Failed to save pin link: ${e.message}`);
      }
      
      setLinkTargetPinId(null);
      setLinkTargetPinCoords(null);
      setLinkModalCurrentId(null);
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h2>Atlas</h2>
        <div>
          {selectedMap && !showUploadForm && (
            <button onClick={() => setPinsLocked(!pinsLocked)} style={{marginRight: '10px'}}>
              {pinsLocked ? 'Unlock Pins' : 'Lock Pins'}
            </button>
          )}
          {selectedMap && !showUploadForm && (
            <button onClick={() => handleDeleteMap(selectedMap._id)} style={{marginRight: '10px', backgroundColor: '#dc3545', color: 'white'}}>
              Delete Map
            </button>
          )}
          <button onClick={handleToggleUpload}>
            {showUploadForm ? 'Cancel Upload' : '+ Upload New Map'}
          </button>
        </div>
      </div>

      {error && <p style={{ color: 'red' }}>{error}</p>}

      {showUploadForm ? (
        <MapUploadForm onSuccess={handleUploadSuccess} />
      ) : isLoading ? (
        <p>Loading maps...</p>
      ) : (
        <div>
          {maps.length > 0 ? (
            <div style={{ display: 'flex', gap: '20px' }}>
              <MapList maps={maps} onSelect={handleMapSelect} selectedMapId={selectedMap?._id} />
              {selectedMap ? (
                <MapView 
                  mapId={selectedMap._id} 
                  key={mapRefreshKey}
                  onPinClick={handlePinClick} 
                  onDeletePin={handleDeletePin}
                  onShowLinkModal={handleShowPinLinkModal}
                  pinsLocked={pinsLocked}
                  onUpdatePinPosition={handleUpdatePinPosition}
                />
              ) : (
                <div style={{flexGrow: 1}}><p>Select a map to view.</p></div>
              )}
            </div>
          ) : (
             <p>No maps found. Upload one to get started!</p>
          )}
        </div>
      )}

      {showArticleLinkModal && (
        <ArticleLinkModal
          articles={articles} 
          currentArticleId={linkModalCurrentId}
          onSelectArticle={handleModalSelectArticle} 
          onClose={() => {
              setShowArticleLinkModal(false);
              setLinkTargetPinId(null);
              setLinkTargetPinCoords(null);
              setLinkModalCurrentId(null);
          }} 
        />
      )}
    </div>
  );
};

export default AtlasPage; 