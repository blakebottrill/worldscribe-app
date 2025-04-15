import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FaSpinner } from 'react-icons/fa';
import toast from 'react-hot-toast';
import MapList from '../components/atlas/MapList';
import MapUploadForm from '../components/atlas/MapUploadForm';
import MapView from '../components/atlas/MapView';
import ArticleLinkModal from '../components/common/ArticleLinkModal';
import PinEditModal from '../components/atlas/PinEditModal';

// --- API Functions ---
const fetchMapsAPI = async () => {
  const response = await fetch('http://localhost:5001/api/maps');
  if (!response.ok) {
    throw new Error('Network response was not ok while fetching maps');
  }
  return response.json();
};

const fetchArticlesAPI = async () => {
  const response = await fetch('http://localhost:5001/api/articles');
  if (!response.ok) {
    throw new Error('Network response was not ok while fetching articles');
  }
  return response.json();
};

// Already defined in MapView, but might be better here if shared
// const fetchMapDataByIdAPI = async (mapId) => { ... };

const deleteMapAPI = async (mapId) => {
  const response = await fetch(`http://localhost:5001/api/maps/${mapId}`, { method: 'DELETE' });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ msg: 'Failed to delete map' }));
    throw new Error(errorData.msg || `HTTP error! status: ${response.status}`);
  }
  return { success: true };
};

const deletePinAPI = async ({ mapId, pinId }) => {
  const response = await fetch(`http://localhost:5001/api/maps/${mapId}/pins/${pinId}`, { method: 'DELETE' });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ msg: 'Failed to delete pin' }));
    throw new Error(errorData.msg || `HTTP error! status: ${response.status}`);
  }
  return { success: true };
};

const updatePinPositionAPI = async ({ mapId, pinId, coords }) => {
  const response = await fetch(`http://localhost:5001/api/maps/${mapId}/pins/${pinId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ x: coords.x, y: coords.y }),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ msg: 'Failed to update pin position' }));
    throw new Error(errorData.msg || `HTTP error! status: ${response.status}`);
  }
  return response.json(); // Returns updated pin
};

const upsertPinLinkAPI = async ({ mapId, pinId, articleId, coords }) => {
  let url = `http://localhost:5001/api/maps/${mapId}/pins`;
  let method;
  const payload = { articleId };
  if (pinId) { // If pinId exists, we are updating an existing pin's link
    url += `/${pinId}`;
    method = 'PUT'; // Use PUT for updating a specific pin's link
    // Payload only needs articleId for this specific pin update endpoint
  } else if (coords) { // If coords exist (and no pinId), we are creating a new pin
    method = 'PUT'; // Use PUT for adding a new pin via the map endpoint
    payload.x = coords.x;
    payload.y = coords.y;
  } else {
    throw new Error("Invalid arguments for upsertPinLinkAPI: requires pinId or coords");
  }
  
  const response = await fetch(url, {
    method: method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ msg: 'Failed to link article or add pin' }));
    throw new Error(errorData.msg || `HTTP error! status: ${response.status}`);
  }
  return response.json(); // Return new/updated pin
};

const updatePinDetailsAPI = async ({ mapId, pinId, pinUpdatePayload }) => {
  // Pin update
  const pinResponse = await fetch(`http://localhost:5001/api/maps/${mapId}/pins/${pinId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        // Only send pin-specific fields to pin endpoint
        icon: pinUpdatePayload.icon,
        iconId: pinUpdatePayload.iconId,
        shape: pinUpdatePayload.shape,
        color: pinUpdatePayload.color,
        displayType: pinUpdatePayload.displayType,
        // Don't send articleId or coords here, they are handled differently
    }),
  });
  if (!pinResponse.ok) {
    const errorData = await pinResponse.json().catch(() => ({ msg: 'Failed to update pin details' }));
    throw new Error(errorData.msg || `Pin update HTTP error! status: ${pinResponse.status}`);
  }
  const updatedPin = await pinResponse.json();

  // Article icon update (if applicable and data present)
  // Moved icon sync logic to WikiPage; this should just update the pin
  /* 
  if (pinUpdatePayload.articleId && pinUpdatePayload.icon && pinUpdatePayload.iconId) {
    // ... existing article fetch call ...
  }
  */

  return updatedPin; // Return the primary updated resource (the pin)
};

// Copied from WikiPage.jsx - TODO: Move API functions to a shared file
const updateArticleAPI = async ({ articleId, articleData }) => {
  const response = await fetch(`http://localhost:5001/api/articles/${articleId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(articleData),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ msg: 'Failed to update article' }));
    throw new Error(errorData.msg || `HTTP error! status: ${response.status}`);
  }
  return response.json(); // Returns the updated article
};

