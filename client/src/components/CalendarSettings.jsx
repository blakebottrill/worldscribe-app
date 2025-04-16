import React, { useState, useEffect } from 'react';
import { Button, Modal, Form, Card, Row, Col, Tab, Tabs, Alert } from 'react-bootstrap';
import { useCalendar } from '../contexts/CalendarContext';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlusCircle, faMinusCircle, faCalendarAlt } from '@fortawesome/free-solid-svg-icons';
import './CalendarSettings.css';

const CalendarSettings = ({ show, onHide }) => {
  const { calendarSettings, saveCalendarSettings, loading } = useCalendar();
  const [localSettings, setLocalSettings] = useState(calendarSettings);
  const [activeTab, setActiveTab] = useState('days');
  const [errors, setErrors] = useState({});

  useEffect(() => {
    setLocalSettings(calendarSettings);
  }, [calendarSettings, show]);

  const handleSave = async () => {
    if (validateSettings()) {
      await saveCalendarSettings(localSettings);
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

  const handleFirstDayOfWeekChange = (day) => {
    setLocalSettings(prev => ({
      ...prev,
      firstDayOfWeek: parseInt(day)
    }));
  };

  return (
    <Modal
      show={show}
      onHide={onHide}
      size="lg"
      centered
      className="calendar-settings-modal"
    >
      <Modal.Header closeButton>
        <Modal.Title>
          <FontAwesomeIcon icon={faCalendarAlt} className="me-2" />
          Calendar Settings
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Tabs
          activeKey={activeTab}
          onSelect={(k) => setActiveTab(k)}
          className="mb-3"
        >
          <Tab eventKey="days" title="Days of Week">
            <Card>
              <Card.Body>
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h5>Days of Week</h5>
                  <Button variant="primary" onClick={handleAddDay}>
                    <FontAwesomeIcon icon={faPlusCircle} className="me-1" /> Add Day
                  </Button>
                </div>
                {errors.dayNames && <Alert variant="danger">{errors.dayNames}</Alert>}
                {localSettings.dayNames.map((day, index) => (
                  <div key={index} className="d-flex align-items-center mb-2">
                    <Form.Control
                      type="text"
                      value={day}
                      onChange={(e) => handleDayNameChange(index, e.target.value)}
                      className="me-2"
                    />
                    <Button
                      variant="danger"
                      onClick={() => handleRemoveDay(index)}
                      disabled={localSettings.dayNames.length <= 1}
                    >
                      <FontAwesomeIcon icon={faMinusCircle} />
                    </Button>
                  </div>
                ))}
                <Form.Group className="mt-3">
                  <Form.Label>First Day of Week</Form.Label>
                  <Form.Select
                    value={localSettings.firstDayOfWeek}
                    onChange={(e) => handleFirstDayOfWeekChange(e.target.value)}
                  >
                    {localSettings.dayNames.map((day, index) => (
                      <option key={index} value={index}>
                        {day}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Card.Body>
            </Card>
          </Tab>
          <Tab eventKey="months" title="Months">
            <Card>
              <Card.Body>
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h5>Months of Year</h5>
                  <Button variant="primary" onClick={handleAddMonth}>
                    <FontAwesomeIcon icon={faPlusCircle} className="me-1" /> Add Month
                  </Button>
                </div>
                {errors.monthNames && <Alert variant="danger">{errors.monthNames}</Alert>}
                {errors.daysPerMonth && <Alert variant="danger">{errors.daysPerMonth}</Alert>}
                {localSettings.monthNames.map((month, index) => (
                  <Row key={index} className="mb-2 align-items-center">
                    <Col xs={7}>
                      <Form.Control
                        type="text"
                        value={month}
                        onChange={(e) => handleMonthNameChange(index, e.target.value)}
                        placeholder="Month name"
                      />
                    </Col>
                    <Col xs={3}>
                      <Form.Control
                        type="number"
                        value={localSettings.daysPerMonth[index]}
                        onChange={(e) => handleDaysPerMonthChange(index, e.target.value)}
                        min="1"
                        placeholder="Days"
                      />
                    </Col>
                    <Col xs={2}>
                      <Button
                        variant="danger"
                        onClick={() => handleRemoveMonth(index)}
                        disabled={localSettings.monthNames.length <= 1}
                      >
                        <FontAwesomeIcon icon={faMinusCircle} />
                      </Button>
                    </Col>
                  </Row>
                ))}
              </Card.Body>
            </Card>
          </Tab>
          <Tab eventKey="leap" title="Leap Years">
            <Card>
              <Card.Body>
                <h5>Leap Year Settings</h5>
                <Form.Group className="mb-3">
                  <Form.Label>Leap Year Rules</Form.Label>
                  <Form.Select
                    value={localSettings.leapYearRule}
                    onChange={(e) => handleLeapYearRuleChange(e.target.value)}
                  >
                    <option value="standard">Standard (Earth-like)</option>
                    <option value="none">None (No leap years)</option>
                    <option value="custom">Custom</option>
                  </Form.Select>
                </Form.Group>
                {localSettings.leapYearRule === 'custom' && (
                  <Form.Group>
                    <Form.Label>Leap Year Frequency (years)</Form.Label>
                    <Form.Control
                      type="number"
                      value={localSettings.leapYearOffset}
                      onChange={(e) => handleLeapYearOffsetChange(e.target.value)}
                      min="1"
                    />
                    <Form.Text className="text-muted">
                      A leap year will occur every {localSettings.leapYearOffset} years
                    </Form.Text>
                  </Form.Group>
                )}
                {localSettings.leapYearRule === 'standard' && (
                  <Alert variant="info">
                    Using Earth's leap year rules: Years divisible by 4 are leap years, 
                    except years divisible by 100 but not by 400.
                  </Alert>
                )}
              </Card.Body>
            </Card>
          </Tab>
        </Tabs>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>
          Cancel
        </Button>
        <Button
          variant="primary"
          onClick={handleSave}
          disabled={loading}
        >
          {loading ? 'Saving...' : 'Save Changes'}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default CalendarSettings; 