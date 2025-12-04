import { createClient } from "@supabase/supabase-js";

/**
 * Reminder Scheduler - Generates periodic check-in reminders
 * This can be called by:
 * 1. A cron job (e.g., node-cron, agenda, bull queue)
 * 2. A scheduled function (e.g., AWS Lambda, Cloud Functions)
 * 3. Manually via API endpoint
 */

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

/**
 * Generate periodic reminders for all active recurring check-ins
 * Should be called once per day (e.g., at midnight or 8 AM)
 */
export async function generatePeriodicReminders() {
  try {
    console.log("🔔 Starting periodic reminder generation...");
    const today = new Date().toISOString().split('T')[0];

    // Get all users with active recurring check-ins due today
    const { data: dueCheckIns, error: fetchError } = await supabase
      .from("recurring_check_ins")
      .select("*")
      .eq("is_active", true)
      .lte("next_reminder_date", today);

    if (fetchError) {
      console.error("❌ Error fetching due check-ins:", fetchError);
      return { success: false, error: fetchError.message };
    }

    if (!dueCheckIns || dueCheckIns.length === 0) {
      console.log("✅ No due check-ins found");
      return { success: true, reminders_generated: 0 };
    }

    console.log(`📋 Found ${dueCheckIns.length} due check-ins`);

    let reminders_created = 0;
    let errors = [];

    // Create reminders for each due check-in
    for (const checkIn of dueCheckIns) {
      try {
        // Create the reminder
        const { data: reminder, error: createError } = await supabase
          .from("relationship_reminders")
          .insert([{
            user_id: checkIn.user_id,
            contact_name: checkIn.contact_name,
            contact_company: checkIn.contact_company,
            reminder_type: "check_in",
            reminder_date: today,
            custom_message: checkIn.custom_message || 
              `Periodic check-in reminder: Reach out to ${checkIn.contact_name}${
                checkIn.contact_company ? ` at ${checkIn.contact_company}` : ''
              }`
          }])
          .select();

        if (createError) {
          errors.push(`Failed to create reminder for ${checkIn.contact_name}: ${createError.message}`);
          continue;
        }

        reminders_created++;
        console.log(`✅ Created reminder for ${checkIn.contact_name}`);

        // Calculate and update next reminder date
        const nextDate = new Date();
        nextDate.setDate(nextDate.getDate() + checkIn.frequency_days);

        const { error: updateError } = await supabase
          .from("recurring_check_ins")
          .update({
            last_reminder_date: today,
            next_reminder_date: nextDate.toISOString().split('T')[0],
            updated_at: new Date().toISOString()
          })
          .eq("id", checkIn.id);

        if (updateError) {
          console.error(`⚠️ Failed to update next date for ${checkIn.contact_name}:`, updateError);
        }

      } catch (err) {
        errors.push(`Error processing ${checkIn.contact_name}: ${err.message}`);
      }
    }

    console.log(`\n✅ Periodic reminder generation complete`);
    console.log(`   Created: ${reminders_created} reminders`);
    if (errors.length > 0) {
      console.log(`   Errors: ${errors.length}`);
      errors.forEach(e => console.log(`   - ${e}`));
    }

    return {
      success: true,
      reminders_generated: reminders_created,
      errors: errors.length > 0 ? errors : null,
      timestamp: new Date().toISOString()
    };

  } catch (err) {
    console.error("❌ Fatal error in generatePeriodicReminders:", err);
    return { success: false, error: err.message };
  }
}

/**
 * Get statistics on recurring check-ins
 * Shows summary of scheduled reminders by frequency and priority
 */
export async function getRecurringCheckInStats(userId) {
  try {
    const { data: checkIns, error } = await supabase
      .from("recurring_check_ins")
      .select("*")
      .eq("user_id", userId)
      .eq("is_active", true);

    if (error) throw error;

    const stats = {
      total_active: checkIns.length,
      by_frequency: {},
      by_priority: {},
      upcoming_this_week: 0,
      upcoming_this_month: 0
    };

    const today = new Date();
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    const nextMonth = new Date();
    nextMonth.setDate(nextMonth.getDate() + 30);

    checkIns.forEach(checkIn => {
      // Count by frequency
      stats.by_frequency[checkIn.frequency] = (stats.by_frequency[checkIn.frequency] || 0) + 1;

      // Count by priority
      stats.by_priority[checkIn.priority] = (stats.by_priority[checkIn.priority] || 0) + 1;

      // Count upcoming
      const nextDate = new Date(checkIn.next_reminder_date);
      if (nextDate <= nextWeek) stats.upcoming_this_week++;
      if (nextDate <= nextMonth) stats.upcoming_this_month++;
    });

    return stats;

  } catch (err) {
    console.error("❌ Error getting recurring check-in stats:", err);
    return null;
  }
}

/**
 * Update recurring check-in schedule
 * Allows changing frequency, priority, or message
 */
export async function updateRecurringCheckIn(id, userId, updates) {
  try {
    const updateData = {
      ...updates,
      updated_at: new Date().toISOString()
    };

    // If frequency is being updated, calculate new next_reminder_date
    if (updates.frequency) {
      const frequencyMap = {
        weekly: 7,
        biweekly: 14,
        monthly: 30,
        quarterly: 90
      };
      const frequency_days = frequencyMap[updates.frequency] || 30;
      updateData.frequency_days = frequency_days;

      const nextDate = new Date();
      nextDate.setDate(nextDate.getDate() + frequency_days);
      updateData.next_reminder_date = nextDate.toISOString().split('T')[0];
    }

    const { data, error } = await supabase
      .from("recurring_check_ins")
      .update(updateData)
      .eq("id", id)
      .eq("user_id", userId)
      .select();

    if (error) throw error;

    return { success: true, data: data[0] };

  } catch (err) {
    console.error("❌ Error updating recurring check-in:", err);
    return { success: false, error: err.message };
  }
}

export default {
  generatePeriodicReminders,
  getRecurringCheckInStats,
  updateRecurringCheckIn
};
