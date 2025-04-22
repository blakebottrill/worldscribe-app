import React, { useState, useEffect, useMemo } from 'react';
import { Button, Modal, Form, Card, Row, Col, Tab, Tabs, Alert, Stack, InputGroup } from 'react-bootstrap';
import { useCalendar } from '../contexts/CalendarContext';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faPlusCircle, 
  faMinusCircle, 
  faCalendarAlt, 
  faUndo, 
  faArrowUp, 
  faArrowDown 
} from '@fortawesome/free-solid-svg-icons';
import './CalendarSettings.css';
import ErasSettingsTab from './settings/ErasSettingsTab';

// --- Calendar Templates ---

// Gregorian Calendar Template
const gregorianTemplate = {
  dayNames: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
  monthNames: [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ],
  daysPerMonth: [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31],
  leapYearRule: 'standard',
  leapYearOffset: 4, 
  firstDayOfWeek: 0, // Sunday
  leapDayMonthIndex: 1, // February
};

// Calendar of Harptos Template (Forgotten Realms)
const harptosTemplate = {
  dayNames: [
    'First-day', 'Second-day', 'Third-day', 'Fourth-day', 'Fifth-day',
    'Sixth-day', 'Seventh-day', 'Eighth-day', 'Ninth-day', 'Tenth-day'
  ],
  monthNames: [
    'Hammer', 'Midwinter', 'Alturiak', 'Ches', 'Tarsakh',
    'Greengrass', 'Mirtul', 'Kythorn', 'Flamerule', 'Midsummer',
    'Eleasis', 'Eleint', 'Highharvestide', 'Marpenoth', 'Uktar',
    'The Feast of the Moon', 'Nightal'
  ],
  daysPerMonth: [30, 1, 30, 30, 30, 1, 30, 30, 30, 1, 30, 30, 1, 30, 30, 1, 30],
  leapYearRule: 'custom',
  leapYearOffset: 4,
  firstDayOfWeek: 0, // First-day
  leapDayMonthIndex: 9, // Midsummer (index 9 in the updated array)
};

// --- Component Start ---

