/**
 * Database Seeding Utilities
 * Provides functions to seed test data for various entities
 */

import { queryTestDb } from './db.js';
import { createTestUser } from './auth.js';

/**
 * Seeds a user with a complete profile
 * @param {Object} userData - Optional user data
 * @returns {Promise<Object>} User object with profile data
 */
export async function seedUserWithProfile(userData = {}) {
  const user = await createTestUser(userData);
  
  await queryTestDb(
    `INSERT INTO profiles (user_id, full_name, email, phone, location, title, bio, industry, experience)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    [
      user.id,
      userData.full_name || `${user.first_name} ${user.last_name}`,
      user.email,
      userData.phone || '+1234567890',
      userData.location || 'San Francisco, CA',
      userData.title || 'Software Engineer',
      userData.bio || 'Test bio',
      userData.industry || 'Technology',
      userData.experience || 'Mid-level',
    ]
  );

  return user;
}

/**
 * Seeds education records for a user
 * @param {number} userId - User ID
 * @param {number} count - Number of education records to create
 * @returns {Promise<Array>} Array of education records
 */
export async function seedEducation(userId, count = 1) {
  const educations = [];
  
  for (let i = 0; i < count; i++) {
    const result = await queryTestDb(
      `INSERT INTO education (user_id, institution, degree_type, field_of_study, graduation_date, currently_enrolled, education_level, gpa)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        userId,
        `University ${i + 1}`,
        'Bachelor',
        'Computer Science',
        new Date(2020 + i, 5, 1),
        i === count - 1, // Last one is currently enrolled
        'Bachelor',
        3.5 + (i * 0.1),
      ]
    );
    educations.push(result.rows[0]);
  }
  
  return educations;
}

/**
 * Seeds employment records for a user
 * @param {number} userId - User ID
 * @param {number} count - Number of employment records to create
 * @returns {Promise<Array>} Array of employment records
 */
export async function seedEmployment(userId, count = 2) {
  const employments = [];
  
  for (let i = 0; i < count; i++) {
    const isCurrent = i === 0; // First one is current
    const result = await queryTestDb(
      `INSERT INTO employment (user_id, title, company, location, start_date, end_date, current, description)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        userId,
        `Software Engineer ${i === 0 ? 'II' : 'I'}`,
        `Company ${i + 1}`,
        'San Francisco, CA',
        new Date(2022 - i, 0, 1),
        isCurrent ? null : new Date(2023 - i, 11, 31),
        isCurrent,
        `Worked on ${i === 0 ? 'backend' : 'frontend'} systems`,
      ]
    );
    employments.push(result.rows[0]);
  }
  
  return employments;
}

/**
 * Seeds skills for a user
 * @param {number} userId - User ID
 * @param {Array} skills - Array of skill objects or skill names
 * @returns {Promise<Array>} Array of skill records
 */
export async function seedSkills(userId, skills = null) {
  const defaultSkills = [
    { name: 'JavaScript', category: 'Technical', proficiency: 'Advanced' },
    { name: 'Python', category: 'Technical', proficiency: 'Intermediate' },
    { name: 'React', category: 'Technical', proficiency: 'Advanced' },
    { name: 'Communication', category: 'Soft Skills', proficiency: 'Expert' },
  ];

  const skillsToSeed = skills || defaultSkills;
  const seededSkills = [];

  for (const skill of skillsToSeed) {
    const skillData = typeof skill === 'string' 
      ? { name: skill, category: 'Technical', proficiency: 'Intermediate' }
      : skill;

    // Try insert first, if unique constraint violation, update instead
    try {
      const result = await queryTestDb(
        `INSERT INTO skills (user_id, name, category, proficiency)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [userId, skillData.name, skillData.category, skillData.proficiency]
      );
      seededSkills.push(result.rows[0]);
    } catch (err) {
      // If unique constraint exists and is violated, try to update instead
      if (err.code === '23505') {
        const result = await queryTestDb(
          `UPDATE skills SET proficiency = $3, category = $4
           WHERE user_id = $1 AND name = $2
           RETURNING *`,
          [userId, skillData.name, skillData.proficiency, skillData.category]
        );
        if (result.rows.length > 0) {
          seededSkills.push(result.rows[0]);
        }
      } else {
        throw err;
      }
    }
  }

  return seededSkills;
}

/**
 * Seeds projects for a user
 * @param {number} userId - User ID
 * @param {number} count - Number of projects to create
 * @returns {Promise<Array>} Array of project records
 */
export async function seedProjects(userId, count = 2) {
  const projects = [];
  
  for (let i = 0; i < count; i++) {
    const result = await queryTestDb(
      `INSERT INTO projects (user_id, name, description, role, start_date, end_date, technologies, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        userId,
        `Project ${i + 1}`,
        `Description for project ${i + 1}`,
        'Developer',
        new Date(2023 - i, 0, 1),
        i === 0 ? null : new Date(2023 - i, 11, 31),
        ['JavaScript', 'React', 'Node.js'],
        i === 0 ? 'Ongoing' : 'Completed',
      ]
    );
    projects.push(result.rows[0]);
  }
  
  return projects;
}

/**
 * Seeds certifications for a user
 * @param {number} userId - User ID
 * @param {number} count - Number of certifications to create
 * @returns {Promise<Array>} Array of certification records
 */
export async function seedCertifications(userId, count = 1) {
  const certifications = [];
  
  for (let i = 0; i < count; i++) {
    const result = await queryTestDb(
      `INSERT INTO certifications (user_id, name, organization, category, date_earned, expiration_date, does_not_expire)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        userId,
        `Certification ${i + 1}`,
        'Test Organization',
        'Technology',
        new Date(2023, 0, 1),
        new Date(2025, 0, 1),
        false,
      ]
    );
    certifications.push(result.rows[0]);
  }
  
  return certifications;
}

