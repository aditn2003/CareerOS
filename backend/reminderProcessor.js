import { createClient } from "@supabase/supabase-js";
import { sendInterviewReminder } from "./utils/schedulingHelpers.js";
import dotenv from "dotenv";

dotenv.config();



const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

async function processReminders() {
  try {
    console.log("🔄 Checking for interview reminders...");

    const now = new Date();
    
    // Calculate time windows
    const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const in2Hours = new Date(now.getTime() + 2 * 60 * 60 * 1000);
    const in24HoursMinus5Min = new Date(in24Hours.getTime() - 5 * 60 * 1000);
    const in2HoursMinus5Min = new Date(in2Hours.getTime() - 5 * 60 * 1000);

    // Find interviews needing 24h reminder
    const { data: interviews24h, error: error24h } = await supabase
      .from("interview_outcomes")
      .select("*")
      .eq("interview_status", "scheduled")
      .eq("reminder_24h_sent", false)
      .not("interview_date", "is", null)
      .not("interview_time", "is", null);

    if (error24h) {
      console.error("❌ Error fetching 24h reminders:", error24h);
    } else if (interviews24h) {
      for (const interview of interviews24h) {
        const interviewDateTime = new Date(`${interview.interview_date}T${interview.interview_time}`);
        
        // Check if interview is between 24h and 24h-5min from now
        if (interviewDateTime >= in24HoursMinus5Min && interviewDateTime <= in24Hours) {
          await send24hReminder(interview);
        }
      }
    }

    // Find interviews needing 2h reminder
    const { data: interviews2h, error: error2h } = await supabase
      .from("interview_outcomes")
      .select("*")
      .eq("interview_status", "scheduled")
      .eq("reminder_2h_sent", false)
      .not("interview_date", "is", null)
      .not("interview_time", "is", null);

    if (error2h) {
      console.error("❌ Error fetching 2h reminders:", error2h);
    } else if (interviews2h) {
      for (const interview of interviews2h) {
        const interviewDateTime = new Date(`${interview.interview_date}T${interview.interview_time}`);
        
        // Check if interview is between 2h and 2h-5min from now
        if (interviewDateTime >= in2HoursMinus5Min && interviewDateTime <= in2Hours) {
          await send2hReminder(interview);
        }
      }
    }

    // Mark past interviews as completed
    await markPastInterviewsCompleted();

    console.log("✅ Reminder check complete");
  } catch (err) {
    console.error("❌ Error in reminder processor:", err);
  }
}

async function send24hReminder(interview) {
  try {
    // Fetch user email separately
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("email")
      .eq("id", interview.user_id)
      .single();
    
    if (userError || !userData?.email) {
      console.warn(`⚠️ No email for user ${interview.user_id}`);
      return;
    }

    const userEmail = userData.email;
    console.log(`📧 Sending 24h reminder for interview ${interview.id} to ${userEmail}`);

    await sendInterviewReminder(interview, userEmail, '24h');

    // Mark as sent
    await supabase
      .from("interview_outcomes")
      .update({
        reminder_24h_sent: true,
        reminder_24h_sent_at: new Date().toISOString()
      })
      .eq("id", interview.id);

    console.log(`✅ 24h reminder sent for interview ${interview.id}`);
  } catch (err) {
    console.error(`❌ Error sending 24h reminder for interview ${interview.id}:`, err);
  }
}

async function send2hReminder(interview) {
  try {
    // Fetch user email separately
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("email")
      .eq("id", interview.user_id)
      .single();
    
    if (userError || !userData?.email) {
      console.warn(`⚠️ No email for user ${interview.user_id}`);
      return;
    }

    const userEmail = userData.email;
    console.log(`📧 Sending 2h reminder for interview ${interview.id} to ${userEmail}`);

    await sendInterviewReminder(interview, userEmail, '2h');

    // Mark as sent
    await supabase
      .from("interview_outcomes")
      .update({
        reminder_2h_sent: true,
        reminder_2h_sent_at: new Date().toISOString()
      })
      .eq("id", interview.id);

    console.log(`✅ 2h reminder sent for interview ${interview.id}`);
  } catch (err) {
    console.error(`❌ Error sending 2h reminder for interview ${interview.id}:`, err);
  }
}

async function markPastInterviewsCompleted() {
  try {
    const now = new Date().toISOString();

    const { error } = await supabase
      .from("interview_outcomes")
      .update({ interview_status: "completed" })
      .eq("interview_status", "scheduled")
      .lt("interview_date", now.split('T')[0]); // Past date

    if (error) {
      console.error("❌ Error marking past interviews:", error);
    }
  } catch (err) {
    console.error("❌ Error in markPastInterviewsCompleted:", err);
  }
}

// Run immediately then every 5 minutes
processReminders();
setInterval(processReminders, 5 * 60 * 1000);

console.log("🚀 Reminder processor started (checking every 5 minutes)");