const CalendarSettings = ({ show, onHide }) => {
  const { calendarSettings, saveCalendarSettings, loading } = useCalendar();
  const initialSettings = useMemo(() => ({
      ...calendarSettings,
      eras: calendarSettings.eras || [] 
  }), [calendarSettings]);

  const [localSettings, setLocalSettings] = useState(initialSettings);
  const [activeTab, setActiveTab] = useState('days');
  const [errors, setErrors] = useState({});

  useEffect(() => {
    // When the modal is shown or the base settings change, reset local state
    setLocalSettings({
        ...calendarSettings,
        eras: calendarSettings.eras || [] // Preserve existing eras
    });
    setErrors({}); // Clear errors when modal opens/resets
    setActiveTab('days'); // Reset to first tab
  }, [calendarSettings, show]);

  // --- Load Template Handler ---
  const loadTemplate = (template) => {
      setLocalSettings(prev => ({
          // Keep existing world-specific stuff like _id, worldId if they exist
          ...(prev._id && { _id: prev._id }), 
          ...(prev.worldId && { worldId: prev.worldId }), 
          // Apply template settings
          ...template,
          // Keep existing eras unless template explicitly clears them (it doesn't)
          eras: prev.eras || [] 
      }));
      setErrors({}); // Clear validation errors after loading template
      // Optionally switch to a relevant tab, e.g., months, or stay put
      // setActiveTab('months'); 
      alert('Calendar template loaded. Review settings before saving.'); // Inform user
  };

  const handleSave = async () => {
    if (validateSettings()) {
      const settingsToSave = {
          ...localSettings,
          eras: localSettings.eras || []
      };
      await saveCalendarSettings(settingsToSave);
      onHide();
    }
  };

  const validateSettings = () => {
    const newErrors = {};
    
    // Check if we have at least one day name
    if (!localSettings.dayNames.length) {
      newErrors.dayNames = 'You must have at least one day name';
    }
    
    // Check if we have at least one month name
    if (!localSettings.monthNames.length) {
      newErrors.monthNames = 'You must have at least one month name';
    }
    
    // Check if daysPerMonth array length matches monthNames length
    if (localSettings.daysPerMonth.length !== localSettings.monthNames.length) {
      newErrors.daysPerMonth = 'Number of days per month must match number of months';
    }
    
    // Check if all months have at least 1 day
    if (localSettings.daysPerMonth.some(days => days < 1)) {
      newErrors.daysPerMonth = 'Each month must have at least 1 day';
    }
    
    // --- Add Era Validation ---
    if (localSettings.eras && localSettings.eras.length > 0) {
        localSettings.eras.forEach((era, index) => {
            if (!era.name?.trim()) {
                newErrors[`era_name_${index}`] = `Era #${index + 1} must have a name.`;
            }
            if (!era.startDate) {
                newErrors[`era_start_${index}`] = `Era #${index + 1} must have a start date.`;
            }
            if (!era.endDate) {
                newErrors[`era_end_${index}`] = `Era #${index + 1} must have an end date.`;
            }
            // Basic date order check (can be enhanced in ErasSettingsTab)
            if (era.startDate && era.endDate) {
                 // TODO: Use dateToDayNumber for accurate comparison if available?
                 // Simple check for now:
                 if (era.startDate.year > era.endDate.year || 
                     (era.startDate.year === era.endDate.year && era.startDate.month > era.endDate.month) || 
                     (era.startDate.year === era.endDate.year && era.startDate.month === era.endDate.month && era.startDate.day > era.endDate.day))
                 {
                      newErrors[`era_order_${index}`] = `Era #${index + 1}: End date must be after start date.`;
                 }
            }
            // Check for overlapping eras? (More complex, maybe defer)
        });
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleAddDay = () => {
    setLocalSettings(prev => ({
      ...prev,
      dayNames: [...prev.dayNames, `New Day ${prev.dayNames.length + 1}`]
    }));
  };

  const handleRemoveDay = (index) => {
    setLocalSettings(prev => ({
      ...prev,
      dayNames: prev.dayNames.filter((_, i) => i !== index)
    }));
  };

  const handleDayNameChange = (index, name) => {
    setLocalSettings(prev => {
      const newDayNames = [...prev.dayNames];
      newDayNames[index] = name;
      return { ...prev, dayNames: newDayNames };
    });
  };

  const handleAddMonth = () => {
    setLocalSettings(prev => ({
      ...prev,
      monthNames: [...prev.monthNames, `New Month ${prev.monthNames.length + 1}`],
      daysPerMonth: [...prev.daysPerMonth, 30]
    }));
  };

  const handleRemoveMonth = (index) => {
    setLocalSettings(prev => ({
      ...prev,
      monthNames: prev.monthNames.filter((_, i) => i !== index),
      daysPerMonth: prev.daysPerMonth.filter((_, i) => i !== index)
    }));
  };

  const handleMonthNameChange = (index, name) => {
    setLocalSettings(prev => {
      const newMonthNames = [...prev.monthNames];
      newMonthNames[index] = name;
      return { ...prev, monthNames: newMonthNames };
    });
  };

  const handleDaysPerMonthChange = (index, days) => {
    setLocalSettings(prev => {
      const newDaysPerMonth = [...prev.daysPerMonth];
      newDaysPerMonth[index] = parseInt(days) || 1;
      return { ...prev, daysPerMonth: newDaysPerMonth };
    });
  };

  const handleLeapYearRuleChange = (rule) => {
    setLocalSettings(prev => ({
      ...prev,
      leapYearRule: rule
    }));
  };

  const handleLeapYearOffsetChange = (offset) => {
    setLocalSettings(prev => ({
      ...prev,
      leapYearOffset: parseInt(offset) || 4
    }));
  };

  const handleFirstDayOfWeekChange = (dayIndex) => {
    setLocalSettings(prev => ({
      ...prev,
      firstDayOfWeek: parseInt(dayIndex)
    }));
  };

  // --- NEW Handler for Leap Day Month ---
  const handleLeapDayMonthChange = (monthIndex) => {
      setLocalSettings(prev => ({
          ...prev,
          leapDayMonthIndex: parseInt(monthIndex) || 0 // Default to first month if invalid
      }));
  };

  // --- Handler for updating eras (passed down to ErasSettingsTab) ---
  const handleErasChange = (newEras) => {
      setLocalSettings(prev => ({
          ...prev,
          eras: newEras
      }));
  };

  // Add new handlers for reordering days and months
  const handleMoveItemUp = (index, arrayName, secondArrayName = null) => {
    if (index <= 0) return; // Can't move first item up
    
    setLocalSettings(prev => {
      // Make copy of the array we're modifying
      const array = [...prev[arrayName]];
      
      // Swap with item above
      [array[index - 1], array[index]] = [array[index], array[index - 1]];
      
      // If we have a second array to keep in sync (like daysPerMonth)
      const result = { ...prev, [arrayName]: array };
      if (secondArrayName && prev[secondArrayName]) {
        const secondArray = [...prev[secondArrayName]];
        [secondArray[index - 1], secondArray[index]] = [secondArray[index], secondArray[index - 1]];
        result[secondArrayName] = secondArray;
      }
      
      return result;
    });
  };

  const handleMoveItemDown = (index, arrayName, secondArrayName = null) => {
    setLocalSettings(prev => {
      const array = [...prev[arrayName]];
      
      // Don't move if it's the last item
      if (index >= array.length - 1) return prev;
      
      // Swap with item below
      [array[index], array[index + 1]] = [array[index + 1], array[index]];
      
      // If we have a second array to keep in sync
      const result = { ...prev, [arrayName]: array };
      if (secondArrayName && prev[secondArrayName]) {
        const secondArray = [...prev[secondArrayName]];
        [secondArray[index], secondArray[index + 1]] = [secondArray[index + 1], secondArray[index]];
        result[secondArrayName] = secondArray;
      }
      
      return result;
    });
  };

  return (
    <Modal
      show={show}
      onHide={onHide}
      size="lg"
      centered
      className="calendar-settings-modal"
      scrollable // Make modal body scrollable if content overflows
    >
      <Modal.Header closeButton>
        <Modal.Title>
          <FontAwesomeIcon icon={faCalendarAlt} className="me-2" />
          Calendar Settings
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {/* --- Settings Tabs (Templates section moved inside) --- */}
        <Tabs
          activeKey={activeTab}
          onSelect={(k) => setActiveTab(k)}
          id="calendar-settings-tabs"
          className="mb-3 settings-tabs" 
          fill
        >
          {/* Days of Week Tab */}
          <Tab eventKey="days" title="Days of Week">
            <Card>
              <Card.Body>
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h6>Day Names</h6>
                  <Button variant="success" size="sm" onClick={handleAddDay}>
                    <FontAwesomeIcon icon={faPlusCircle} className="me-1" /> Add Day
                  </Button>
                </div>
                {errors.dayNames && <Alert variant="danger" size="sm">{errors.dayNames}</Alert>}
                {(localSettings.dayNames || []).map((day, index) => (
                  <InputGroup key={index} className="mb-2">
                    {/* Add move up/down buttons */}
                    <div className="d-flex flex-column me-1" style={{ justifyContent: "center" }}>
                      <Button 
                        variant="outline-secondary" 
                        size="sm" 
                        className="p-0 border-0 mb-1" 
                        style={{ width: '24px', height: '24px' }}
                        onClick={() => handleMoveItemUp(index, 'dayNames')}
                        disabled={index === 0}
                      >
                        <FontAwesomeIcon icon={faArrowUp} size="xs" />
                      </Button>
                      <Button 
                        variant="outline-secondary" 
                        size="sm" 
                        className="p-0 border-0" 
                        style={{ width: '24px', height: '24px' }}
                        onClick={() => handleMoveItemDown(index, 'dayNames')}
                        disabled={index === (localSettings.dayNames || []).length - 1}
                      >
                        <FontAwesomeIcon icon={faArrowDown} size="xs" />
                      </Button>
                    </div>
                    <Form.Control
                      type="text"
                      value={day}
                      onChange={(e) => handleDayNameChange(index, e.target.value)}
                      placeholder={`Day ${index + 1} Name`}
                    />
                    <Button variant="danger" size="sm" onClick={() => handleRemoveDay(index)} disabled={(localSettings.dayNames || []).length <= 1}>
                      <FontAwesomeIcon icon={faMinusCircle} />
                    </Button>
                  </InputGroup>
                ))}
                {(localSettings.dayNames || []).length === 0 && <Alert variant="warning" size="sm">Add at least one day.</Alert>}
                
                <hr />
                <h6>First Day of Week</h6>
                 {errors.firstDayOfWeek && <Alert variant="danger" size="sm">{errors.firstDayOfWeek}</Alert>}
                <Form.Select 
                  aria-label="First day of week"
                  value={localSettings.firstDayOfWeek || 0}
                  onChange={(e) => handleFirstDayOfWeekChange(e.target.value)}
                  disabled={(localSettings.dayNames || []).length === 0}
                >
                  {(localSettings.dayNames || []).map((day, index) => (
                    <option key={index} value={index}>{day}</option>
                  ))}
                </Form.Select>
              </Card.Body>
            </Card>
          </Tab>

          {/* Months Tab */}
          <Tab eventKey="months" title="Months">
              <Card>
              <Card.Body>
                 <div className="d-flex justify-content-between align-items-center mb-3">
                  <h6>Months & Days</h6>
                  <Button variant="success" size="sm" onClick={handleAddMonth}>
                    <FontAwesomeIcon icon={faPlusCircle} className="me-1" /> Add Month
                  </Button>
                </div>
                {errors.monthNames && <Alert variant="danger" size="sm">{errors.monthNames}</Alert>}
                {errors.daysPerMonth && <Alert variant="danger" size="sm">{errors.daysPerMonth}</Alert>}
                {(localSettings.monthNames || []).map((month, index) => (
                  <Row key={index} className="mb-2 gx-2 align-items-center">
                    {/* Add move up/down buttons */}
                    <Col xs="auto" className="pe-0">
                      <div className="d-flex flex-column">
                        <Button 
                          variant="outline-secondary" 
                          size="sm" 
                          className="p-0 border-0 mb-1" 
                          style={{ width: '24px', height: '24px' }}
                          onClick={() => handleMoveItemUp(index, 'monthNames', 'daysPerMonth')}
                          disabled={index === 0}
                        >
                          <FontAwesomeIcon icon={faArrowUp} size="xs" />
                        </Button>
                        <Button 
                          variant="outline-secondary" 
                          size="sm" 
                          className="p-0 border-0" 
                          style={{ width: '24px', height: '24px' }}
                          onClick={() => handleMoveItemDown(index, 'monthNames', 'daysPerMonth')}
                          disabled={index === (localSettings.monthNames || []).length - 1}
                        >
                          <FontAwesomeIcon icon={faArrowDown} size="xs" />
                        </Button>
                      </div>
                    </Col>
                    <Col>
                      <Form.Control
                        type="text"
                        value={month}
                        onChange={(e) => handleMonthNameChange(index, e.target.value)}
                        placeholder={`Month ${index + 1} Name`}
                        size="sm"
                      />
                    </Col>
                    <Col xs={3}>
                      <InputGroup size="sm">
                         <Form.Control
                           type="number"
                           value={localSettings.daysPerMonth[index]}
                           onChange={(e) => handleDaysPerMonthChange(index, e.target.value)}
                           placeholder="Days"
                           min="1"
                         />
                         <InputGroup.Text>days</InputGroup.Text>
                      </InputGroup>
                    </Col>
                    <Col xs="auto">
                      <Button variant="danger" size="sm" onClick={() => handleRemoveMonth(index)} disabled={(localSettings.monthNames || []).length <= 1}>
                        <FontAwesomeIcon icon={faMinusCircle} />
                      </Button>
                    </Col>
                  </Row>
                ))}
                 {(localSettings.monthNames || []).length === 0 && <Alert variant="warning" size="sm">Add at least one month.</Alert>}
              </Card.Body>
            </Card>
          </Tab>

          {/* Leap Years Tab */}
          <Tab eventKey="leap" title="Leap Years">
             <Card>
              <Card.Body>
                <h6>Leap Year Rule</h6>
                 {errors.leapYearRule && <Alert variant="danger" size="sm">{errors.leapYearRule}</Alert>}
                 {errors.leapYearOffset && <Alert variant="danger" size="sm">{errors.leapYearOffset}</Alert>}
                 {errors.leapDayMonthIndex && <Alert variant="danger" size="sm">{errors.leapDayMonthIndex}</Alert>}
                <Form.Group className="mb-3">
                  <Form.Check
                    type="radio"
                    id="leap-standard"
                    label="Standard Gregorian (Every 4 years, except 100 unless divisible by 400)"
                    value="standard"
                    checked={localSettings.leapYearRule === 'standard'}
                    onChange={(e) => handleLeapYearRuleChange(e.target.value)}
                  />
                  <Form.Check
                    type="radio"
                    id="leap-custom"
                    label="Custom Interval (Every N years)"
                    value="custom"
                    checked={localSettings.leapYearRule === 'custom'}
                    onChange={(e) => handleLeapYearRuleChange(e.target.value)}
                  />
                  <Form.Check
                    type="radio"
                    id="leap-none"
                    label="No Leap Years"
                    value="none"
                    checked={localSettings.leapYearRule === 'none'}
                    onChange={(e) => handleLeapYearRuleChange(e.target.value)}
                  />
                </Form.Group>
                
                {/* --- Custom Rule Options --- */}
                {localSettings.leapYearRule === 'custom' && (
                  <>
                    <Form.Group as={Row} className="mb-3 align-items-center">
                      <Form.Label column sm={3}>Leap Year Interval:</Form.Label>
                      <Col sm={4}>
                        <InputGroup size="sm">
                            <InputGroup.Text>Every</InputGroup.Text>
                            <Form.Control 
                                type="number" 
                                min="1" 
                                value={localSettings.leapYearOffset}
                                onChange={(e) => handleLeapYearOffsetChange(e.target.value)} 
                                placeholder="e.g., 4"
                             />
                            <InputGroup.Text>years</InputGroup.Text>
                        </InputGroup>
                         <Form.Text>The interval (e.g., 4) for the custom rule.</Form.Text>
                      </Col>
                    </Form.Group>

                    {/* --- NEW Leap Day Month Selector --- */}
                    <Form.Group as={Row} className="mb-3 align-items-center">
                        <Form.Label column sm={3}>Add Leap Day To:</Form.Label>
                        <Col sm={5}>
                            <Form.Select 
                                aria-label="Month to add leap day"
                                value={localSettings.leapDayMonthIndex === undefined ? 1 : localSettings.leapDayMonthIndex}
                                onChange={(e) => handleLeapDayMonthChange(e.target.value)}
                                disabled={(localSettings.monthNames || []).length === 0}
                                size="sm"
                              >
                                {(localSettings.monthNames || []).map((month, index) => (
                                  <option key={index} value={index}>{month}</option>
                                ))}
                              </Form.Select>
                              <Form.Text>Select the month that gets an extra day in a leap year.</Form.Text>
                        </Col>
                    </Form.Group>
                  </>
                )}
                 {/* --- Standard Rule Info --- */}
                 {localSettings.leapYearRule === 'standard' && (
                     <Alert variant="info" size="sm">
                         Standard leap day is added to the second month (like February).
                     </Alert>
                 )}
              </Card.Body>
            </Card>
          </Tab>

          {/* Eras Tab */}
          <Tab eventKey="eras" title="Eras">
            <ErasSettingsTab 
              eras={localSettings.eras || []} 
              onChange={handleErasChange} 
              errors={errors} // Pass down errors object
            />
          </Tab>
          
          {/* Templates Tab (Moved to end) */}
           <Tab eventKey="templates" title="Templates">
             <Card>
               <Card.Header>Load Calendar Template</Card.Header>
               <Card.Body>
                 <p className="text-muted small mb-2">
                   Load settings from a standard calendar template. This will overwrite current day, month, and leap year settings but preserve Eras.
                 </p>
                 <Stack direction="horizontal" gap={2}>
                   <Button variant="outline-secondary" size="sm" onClick={() => loadTemplate(gregorianTemplate)}>
                     <FontAwesomeIcon icon={faUndo} className="me-1" /> Load Gregorian
                   </Button>
                   <Button variant="outline-secondary" size="sm" onClick={() => loadTemplate(harptosTemplate)}>
                     <FontAwesomeIcon icon={faUndo} className="me-1" /> Load Harptos (Forgotten Realms)
                   </Button>
                 </Stack>
               </Card.Body>
             </Card>
           </Tab>
        </Tabs>
      </Modal.Body>
       <Modal.Footer>
         {Object.keys(errors).length > 0 && (
             <Col className="text-danger me-auto">
                 Please fix the validation errors before saving.
             </Col>
         )}
        <Button variant="secondary" onClick={onHide}>
          Cancel
        </Button>
        <Button variant="primary" onClick={handleSave} disabled={loading || Object.keys(errors).length > 0}>
          {loading ? 'Saving...' : 'Save Changes'}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default CalendarSettings; 