// --- End API Functions ---

const AtlasPage = () => {
  const [selectedMap, setSelectedMap] = useState(null);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [mapRefreshKey, setMapRefreshKey] = useState(0);
  const [pinsLocked, setPinsLocked] = useState(true);
  
  // Article Link Modal state
  const [showArticleLinkModal, setShowArticleLinkModal] = useState(false);
  const [linkModalCurrentId, setLinkModalCurrentId] = useState(null);
  const [linkTargetPinId, setLinkTargetPinId] = useState(null);
  const [linkTargetPinCoords, setLinkTargetPinCoords] = useState(null);
  
  // Pin Edit Modal state
  const [showPinEditModal, setShowPinEditModal] = useState(false);
  const [editingPin, setEditingPin] = useState(null);
  const [editingPinArticle, setEditingPinArticle] = useState(null);
  
  const navigate = useNavigate();
  const queryClient = useQueryClient(); // Get query client

  // --- React Query Hooks ---
  // Replace useEffect and fetchData
  const { data: maps = [], isLoading: isLoadingMaps, error: mapsError } = useQuery({ 
      queryKey: ['maps'], 
      queryFn: fetchMapsAPI 
  });
  const { data: articles = [], isLoading: isLoadingArticles, error: articlesError } = useQuery({
      queryKey: ['articles'],
      queryFn: fetchArticlesAPI,
      staleTime: 5 * 60 * 1000, // Keep articles fresh across pages
  });

  // Combined loading/error states
  const isLoading = isLoadingMaps || isLoadingArticles;
  const error = mapsError || articlesError;

  // --- React Query Mutations ---
  const deleteMapMutation = useMutation({
    mutationFn: deleteMapAPI,
    onSuccess: () => {
      setSelectedMap(null);
      queryClient.invalidateQueries({ queryKey: ['maps'] });
    },
    onError: (err) => {
      toast.error(`Failed to delete map: ${err.message}`);
    }
  });

  const deletePinMutation = useMutation({
    mutationFn: deletePinAPI,
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['map', variables.mapId] });
    },
    onError: (err) => {
      toast.error(`Failed to delete pin: ${err.message}`);
    }
  });

  const updatePinPositionMutation = useMutation({
    mutationFn: updatePinPositionAPI,
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['map', variables.mapId] });
    },
    onError: (err) => {
      toast.error(`Failed to update pin position: ${err.message}`);
    }
  });

  const upsertPinLinkMutation = useMutation({
    mutationFn: upsertPinLinkAPI,
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['map', variables.mapId] });
    },
    onError: (err) => {
      toast.error(`Failed to ${variables.pinId ? 'update pin link' : 'add pin'}: ${err.message}`);
    }
  });

  const updatePinDetailsMutation = useMutation({
    mutationFn: updatePinDetailsAPI,
    onSuccess: (updatedPin, variables) => {
      queryClient.invalidateQueries({ queryKey: ['map', variables.mapId] });

      // --- BEGIN SYNC TO ARTICLE --- 
      const previousIcon = variables.pinUpdatePayload?.previousIcon;
      const previousIconId = variables.pinUpdatePayload?.previousIconId;
      const articleId = variables.pinUpdatePayload?.articleId;
      const currentIcon = updatedPin.icon; // Use icon from the successfully updated pin
      const currentIconId = updatedPin.iconId; // Use iconId from the successfully updated pin

      if (articleId && currentIcon && currentIconId && (currentIcon !== previousIcon || currentIconId !== previousIconId)) {
          console.log(`Pin icon changed for article ${articleId}. Triggering article update...`);
          updateArticleMutation.mutate({
              articleId: articleId,
              articleData: { icon: currentIcon, iconId: currentIconId } // Only update icon fields
          });
      }
      // --- END SYNC TO ARTICLE ---
    },
    onError: (err) => {
      toast.error(`Failed to update pin details: ${err.message}`);
    }
  });

  // Mutation for updating articles (for sync purposes)
  const updateArticleMutation = useMutation({
      mutationFn: updateArticleAPI,
      onSuccess: (updatedArticle) => {
          console.log(`Successfully synced icon update to article ${updatedArticle._id}`);
          queryClient.invalidateQueries({ queryKey: ['articles'] });
      },
      onError: (err, variables) => {
          console.error(`Error syncing icon update to article ${variables.articleId}:`, err);
          toast.error(`Failed to sync icon update to article: ${err.message}`);
      }
  });

  const handleMapSelect = (map) => {
    console.log("Selected map:", map);
    setSelectedMap(map);
    setShowUploadForm(false);
  };

  const handleUploadSuccess = () => {
    setShowUploadForm(false);
    queryClient.invalidateQueries({ queryKey: ['maps'] }); // Invalidate maps list on new upload
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

  const handleDeleteMap = (mapId) => {
    if (!mapId) return;
    if (window.confirm('Are you sure you want to delete this map and all its pins?')) {
      deleteMapMutation.mutate(mapId);
    }
  };

  const handleDeletePin = (pinId) => {
    if (!selectedMap || !pinId) return;
    if (window.confirm('Are you sure you want to delete this pin?')) {
      deletePinMutation.mutate({ mapId: selectedMap._id, pinId });
    }
  };

  const handleUpdatePinPosition = (pinId, newCoords) => {
     if (!pinId || !selectedMap || !newCoords) {
        console.error("Missing data needed to update pin position.");
        toast.error("Error updating pin position: Missing required data.");
        return;
    }
    updatePinPositionMutation.mutate({ mapId: selectedMap._id, pinId, coords: newCoords });
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

  const handleModalSelectArticle = (selectedArticle) => {
      if (!linkTargetPinId && !linkTargetPinCoords) {
          console.error("Cannot link article: Target pin context is missing.");
          toast.error("Cannot link article: Target pin context is missing.");
          setShowArticleLinkModal(false); // Close modal regardless
          setLinkTargetPinId(null);
          setLinkTargetPinCoords(null);
          setLinkModalCurrentId(null);
          return;
      }
      if (!Array.isArray(articles)) {
          console.error("Articles list is not available. Cannot proceed with linking.");
          toast.error("Error: Articles data is missing. Cannot link pin.");
          setShowArticleLinkModal(false);
          setLinkTargetPinId(null);
          setLinkTargetPinCoords(null);
          setLinkModalCurrentId(null);
          return;
      }

      setShowArticleLinkModal(false);
      const article = articles.find(a => a._id === selectedArticle?._id);
      if (!article) {
        console.error("Selected article not found in the list!");
        toast.error('Selected article could not be found. Cannot create/update link.');
        setLinkTargetPinId(null);
        setLinkTargetPinCoords(null);
        setLinkModalCurrentId(null);
        return;
      }

      // Prepare payload for mutation
      const mutationPayload = {
        mapId: selectedMap._id,
        articleId: article._id,
        pinId: linkTargetPinId, // Will be null if creating new
        coords: linkTargetPinCoords // Will be null if updating existing
      };

      // If we have a specific pin we're updating (not creating a new one)
      if (linkTargetPinId) {
        // Fetch the current pin data from the map if available via map.pins
        const mapData = queryClient.getQueryData(['map', selectedMap._id]);
        const existingPin = mapData?.pins?.find(p => p._id === linkTargetPinId);

        // For existing pins, we need to include the icon update
        updatePinDetailsMutation.mutate({
          mapId: selectedMap._id,
          pinId: linkTargetPinId,
          pinUpdatePayload: {
            // Adopt the article's icon
            icon: article.icon || 'FaHome',
            iconId: article.iconId || `icon_${Date.now()}`,
            // Keep existing display settings or use defaults
            shape: existingPin?.shape || 'pin',
            color: existingPin?.color || '#dc3545',
            displayType: existingPin?.displayType || 'pin+icon',
            // Include articleId for reference
            articleId: article._id,
            // Include previous icon data for comparison
            previousIcon: existingPin?.icon || null,
            previousIconId: existingPin?.iconId || null
          }
        });
      }

      // Always update the article link
      upsertPinLinkMutation.mutate(mutationPayload);

      // Reset state after initiating mutation
      setLinkTargetPinId(null);
      setLinkTargetPinCoords(null);
      setLinkModalCurrentId(null);
  };
  
  const handleShowPinEditModal = (context) => {
      console.log("Showing pin edit modal with context:", context);
      if (context.pin && context.pin.article) {
          const article = articles.find(a => a._id === context.pin.article._id);
          setEditingPin(context.pin);
          setEditingPinArticle(article);
          setShowPinEditModal(true);
      } else {
          console.error("Cannot edit pin without an article link");
          // If no article, show the link modal first
          handleShowPinLinkModal(context);
      }
  };
  
  const handlePinEditSave = (updatedPinDataFromModal) => {
      const { pin: pinFromModal, linkedArticle, ...pinUpdatePayloadFromModal } = updatedPinDataFromModal;
      
      if (!selectedMap || !pinFromModal || !pinFromModal._id) {
          console.error("Missing data needed to update pin.");
          toast.error("Error updating pin: Missing required data.");
          return;
      }

      setShowPinEditModal(false);
      
      // Construct the payload for updatePinDetailsMutation
      // Include the original icon/iconId for comparison in onSuccess
      const finalPinUpdatePayload = {
        ...pinUpdatePayloadFromModal, // New values from modal state (icon, shape, color, etc.)
        articleId: pinFromModal.article?._id, // Include articleId for onSuccess check
        previousIcon: pinFromModal.icon, // Original icon from before edit
        previousIconId: pinFromModal.iconId // Original iconId from before edit
      };

      // Trigger the mutation with the combined payload
      updatePinDetailsMutation.mutate({ 
          mapId: selectedMap._id, 
          pinId: pinFromModal._id, 
          pinUpdatePayload: finalPinUpdatePayload
      });
      
      // Reset editing state
      setEditingPin(null);
      setEditingPinArticle(null);
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
            <button
              onClick={() => handleDeleteMap(selectedMap._id)}
              disabled={deleteMapMutation.isPending} // Disable button while deleting
              className="delete-button"
              style={{marginRight: '10px'}} // Keep margin
            >
              {deleteMapMutation.isPending ? <FaSpinner className="spinner"/> : 'Delete Map'}
            </button>
          )}
          <button onClick={handleToggleUpload}>
            {showUploadForm ? 'Cancel Upload' : '+ Upload New Map'}
          </button>
        </div>
      </div>

      {/* Use loading state from useQuery */}
      {isLoading && (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px' }}>
              <FaSpinner className="spinner" size={24} />
              <span style={{ marginLeft: '10px' }}>Loading data...</span>
          </div>
      )}

      {/* Use error state from useQuery */}
      {error && <p style={{ color: 'red' }}>Error loading data: {error.message}</p>}

      {!isLoading && !error && (
          <> 
              {showUploadForm ? (
                <MapUploadForm onSuccess={handleUploadSuccess} onClose={handleToggleUpload} />
              ) : (
                <div>
                  {maps.length > 0 ? (
                    <div style={{ display: 'flex', gap: '20px', height: 'calc(100vh - 150px)' }}> {/* Adjust height */}
                      <MapList maps={maps} onSelect={handleMapSelect} selectedMapId={selectedMap?._id} />
                      <div style={{ flexGrow: 1, border: '1px solid #ccc' }}> {/* Add border to map view container */}
                        {selectedMap ? (
                          <MapView 
                            mapId={selectedMap._id} 
                            key={selectedMap._id} // Add key based on mapId to force remount
                            onPinClick={handlePinClick} 
                            onDeletePin={handleDeletePin} // Pass refactored handler
                            onShowLinkModal={handleShowPinLinkModal}
                            onShowEditModal={handleShowPinEditModal}
                            pinsLocked={pinsLocked}
                            onUpdatePinPosition={handleUpdatePinPosition} // Pass refactored handler
                          />
                        ) : (
                          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                            <p>Select a map to view.</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                     <p>No maps found. Upload one to get started!</p>
                  )}
                </div>
              )}
          </>
      )}

      {/* Article Link Modal */}
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
      
      {/* Pin Edit Modal */}
      {showPinEditModal && editingPin && (
        <PinEditModal
          pin={editingPin}
          linkedArticle={editingPinArticle}
          articles={articles}
          onSave={handlePinEditSave}
          onArticleLinkClick={(pin) => handleShowPinLinkModal({ pin })}
          onClose={() => {
              setShowPinEditModal(false);
              setEditingPin(null);
              setEditingPinArticle(null);
          }}
        />
      )}
    </div>
  );
};

export default AtlasPage; 