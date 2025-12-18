import { simpleParser } from "mailparser";
import OpenAI from "openai";

/**
 * Parse email and extract job details
 * Supports: LinkedIn, Indeed, Glassdoor, and generic company sites
 */
export async function parseJobEmail(rawEmail, boundaryHint = null) {
  try {
    console.log("📧 Parsing email, length:", rawEmail.length);

    let emailToParse = rawEmail;

    // =====================================================================
    // Handle SendGrid Inbound Parse (multipart/form-data with fields)
    // =====================================================================
    // When NOT using "POST the raw, full MIME message", SendGrid posts
    // a multipart/form-data payload with fields like:
    // - subject
    // - from
    // - to
    // - text
    // - html
    //
    // In that case, simpleParser(rawEmail) can't find normal RFC822 headers,
    // so we need to reconstruct a synthetic email with standard headers.
    // =====================================================================
    // NOTE: By the time we see rawEmail here, Express has already stripped
    // the HTTP headers, so we won't see "Content-Type: multipart/form-data".
    // Instead we detect the multipart body by the form-data markers.
    if (
      typeof rawEmail === "string" &&
      rawEmail.includes("Content-Disposition: form-data;") &&
      (rawEmail.includes('name="email"') || rawEmail.includes('name="from"'))
    ) {
      console.log("📧 Detected SendGrid multipart/form-data payload. Extracting raw email / fields.");

      // Extract the boundary from the multipart payload or use hint
      let boundary = boundaryHint || "xYzZY"; // default fallback
      if (!boundaryHint) {
        const boundaryMatch = rawEmail.match(/boundary=([^\s;]+)/i);
        if (boundaryMatch) {
          boundary = boundaryMatch[1].replace(/["']/g, ""); // Remove quotes if present
        }
      }
      console.log("📧 Using boundary:", boundary);

      const extractField = (fieldName) => {
        try {
          // Find the field start
          const fieldStart = rawEmail.indexOf(`name="${fieldName}"`);
          if (fieldStart === -1) return "";
          
          // Find the double newline after the field name (start of value)
          let valueStart = rawEmail.indexOf("\n\n", fieldStart);
          if (valueStart === -1) {
            // Try single newline
            const singleNewline = rawEmail.indexOf("\n", fieldStart);
            if (singleNewline === -1) return "";
            valueStart = rawEmail.indexOf("\n", singleNewline + 1);
            if (valueStart === -1) return "";
            valueStart += 1;
          } else {
            valueStart += 2;
          }
          
          // Find the next boundary marker (--BOUNDARY) which marks the end of this field
          // Must look for the actual boundary, not just any "--"
          const boundaryMarker = `--${boundary}`;
          const nextBoundary = rawEmail.indexOf(`\n${boundaryMarker}`, valueStart);
          if (nextBoundary === -1) {
            // Last field - take everything to end
            return rawEmail.substring(valueStart).trim();
          }
          
          // Extract the value (between double newline and next boundary)
          return rawEmail.substring(valueStart, nextBoundary).trim();
        } catch (err) {
          console.warn(`⚠️ Failed to extract field "${fieldName}":`, err.message);
        }
        return "";
      };

      // 1) Preferred path: SendGrid often includes a full raw email in the "email" field
      const rawEmailField = extractField("email");
      // Also extract text/html fields directly - SendGrid provides these separately!
      const textField = extractField("text");
      const htmlField = extractField("html");

      if (rawEmailField) {
        console.log("📧 Using raw email from SendGrid 'email' field.");
        console.log("📧 Raw email field length:", rawEmailField.length);
        console.log("📧 Raw email field first 1000 chars:", rawEmailField.slice(0, 1000));
        console.log("📧 Raw email field LAST 2000 chars (where body should be):", rawEmailField.slice(-2000));
        console.log("📧 Also found text/html fields:", {
          hasText: !!textField,
          hasHtml: !!htmlField,
          textLength: textField?.length || 0,
          htmlLength: htmlField?.length || 0,
        });
        emailToParse = rawEmailField;
      } else {
        // 2) Fallback: build email metadata directly from individual fields
        const fromField = extractField("from");      // e.g. `"Name" <ddr@njit.edu>`
        const toField = extractField("to");          // e.g. `forward@jobs.atscareeros.com`
        const subjectField = extractField("subject");
        const textField = extractField("text");      // plain-text version
        const htmlField = extractField("html");      // html version (optional)

        console.log("📧 Extracted from SendGrid fields (no 'email' field):", {
          fromField,
          toField,
          subjectField,
          hasText: !!textField,
          hasHtml: !!htmlField,
        });

        // Also try envelope JSON for from/to if available
        let fromEmail = "";
        const envelopeField = extractField("envelope");
        if (envelopeField) {
          try {
            const env = JSON.parse(envelopeField);
            if (env.from) {
              fromEmail = env.from;
            }
          } catch (e) {
            console.warn("⚠️ Failed to parse envelope JSON:", e.message);
          }
        }

        if (!fromEmail && fromField) {
          // Try to extract email part from `"Name" <email@domain>`
          const match = fromField.match(/<([^>]+)>/);
          fromEmail = match ? match[1].trim() : fromField.trim().replace(/"/g, "");
        }

        const emailData = {
          from: fromField || fromEmail || "",
          fromEmail: fromEmail || "",
          subject: subjectField || "",
          textBody: textField || "",
          htmlBody: htmlField || "",
          date: new Date(),
        };

        console.log("📧 Built emailData from multipart fields:", emailData);

        const platform = detectPlatform(emailData);
        const jobDetails = extractJobDetails(emailData, platform);

        return {
          platform,
          ...jobDetails,
          emailFrom: emailData.fromEmail,
          rawEmail: emailData,
        };
      }
    }

    let parsed;
    try {
      parsed = await simpleParser(emailToParse);
      console.log(
        "📧 Parsed email - From:",
        parsed.from?.text,
        "Email:",
        parsed.from?.value?.[0]?.address
      );
      console.log("📧 Subject:", parsed.subject);
      console.log("📧 Parsed text length:", parsed.text?.length || 0);
      console.log("📧 Parsed html length:", typeof parsed.html === 'string' ? parsed.html.length : 0);
      console.log("📧 Parsed text preview:", typeof parsed.text === 'string' ? parsed.text.slice(0, 500) : "(empty)");
      if (parsed.html && typeof parsed.html === 'object') {
        console.log("📧 Parsed html is object, trying to stringify:", Object.keys(parsed.html));
        // Sometimes mailparser returns html as an object with text property
        parsed.html = parsed.html.text || String(parsed.html);
      }
      console.log("📧 Parsed html preview:", typeof parsed.html === 'string' ? parsed.html.slice(0, 500) : "(empty)");
    } catch (parseErr) {
      console.error("❌ simpleParser error:", parseErr.message);
      throw parseErr;
    }

    // Extract text/html from multipart fields if available (more reliable than parsing raw email)
    let extractedText = "";
    let extractedHtml = "";
    if (
      typeof rawEmail === "string" &&
      rawEmail.includes("Content-Disposition: form-data;")
    ) {
      const extractField = (fieldName) => {
        try {
          const regex = new RegExp(
            `name="${fieldName}"[\\s\\S]*?\\r?\\n\\r?\\n([\\s\\S]*?)\\r?\\n--`,
            "i"
          );
          const match = rawEmail.match(regex);
          if (match && match[1]) {
            return match[1].trim();
          }
        } catch (err) {
          // Ignore
        }
        return "";
      };
      extractedText = extractField("text");
      extractedHtml = extractField("html");
    }

    const emailData = {
      from: parsed.from?.text || "",
      fromEmail: parsed.from?.value?.[0]?.address || "",
      subject: parsed.subject || "",
      // Prefer extracted fields from SendGrid, fallback to parsed
      textBody: extractedText || parsed.text || "",
      htmlBody: extractedHtml || parsed.html || "",
      date: parsed.date || new Date(),
    };

    console.log("📧 Email body content:", {
      textLength: emailData.textBody.length,
      htmlLength: emailData.htmlBody.length,
      textPreview: emailData.textBody.slice(0, 200),
    });

    // If forwarded email, the "From" field might be the user's email
    // But we also need to check headers for the original sender
    // For forwarded emails, the "From" is usually the forwarder's email
    if (!emailData.fromEmail && parsed.headers) {
      // Try to get from headers
      const fromHeader = parsed.headers.get("from");
      if (fromHeader && fromHeader.value && fromHeader.value[0]) {
        emailData.fromEmail = fromHeader.value[0].address;
        emailData.from = fromHeader.value[0].name || fromHeader.value[0].address;
      }
    }

    console.log("📧 Final emailFrom:", emailData.fromEmail);

    // Detect platform (LinkedIn, Indeed, Glassdoor)
    let platform = detectPlatform(emailData);

    // Extract job details via simple heuristics
    let jobDetails = extractJobDetails(emailData, platform);

    // -------------------------------------------------------------------
    // 🔁 AI fallback when we couldn't confidently extract details
    // -------------------------------------------------------------------
    const needsAIFallback =
      (!jobDetails.title || jobDetails.title === "Unknown Position") ||
      (!jobDetails.company || jobDetails.company === "Unknown Company") ||
      platform === "company_site";

    if (needsAIFallback) {
      try {
        const aiResult = await extractJobWithAI(emailData, emailToParse);
        if (aiResult) {
          console.log("🤖 AI-extracted job details:", aiResult);
          jobDetails = {
            title: aiResult.title || jobDetails.title,
            company: aiResult.company || jobDetails.company,
            status: jobDetails.status || "Applied",
            location: aiResult.location || jobDetails.location || null,
          };
          if (aiResult.platform) {
            platform = aiResult.platform;
          }
          // Store location in emailData for reference
          if (aiResult.location && !emailData.location) {
            emailData.location = aiResult.location;
          }
        }
      } catch (aiErr) {
        console.warn("⚠️ AI extraction failed:", aiErr.message);
      }
    }

    // Include location from emailData if it exists and wasn't already in jobDetails
    const location = jobDetails.location || emailData.location || null;

    return {
      platform,
      ...jobDetails,
      location, // Ensure location is included in the return
      emailFrom: emailData.fromEmail, // User's email address
      rawEmail: emailData,
    };
  } catch (error) {
    throw new Error(`Failed to parse email: ${error.message}`);
  }
}

// -------------------------------------------------------------------
// OpenAI helper for richer job extraction from email content
// -------------------------------------------------------------------
let openaiClient = null;

function getOpenAIClient() {
  if (!process.env.OPENAI_API_KEY) {
    console.warn("⚠️ OPENAI_API_KEY not set. Skipping AI extraction.");
    return null;
  }
  if (!openaiClient) {
    openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return openaiClient;
}

async function extractJobWithAI(emailData, rawContent) {
  const openai = getOpenAIClient();
  if (!openai) return null;

  const bodyText =
    (emailData.textBody && emailData.textBody.trim()) ||
    (emailData.htmlBody && cleanHtml(emailData.htmlBody).slice(0, 8000)) ||
    (typeof rawContent === "string" ? rawContent.slice(0, 8000) : "");

  if (!bodyText && !emailData.subject) {
    return null;
  }

  const prompt = `
You are an assistant that extracts job application details from email text.

Return ONLY valid JSON with keys:
{
  "platform": "linkedin" | "indeed" | "glassdoor" | "company_site",
  "title": "job title",
  "company": "company name",
  "location": "location string"
}

If you are unsure about a field, use an empty string for that field.

Email subject:
${emailData.subject || "(none)"}

Email body:
${bodyText}
`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: "You extract structured job info from emails." },
      { role: "user", content: prompt },
    ],
    response_format: { type: "json_object" },
    temperature: 0.1,
  });

  const content = response.choices?.[0]?.message?.content;
  if (!content) return null;

  try {
    const parsed = JSON.parse(content);
    // Normalize platform
    if (parsed.platform) {
      const p = String(parsed.platform).toLowerCase();
      if (["linkedin", "indeed", "glassdoor", "company_site"].includes(p)) {
        parsed.platform = p;
      } else {
        parsed.platform = "company_site";
      }
    }
    return parsed;
  } catch (err) {
    console.warn("⚠️ Failed to parse AI JSON:", err.message, "raw:", content);
    return null;
  }
}

