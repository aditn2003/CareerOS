// frontend/src/components/JobMapView.jsx
// UC-116: Location and Geo-coding Services - Interactive Map View

import React, { useEffect, useState, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { api } from "../api";
import "./JobMapView.css";

// Fix for default marker icons in react-leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

// Component to handle map bounds updates
function MapBoundsUpdater({ jobs, homeLocation, shouldUpdateBounds, onBoundsUpdated }) {
  const map = useMap();

  useEffect(() => {
    // Only update bounds when explicitly requested (not on every filter change)
    if (!shouldUpdateBounds) return;

    const jobsWithCoords = jobs.filter(job => job.latitude && job.longitude);
    
    // Don't update bounds if there are no jobs - keep current view
    if (jobsWithCoords.length === 0) {
      onBoundsUpdated?.();
      return;
    }

    const bounds = L.latLngBounds([]);
    
    // Add job markers to bounds
    jobsWithCoords.forEach((job) => {
      bounds.extend([job.latitude, job.longitude]);
    });

    // Add home location if available
    if (homeLocation?.latitude && homeLocation?.longitude) {
      bounds.extend([homeLocation.latitude, homeLocation.longitude]);
    }

    if (bounds.isValid() && jobsWithCoords.length > 0) {
      map.fitBounds(bounds, { padding: [50, 50] });
      onBoundsUpdated?.();
    }
  }, [shouldUpdateBounds, jobs, homeLocation, map, onBoundsUpdated]);

  return null;
}

export default function JobMapView({ token }) {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filters, setFilters] = useState({
    locationType: "",
    maxDistance: "",
    maxTime: "",
    maxTimeMode: "driving", // "driving" or "flying"
    status: "",
  });
  const [tempMaxDistance, setTempMaxDistance] = useState("");
  const [tempMaxTime, setTempMaxTime] = useState("");
  const [homeLocation, setHomeLocation] = useState(null);
  const [selectedJobs, setSelectedJobs] = useState([]);
  const [geocodingInProgress, setGeocodingInProgress] = useState(false);
  const [shouldUpdateBounds, setShouldUpdateBounds] = useState(true);

  // Fetch jobs with geocoding data
  const fetchJobs = async (updateBounds = false) => {
    try {
      setLoading(true);
      setError("");

      const params = new URLSearchParams();
      if (filters.locationType) params.append("locationType", filters.locationType);
      if (filters.maxDistance) params.append("maxDistance", filters.maxDistance);
      // Only send maxTime to backend if filtering by driving time
      // For plane time, we'll filter client-side
      if (filters.maxTime && filters.maxTimeMode === "driving") {
        params.append("maxTime", filters.maxTime);
      }
      if (filters.status) params.append("status", filters.status);

      const res = await api.get(`/api/jobs/map?${params.toString()}`);
      
      if (res.data.success) {
        let filteredJobs = res.data.jobs || [];
        
        // Client-side filter for plane time if maxTimeMode is "flying"
        if (filters.maxTime && filters.maxTimeMode === "flying") {
          const maxTimeMinutes = parseFloat(filters.maxTime);
          filteredJobs = filteredJobs.filter((job) => {
            // Only filter if planeTime exists (jobs need to have commute calculated)
            if (job.planeTime && job.planeTime.minutes !== undefined) {
              return job.planeTime.minutes <= maxTimeMinutes;
            }
            // If planeTime not calculated yet, include it (user can click to calculate)
            return true;
          });
        }
        
        setJobs(filteredJobs);
        // Only update bounds if we have jobs and it's requested
        if (filteredJobs.length > 0) {
          setShouldUpdateBounds(updateBounds);
        } else {
          setShouldUpdateBounds(false);
        }
      } else {
        setError("Failed to load jobs");
      }
    } catch (err) {
      console.error("Error fetching jobs:", err);
      setError(err.response?.data?.error || "Failed to load jobs");
    } finally {
      setLoading(false);
    }
  };

  // Fetch user's home location
  const fetchHomeLocation = async () => {
    try {
      const res = await api.get("/api/profile");
      if (res.data.profile) {
        const profile = res.data.profile;
        if (profile.home_latitude && profile.home_longitude) {
          setHomeLocation({
            latitude: profile.home_latitude,
            longitude: profile.home_longitude,
            address: profile.location,
            timezone: profile.home_timezone || null,
            utc_offset: profile.home_utc_offset || null,
          });
        }
      }
    } catch (err) {
      console.error("Error fetching home location:", err);
    }
  };

  // Geocode jobs that don't have coordinates
  const geocodeJobs = async () => {
    const jobsToGeocode = jobs.filter(
      (job) => job.location && (!job.latitude || !job.longitude)
    );

    if (jobsToGeocode.length === 0) {
      return;
    }

    try {
      setGeocodingInProgress(true);
      const locations = jobsToGeocode.map((job) => job.location);

      const res = await api.post("/api/geocoding/geocode/batch", { locations });

      if (res.data.success) {
        // Update jobs with geocoded coordinates and persist to database
        const updatedJobs = jobs.map((job) => {
          if (job.latitude && job.longitude) return job;

          const geocodeResult = res.data.results.find(
            (r) => r.location === job.location && r.success
          );

          if (geocodeResult?.data) {
            // Persist coordinates to database
            api.put(`/api/jobs/${job.id}/coordinates`, {
              latitude: geocodeResult.data.latitude,
              longitude: geocodeResult.data.longitude,
              location_type: geocodeResult.data.location_type || null,
              timezone: geocodeResult.data.timezone || null,
              utc_offset: geocodeResult.data.utc_offset || null,
            }).catch(err => {
              console.error(`Failed to update coordinates for job ${job.id}:`, err);
            });

            return {
              ...job,
              latitude: geocodeResult.data.latitude,
              longitude: geocodeResult.data.longitude,
              location_type: geocodeResult.data.location_type || job.location_type,
              timezone: geocodeResult.data.timezone || null,
              utc_offset: geocodeResult.data.utc_offset || null,
            };
          }

          return job;
        });

        setJobs(updatedJobs);
      }
    } catch (err) {
      console.error("Error geocoding jobs:", err);
      setError("Failed to geocode some locations");
    } finally {
      setGeocodingInProgress(false);
    }
  };

  // Initial load - update bounds
  useEffect(() => {
    fetchJobs(true);
    fetchHomeLocation();
  }, [token]);

  // Debounce max distance and max time inputs
  useEffect(() => {
    if (!token) return;
    
    const timer = setTimeout(() => {
      setFilters(prevFilters => {
        const hasChanges = tempMaxDistance !== prevFilters.maxDistance || tempMaxTime !== prevFilters.maxTime;
        if (hasChanges) {
          return {
            ...prevFilters,
            maxDistance: tempMaxDistance,
            maxTime: tempMaxTime,
          };
        }
        return prevFilters;
      });
    }, 500); // 500ms debounce

    return () => clearTimeout(timer);
  }, [tempMaxDistance, tempMaxTime, token]);

  // When filters change, fetch jobs but don't auto-update bounds
  useEffect(() => {
    if (token) {
      fetchJobs(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.locationType, filters.status, filters.maxTimeMode, filters.maxDistance, filters.maxTime]);

  useEffect(() => {
    // Auto-geocode jobs when they're loaded
    if (jobs.length > 0) {
      const needsGeocoding = jobs.some(
        (job) => job.location && (!job.latitude || !job.longitude)
      );
      if (needsGeocoding) {
        geocodeJobs();
      }
    }
  }, [jobs.length]);

  // Listen for job updates from other components (via custom event)
  useEffect(() => {
    const handleJobUpdate = (event) => {
      // Refresh jobs when a job is updated elsewhere, especially if location changed
      console.log('Job updated event received:', event.detail);
      fetchJobs();
    };

    window.addEventListener('jobUpdated', handleJobUpdate);
    return () => {
      window.removeEventListener('jobUpdated', handleJobUpdate);
    };
  }, [filters]); // Include filters in dependency to ensure fetchJobs has latest filters

  // Initialize temp values from filters on mount only
  useEffect(() => {
    setTempMaxDistance(filters.maxDistance || "");
    setTempMaxTime(filters.maxTime || "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Calculate commute for a job
  const calculateCommute = async (jobId) => {
    try {
      const res = await api.post("/api/geocoding/commute", { jobId });
      if (res.data.success) {
        // Update job with commute info
        setJobs((prevJobs) =>
          prevJobs.map((job) =>
            job.id === jobId
              ? {
                  ...job,
                  commuteDistance: res.data.data.distance,
                  drivingTime: res.data.data.drivingTime,
                  planeTime: res.data.data.planeTime,
                  commuteTime: res.data.data.drivingTime, // For compatibility
                }
              : job
          )
        );
      }
    } catch (err) {
      console.error("Error calculating commute:", err);
    }
  };

  // Helper to format UTC offset for display
  const formatUtcOffset = (offsetMinutes) => {
    if (offsetMinutes === null || offsetMinutes === undefined) return "";
    const hours = Math.floor(Math.abs(offsetMinutes) / 60);
    const minutes = Math.abs(offsetMinutes) % 60;
    const sign = offsetMinutes >= 0 ? "+" : "-";
    return `UTC${sign}${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
  };

  // Toggle job selection for comparison
  const toggleJobSelection = (jobId) => {
    setSelectedJobs((prev) =>
      prev.includes(jobId)
        ? prev.filter((id) => id !== jobId)
        : [...prev, jobId]
    );
  };

  // Get location type color
  const getLocationTypeColor = (locationType) => {
    switch (locationType) {
      case "remote":
        return "#10b981"; // green
      case "hybrid":
        return "#f59e0b"; // amber
      case "on_site":
        return "#ef4444"; // red
      default:
        return "#6366f1"; // indigo
    }
  };

  // Create custom marker icon
  const createMarkerIcon = (color) => {
    return L.divIcon({
      className: "custom-marker",
      html: `<div style="background-color: ${color}; width: 20px; height: 20px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
      iconSize: [20, 20],
      iconAnchor: [10, 10],
    });
  };

  if (loading && jobs.length === 0) {
    return (
      <div className="job-map-container">
        <div className="map-loading">Loading map...</div>
      </div>
    );
  }

  const jobsWithCoordinates = jobs.filter(
    (job) => job.latitude && job.longitude
  );

  // Default center (San Francisco) if no jobs
  const defaultCenter = [37.7749, -122.4194];
  const center =
    jobsWithCoordinates.length > 0
      ? [
          jobsWithCoordinates[0].latitude,
          jobsWithCoordinates[0].longitude,
        ]
      : defaultCenter;

  return (
    <div className="job-map-container">
      {/* Filters */}
      <div className="map-filters">
        <div className="filter-group">
          <label htmlFor="map-location-type">Location Type:</label>
          <select
            id="map-location-type"
            value={filters.locationType}
            onChange={(e) =>
              setFilters({ ...filters, locationType: e.target.value })
            }
            aria-label="Filter jobs by location type"
          >
            <option value="">All</option>
            <option value="remote">Remote</option>
            <option value="hybrid">Hybrid</option>
            <option value="on_site">On-Site</option>
            <option value="flexible">Flexible</option>
          </select>
        </div>

        <div className="filter-group">
          <label htmlFor="map-max-distance">Max Distance (miles):</label>
          <input
            type="number"
            id="map-max-distance"
            value={tempMaxDistance}
            onChange={(e) => setTempMaxDistance(e.target.value)}
            placeholder="e.g., 50"
            aria-label="Maximum distance in miles"
          />
        </div>

        <div className="filter-group">
          <label htmlFor="map-max-time">Max Time (minutes):</label>
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <input
              type="number"
              id="map-max-time"
              value={tempMaxTime}
              onChange={(e) => setTempMaxTime(e.target.value)}
              placeholder="e.g., 60"
              style={{ flex: 1 }}
              aria-label="Maximum travel time in minutes"
            />
            <label htmlFor="map-travel-mode" className="visually-hidden">Travel Mode</label>
            <select
              id="map-travel-mode"
              value={filters.maxTimeMode}
              onChange={(e) => setFilters({ ...filters, maxTimeMode: e.target.value })}
              style={{ width: "auto" }}
              aria-label="Travel mode for maximum time calculation"
            >
              <option value="driving">🚗 Car</option>
              <option value="flying">✈️ Plane</option>
            </select>
          </div>
        </div>

        <div className="filter-group">
          <label htmlFor="map-status">Status:</label>
          <select
            id="map-status"
            value={filters.status}
            onChange={(e) =>
              setFilters({ ...filters, status: e.target.value })
            }
            aria-label="Filter jobs by application status"
          >
            <option value="">All</option>
            <option value="Interested">Interested</option>
            <option value="Applied">Applied</option>
            <option value="Phone Screen">Phone Screen</option>
            <option value="Interview">Interview</option>
            <option value="Offer">Offer</option>
            <option value="Rejected">Rejected</option>
          </select>
        </div>

        {geocodingInProgress && (
          <div className="geocoding-status">Geocoding locations...</div>
        )}
        <div className="filter-group">
          <button
            className="fit-bounds-btn"
            onClick={() => setShouldUpdateBounds(true)}
            title="Fit map to show all visible jobs"
          >
            Fit to Jobs
          </button>
        </div>
      </div>

      {/* Map */}
      <div className="map-wrapper">
        <MapContainer
          center={center}
          zoom={10}
          style={{ height: "600px", width: "100%" }}
          scrollWheelZoom={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <MapBoundsUpdater 
            jobs={jobsWithCoordinates} 
            homeLocation={homeLocation}
            shouldUpdateBounds={shouldUpdateBounds}
            onBoundsUpdated={() => setShouldUpdateBounds(false)}
          />

          {/* Home location marker */}
          {homeLocation && (
            <Marker
              position={[homeLocation.latitude, homeLocation.longitude]}
              icon={L.icon({
                iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png",
                shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
                iconSize: [25, 41],
                iconAnchor: [12, 41],
                popupAnchor: [1, -34],
                shadowSize: [41, 41],
              })}
            >
              <Popup>
                <strong>🏠 Your Home</strong>
                <br />
                {homeLocation.address}
                {homeLocation.timezone && (
                  <>
                    <br />
                    <small style={{ color: "#64748b" }}>
                      🕐 {homeLocation.timezone}
                      {homeLocation.utc_offset !== null && homeLocation.utc_offset !== undefined && (
                        <span> ({formatUtcOffset(homeLocation.utc_offset)})</span>
                      )}
                    </small>
                  </>
                )}
              </Popup>
            </Marker>
          )}

          {/* Job markers */}
          {jobsWithCoordinates.map((job) => {
            const color = getLocationTypeColor(job.location_type);
            return (
              <Marker
                key={job.id}
                position={[job.latitude, job.longitude]}
                icon={createMarkerIcon(color)}
                eventHandlers={{
                  click: () => {
                    if (!job.commuteDistance) {
                      calculateCommute(job.id);
                    }
                  },
                }}
              >
                <Popup>
                  <div className="job-popup">
                    <h4>{job.title}</h4>
                    <p>
                      <strong>{job.company}</strong>
                    </p>
                    <p>{job.location}</p>
                    {job.location_type && (
                      <p>
                        <span
                          className="location-type-badge"
                          style={{ backgroundColor: color }}
                        >
                          {job.location_type}
                        </span>
                      </p>
                    )}
                    {job.timezone && (
                      <p style={{ fontSize: "12px", color: "#64748b", marginTop: "4px" }}>
                        🕐 {job.timezone}
                        {job.utc_offset !== null && job.utc_offset !== undefined && (
                          <span> ({formatUtcOffset(job.utc_offset)})</span>
                        )}
                      </p>
                    )}
                    {job.commuteDistance && (
                      <div className="commute-info">
                        <p>
                          📍 Distance: {job.commuteDistance.miles} miles (
                          {job.commuteDistance.kilometers} km)
                        </p>
                        {job.drivingTime && (
                          <p>
                            🚗 Driving: {job.drivingTime.minutes} minutes (
                            {job.drivingTime.hours} hours)
                          </p>
                        )}
                        {/* Only show plane info if driving time is 2 hours (120 minutes) or more */}
                        {job.planeTime && job.drivingTime && job.drivingTime.minutes >= 120 && (
                          <p>
                            ✈️ Plane: {job.planeTime.minutes} minutes (
                            {job.planeTime.hours} hours)
                          </p>
                        )}
                      </div>
                    )}
                    <button
                      className="compare-btn"
                      onClick={() => toggleJobSelection(job.id)}
                    >
                      {selectedJobs.includes(job.id)
                        ? "Remove from Comparison"
                        : "Add to Comparison"}
                    </button>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      </div>

      {/* Comparison Panel */}
      {selectedJobs.length > 0 && (
        <div className="comparison-panel">
          <h3>Location Comparison ({selectedJobs.length} selected)</h3>
          <div className="comparison-jobs">
            {selectedJobs.map((jobId) => {
              const job = jobs.find((j) => j.id === jobId);
              if (!job) return null;

              return (
                <div key={jobId} className="comparison-job-card">
                  <h4>{job.title} - {job.company}</h4>
                  <p>{job.location}</p>
                  {job.timezone && (
                    <p style={{ fontSize: "12px", color: "#64748b", marginTop: "4px" }}>
                      🕐 {job.timezone}
                      {job.utc_offset !== null && job.utc_offset !== undefined && (
                        <span> ({formatUtcOffset(job.utc_offset)})</span>
                      )}
                    </p>
                  )}
                  {job.commuteDistance && (
                    <div>
                      <p>
                        Distance: {job.commuteDistance.miles} miles
                      </p>
                      {job.drivingTime && (
                        <p>🚗 Driving: {job.drivingTime.minutes} minutes</p>
                      )}
                      {/* Only show plane info if driving time is 2 hours (120 minutes) or more */}
                      {job.planeTime && job.drivingTime && job.drivingTime.minutes >= 120 && (
                        <p>✈️ Plane: {job.planeTime.minutes} minutes</p>
                      )}
                    </div>
                  )}
                  <button
                    className="remove-btn"
                    onClick={() => toggleJobSelection(jobId)}
                  >
                    Remove
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Error message */}
      {error && <div className="map-error">{error}</div>}

      {/* Jobs without coordinates */}
      {jobs.filter((j) => !j.latitude || !j.longitude).length > 0 && (
        <div className="unmapped-jobs">
          <h4>
            Jobs without location data (
            {jobs.filter((j) => !j.latitude || !j.longitude).length})
          </h4>
          <button
            onClick={geocodeJobs}
            disabled={geocodingInProgress}
            style={{
              marginBottom: "10px",
              padding: "8px 16px",
              backgroundColor: "#6366f1",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: geocodingInProgress ? "not-allowed" : "pointer",
              opacity: geocodingInProgress ? 0.6 : 1,
            }}
          >
            {geocodingInProgress ? "Geocoding..." : "Re-geocode Jobs"}
          </button>
          <ul>
            {jobs
              .filter((j) => !j.latitude || !j.longitude)
              .map((job) => (
                <li key={job.id}>
                  {job.company} - {job.title} ({job.location || "No location"})
                </li>
              ))}
          </ul>
        </div>
      )}
    </div>
  );
}
