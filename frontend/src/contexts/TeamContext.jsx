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

      setState({
        accountType: data?.accountType || null,
        teams,
        primaryTeam,
        role,
        status: "ready",
        error: null,
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

  const value = useMemo(() => {
    const isAdmin =
      state.role === "admin" || state.accountType === "team_admin";
    const isMentor = state.role === "mentor";
    const isCandidate = state.accountType === "candidate" && !isMentor;

    return {
      teamState: {
        ...state,
        hasTeam: !!state.primaryTeam,
        isAdmin,
        isMentor,
        isCandidate,
      },
      refreshTeam,
    };
  }, [state, refreshTeam]);

  return (
    <TeamContext.Provider value={value}>{children}</TeamContext.Provider>
  );
}

export function useTeam() {
  return useContext(TeamContext);
}

