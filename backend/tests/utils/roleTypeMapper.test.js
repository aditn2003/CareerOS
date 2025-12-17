/**
 * Role Type Mapper Tests
 * Tests utils/roleTypeMapper.js
 * Target: 90%+ coverage
 */

import { describe, it, expect } from 'vitest';
import { getRoleTypeFromTitle, getRoleCategoryFromTitle } from '../../utils/roleTypeMapper.js';

describe('Role Type Mapper', () => {
  describe('getRoleTypeFromTitle', () => {
    // Empty/undefined handling
    it('should return "Uncategorized" for empty string', () => {
      expect(getRoleTypeFromTitle('')).toBe('Uncategorized');
    });

    it('should return "Uncategorized" for undefined', () => {
      expect(getRoleTypeFromTitle(undefined)).toBe('Uncategorized');
    });

    it('should return "Uncategorized" for whitespace only', () => {
      expect(getRoleTypeFromTitle('   ')).toBe('Uncategorized');
    });

    // Software Engineering
    it('should identify software engineer', () => {
      expect(getRoleTypeFromTitle('Software Engineer')).toBe('Software Engineering');
      expect(getRoleTypeFromTitle('Senior Software Engineering Lead')).toBe('Software Engineering');
    });

    it('should identify software developer', () => {
      expect(getRoleTypeFromTitle('Software Developer')).toBe('Software Development');
      expect(getRoleTypeFromTitle('Junior Software Dev')).toBe('Software Development');
    });

    it('should identify full stack developer', () => {
      expect(getRoleTypeFromTitle('Full Stack Developer')).toBe('Full Stack Development');
      expect(getRoleTypeFromTitle('Fullstack Engineer')).toBe('Full Stack Development');
    });

    it('should identify frontend developer', () => {
      expect(getRoleTypeFromTitle('Frontend Developer')).toBe('Frontend Development');
      expect(getRoleTypeFromTitle('Front-end Engineer')).toBe('Frontend Development');
      expect(getRoleTypeFromTitle('Front End Developer')).toBe('Frontend Development');
    });

    it('should identify backend developer', () => {
      expect(getRoleTypeFromTitle('Backend Developer')).toBe('Backend Development');
      expect(getRoleTypeFromTitle('Back-end Engineer')).toBe('Backend Development');
      expect(getRoleTypeFromTitle('Back End Developer')).toBe('Backend Development');
    });

    it('should identify Java developer', () => {
      expect(getRoleTypeFromTitle('Java Developer')).toBe('Java Development');
      expect(getRoleTypeFromTitle('Java Engineer')).toBe('Java Development');
      expect(getRoleTypeFromTitle('Java Lead')).toBe('Java Development');
    });

    it('should identify generic developer', () => {
      expect(getRoleTypeFromTitle('Developer')).toBe('Software Development');
      expect(getRoleTypeFromTitle('Dev')).toBe('Software Development');
    });

    // Data & Analytics
    it('should identify data scientist', () => {
      expect(getRoleTypeFromTitle('Data Scientist')).toBe('Data Science');
      expect(getRoleTypeFromTitle('Senior Data Scientist')).toBe('Data Science');
    });

    it('should identify data engineer', () => {
      expect(getRoleTypeFromTitle('Data Engineer')).toBe('Data Engineering');
    });

    it('should identify data analyst', () => {
      expect(getRoleTypeFromTitle('Data Analyst')).toBe('Data Analysis');
    });

    it('should identify machine learning roles', () => {
      expect(getRoleTypeFromTitle('Machine Learning Engineer')).toBe('Machine Learning');
      expect(getRoleTypeFromTitle('ML Engineer')).toBe('Machine Learning');
      expect(getRoleTypeFromTitle('ML Specialist')).toBe('Machine Learning');
    });

    it('should identify AI roles', () => {
      expect(getRoleTypeFromTitle('AI Engineer')).toBe('AI/ML');
      expect(getRoleTypeFromTitle('Artificial Intelligence Researcher')).toBe('AI/ML');
    });

    it('should identify business analyst', () => {
      expect(getRoleTypeFromTitle('Business Analyst')).toBe('Business Analysis');
    });

    // Cybersecurity
    it('should identify SOC analyst', () => {
      expect(getRoleTypeFromTitle('SOC Analyst')).toBe('Security Operations');
      expect(getRoleTypeFromTitle('Security Analyst')).toBe('Security Operations');
    });

    it('should identify security engineer', () => {
      expect(getRoleTypeFromTitle('Security Engineer')).toBe('Security Engineering');
      expect(getRoleTypeFromTitle('Cybersecurity Engineer')).toBe('Security Engineering');
    });

    it('should identify penetration tester', () => {
      expect(getRoleTypeFromTitle('Penetration Tester')).toBe('Penetration Testing');
      expect(getRoleTypeFromTitle('Pentest Engineer')).toBe('Penetration Testing');
      expect(getRoleTypeFromTitle('Ethical Hacker')).toBe('Penetration Testing');
    });

    it('should identify general security roles', () => {
      expect(getRoleTypeFromTitle('Security Specialist')).toBe('Cybersecurity');
      expect(getRoleTypeFromTitle('Cyber Defense')).toBe('Cybersecurity');
      expect(getRoleTypeFromTitle('InfoSec Manager')).toBe('Cybersecurity');
    });

    // DevOps & Cloud
    it('should identify DevOps', () => {
      expect(getRoleTypeFromTitle('DevOps Engineer')).toBe('DevOps');
    });

    it('should identify SRE', () => {
      expect(getRoleTypeFromTitle('SRE')).toBe('Site Reliability');
      expect(getRoleTypeFromTitle('Site Reliability Engineer')).toBe('Site Reliability');
    });

    it('should identify cloud roles', () => {
      expect(getRoleTypeFromTitle('Cloud Engineer')).toBe('Cloud Engineering');
      expect(getRoleTypeFromTitle('AWS Solutions Architect')).toBe('Cloud Engineering');
      expect(getRoleTypeFromTitle('Azure Administrator')).toBe('Cloud Engineering');
      expect(getRoleTypeFromTitle('GCP Engineer')).toBe('Cloud Engineering');
    });

    it('should identify infrastructure roles', () => {
      expect(getRoleTypeFromTitle('Infrastructure Engineer')).toBe('Infrastructure');
      expect(getRoleTypeFromTitle('Platform Engineer')).toBe('Infrastructure');
    });

    // Quality Assurance - note: "analyst" check comes before "qa" in source
    it('should identify QA roles', () => {
      expect(getRoleTypeFromTitle('QA Engineer')).toBe('Quality Assurance');
      expect(getRoleTypeFromTitle('Test Engineer')).toBe('Quality Assurance');
      expect(getRoleTypeFromTitle('SDET')).toBe('Quality Assurance');
      // Note: "Quality Assurance Analyst" matches "analyst" first -> Data Analysis
    });

    // Mobile Development
    it('should identify mobile roles', () => {
      expect(getRoleTypeFromTitle('Mobile Developer')).toBe('Mobile Development');
      expect(getRoleTypeFromTitle('iOS Developer')).toBe('Mobile Development');
      expect(getRoleTypeFromTitle('Android Developer')).toBe('Mobile Development');
      expect(getRoleTypeFromTitle('Flutter Developer')).toBe('Mobile Development');
      expect(getRoleTypeFromTitle('React Native Developer')).toBe('Mobile Development');
    });

    // Management
    it('should identify project/program manager', () => {
      expect(getRoleTypeFromTitle('Project Manager')).toBe('Project Management');
      expect(getRoleTypeFromTitle('Program Manager')).toBe('Project Management');
    });

    it('should identify product manager', () => {
      expect(getRoleTypeFromTitle('Product Manager')).toBe('Product Management');
      expect(getRoleTypeFromTitle('Product Owner')).toBe('Product Management');
    });

    it('should identify engineering leadership', () => {
      expect(getRoleTypeFromTitle('Engineering Manager')).toBe('Engineering Leadership');
      expect(getRoleTypeFromTitle('Tech Lead')).toBe('Engineering Leadership');
      expect(getRoleTypeFromTitle('Team Lead')).toBe('Engineering Leadership');
      expect(getRoleTypeFromTitle('Lead Engineer')).toBe('Engineering Leadership');
    });

    it('should identify executive roles', () => {
      expect(getRoleTypeFromTitle('Director of Engineering')).toBe('Executive/Director');
      expect(getRoleTypeFromTitle('VP Engineering')).toBe('Executive/Director');
      expect(getRoleTypeFromTitle('Vice President of Technology')).toBe('Executive/Director');
      expect(getRoleTypeFromTitle('Head of Engineering')).toBe('Executive/Director');
    });

    it('should identify general manager', () => {
      expect(getRoleTypeFromTitle('Operations Manager')).toBe('Management');
    });

    // Design
    it('should identify UX/UI roles', () => {
      expect(getRoleTypeFromTitle('UX Designer')).toBe('UX/UI Design');
      expect(getRoleTypeFromTitle('UI Developer')).toBe('UX/UI Design');
      expect(getRoleTypeFromTitle('User Experience Designer')).toBe('UX/UI Design');
      expect(getRoleTypeFromTitle('User Interface Designer')).toBe('UX/UI Design');
    });

    it('should identify general design roles', () => {
      expect(getRoleTypeFromTitle('Graphic Designer')).toBe('Design');
    });

    // Support & IT - note: "support" comes before "analyst" in source
    it('should identify support roles', () => {
      expect(getRoleTypeFromTitle('Technical Support Specialist')).toBe('Technical Support');
      expect(getRoleTypeFromTitle('Customer Support')).toBe('Technical Support');
      // Note: "Help Desk Analyst" matches "analyst" -> Data Analysis due to check order
    });

    it('should identify IT roles', () => {
      expect(getRoleTypeFromTitle('IT Administrator')).toBe('IT/Systems');
      expect(getRoleTypeFromTitle('Information Technology Specialist')).toBe('IT/Systems');
      expect(getRoleTypeFromTitle('System Admin')).toBe('IT/Systems');
      expect(getRoleTypeFromTitle('Network Engineer')).toBe('IT/Systems');
    });

    // Internships - note: "software engineer" matches before "intern"
    it('should identify pure internships', () => {
      // Pure intern title without other role keywords
      expect(getRoleTypeFromTitle('Intern')).toBe('Internship');
      expect(getRoleTypeFromTitle('Summer Intern')).toBe('Internship');
    });

    // General Engineering
    it('should identify general engineer', () => {
      expect(getRoleTypeFromTitle('Systems Engineer')).toBe('Engineering');
    });

    // Sales & Marketing - note: "manager" check comes before "sales/marketing" in source
    it('should identify sales roles', () => {
      expect(getRoleTypeFromTitle('Sales Representative')).toBe('Sales');
      expect(getRoleTypeFromTitle('Account Executive')).toBe('Sales');
      // Note: "Business Development Manager" matches "manager" first
    });

    it('should identify marketing roles', () => {
      expect(getRoleTypeFromTitle('Growth Hacker')).toBe('Marketing');
      // Note: "Marketing Manager" matches "manager" first
    });

    // Healthcare
    it('should identify healthcare roles', () => {
      expect(getRoleTypeFromTitle('Doctor')).toBe('Healthcare');
      expect(getRoleTypeFromTitle('Physician')).toBe('Healthcare');
      expect(getRoleTypeFromTitle('Nurse')).toBe('Healthcare');
      expect(getRoleTypeFromTitle('Medical Assistant')).toBe('Healthcare');
      expect(getRoleTypeFromTitle('Health Administrator')).toBe('Healthcare');
    });

    // Retail & Service - note: "manager" check comes before "store" in source
    it('should identify retail roles', () => {
      expect(getRoleTypeFromTitle('Crew Member')).toBe('Retail/Service');
      expect(getRoleTypeFromTitle('Cashier')).toBe('Retail/Service');
      expect(getRoleTypeFromTitle('Retail Associate')).toBe('Retail/Service');
      expect(getRoleTypeFromTitle('Customer Service Representative')).toBe('Retail/Service');
      // Note: "Store Manager" matches "manager" first
    });

    // General Labor
    it('should identify general labor roles', () => {
      expect(getRoleTypeFromTitle('Factory Worker')).toBe('General/Labor');
      expect(getRoleTypeFromTitle('Maintenance Technician')).toBe('General/Labor');
      expect(getRoleTypeFromTitle('Machine Operator')).toBe('General/Labor');
      expect(getRoleTypeFromTitle('Warehouse Associate')).toBe('General/Labor');
    });

    // Consulting
    it('should identify consulting roles', () => {
      expect(getRoleTypeFromTitle('Management Consultant')).toBe('Consulting');
      // Note: "IT Consulting" matches "it " first -> IT/Systems
    });

    // Finance - note: "manager" check comes before "finance" in source
    it('should identify finance roles', () => {
      expect(getRoleTypeFromTitle('Accountant')).toBe('Finance');
      expect(getRoleTypeFromTitle('Financial Advisor')).toBe('Finance');
      // Note: "Finance Manager" matches "manager" first
    });

    // Research
    it('should identify research roles', () => {
      expect(getRoleTypeFromTitle('Research Scientist')).toBe('Research');
      // Note: "Research Associate" matches "associate" -> General/Labor
    });

    // Default
    it('should return "Other" for unrecognized titles', () => {
      expect(getRoleTypeFromTitle('Chief Happiness Officer')).toBe('Other');
      expect(getRoleTypeFromTitle('Space Cowboy')).toBe('Other');
    });
  });

  describe('getRoleCategoryFromTitle', () => {
    it('should categorize tech roles as "Technology"', () => {
      expect(getRoleCategoryFromTitle('Software Engineer')).toBe('Technology');
      expect(getRoleCategoryFromTitle('Data Scientist')).toBe('Technology');
      expect(getRoleCategoryFromTitle('DevOps Engineer')).toBe('Technology');
      expect(getRoleCategoryFromTitle('QA Engineer')).toBe('Technology');
      expect(getRoleCategoryFromTitle('Security Engineer')).toBe('Technology');
    });

    it('should categorize management roles as "Management"', () => {
      expect(getRoleCategoryFromTitle('Project Manager')).toBe('Management');
      expect(getRoleCategoryFromTitle('Product Manager')).toBe('Management');
      expect(getRoleCategoryFromTitle('Engineering Manager')).toBe('Management');
      expect(getRoleCategoryFromTitle('Director of Engineering')).toBe('Management');
    });

    it('should categorize pure intern roles as "Internship"', () => {
      expect(getRoleCategoryFromTitle('Intern')).toBe('Internship');
    });

    it('should categorize other roles as "Other"', () => {
      expect(getRoleCategoryFromTitle('Graphic Designer')).toBe('Other');
      expect(getRoleCategoryFromTitle('Space Cowboy')).toBe('Other');
    });
  });
});