function detectPlatform(emailData) {
  const from = emailData.from.toLowerCase();
  const subject = emailData.subject.toLowerCase();
  
  if (from.includes('linkedin.com') || from.includes('linkedin')) {
    return 'linkedin';
  }
  if (from.includes('indeed.com') || from.includes('indeed')) {
    return 'indeed';
  }
  if (from.includes('glassdoor.com') || from.includes('glassdoor')) {
    return 'glassdoor';
  }
  
  // Check subject patterns
  if (subject.includes('linkedin')) return 'linkedin';
  if (subject.includes('indeed')) return 'indeed';
  if (subject.includes('glassdoor')) return 'glassdoor';
  
  return 'company_site'; // Default fallback
}

function extractJobDetails(emailData, platform) {
  const { subject, textBody, htmlBody } = emailData;
  
  switch (platform) {
    case 'linkedin':
      return extractLinkedInDetails(subject, textBody, htmlBody);
    case 'indeed':
      return extractIndeedDetails(subject, textBody);
    case 'glassdoor':
      return extractGlassdoorDetails(subject, textBody);
    default:
      return extractGenericDetails(subject, textBody);
  }
}

function extractLinkedInDetails(subject, text, html) {
  // Pattern: "You applied for [Job Title] at [Company]"
  const pattern = /You applied for (.+?) at (.+?)(?:\.|$)/i;
  const match = subject.match(pattern) || text.match(pattern);
  
  if (match) {
    return {
      title: match[1].trim(),
      company: match[2].trim(),
      status: 'Applied'
    };
  }
  
  // Try HTML parsing if available
  if (html) {
    const titleMatch = html.match(/<strong[^>]*>(.+?)<\/strong>/i);
    const companyMatch = html.match(/at <strong[^>]*>(.+?)<\/strong>/i);
    
    if (titleMatch && companyMatch) {
      return {
        title: cleanHtml(titleMatch[1]),
        company: cleanHtml(companyMatch[1]),
        status: 'Applied'
      };
    }
  }
  
  // Fallback
  return extractGenericDetails(subject, text);
}

