// src/components/ScheduleCalendar.jsx
import React, { useState, useMemo, useCallback } from 'react';
import './ScheduleCalendar.css';

export default function ScheduleCalendar({ scheduledSubmissions = [] }) {
  const [currentDate, setCurrentDate] = useState(new Date());

  // Helper function to check if date is today
  const isToday = useCallback((date) => {
    const today = new Date();
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
  }, []);

  // Get calendar data
  const calendarData = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    // First day of the month
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    // Day of week for first day (0 = Sunday)
    const startDayOfWeek = firstDay.getDay();
    const daysInMonth = lastDay.getDate();
    
    // Create array of days
    const days = [];
    
    // Add empty slots for days before the first of the month
    for (let i = 0; i < startDayOfWeek; i++) {
      days.push({ day: null, date: null });
    }
    
    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      // Use local date format to avoid timezone issues (YYYY-MM-DD)
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      
      // Find scheduled submissions for this day
      const events = scheduledSubmissions.filter(sub => {
        // Handle both ISO format and plain date strings
        let subDate = sub.scheduled_date || sub.scheduledDate || '';
        // Extract just the date part (YYYY-MM-DD) regardless of format
        if (subDate.includes('T')) {
          subDate = subDate.split('T')[0];
        }
        return subDate === dateStr;
      });
      
      days.push({
        day,
        date: dateStr,
        events,
        isToday: isToday(date),
        isPast: date < new Date(new Date().setHours(0, 0, 0, 0))
      });
    }
    
    return {
      year,
      month,
      monthName: firstDay.toLocaleDateString('en-US', { month: 'long' }),
      days
    };
  }, [currentDate, scheduledSubmissions, isToday]);

  const goToPrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return '#f59e0b';
      case 'completed': return '#10b981';
      case 'cancelled': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const formatTime = (timeStr) => {
    if (!timeStr) return '';
    const [hours, minutes] = timeStr.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="schedule-calendar">
      <div className="calendar-header">
        <h4>📆 Submission Calendar</h4>
        <div className="calendar-nav">
          <button onClick={goToPrevMonth} className="calendar-nav-btn">←</button>
          <span className="calendar-month-year">
            {calendarData.monthName} {calendarData.year}
          </span>
          <button onClick={goToNextMonth} className="calendar-nav-btn">→</button>
          <button onClick={goToToday} className="calendar-today-btn">Today</button>
        </div>
      </div>

      <div className="calendar-grid">
        {/* Week day headers */}
        {weekDays.map(day => (
          <div key={day} className="calendar-weekday">{day}</div>
        ))}

        {/* Calendar days */}
        {calendarData.days.map((dayData, index) => (
          <div
            key={index}
            className={`calendar-day ${!dayData.day ? 'empty' : ''} ${dayData.isToday ? 'today' : ''} ${dayData.isPast ? 'past' : ''}`}
          >
            {dayData.day && (
              <>
                <span className="calendar-day-number">{dayData.day}</span>
                <div className="calendar-events">
                  {dayData.events.map((event, eventIndex) => (
                    <div key={eventIndex} className="calendar-event-wrapper">
                      <div
                        className={`calendar-event calendar-event-${event.status}`}
                        style={{ backgroundColor: getStatusColor(event.status) }}
                      />
                      <div className="calendar-event-tooltip">
                        <div className="tooltip-title">{event.job_title || 'Submission'}</div>
                        <div className="tooltip-company">at {event.job_company || 'Company'}</div>
                        <div className="tooltip-time">🕐 {formatTime(event.scheduled_time)}</div>
                        <div className={`tooltip-status status-${event.status}`}>
                          Status: {event.status}
                        </div>
                        {event.notes && <div className="tooltip-notes">📝 {event.notes}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="calendar-legend">
        <div className="legend-item">
          <span className="legend-dot" style={{ backgroundColor: '#f59e0b' }}></span>
          <span>Pending</span>
        </div>
        <div className="legend-item">
          <span className="legend-dot" style={{ backgroundColor: '#10b981' }}></span>
          <span>Completed</span>
        </div>
        <div className="legend-item">
          <span className="legend-dot" style={{ backgroundColor: '#ef4444' }}></span>
          <span>Cancelled</span>
        </div>
      </div>

    </div>
  );
}
