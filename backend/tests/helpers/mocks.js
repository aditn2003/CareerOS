/**
 * Mock Utilities
 * Provides mocks for external services like email, messaging, etc.
 */

import { vi } from 'vitest';

// Email/messaging mocks
export const emailMocks = {
  sendEmail: vi.fn().mockResolvedValue({ success: true }),
  sendBulkEmail: vi.fn().mockResolvedValue({ success: true, sent: 0 }),
  sendTemplateEmail: vi.fn().mockResolvedValue({ success: true }),
};

// Nodemailer mock
export const nodemailerMock = {
  createTransport: vi.fn(() => ({
    sendMail: emailMocks.sendEmail,
  })),
};

// Resend mock
export const resendMock = {
  emails: {
    send: emailMocks.sendEmail,
    sendBatch: emailMocks.sendBulkEmail,
  },
};

// OpenAI mock
export const openaiMock = {
  chat: {
    completions: {
      create: vi.fn().mockResolvedValue({
        choices: [{
          message: {
            content: 'Mock AI response',
          },
        }],
      }),
    },
  },
};

// Google Generative AI mock - needs to be a constructor
export const GoogleGenerativeAIMock = vi.fn().mockImplementation(() => ({
  getGenerativeModel: vi.fn(() => ({
    generateContent: vi.fn().mockResolvedValue({
      response: {
        text: vi.fn(() => 'Mock Google AI response'),
      },
    }),
  })),
}));

export const googleGenAIMock = {
  generateContent: vi.fn().mockResolvedValue({
    response: {
      text: vi.fn(() => 'Mock Google AI response'),
    },
  }),
};

// Supabase mock
export const supabaseMock = {
  from: vi.fn(() => ({
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
    then: vi.fn((callback) => Promise.resolve(callback({ data: [], error: null }))),
  })),
  auth: {
    getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
  },
};

// Axios mock
export const axiosMock = {
  get: vi.fn().mockResolvedValue({ data: {} }),
  post: vi.fn().mockResolvedValue({ data: {} }),
  put: vi.fn().mockResolvedValue({ data: {} }),
  delete: vi.fn().mockResolvedValue({ data: {} }),
  create: vi.fn(() => axiosMock),
};

// Puppeteer mock
export const puppeteerMock = {
  launch: vi.fn().mockResolvedValue({
    newPage: vi.fn().mockResolvedValue({
      goto: vi.fn().mockResolvedValue(null),
      content: vi.fn().mockResolvedValue('<html></html>'),
      pdf: vi.fn().mockResolvedValue(Buffer.from('mock pdf')),
      screenshot: vi.fn().mockResolvedValue(Buffer.from('mock image')),
      close: vi.fn().mockResolvedValue(null),
    }),
    close: vi.fn().mockResolvedValue(null),
  }),
};

// File system mocks
export const fsMocks = {
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
  existsSync: vi.fn().mockReturnValue(true),
  mkdirSync: vi.fn(),
  unlinkSync: vi.fn(),
  readdirSync: vi.fn().mockReturnValue([]),
};

// Path mocks
export const pathMocks = {
  join: vi.fn((...args) => args.join('/')),
  dirname: vi.fn((path) => path.split('/').slice(0, -1).join('/')),
  basename: vi.fn((path) => path.split('/').pop()),
  extname: vi.fn((path) => {
    const parts = path.split('.');
    return parts.length > 1 ? `.${parts.pop()}` : '';
  }),
};

/**
 * Resets all mocks
 */
export function resetMocks() {
  // Reset email mocks
  emailMocks.sendEmail.mockClear();
  emailMocks.sendBulkEmail.mockClear();
  emailMocks.sendTemplateEmail.mockClear();
  
  // Reset nodemailer
  nodemailerMock.createTransport.mockClear();
  
  // Reset OpenAI
  openaiMock.chat.completions.create.mockClear();
  
  // Reset Google Gen AI
  googleGenAIMock.generateContent.mockClear();
  
  // Reset Supabase
  supabaseMock.from.mockClear();
  
  // Reset Axios
  axiosMock.get.mockClear();
  axiosMock.post.mockClear();
  axiosMock.put.mockClear();
  axiosMock.delete.mockClear();
  axiosMock.create.mockClear();
  
  // Reset Puppeteer
  puppeteerMock.launch.mockClear();
  
  // Reset FS
  fsMocks.readFileSync.mockClear();
  fsMocks.writeFileSync.mockClear();
  fsMocks.existsSync.mockClear();
  fsMocks.mkdirSync.mockClear();
  fsMocks.unlinkSync.mockClear();
  fsMocks.readdirSync.mockClear();
}

/**
 * Sets up all mocks for a test
 */
export function setupMocks() {
  // Mock nodemailer
  vi.mock('nodemailer', () => ({
    default: nodemailerMock,
  }));
  
  // Mock resend
  vi.mock('resend', () => ({
    Resend: vi.fn(() => resendMock),
  }));
  
  // Mock OpenAI
  vi.mock('openai', () => ({
    default: vi.fn(() => openaiMock),
  }));
  
  // Mock Google Generative AI
  vi.mock('@google/generative-ai', () => ({
    GoogleGenerativeAI: GoogleGenerativeAIMock,
  }));
  
  // Mock Supabase
  vi.mock('@supabase/supabase-js', () => ({
    createClient: vi.fn(() => supabaseMock),
  }));
  
  // Mock axios
  vi.mock('axios', () => ({
    default: axiosMock,
  }));
  
  // Mock puppeteer
  vi.mock('puppeteer', () => ({
    default: puppeteerMock,
  }));
  
  // Mock fs
  vi.mock('fs', () => ({
    default: fsMocks,
    readFileSync: fsMocks.readFileSync,
    writeFileSync: fsMocks.writeFileSync,
    existsSync: fsMocks.existsSync,
    mkdirSync: fsMocks.mkdirSync,
    unlinkSync: fsMocks.unlinkSync,
    readdirSync: fsMocks.readdirSync,
  }));
  
  // Mock fs-extra
  vi.mock('fs-extra', () => ({
    default: fsMocks,
    ...fsMocks,
  }));
  
  // Mock path
  vi.mock('path', () => ({
    default: pathMocks,
    ...pathMocks,
  }));
}

export default {
  emailMocks,
  nodemailerMock,
  resendMock,
  openaiMock,
  googleGenAIMock,
  supabaseMock,
  axiosMock,
  puppeteerMock,
  fsMocks,
  pathMocks,
  resetMocks,
  setupMocks,
};