function extractIndeedDetails(subject, text) {
  // Pattern: "Your application to [Company]"
  const companyMatch = subject.match(/Your application to (.+?)(?:\.|$)/i) ||
                       text.match(/Your application to (.+?)(?:\.|$)/i);
  
  // Try to find job title in body
  const titlePatterns = [
    /position[:\s]+(.+?)(?:\n|$)/i,
    /role[:\s]+(.+?)(?:\n|$)/i,
    /job[:\s]+(.+?)(?:\n|$)/i,
    /title[:\s]+(.+?)(?:\n|$)/i
  ];
  
  let title = null;
  for (const pattern of titlePatterns) {
    const match = text.match(pattern);
    if (match) {
      title = match[1].trim();
      break;
    }
  }
  
  return {
    title: title || 'Unknown Position',
    company: companyMatch ? companyMatch[1].trim() : 'Unknown Company',
    status: 'Applied'
  };
}

function extractGlassdoorDetails(subject, text) {
  const companyMatch = subject.match(/application.*?to (.+?)(?:\.|$)/i) ||
                       text.match(/application.*?to (.+?)(?:\.|$)/i);
  
  return {
    title: extractGenericDetails(subject, text).title || 'Unknown Position',
    company: companyMatch ? companyMatch[1].trim() : 'Unknown Company',
    status: 'Applied'
  };
}

function extractGenericDetails(subject, text) {
  let title = 'Unknown Position';
  let company = 'Unknown Company';
  
  // Try to extract company from "at [Company]"
  const atMatch = subject.match(/at (.+?)(?:\.|$)/i) || text.match(/at (.+?)(?:\.|$)/i);
  if (atMatch) company = atMatch[1].trim();
  
  // Try to extract title before "at"
  const titleMatch = subject.match(/(.+?) at /i);
  if (titleMatch) title = titleMatch[1].trim();
  
  // If no "at" pattern, try other patterns
  if (title === 'Unknown Position' && subject) {
    // Try patterns like "Application for [Title]"
    const appMatch = subject.match(/(?:application|applied).*?for (.+?)(?:\.|$)/i);
    if (appMatch) title = appMatch[1].trim();
  }
  
  return { title, company, status: 'Applied' };
}

function cleanHtml(html) {
  return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
}
