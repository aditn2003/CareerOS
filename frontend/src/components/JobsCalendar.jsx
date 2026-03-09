import React, { useEffect, useState, useMemo } from "react";
import { Calendar, dateFnsLocalizer } from "react-big-calendar";
import { format, parse, startOfWeek, getDay } from "date-fns";
import enUS from "date-fns/locale/en-US";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { baseURL } from "../api";
import "./JobsCalendar.css";

const locales = { "en-US": enUS };

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 0 }),
  getDay,
  locales,
});

export default function JobsCalendar({ token }) {
  const [jobs, setJobs] = useState([]);

  useEffect(() => {
    async function loadJobs() {
      try {
        const res = await fetch(`${baseURL}/api/jobs`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        setJobs(data.jobs || []);
      } catch (err) {
        console.error("❌ Failed to load jobs for calendar:", err);
      }
    }
    loadJobs();
  }, [token]);

  // 🟣 Build events with urgency colors identical to UpcomingDeadlinesWidget
  const events = useMemo(() => {
    return jobs
      .filter((j) => j.deadline)
      .map((j) => {
        const color = getUrgencyColor(j.deadline);
        return {
          id: j.id,
          title: `${j.title} — ${j.company}`,
          start: new Date(j.deadline),
          end: new Date(j.deadline),
          allDay: true,
          color,
        };
      });
  }, [jobs]);

  // 🎨 Same color logic as UpcomingDeadlinesWidget
  function getUrgencyColor(deadline) {
    if (!deadline) return "#9ca3af"; // gray (no date)
    const diff = Math.ceil(
      (new Date(deadline) - Date.now()) / (1000 * 60 * 60 * 24)
    );
    if (diff < 0) return "#ef4444"; // red (overdue)
    if (diff <= 2) return "#f87171"; // light red (urgent)
    if (diff <= 7) return "#fbbf24"; // yellow (soon)
    return "#4ade80"; // green (safe)
  }

  return (
    <div className="calendar-container">
      <div className="big-calendar-wrapper">
        <Calendar
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          views={["month"]}
          defaultView="month"
          toolbar={true}
          popup
          style={{ height: 500 }}
          eventPropGetter={(event) => ({
            style: {
              backgroundColor: event.color,
              borderRadius: "6px",
              color:
                event.color === "#fbbf24" || event.color === "#facc15"
                  ? "#1e1b4b"
                  : "#f9fafb",
              fontWeight: 500,
              border: "none",
              padding: "2px 4px",
            },
          })}
        />
      </div>
    </div>
  );
}
