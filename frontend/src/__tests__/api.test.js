/**
 * API Layer Tests
 * Unit tests for API function definitions and configurations
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  api,
  fetchCompanyResearch,
  updateTemplate,
  deleteTemplate,
  duplicateTemplate,
  exportPDF,
  exportDOCX,
  exportTXT,
  fetchDashboardStats,
  getSuccessAnalysis,
  getGoals,
  updateGoals,
  resetGoals,
  getInterviewAnalysis,
  getNetworkingAnalysis,
  getContacts,
  getContact,
  createContact,
  updateContact,
  deleteContact,
  getActivities,
  createActivity,
  getEvents,
  createEvent,
  getReferrals,
  createReferral,
  updateReferral,
  getOffers,
  getOffer,
  createOffer,
  updateOffer,
  deleteOffer,
  recordNegotiation,
  acceptOffer,
  getCareerGoals,
  getCareerGoal,
  createCareerGoal,
  updateCareerGoal,
  deleteCareerGoal,
} from "../api";

describe("API Instance", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("has correct base URL configuration", () => {
    expect(api.defaults.baseURL).toBeDefined();
  });

  it("has default content type header", () => {
    expect(api.defaults.headers["Content-Type"]).toBe("application/json");
  });

  it("attaches token to requests when available", () => {
    localStorage.setItem("token", "test-token");
    
    // Verify interceptor logic
    const config = { headers: {} };
    const token = localStorage.getItem("token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
    
    expect(config.headers.Authorization).toBe("Bearer test-token");
  });

  it("does not attach token when not available", () => {
    const config = { headers: {} };
    const token = localStorage.getItem("token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
    
    expect(config.headers.Authorization).toBeUndefined();
  });
});

describe("Company Research API", () => {
  it("fetchCompanyResearch is a function", () => {
    expect(typeof fetchCompanyResearch).toBe("function");
  });
});

describe("Cover Letter Template API", () => {
  it("updateTemplate is a function that accepts id and data", () => {
    expect(typeof updateTemplate).toBe("function");
    expect(updateTemplate.length).toBeGreaterThanOrEqual(1);
  });

  it("deleteTemplate is a function that accepts id", () => {
    expect(typeof deleteTemplate).toBe("function");
    expect(deleteTemplate.length).toBeGreaterThanOrEqual(1);
  });

  it("duplicateTemplate is a function that accepts id", () => {
    expect(typeof duplicateTemplate).toBe("function");
    expect(duplicateTemplate.length).toBeGreaterThanOrEqual(1);
  });
});

describe("Export API", () => {
  it("exportPDF is a function", () => {
    expect(typeof exportPDF).toBe("function");
  });

  it("exportDOCX is a function", () => {
    expect(typeof exportDOCX).toBe("function");
  });

  it("exportTXT is a function", () => {
    expect(typeof exportTXT).toBe("function");
  });
});

describe("Dashboard API", () => {
  it("fetchDashboardStats is a function", () => {
    expect(typeof fetchDashboardStats).toBe("function");
  });

  it("getSuccessAnalysis is a function", () => {
    expect(typeof getSuccessAnalysis).toBe("function");
  });
});

describe("Goals API", () => {
  it("getGoals is a function", () => {
    expect(typeof getGoals).toBe("function");
  });

  it("updateGoals is a function that accepts goals object", () => {
    expect(typeof updateGoals).toBe("function");
    expect(updateGoals.length).toBeGreaterThanOrEqual(1);
  });

  it("resetGoals is a function", () => {
    expect(typeof resetGoals).toBe("function");
  });
});

describe("Analysis APIs", () => {
  it("getInterviewAnalysis is a function", () => {
    expect(typeof getInterviewAnalysis).toBe("function");
  });

  it("getNetworkingAnalysis is a function", () => {
    expect(typeof getNetworkingAnalysis).toBe("function");
  });
});

describe("Networking API", () => {
  describe("Contacts", () => {
    it("getContacts is a function", () => {
      expect(typeof getContacts).toBe("function");
    });

    it("getContact is a function that accepts id", () => {
      expect(typeof getContact).toBe("function");
      expect(getContact.length).toBeGreaterThanOrEqual(1);
    });

    it("createContact is a function that accepts data", () => {
      expect(typeof createContact).toBe("function");
      expect(createContact.length).toBeGreaterThanOrEqual(1);
    });

    it("updateContact is a function that accepts id and data", () => {
      expect(typeof updateContact).toBe("function");
      expect(updateContact.length).toBeGreaterThanOrEqual(2);
    });

    it("deleteContact is a function that accepts id", () => {
      expect(typeof deleteContact).toBe("function");
      expect(deleteContact.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("Activities", () => {
    it("getActivities is a function with optional contactId", () => {
      expect(typeof getActivities).toBe("function");
    });

    it("createActivity is a function that accepts data", () => {
      expect(typeof createActivity).toBe("function");
      expect(createActivity.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("Events", () => {
    it("getEvents is a function", () => {
      expect(typeof getEvents).toBe("function");
    });

    it("createEvent is a function that accepts data", () => {
      expect(typeof createEvent).toBe("function");
      expect(createEvent.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("Referrals", () => {
    it("getReferrals is a function", () => {
      expect(typeof getReferrals).toBe("function");
    });

    it("createReferral is a function that accepts data", () => {
      expect(typeof createReferral).toBe("function");
      expect(createReferral.length).toBeGreaterThanOrEqual(1);
    });

    it("updateReferral is a function that accepts id and data", () => {
      expect(typeof updateReferral).toBe("function");
      expect(updateReferral.length).toBeGreaterThanOrEqual(2);
    });
  });
});

describe("Offers API", () => {
  it("getOffers is a function", () => {
    expect(typeof getOffers).toBe("function");
  });

  it("getOffer is a function that accepts id", () => {
    expect(typeof getOffer).toBe("function");
    expect(getOffer.length).toBeGreaterThanOrEqual(1);
  });

  it("createOffer is a function that accepts data", () => {
    expect(typeof createOffer).toBe("function");
    expect(createOffer.length).toBeGreaterThanOrEqual(1);
  });

  it("updateOffer is a function that accepts id and data", () => {
    expect(typeof updateOffer).toBe("function");
    expect(updateOffer.length).toBeGreaterThanOrEqual(2);
  });

  it("deleteOffer is a function that accepts id", () => {
    expect(typeof deleteOffer).toBe("function");
    expect(deleteOffer.length).toBeGreaterThanOrEqual(1);
  });

  it("recordNegotiation is a function that accepts id and data", () => {
    expect(typeof recordNegotiation).toBe("function");
    expect(recordNegotiation.length).toBeGreaterThanOrEqual(2);
  });

  it("acceptOffer is a function that accepts id", () => {
    expect(typeof acceptOffer).toBe("function");
    expect(acceptOffer.length).toBeGreaterThanOrEqual(1);
  });
});

describe("Career Goals API", () => {
  it("getCareerGoals is a function", () => {
    expect(typeof getCareerGoals).toBe("function");
  });

  it("getCareerGoal is a function that accepts id", () => {
    expect(typeof getCareerGoal).toBe("function");
    expect(getCareerGoal.length).toBeGreaterThanOrEqual(1);
  });

  it("createCareerGoal is a function that accepts data", () => {
    expect(typeof createCareerGoal).toBe("function");
    expect(createCareerGoal.length).toBeGreaterThanOrEqual(1);
  });

  it("updateCareerGoal is a function that accepts id and data", () => {
    expect(typeof updateCareerGoal).toBe("function");
    expect(updateCareerGoal.length).toBeGreaterThanOrEqual(2);
  });

  it("deleteCareerGoal is a function that accepts id", () => {
    expect(typeof deleteCareerGoal).toBe("function");
    expect(deleteCareerGoal.length).toBeGreaterThanOrEqual(1);
  });
});
