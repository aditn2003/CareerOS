/**
 * Test Data Cleanup Utilities
 * Provides functions to clean up specific test data
 */

import { queryTestDb } from './db.js';

/**
 * Deletes a user and all related data
 * @param {number} userId - User ID to delete
 */
export async function deleteUser(userId) {
  // Delete in order of dependencies
  const tables = [
    'application_materials_history',
    'application_materials',
    'resume_versions',
    'resumes',
    'cover_letters',
    'uploaded_cover_letters',
    'job_application_materials',
    'match_history',
    'job_descriptions',
    'jobs',
    'networking_contacts',
    'referrals',
    'informational_interviews',
    'mentor_feedback',
    'mentors',
    'industry_contacts',
    'networking_events',
    'event_contacts',
    'contacts',
    'certifications',
    'projects',
    'employment',
    'education',
    'skills',
    'profiles',
    'user_goals',
    'career_goals',
    'section_presets',
    'resume_presets',
    'cover_letter_templates',
    'compensation_history',
    'compensation_analytics',
    'timing_optimizer_ab_tests',
    'job_search_activities',
    'practiced_questions',
    'references',
    'tasks',
    'team_members',
    'users',
  ];

  for (const table of tables) {
    try {
      await queryTestDb(`DELETE FROM ${table} WHERE user_id = $1`, [userId]);
    } catch (error) {
      // Ignore errors for tables that don't have user_id or don't exist
      if (!error.message.includes('does not exist') && !error.message.includes('column "user_id"')) {
        console.warn(`Warning: Could not delete from ${table}:`, error.message);
      }
    }
  }
}

/**
 * Deletes jobs for a user
 * @param {number} userId - User ID
 */
export async function deleteUserJobs(userId) {
  await queryTestDb('DELETE FROM jobs WHERE user_id = $1', [userId]);
}

/**
 * Deletes resumes for a user
 * @param {number} userId - User ID
 */
export async function deleteUserResumes(userId) {
  await queryTestDb('DELETE FROM resumes WHERE user_id = $1', [userId]);
}

/**
 * Deletes profile for a user
 * @param {number} userId - User ID
 */
export async function deleteUserProfile(userId) {
  await queryTestDb('DELETE FROM profiles WHERE user_id = $1', [userId]);
}

/**
 * Deletes education records for a user
 * @param {number} userId - User ID
 */
export async function deleteUserEducation(userId) {
  await queryTestDb('DELETE FROM education WHERE user_id = $1', [userId]);
}

/**
 * Deletes employment records for a user
 * @param {number} userId - User ID
 */
export async function deleteUserEmployment(userId) {
  await queryTestDb('DELETE FROM employment WHERE user_id = $1', [userId]);
}

/**
 * Deletes skills for a user
 * @param {number} userId - User ID
 */
export async function deleteUserSkills(userId) {
  await queryTestDb('DELETE FROM skills WHERE user_id = $1', [userId]);
}

/**
 * Deletes projects for a user
 * @param {number} userId - User ID
 */
export async function deleteUserProjects(userId) {
  await queryTestDb('DELETE FROM projects WHERE user_id = $1', [userId]);
}

/**
 * Deletes certifications for a user
 * @param {number} userId - User ID
 */
export async function deleteUserCertifications(userId) {
  await queryTestDb('DELETE FROM certifications WHERE user_id = $1', [userId]);
}

/**
 * Deletes a specific record by ID from a table
 * @param {string} table - Table name
 * @param {number} id - Record ID
 */
export async function deleteById(table, id) {
  await queryTestDb(`DELETE FROM ${table} WHERE id = $1`, [id]);
}

/**
 * Deletes records matching a condition
 * @param {string} table - Table name
 * @param {string} condition - WHERE condition (without WHERE keyword)
 * @param {Array} params - Query parameters
 */
export async function deleteWhere(table, condition, params = []) {
  await queryTestDb(`DELETE FROM ${table} WHERE ${condition}`, params);
}

/**
 * Truncates a table (faster than DELETE for large datasets)
 * @param {string} table - Table name
 */
export async function truncateTable(table) {
  try {
    await queryTestDb(`TRUNCATE TABLE ${table} CASCADE`);
  } catch (error) {
    if (!error.message.includes('does not exist')) {
      throw error;
    }
  }
}

/**
 * Truncates multiple tables
 * @param {Array<string>} tables - Array of table names
 */
export async function truncateTables(tables) {
  for (const table of tables) {
    await truncateTable(table);
  }
}

export default {
  deleteUser,
  deleteUserJobs,
  deleteUserResumes,
  deleteUserProfile,
  deleteUserEducation,
  deleteUserEmployment,
  deleteUserSkills,
  deleteUserProjects,
  deleteUserCertifications,
  deleteById,
  deleteWhere,
  truncateTable,
  truncateTables,
};

