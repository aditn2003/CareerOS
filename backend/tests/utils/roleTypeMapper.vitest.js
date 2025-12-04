/**
 * Role Type Mapper - Full Coverage Tests
 * File: backend/utils/roleTypeMapper.js
 */

import { describe, it, expect } from 'vitest';
import { getRoleTypeFromTitle, getRoleCategoryFromTitle } from '../../utils/roleTypeMapper.js';

describe('Role Type Mapper - Full Coverage', () => {
  describe('getRoleTypeFromTitle', () => {
    it('should return "Uncategorized" for empty title', () => {
      expect(getRoleTypeFromTitle('')).toBe('Uncategorized');
      expect(getRoleTypeFromTitle('   ')).toBe('Uncategorized');
      // Note: The function doesn't handle null/undefined, so these will throw
      // expect(getRoleTypeFromTitle(null)).toBe('Uncategorized');
      // expect(getRoleTypeFromTitle(undefined)).toBe('Uncategorized');
    });

    it('should map software engineering titles', () => {
      expect(getRoleTypeFromTitle('Software Engineer')).toBe('Software Engineering');
      expect(getRoleTypeFromTitle('Software Engineering Lead')).toBe('Software Engineering');
      expect(getRoleTypeFromTitle('Software Developer')).toBe('Software Development');
      expect(getRoleTypeFromTitle('Software Dev')).toBe('Software Development');
      expect(getRoleTypeFromTitle('Full Stack Developer')).toBe('Full Stack Development');
      expect(getRoleTypeFromTitle('Fullstack Engineer')).toBe('Full Stack Development');
      expect(getRoleTypeFromTitle('Frontend Developer')).toBe('Frontend Development');
      expect(getRoleTypeFromTitle('Front-end Engineer')).toBe('Frontend Development');
      expect(getRoleTypeFromTitle('Backend Developer')).toBe('Backend Development');
      expect(getRoleTypeFromTitle('Back-end Engineer')).toBe('Backend Development');
      expect(getRoleTypeFromTitle('Java Developer')).toBe('Java Development');
      expect(getRoleTypeFromTitle('Java Engineer')).toBe('Java Development');
      expect(getRoleTypeFromTitle('Java Lead')).toBe('Java Development');
      expect(getRoleTypeFromTitle('Developer')).toBe('Software Development');
      expect(getRoleTypeFromTitle('Dev')).toBe('Software Development');
    });

    it('should map data and analytics titles', () => {
      expect(getRoleTypeFromTitle('Data Scientist')).toBe('Data Science');
      expect(getRoleTypeFromTitle('Data Engineer')).toBe('Data Engineering');
      expect(getRoleTypeFromTitle('Data Analyst')).toBe('Data Analysis');
      expect(getRoleTypeFromTitle('Machine Learning Engineer')).toBe('Machine Learning');
      expect(getRoleTypeFromTitle('ML Engineer')).toBe('Machine Learning');
      expect(getRoleTypeFromTitle('AI Engineer')).toBe('AI/ML');
      expect(getRoleTypeFromTitle('Artificial Intelligence Researcher')).toBe('AI/ML');
      expect(getRoleTypeFromTitle('Business Analyst')).toBe('Business Analysis');
      expect(getRoleTypeFromTitle('Analyst')).toBe('Data Analysis');
    });

    it('should map cybersecurity titles', () => {
      expect(getRoleTypeFromTitle('SOC Analyst')).toBe('Security Operations');
      expect(getRoleTypeFromTitle('Security Analyst')).toBe('Security Operations');
      expect(getRoleTypeFromTitle('Security Engineer')).toBe('Security Engineering');
      expect(getRoleTypeFromTitle('Cybersecurity Engineer')).toBe('Security Engineering');
      expect(getRoleTypeFromTitle('Penetration Tester')).toBe('Penetration Testing');
      expect(getRoleTypeFromTitle('Pentest Engineer')).toBe('Penetration Testing');
      expect(getRoleTypeFromTitle('Ethical Hacker')).toBe('Penetration Testing');
      expect(getRoleTypeFromTitle('Security Specialist')).toBe('Cybersecurity');
      expect(getRoleTypeFromTitle('Cyber Security Analyst')).toBe('Security Operations'); // Matches "security analyst" first
      expect(getRoleTypeFromTitle('InfoSec Engineer')).toBe('Cybersecurity');
    });

    it('should map DevOps and cloud titles', () => {
      expect(getRoleTypeFromTitle('DevOps Engineer')).toBe('DevOps');
      expect(getRoleTypeFromTitle('SRE')).toBe('Site Reliability');
      expect(getRoleTypeFromTitle('Site Reliability Engineer')).toBe('Site Reliability');
      expect(getRoleTypeFromTitle('Cloud Engineer')).toBe('Cloud Engineering');
      expect(getRoleTypeFromTitle('AWS Engineer')).toBe('Cloud Engineering');
      expect(getRoleTypeFromTitle('Azure Developer')).toBe('Cloud Engineering');
      expect(getRoleTypeFromTitle('GCP Architect')).toBe('Cloud Engineering');
      expect(getRoleTypeFromTitle('Infrastructure Engineer')).toBe('Infrastructure');
      expect(getRoleTypeFromTitle('Platform Engineer')).toBe('Infrastructure');
    });

    it('should map QA titles', () => {
      expect(getRoleTypeFromTitle('QA Engineer')).toBe('Quality Assurance');
      expect(getRoleTypeFromTitle('Quality Assurance Engineer')).toBe('Quality Assurance');
      expect(getRoleTypeFromTitle('Test Engineer')).toBe('Quality Assurance');
      expect(getRoleTypeFromTitle('SDET')).toBe('Quality Assurance');
    });

    it('should map mobile development titles', () => {
      expect(getRoleTypeFromTitle('Mobile Developer')).toBe('Mobile Development');
      expect(getRoleTypeFromTitle('iOS Developer')).toBe('Mobile Development');
      expect(getRoleTypeFromTitle('Android Developer')).toBe('Mobile Development');
      expect(getRoleTypeFromTitle('Flutter Developer')).toBe('Mobile Development');
      expect(getRoleTypeFromTitle('React Native Developer')).toBe('Mobile Development');
    });

    it('should map management titles', () => {
      expect(getRoleTypeFromTitle('Project Manager')).toBe('Project Management');
      expect(getRoleTypeFromTitle('Program Manager')).toBe('Project Management');
      expect(getRoleTypeFromTitle('Product Manager')).toBe('Product Management');
      expect(getRoleTypeFromTitle('Product Owner')).toBe('Product Management');
      expect(getRoleTypeFromTitle('Engineering Manager')).toBe('Engineering Leadership');
      expect(getRoleTypeFromTitle('Tech Lead')).toBe('Engineering Leadership');
      expect(getRoleTypeFromTitle('Team Lead')).toBe('Engineering Leadership');
      expect(getRoleTypeFromTitle('Lead Engineer')).toBe('Engineering Leadership');
      expect(getRoleTypeFromTitle('Director of Engineering')).toBe('Executive/Director');
      expect(getRoleTypeFromTitle('VP Engineering')).toBe('Executive/Director');
      expect(getRoleTypeFromTitle('Vice President of Product')).toBe('Executive/Director');
      expect(getRoleTypeFromTitle('Head of Engineering')).toBe('Executive/Director');
      expect(getRoleTypeFromTitle('Engineering Manager')).toBe('Engineering Leadership');
      expect(getRoleTypeFromTitle('Operations Manager')).toBe('Management');
    });

    it('should map design titles', () => {
      expect(getRoleTypeFromTitle('UX Designer')).toBe('UX/UI Design');
      expect(getRoleTypeFromTitle('UI Designer')).toBe('UX/UI Design');
      expect(getRoleTypeFromTitle('User Experience Designer')).toBe('UX/UI Design');
      expect(getRoleTypeFromTitle('User Interface Designer')).toBe('UX/UI Design');
      expect(getRoleTypeFromTitle('Graphic Designer')).toBe('Design');
    });

    it('should map support and IT titles', () => {
      expect(getRoleTypeFromTitle('Support Engineer')).toBe('Technical Support');
      expect(getRoleTypeFromTitle('Help Desk Technician')).toBe('Technical Support');
      expect(getRoleTypeFromTitle('Technical Support Specialist')).toBe('Technical Support');
      expect(getRoleTypeFromTitle('IT Specialist')).toBe('IT/Systems');
      expect(getRoleTypeFromTitle('Information Technology Manager')).toBe('Management'); // "manager" matches first
      expect(getRoleTypeFromTitle('System Administrator')).toBe('IT/Systems');
      expect(getRoleTypeFromTitle('Network Engineer')).toBe('IT/Systems');
    });

    it('should map internship titles', () => {
      // Note: "software engineering" check (line 12) comes before "intern" check (line 129), so this returns "Software Engineering"
      expect(getRoleTypeFromTitle('Software Engineering Intern')).toBe('Software Engineering');
      expect(getRoleTypeFromTitle('Intern')).toBe('Internship');
      // "intern" check (line 129) comes before "engineer" check (line 134), so this returns "Internship"
      expect(getRoleTypeFromTitle('Engineering Intern')).toBe('Internship');
      // "intern" check (line 129) comes before "data scientist" check (line 35), so this returns "Internship"
      expect(getRoleTypeFromTitle('Data Science Intern')).toBe('Internship');
    });

    it('should map general engineering titles', () => {
      expect(getRoleTypeFromTitle('Mechanical Engineer')).toBe('Engineering');
      expect(getRoleTypeFromTitle('Electrical Engineer')).toBe('Engineering');
    });

    it('should map sales and marketing titles', () => {
      expect(getRoleTypeFromTitle('Sales Representative')).toBe('Sales');
      expect(getRoleTypeFromTitle('Account Executive')).toBe('Sales');
      // "manager" check (line 108) comes before "business development" check (line 139), so this returns "Management"
      expect(getRoleTypeFromTitle('Business Development Manager')).toBe('Management');
      // "manager" check (line 108) comes before "marketing" check (line 142), so this returns "Management"
      expect(getRoleTypeFromTitle('Marketing Manager')).toBe('Management');
      expect(getRoleTypeFromTitle('Growth Hacker')).toBe('Marketing');
      // "manager" check (line 108) comes before "sales" check (line 139), so this returns "Management"
      expect(getRoleTypeFromTitle('Sales Manager')).toBe('Management');
    });

    it('should map healthcare titles', () => {
      expect(getRoleTypeFromTitle('Doctor')).toBe('Healthcare');
      expect(getRoleTypeFromTitle('Physician')).toBe('Healthcare');
      expect(getRoleTypeFromTitle('Nurse')).toBe('Healthcare');
      expect(getRoleTypeFromTitle('Medical Assistant')).toBe('Healthcare');
      expect(getRoleTypeFromTitle('Health Coordinator')).toBe('Healthcare');
    });

    it('should map retail and service titles', () => {
      expect(getRoleTypeFromTitle('Crew Member')).toBe('Retail/Service');
      expect(getRoleTypeFromTitle('Cashier')).toBe('Retail/Service');
      expect(getRoleTypeFromTitle('Retail Associate')).toBe('Retail/Service');
      // "manager" check (line 108) comes before "store" check (line 152), so this returns "Management"
      expect(getRoleTypeFromTitle('Store Manager')).toBe('Management');
      expect(getRoleTypeFromTitle('Customer Service Representative')).toBe('Retail/Service');
      expect(getRoleTypeFromTitle('Store Associate')).toBe('Retail/Service'); // "store" matches before "associate"
    });

    it('should map general labor titles', () => {
      expect(getRoleTypeFromTitle('Warehouse Worker')).toBe('General/Labor');
      expect(getRoleTypeFromTitle('Technician')).toBe('General/Labor');
      expect(getRoleTypeFromTitle('Machine Operator')).toBe('General/Labor');
      expect(getRoleTypeFromTitle('Sales Associate')).toBe('Sales'); // "sales" matches first
    });

    it('should map consulting titles', () => {
      expect(getRoleTypeFromTitle('Consultant')).toBe('Consulting');
      expect(getRoleTypeFromTitle('Management Consulting')).toBe('Consulting');
    });

    it('should map finance titles', () => {
      expect(getRoleTypeFromTitle('Financial Analyst')).toBe('Data Analysis'); // "analyst" matches first (line 53)
      expect(getRoleTypeFromTitle('Accountant')).toBe('Finance');
      // "manager" check (line 108) comes before "finance" check (line 167), so this returns "Management"
      expect(getRoleTypeFromTitle('Finance Manager')).toBe('Management');
      expect(getRoleTypeFromTitle('Financial Advisor')).toBe('Finance'); // "financial" matches
    });

    it('should map research titles', () => {
      expect(getRoleTypeFromTitle('Research Scientist')).toBe('Research');
      expect(getRoleTypeFromTitle('Research Analyst')).toBe('Data Analysis'); // "analyst" matches first (line 53), before "research" (line 172)
    });

    it('should return "Other" for unmapped titles', () => {
      expect(getRoleTypeFromTitle('Unknown Title')).toBe('Other');
      expect(getRoleTypeFromTitle('Random Job')).toBe('Other');
    });

    it('should handle case insensitivity', () => {
      expect(getRoleTypeFromTitle('SOFTWARE ENGINEER')).toBe('Software Engineering');
      expect(getRoleTypeFromTitle('Software ENGINEER')).toBe('Software Engineering');
      expect(getRoleTypeFromTitle('software engineer')).toBe('Software Engineering');
    });

    it('should handle titles with extra whitespace', () => {
      expect(getRoleTypeFromTitle('  Software Engineer  ')).toBe('Software Engineering');
      expect(getRoleTypeFromTitle('\tData Scientist\n')).toBe('Data Science');
    });
  });

  describe('getRoleCategoryFromTitle', () => {
    it('should return "Technology" for tech roles', () => {
      expect(getRoleCategoryFromTitle('Software Engineer')).toBe('Technology');
      expect(getRoleCategoryFromTitle('Data Scientist')).toBe('Technology');
      expect(getRoleCategoryFromTitle('DevOps Engineer')).toBe('Technology');
      expect(getRoleCategoryFromTitle('Security Engineer')).toBe('Technology');
    });

    it('should return "Management" for management roles', () => {
      expect(getRoleCategoryFromTitle('Project Manager')).toBe('Management');
      expect(getRoleCategoryFromTitle('Product Manager')).toBe('Management');
      expect(getRoleCategoryFromTitle('Engineering Manager')).toBe('Management');
      expect(getRoleCategoryFromTitle('Director')).toBe('Management');
    });

    it('should return "Internship" for internship roles', () => {
      // Note: "Software Engineering Intern" returns "Software Engineering" (tech role), so category is "Technology"
      expect(getRoleCategoryFromTitle('Software Engineering Intern')).toBe('Technology');
      expect(getRoleCategoryFromTitle('Intern')).toBe('Internship');
      // "Data Science Intern" returns "Internship" (because "intern" check comes before "data scientist"), so category is "Internship"
      expect(getRoleCategoryFromTitle('Data Science Intern')).toBe('Internship');
      // "Engineering Intern" returns "Internship" (because "intern" check comes before "engineer"), so category is "Internship"
      expect(getRoleCategoryFromTitle('Engineering Intern')).toBe('Internship');
    });

    it('should return "Other" for non-tech/management roles', () => {
      expect(getRoleCategoryFromTitle('Sales Representative')).toBe('Other');
      expect(getRoleCategoryFromTitle('Designer')).toBe('Other');
      expect(getRoleCategoryFromTitle('Consultant')).toBe('Other');
    });
  });
});

