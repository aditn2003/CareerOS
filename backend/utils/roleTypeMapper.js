/**
 * Maps job titles to specific role type categories
 * More granular than before, but still categories (not raw titles)
 */
export function getRoleTypeFromTitle(title = "") {
  if (!title || title === null || title === undefined) return "Uncategorized";
  const t = title.toLowerCase().trim();

  // Return empty titles as "Uncategorized"
  if (!t) return "Uncategorized";

  // --- Software Engineering ---
  if (t.includes("software engineer") || t.includes("software engineering")) {
    return "Software Engineering";
  }
  if (t.includes("software developer") || t.includes("software dev")) {
    return "Software Development";
  }
  if (t.includes("full stack") || t.includes("fullstack")) {
    return "Full Stack Development";
  }
  if (t.includes("frontend") || t.includes("front-end") || t.includes("front end")) {
    return "Frontend Development";
  }
  if (t.includes("backend") || t.includes("back-end") || t.includes("back end")) {
    return "Backend Development";
  }
  if (t.includes("java") && (t.includes("developer") || t.includes("engineer") || t.includes("lead"))) {
    return "Java Development";
  }
  if (t === "developer" || t === "dev") {
    return "Software Development";
  }

  // --- Data & Analytics ---
  if (t.includes("data scientist")) {
    return "Data Science";
  }
  if (t.includes("data engineer")) {
    return "Data Engineering";
  }
  if (t.includes("data analyst")) {
    return "Data Analysis";
  }
  if (t.includes("machine learning") || t.includes("ml engineer") || t.includes("ml ")) {
    return "Machine Learning";
  }
  if (t.includes("ai ") || t.includes("artificial intelligence")) {
    return "AI/ML";
  }
  if (t.includes("business analyst")) {
    return "Business Analysis";
  }
  if (t.includes("analyst") && !t.includes("soc") && !t.includes("security")) {
    return "Data Analysis";
  }

  // --- Cybersecurity ---
  if (t.includes("soc analyst") || t.includes("security analyst")) {
    return "Security Operations";
  }
  if (t.includes("security engineer") || t.includes("cybersecurity engineer")) {
    return "Security Engineering";
  }
  if (t.includes("penetration") || t.includes("pentest") || t.includes("ethical hack")) {
    return "Penetration Testing";
  }
  if (t.includes("security") || t.includes("cyber") || t.includes("infosec")) {
    return "Cybersecurity";
  }

  // --- DevOps & Cloud ---
  if (t.includes("devops")) {
    return "DevOps";
  }
  if (t.includes("sre") || t.includes("site reliability")) {
    return "Site Reliability";
  }
  if (t.includes("cloud") || t.includes("aws") || t.includes("azure") || t.includes("gcp")) {
    return "Cloud Engineering";
  }
  if (t.includes("infrastructure") || t.includes("platform")) {
    return "Infrastructure";
  }

  // --- Quality Assurance ---
  if (t.includes("qa") || t.includes("quality assurance") || t.includes("test engineer") || t.includes("sdet")) {
    return "Quality Assurance";
  }

  // --- Mobile Development ---
  if (t.includes("mobile") || t.includes("ios") || t.includes("android") || t.includes("flutter") || t.includes("react native")) {
    return "Mobile Development";
  }

  // --- Management ---
  if (t.includes("project manager") || t.includes("program manager")) {
    return "Project Management";
  }
  if (t.includes("product manager") || t.includes("product owner")) {
    return "Product Management";
  }
  if (t.includes("engineering manager") || t.includes("tech lead") || t.includes("team lead") || t.includes("lead engineer")) {
    return "Engineering Leadership";
  }
  if (t.includes("director") || t.includes("vp ") || t.includes("vice president") || t.includes("head of")) {
    return "Executive/Director";
  }
  if (t.includes("manager") && !t.includes("project") && !t.includes("product")) {
    return "Management";
  }

  // --- Design ---
  if (t.includes("ux") || t.includes("ui") || t.includes("user experience") || t.includes("user interface")) {
    return "UX/UI Design";
  }
  if (t.includes("design")) {
    return "Design";
  }

  // --- Support & IT ---
  if (t.includes("support") || t.includes("help desk") || t.includes("technical support")) {
    return "Technical Support";
  }
  if (t.includes("it ") || t.includes("information technology") || t.includes("system admin") || t.includes("network")) {
    return "IT/Systems";
  }

  // --- Internships ---
  if (t.includes("intern")) {
    return "Internship";
  }

  // --- General Engineering ---
  if (t.includes("engineer")) {
    return "Engineering";
  }

  // --- Sales & Marketing ---
  if (t.includes("sales") || t.includes("account executive") || t.includes("business development")) {
    return "Sales";
  }
  if (t.includes("marketing") || t.includes("growth")) {
    return "Marketing";
  }

  // --- Healthcare ---
  if (t.includes("doctor") || t.includes("physician") || t.includes("nurse") || t.includes("medical") || t.includes("health")) {
    return "Healthcare";
  }

  // --- Retail & Service ---
  if (t.includes("crew") || t.includes("cashier") || t.includes("retail") || t.includes("store") || t.includes("customer service")) {
    return "Retail/Service";
  }

  // --- General Labor ---
  if (t.includes("worker") || t.includes("technician") || t.includes("operator") || t.includes("associate")) {
    return "General/Labor";
  }

  // --- Consulting ---
  if (t.includes("consultant") || t.includes("consulting")) {
    return "Consulting";
  }

  // --- Finance ---
  if (t.includes("finance") || t.includes("accountant") || t.includes("financial")) {
    return "Finance";
  }

  // --- Research ---
  if (t.includes("research") || t.includes("scientist")) {
    return "Research";
  }

  // Default - Other
  return "Other";
}

/**
 * Get a broad category for high-level analysis
 */
export function getRoleCategoryFromTitle(title = "") {
  const roleType = getRoleTypeFromTitle(title);
  
  // Group into broad categories
  const techRoles = ["Software Engineering", "Software Development", "Full Stack Development", 
    "Frontend Development", "Backend Development", "Java Development", "Mobile Development",
    "Data Science", "Data Engineering", "Data Analysis", "Machine Learning", "AI/ML",
    "Security Operations", "Security Engineering", "Penetration Testing", "Cybersecurity",
    "DevOps", "Site Reliability", "Cloud Engineering", "Infrastructure",
    "Quality Assurance", "Engineering", "IT/Systems"];
  
  const managementRoles = ["Project Management", "Product Management", "Engineering Leadership", 
    "Executive/Director", "Management"];
  
  if (techRoles.includes(roleType)) return "Technology";
  if (managementRoles.includes(roleType)) return "Management";
  if (roleType === "Internship") return "Internship";
  
  return "Other";
}
