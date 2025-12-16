import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { api } from "../api";
import { useAuth } from "./AuthContext";

const TeamContext = createContext();

const initialState = {
  accountType: null,
  teams: [],
  primaryTeam: null,
  selectedTeam: null, // Currently selected team (for mentors with multiple teams)
  role: null,
  status: "idle",
  error: null,
};

export function TeamProvider({ children }) {
  const { token } = useAuth();
  const [state, setState] = useState(initialState);

  const refreshTeam = useCallback(async () => {
    if (!token) {
      setState(initialState);
      return;
    }

    setState((prev) => ({ ...prev, status: "loading", error: null }));
    try {
      const { data } = await api.get("/api/team/me");
      const teams = data?.teams || [];
      const primaryTeam = data?.primaryTeam || teams[0] || null;
      const role = primaryTeam?.role || null;
      
      // For mentors, if they have multiple teams, use primaryTeam as default selectedTeam
      // If selectedTeam was already set, try to preserve it if it still exists
      // Use functional update to access previous state without dependency
      setState((prev) => {
        const currentSelectedTeamId = prev.selectedTeam?.id;
        const preservedSelectedTeam = currentSelectedTeamId 
          ? teams.find(t => t.id === currentSelectedTeamId) 
          : null;
        const selectedTeam = preservedSelectedTeam || primaryTeam || null;

        return {
          accountType: data?.accountType || null,
          userId: data?.userId || null, // Current user ID
          teams,
          primaryTeam,
          selectedTeam,
          role,
          status: "ready",
          error: null,
        };
      });
    } catch (err) {
      console.error("Failed to load team context", err);
      setState((prev) => ({
        ...prev,
        status: "error",
        error: err.response?.data?.error || err.message,
      }));
    }
  }, [token]);

  useEffect(() => {
    refreshTeam();
  }, [token, refreshTeam]);

  const setSelectedTeam = useCallback((team) => {
    setState((prev) => ({
      ...prev,
      selectedTeam: team,
    }));
  }, []);

  const value = useMemo(() => {
    const isMentor = state.role === "mentor" || state.accountType === "mentor";
    const isAdmin = isMentor; // Mentors have admin privileges
    const isCandidate = state.accountType === "candidate" && !isMentor;
    
    // Use selectedTeam if available (for mentors with multiple teams), otherwise fall back to primaryTeam
    const activeTeam = state.selectedTeam || state.primaryTeam;

    return {
      teamState: {
        ...state,
        activeTeam, // The currently active team to use in components
        hasTeam: !!activeTeam,
        isAdmin,
        isMentor,
        isCandidate,
      },
      refreshTeam,
      setSelectedTeam,
    };
  }, [state, refreshTeam, setSelectedTeam]);

  return (
    <TeamContext.Provider value={value}>{children}</TeamContext.Provider>
  );
}

export function useTeam() {
  return useContext(TeamContext);
}