/**
 * Seeds jobs for a user
 * @param {number} userId - User ID
 * @param {number} count - Number of jobs to create
 * @param {Object} defaults - Default job data
 * @returns {Promise<Array>} Array of job records
 */
export async function seedJobs(userId, count = 3, defaults = {}) {
  const jobs = [];
  const statuses = ['Interested', 'Applied', 'Interview', 'Offer', 'Rejected'];
  
  for (let i = 0; i < count; i++) {
    // Use base schema columns that definitely exist
    const result = await queryTestDb(
      `INSERT INTO jobs (
        user_id, title, company, location, salary_min, salary_max,
        url, deadline, description, industry, type, status, created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())
      RETURNING *`,
      [
        userId,
        defaults.title || `Software Engineer ${i + 1}`,
        defaults.company || `Company ${i + 1}`,
        defaults.location || 'San Francisco, CA',
        defaults.salary_min || 100000 + (i * 10000),
        defaults.salary_max || 150000 + (i * 10000),
        defaults.url || `https://example.com/job/${i + 1}`,
        defaults.deadline || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        defaults.description || `Job description ${i + 1}`,
        defaults.industry || null,
        defaults.type || null,
        defaults.status || statuses[i % statuses.length],
      ]
    );
    
    const job = result.rows[0];
    
    // Optionally update columns that may not exist in all schemas
    const optionalUpdates = [];
    const updateParams = [];
    let paramIndex = 1;
    
    if (defaults.location_type !== undefined) {
      optionalUpdates.push(`location_type = $${paramIndex++}`);
      updateParams.push(defaults.location_type);
    }
    if (defaults.role_level !== undefined) {
      optionalUpdates.push(`role_level = $${paramIndex++}`);
      updateParams.push(defaults.role_level);
    }
    if (defaults.applicationDate !== undefined) {
      optionalUpdates.push(`"applicationDate" = $${paramIndex++}`);
      updateParams.push(defaults.applicationDate);
    }
    if (defaults.required_skills !== undefined) {
      optionalUpdates.push(`"required_skills" = $${paramIndex++}`);
      updateParams.push(Array.isArray(defaults.required_skills) ? defaults.required_skills : []);
    }
    
    if (optionalUpdates.length > 0) {
      try {
        await queryTestDb(
          `UPDATE jobs SET ${optionalUpdates.join(', ')} WHERE id = $${paramIndex}`,
          [...updateParams, job.id]
        );
        // Re-fetch to get updated values
        const updated = await queryTestDb('SELECT * FROM jobs WHERE id = $1', [job.id]);
        if (updated.rows.length > 0) {
          jobs.push(updated.rows[0]);
          continue;
        }
      } catch (err) {
        // Column might not exist, that's okay - use the base job
      }
    }
    
    jobs.push(job);
  }
  
  return jobs;
}

/**
 * Seeds a resume for a user
 * @param {number} userId - User ID
 * @param {Object} resumeData - Optional resume data
 * @returns {Promise<Object>} Resume record
 */
export async function seedResume(userId, resumeData = {}) {
  // Use title instead of name, and sections instead of content
  const result = await queryTestDb(
    `INSERT INTO resumes (user_id, title, sections, template_name, format)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [
      userId,
      resumeData.title || resumeData.name || 'Test Resume',
      resumeData.sections || resumeData.content || JSON.stringify({ sections: [] }),
      resumeData.template_name || 'professional',
      resumeData.format || 'pdf',
    ]
  );
  
  return result.rows[0];
}

/**
 * Seeds a complete user profile with all related data
 * @param {Object} userData - Optional user data
 * @returns {Promise<Object>} Complete user object with all seeded data
 */
export async function seedCompleteUser(userData = {}) {
  const user = await seedUserWithProfile(userData);
  
  const [educations, employments, skills, projects, certifications, jobs, resume] = await Promise.all([
    seedEducation(user.id, 2),
    seedEmployment(user.id, 2),
    seedSkills(user.id),
    seedProjects(user.id, 2),
    seedCertifications(user.id, 1),
    seedJobs(user.id, 3),
    seedResume(user.id),
  ]);

  return {
    ...user,
    profile: { user_id: user.id },
    educations,
    employments,
    skills,
    projects,
    certifications,
    jobs,
    resume,
  };
}

export default {
  seedUserWithProfile,
  seedEducation,
  seedEmployment,
  seedSkills,
  seedProjects,
  seedCertifications,
  seedJobs,
  seedResume,
  seedCompleteUser,
};

