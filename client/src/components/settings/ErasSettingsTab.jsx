import React, { useState } from 'react';
import { Button, Form, Card, Row, Col, Alert } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlusCircle, faMinusCircle, faEdit, faSave, faTimes } from '@fortawesome/free-solid-svg-icons';
import DatePicker from '../DatePicker'; // Assuming DatePicker is in the parent directory
import { useCalendar } from '../../contexts/CalendarContext'; // For formatting
import { v4 as uuidv4 } from 'uuid'; // For generating unique IDs

const ErasSettingsTab = ({ eras, onChange, errors }) => {
    const { formatDate, calendarSettings, getDaysInMonth } = useCalendar();
    const [editingEraId, setEditingEraId] = useState(null);
    const [currentEditData, setCurrentEditData] = useState({ name: '', startDate: null, endDate: null });

    const handleAddEra = () => {
        const newEra = {
            id: uuidv4(), // Generate unique ID
            name: 'New Era',
            startDate: null, 
            endDate: null,
        };
        onChange([...eras, newEra]);
        // Start editing the newly added era
        setEditingEraId(newEra.id);
        setCurrentEditData({ name: newEra.name, startDate: newEra.startDate, endDate: newEra.endDate });
    };

    const handleRemoveEra = (idToRemove) => {
        if (editingEraId === idToRemove) {
            setEditingEraId(null); // Stop editing if the removed era was being edited
        }
        onChange(eras.filter(era => era.id !== idToRemove));
    };

    const handleStartEdit = (era) => {
        setEditingEraId(era.id);
        setCurrentEditData({ name: era.name, startDate: era.startDate, endDate: era.endDate });
    };

    const handleCancelEdit = () => {
        setEditingEraId(null);
        setCurrentEditData({ name: '', startDate: null, endDate: null });
    };

    const handleSaveEdit = (idToSave) => {
        // Basic validation within the edit form (can enhance)
        if (!currentEditData.name?.trim()) {
             alert('Era name cannot be empty.'); // Simple alert, can integrate with errors prop
             return;
        }
         if (!currentEditData.startDate) {
             alert('Start date is required.');
             return;
         }
          if (!currentEditData.endDate) {
             alert('End date is required.');
             return;
         }
          // Basic date order check (could use day numbers for accuracy)
          if (currentEditData.startDate.year > currentEditData.endDate.year || 
              (currentEditData.startDate.year === currentEditData.endDate.year && currentEditData.startDate.month > currentEditData.endDate.month) || 
              (currentEditData.startDate.year === currentEditData.endDate.year && currentEditData.startDate.month === currentEditData.endDate.month && currentEditData.startDate.day > currentEditData.endDate.day))
          { 
              alert('End date must be after start date.');
              return;
          }

        onChange(
            eras.map(era => 
                era.id === idToSave ? { ...era, ...currentEditData } : era
            )
        );
        setEditingEraId(null);
    };

    const handleEditInputChange = (e) => {
        const { name, value } = e.target;
        setCurrentEditData(prev => ({ ...prev, [name]: value }));
    };

    const handleEditDateChange = (field, value) => {
        setCurrentEditData(prev => ({
            ...prev,
            [field]: value
        }));
        // Optional: Auto-adjust end date if start date changes and makes end invalid
        if (field === 'startDate' && prev.endDate) {
             // Simple date order check
            if (value.year > prev.endDate.year || 
                (value.year === prev.endDate.year && value.month > prev.endDate.month) || 
                (value.year === prev.endDate.year && value.month === prev.endDate.month && value.day > prev.endDate.day))
            {
                 setCurrentEditData(prevData => ({ ...prevData, endDate: value }));
            }
        }
    };

    const getErrorForField = (eraId, field) => {
        const eraIndex = eras.findIndex(e => e.id === eraId);
        if (eraIndex === -1) return null;
        
        let errorKey = null;
        if (field === 'name') errorKey = `era_name_${eraIndex}`;
        else if (field === 'startDate') errorKey = `era_start_${eraIndex}`;
        else if (field === 'endDate') errorKey = `era_end_${eraIndex}`;
        else if (field === 'order') errorKey = `era_order_${eraIndex}`;
        
        return errors && errorKey && errors[errorKey];
    };

    return (
        <Card>
            <Card.Body>
                <div className="d-flex justify-content-between align-items-center mb-3">
                    <h5>Eras</h5>
                    <Button variant="primary" onClick={handleAddEra}>
                        <FontAwesomeIcon icon={faPlusCircle} className="me-1" /> Add Era
                    </Button>
                </div>
                
                {eras.length === 0 && <Alert variant="info">No eras defined yet.</Alert>}

                {eras.map((era, index) => (
                    <Card key={era.id} className="mb-3 era-card">
                        <Card.Body>
                            {editingEraId === era.id ? (
                                // --- Editing View ---
                                <Form>
                                     {getErrorForField(era.id, 'name') && <Alert variant="danger" size="sm">{getErrorForField(era.id, 'name')}</Alert>}
                                     {getErrorForField(era.id, 'order') && <Alert variant="danger" size="sm">{getErrorForField(era.id, 'order')}</Alert>}
                                    <Form.Group as={Row} className="mb-2 align-items-center">
                                        <Form.Label column sm="3">Name</Form.Label>
                                        <Col sm="9">
                                            <Form.Control
                                                type="text"
                                                name="name"
                                                value={currentEditData.name}
                                                onChange={handleEditInputChange}
                                                placeholder="Era Name"
                                                isInvalid={!!getErrorForField(era.id, 'name')}
                                            />
                                        </Col>
                                    </Form.Group>
                                     {getErrorForField(era.id, 'startDate') && <Alert variant="danger" size="sm">{getErrorForField(era.id, 'startDate')}</Alert>}
                                    <Form.Group as={Row} className="mb-2 align-items-center">
                                        <Form.Label column sm="3">Start Date</Form.Label>
                                        <Col sm="9">
                                            <DatePicker
                                                value={currentEditData.startDate}
                                                onChange={(date) => handleEditDateChange('startDate', date)}
                                                id={`era-start-${era.id}`}
                                                isInvalid={!!getErrorForField(era.id, 'startDate')}
                                            />
                                        </Col>
                                    </Form.Group>
                                    {getErrorForField(era.id, 'endDate') && <Alert variant="danger" size="sm">{getErrorForField(era.id, 'endDate')}</Alert>}
                                    <Form.Group as={Row} className="mb-2 align-items-center">
                                        <Form.Label column sm="3">End Date</Form.Label>
                                        <Col sm="9">
                                            <DatePicker
                                                value={currentEditData.endDate}
                                                onChange={(date) => handleEditDateChange('endDate', date)}
                                                id={`era-end-${era.id}`}
                                                minDate={currentEditData.startDate} // Ensure end date is not before start date
                                                initialViewDate={currentEditData.startDate}
                                                isInvalid={!!getErrorForField(era.id, 'endDate')}
                                            />
                                        </Col>
                                    </Form.Group>
                                    <div className="d-flex justify-content-end mt-2">
                                         <Button variant="secondary" size="sm" onClick={handleCancelEdit} className="me-2">
                                             <FontAwesomeIcon icon={faTimes} className="me-1" /> Cancel
                                         </Button>
                                         <Button variant="success" size="sm" onClick={() => handleSaveEdit(era.id)}>
                                             <FontAwesomeIcon icon={faSave} className="me-1" /> Save
                                         </Button>
                                    </div>
                                </Form>
                            ) : (
                                // --- Display View ---
                                <Row className="align-items-center">
                                    <Col>
                                        <strong>{era.name || '(Unnamed Era)'}</strong><br />
                                        <small>
                                            {era.startDate ? formatDate(era.startDate) : 'No start date'} - {era.endDate ? formatDate(era.endDate) : 'No end date'}
                                        </small>
                                    </Col>
                                    <Col xs="auto">
                                        <Button variant="outline-secondary" size="sm" onClick={() => handleStartEdit(era)} className="me-2">
                                            <FontAwesomeIcon icon={faEdit} />
                                        </Button>
                                        <Button variant="outline-danger" size="sm" onClick={() => handleRemoveEra(era.id)}>
                                            <FontAwesomeIcon icon={faMinusCircle} />
                                        </Button>
                                    </Col>
                                </Row>
                            )}
                        </Card.Body>
                    </Card>
                ))}
            </Card.Body>
        </Card>
    );
};

export default ErasSettingsTab; 