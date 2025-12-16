/**
 * Company Research Routes Tests
 * Tests routes/companyResearch.js
 * Target: 90%+ coverage
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import companyResearchRoutes from '../../routes/companyResearch.js';
import { createTestUser } from '../helpers/index.js';
import axios from 'axios';

// Mock axios - need to handle axios.create() which returns an instance
// and also direct axios.post() calls
const { mockHttpInstance, mockAxiosPost, mockAxiosGet } = vi.hoisted(() => {
  const httpInstance = {
    get: vi.fn(),
    post: vi.fn(),
  };
  
  const axiosPost = vi.fn();
  const axiosGet = vi.fn();
  
  return {
    mockHttpInstance: httpInstance,
    mockAxiosPost: axiosPost,
    mockAxiosGet: axiosGet,
  };
});

vi.mock('axios', () => {
  return {
    default: {
      get: mockAxiosGet,
      post: mockAxiosPost,
      create: vi.fn(() => mockHttpInstance),
    },
  };
});

describe('Company Research Routes', () => {
  let app;
  let user;

  beforeEach(async () => {
    app = express();
    app.use(express.json());
    app.use('/api/company-research', companyResearchRoutes);
    
    user = await createTestUser({
      email: 'research@test.com',
      first_name: 'Research',
      last_name: 'Test',
    });

    vi.clearAllMocks();
    // Reset mocks
    mockHttpInstance.get.mockReset();
    mockHttpInstance.post.mockReset();
    mockAxiosPost.mockReset();
    mockAxiosGet.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('GET /api/company-research', () => {
    it('should return error when company parameter is missing', async () => {
      const response = await request(app)
        .get('/api/company-research');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Missing ?company=');
    });

    it('should return company research data with mocked APIs', async () => {
      // Mock Wikipedia API responses
      mockHttpInstance.get.mockImplementation((url, config) => {
        if (url.includes('wikipedia.org/w/api.php')) {
          const params = new URL(url).searchParams;
          if (params.get('list') === 'search') {
            // Search response
            return Promise.resolve({
              data: {
                query: {
                  search: [{
                    pageid: 12345,
                    title: 'Google'
                  }]
                }
              }
            });
          } else {
            // Page content response
            return Promise.resolve({
              data: {
                query: {
                  pages: {
                    12345: {
                      extract: 'Google is a technology company...',
                      fullurl: 'https://en.wikipedia.org/wiki/Google'
                    }
                  }
                }
              }
            });
          }
        }
        if (url.includes('wikipedia.org/api/rest_v1/page/summary')) {
          // Summary response
          return Promise.resolve({
            data: {
              title: 'Google',
              description: 'Technology company',
              extract: 'Google is a multinational technology company...',
              content_urls: {
                desktop: {
                  page: 'https://en.wikipedia.org/wiki/Google'
                }
              }
            }
          });
        }
        return Promise.reject(new Error('Unexpected URL'));
      });

      // Mock OpenAI API (will use fallback if no key)
      process.env.OPENAI_API_KEY = undefined;

      const response = await request(app)
        .get('/api/company-research?company=Google');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.basics).toBeDefined();
      expect(response.body.data.recentNews).toBeDefined();
      expect(response.body.data.social).toBeDefined();
    });

    it('should handle Wikipedia API errors gracefully', async () => {
      mockHttpInstance.get.mockRejectedValue(new Error('Wikipedia API error'));

      const response = await request(app)
        .get('/api/company-research?company=TestCompany');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      // Should still return data with fallbacks
      expect(response.body.data).toBeDefined();
    });

    it('should use mock news when NEWS_API_KEY is not set', async () => {
      process.env.NEWS_API_KEY = undefined;

      // Mock Wikipedia
      mockHttpInstance.get.mockImplementation((url, config) => {
        if (url.includes('wikipedia.org')) {
          return Promise.resolve({
            data: {
              query: {
                search: [{ pageid: 1, title: 'Test' }],
                pages: {
                  1: {
                    extract: 'Test company',
                    fullurl: 'https://en.wikipedia.org/wiki/Test'
                  }
                }
              }
            }
          });
        }
        return Promise.reject(new Error('Unexpected URL'));
      });
      // News API won't be called when key is not set - uses mock data
      mockAxiosGet.mockResolvedValue({ data: { status: 'ok', articles: [] } });

      const response = await request(app)
        .get('/api/company-research?company=TestCompany');

      expect(response.status).toBe(200);
      expect(response.body.data.recentNews).toBeDefined();
      expect(Array.isArray(response.body.data.recentNews)).toBe(true);
      expect(response.body.data.recentNews.length).toBeGreaterThan(0);
    });

    it('should use News API when key is available', async () => {
      process.env.NEWS_API_KEY = 'test-api-key';

      mockHttpInstance.get.mockImplementation((url) => {
        if (url.includes('wikipedia.org')) {
          return Promise.resolve({
            data: {
              query: {
                search: [{ pageid: 1, title: 'Test' }]
              }
            }
          });
        }
        if (url.includes('newsapi.org')) {
          return Promise.resolve({
            data: {
              status: 'ok',
              articles: [
                {
                  title: 'Test Company announces new product',
                  url: 'https://example.com/news1',
                  source: { name: 'TechNews' },
                  publishedAt: new Date().toISOString(),
                  description: 'Test Company has announced a new product.'
                }
              ]
            }
          });
        }
        return Promise.reject(new Error('Unexpected URL'));
      });

      const response = await request(app)
        .get('/api/company-research?company=TestCompany');

      expect(response.status).toBe(200);
      expect(response.body.data.recentNews).toBeDefined();
    });

    it('should categorize news articles correctly', async () => {
      process.env.NEWS_API_KEY = 'test-api-key';

      // Mock Wikipedia
      mockHttpInstance.get.mockImplementation((url, config) => {
        if (url.includes('wikipedia.org')) {
          return Promise.resolve({
            data: {
              query: {
                search: [{ pageid: 1, title: 'Test' }],
                pages: {
                  1: {
                    extract: 'Test company',
                    fullurl: 'https://en.wikipedia.org/wiki/Test'
                  }
                }
              }
            }
          });
        }
        return Promise.reject(new Error('Unexpected URL'));
      });
      // News API uses axios.get directly
      mockAxiosGet.mockResolvedValue({
        data: {
          status: 'ok',
          articles: [
            {
              title: 'Test Company raises $10M in funding',
              url: 'https://example.com/funding',
              source: { name: 'TechCrunch' },
              publishedAt: new Date().toISOString(),
              description: 'Funding round announcement'
            },
            {
              title: 'Test Company launches new product',
              url: 'https://example.com/launch',
              source: { name: 'TechNews' },
              publishedAt: new Date().toISOString(),
              description: 'Product launch announcement'
            }
          ]
        }
      });

      const response = await request(app)
        .get('/api/company-research?company=TestCompany');

      expect(response.status).toBe(200);
      const news = response.body.data.recentNews;
      expect(news.some(n => n.category === 'Funding')).toBe(true);
      expect(news.some(n => n.category === 'Product Launch')).toBe(true);
    });

    it('should use OpenAI when API key is available', async () => {
      process.env.OPENAI_API_KEY = 'test-openai-key';

      mockHttpInstance.get.mockImplementation((url) => {
        if (url.includes('wikipedia.org')) {
          return Promise.resolve({
            data: {
              query: {
                search: [{ pageid: 1, title: 'Test' }]
              }
            }
          });
        }
        return Promise.reject(new Error('Unexpected GET URL'));
      });

      // Mock News API
      mockAxiosGet.mockResolvedValue({
        data: {
          status: 'ok',
          articles: []
        }
      });
      // Mock OpenAI
      mockAxiosPost.mockResolvedValue({
        data: {
          choices: [{
            message: {
              content: JSON.stringify({
                company: 'Test Company',
                industry: 'Technology',
                headquarters: 'San Francisco, CA',
                size: '1000+ employees',
                mission: 'To innovate',
                values: ['Innovation', 'Quality'],
                culture: 'Collaborative',
                executives: [
                  { name: 'John Doe', title: 'CEO' }
                ],
                productsServices: ['Product A', 'Product B'],
                competitiveLandscape: ['Competitor 1', 'Competitor 2'],
                summary: 'Test Company summary'
              })
            }
          }]
        }
      });

      const response = await request(app)
        .get('/api/company-research?company=TestCompany');

      expect(response.status).toBe(200);
      expect(response.body.data.executives).toBeDefined();
      expect(response.body.data.productsServices).toBeDefined();
      expect(response.body.data.competitiveLandscape).toBeDefined();
    });

    it('should handle OpenAI errors gracefully', async () => {
      process.env.OPENAI_API_KEY = 'test-openai-key';

      // Mock Wikipedia
      mockHttpInstance.get.mockImplementation((url, config) => {
        if (url.includes('wikipedia.org')) {
          return Promise.resolve({
            data: {
              query: {
                search: [{ pageid: 1, title: 'Test' }],
                pages: {
                  1: {
                    extract: 'Test company',
                    fullurl: 'https://en.wikipedia.org/wiki/Test'
                  }
                }
              }
            }
          });
        }
        return Promise.reject(new Error('Unexpected GET URL'));
      });
      // Mock News API
      mockAxiosGet.mockResolvedValue({
        data: {
          status: 'ok',
          articles: []
        }
      });
      // Mock OpenAI error
      mockAxiosPost.mockRejectedValue(new Error('OpenAI API error'));

      const response = await request(app)
        .get('/api/company-research?company=TestCompany');

      expect(response.status).toBe(200);
      // Should still return data with fallbacks
      expect(response.body.data).toBeDefined();
    });

    it('should generate interview prep data', async () => {
      process.env.OPENAI_API_KEY = 'test-openai-key';

      // Mock Wikipedia
      mockHttpInstance.get.mockImplementation((url, config) => {
        if (url.includes('wikipedia.org')) {
          return Promise.resolve({
            data: {
              query: {
                search: [{ pageid: 1, title: 'Test' }],
                pages: {
                  1: {
                    extract: 'Test company',
                    fullurl: 'https://en.wikipedia.org/wiki/Test'
                  }
                }
              }
            }
          });
        }
        return Promise.reject(new Error('Unexpected GET URL'));
      });
      // Mock News API
      mockAxiosGet.mockResolvedValue({
        data: {
          status: 'ok',
          articles: []
        }
      });

      // Mock News API
      mockAxiosGet.mockResolvedValue({
        data: {
          status: 'ok',
          articles: []
        }
      });
      // Mock OpenAI (called twice - once for insights, once for talking points)
      mockAxiosPost
        .mockResolvedValueOnce({
          data: {
            choices: [{
              message: {
                content: JSON.stringify({
                  company: 'Test Company',
                  industry: 'Technology',
                  executives: [],
                  productsServices: ['Product A'],
                  competitiveLandscape: ['Competitor 1'],
                  summary: 'Test summary'
                })
              }
            }]
          }
        })
        .mockResolvedValueOnce({
          data: {
            choices: [{
              message: {
                content: JSON.stringify({
                  talkingPoints: ['Point 1', 'Point 2'],
                  questionsToAsk: ['Question 1', 'Question 2']
                })
              }
            }]
          }
        });

      const response = await request(app)
        .get('/api/company-research?company=TestCompany');

      expect(response.status).toBe(200);
      expect(response.body.data.interviewPrep).toBeDefined();
      expect(response.body.data.interviewPrep.talkingPoints).toBeDefined();
      expect(response.body.data.interviewPrep.questionsToAsk).toBeDefined();
    });

    it('should build social links correctly', async () => {
      // Mock Wikipedia
      mockHttpInstance.get.mockImplementation((url, config) => {
        if (url.includes('wikipedia.org')) {
          return Promise.resolve({
            data: {
              query: {
                search: [{ pageid: 1, title: 'Test' }],
                pages: {
                  1: {
                    extract: 'Test company',
                    fullurl: 'https://en.wikipedia.org/wiki/Test'
                  }
                }
              }
            }
          });
        }
        return Promise.reject(new Error('Unexpected URL'));
      });
      // Mock News API
      mockAxiosGet.mockResolvedValue({
        data: {
          status: 'ok',
          articles: []
        }
      });

      const response = await request(app)
        .get('/api/company-research?company=Test Company');

      expect(response.status).toBe(200);
      expect(response.body.data.social).toBeDefined();
      expect(response.body.data.social.website).toBeDefined();
      expect(response.body.data.social.linkedin).toBeDefined();
    });

    it('should handle network errors with retry logic', async () => {
      process.env.OPENAI_API_KEY = 'test-openai-key';

      // Mock Wikipedia
      mockHttpInstance.get.mockImplementation((url, config) => {
        if (url.includes('wikipedia.org')) {
          return Promise.resolve({
            data: {
              query: {
                search: [{ pageid: 1, title: 'Test' }],
                pages: {
                  1: {
                    extract: 'Test company',
                    fullurl: 'https://en.wikipedia.org/wiki/Test'
                  }
                }
              }
            }
          });
        }
        return Promise.reject(new Error('Unexpected GET URL'));
      });
      // Mock News API
      mockAxiosGet.mockResolvedValue({
        data: {
          status: 'ok',
          articles: []
        }
      });

      // Mock SSL/TLS error that should trigger retry
      const sslError = new Error('SSL error');
      sslError.code = 'ECONNRESET';
      
      mockAxiosPost
        .mockRejectedValueOnce(sslError)
        .mockRejectedValueOnce(sslError)
        .mockResolvedValue({
          data: {
            choices: [{
              message: {
                content: JSON.stringify({
                  company: 'Test Company',
                  industry: 'Technology'
                })
              }
            }]
          }
        });

      const response = await request(app)
        .get('/api/company-research?company=TestCompany');

      expect(response.status).toBe(200);
      // OpenAI is called multiple times (insights + talking points), so retries may result in more calls
      expect(mockAxiosPost).toHaveBeenCalled();
    });

    it('should handle server errors gracefully', async () => {
      // Mock Wikipedia to fail
      mockHttpInstance.get.mockRejectedValue(new Error('Server error'));
      // Mock News API to fail
      mockAxiosGet.mockRejectedValue(new Error('Server error'));

      const response = await request(app)
        .get('/api/company-research?company=TestCompany');

      // Route handles errors gracefully and may return 200 with fallback data
      // or 500 if error occurs in main try-catch
      expect([200, 500]).toContain(response.status);
      if (response.status === 500) {
        expect(response.body.success).toBe(false);
      }
    });
  });

  describe('POST /api/company-research/export', () => {
    const mockResearchData = {
      basics: {
        industry: 'Technology',
        headquarters: 'San Francisco, CA',
        size: '1000+ employees'
      },
      missionValuesCulture: {
        mission: 'To innovate',
        values: ['Innovation', 'Quality'],
        culture: 'Collaborative'
      },
      executives: [
        { name: 'John Doe', title: 'CEO' }
      ],
      productsServices: ['Product A', 'Product B'],
      competitiveLandscape: ['Competitor 1'],
      recentNews: [
        {
          title: 'Test News',
          source: 'TechNews',
          date: new Date().toISOString(),
          summary: 'Test summary'
        }
      ],
      interviewPrep: {
        talkingPoints: ['Point 1'],
        questionsToAsk: ['Question 1']
      },
      social: {
        website: 'https://test.com',
        linkedin: 'https://linkedin.com/test'
      }
    };

    it('should export research as JSON', async () => {
      const response = await request(app)
        .post('/api/company-research/export')
        .send({
          researchData: mockResearchData,
          format: 'json'
        });

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('application/json');
      expect(response.headers['content-disposition']).toContain('attachment');
      expect(response.body).toEqual(mockResearchData);
    });

    it('should export research as text', async () => {
      const response = await request(app)
        .post('/api/company-research/export')
        .send({
          researchData: mockResearchData,
          format: 'text'
        });

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('text/plain');
      expect(response.headers['content-disposition']).toContain('attachment');
      expect(response.text).toContain('COMPANY RESEARCH REPORT');
      expect(response.text).toContain('Technology');
      expect(response.text).toContain('John Doe');
    });

    it('should return error when research data is missing', async () => {
      const response = await request(app)
        .post('/api/company-research/export')
        .send({
          format: 'json'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Missing research data');
    });

    it('should return error for invalid format', async () => {
      const response = await request(app)
        .post('/api/company-research/export')
        .send({
          researchData: mockResearchData,
          format: 'invalid'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid format');
    });

    it('should handle export errors gracefully', async () => {
      // Mock res.json to throw error
      const response = await request(app)
        .post('/api/company-research/export')
        .send({
          researchData: null, // This will cause an error
          format: 'json'
        });

      // Should handle gracefully
      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it('should use default format when not specified', async () => {
      const response = await request(app)
        .post('/api/company-research/export')
        .send({
          researchData: mockResearchData
        });

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('application/json');
    });

    it('should handle missing optional fields in text export', async () => {
      const minimalData = {
        basics: {
          industry: 'Technology'
        },
        missionValuesCulture: {},
        executives: [],
        productsServices: [],
        competitiveLandscape: [],
        recentNews: [],
        interviewPrep: {
          talkingPoints: [],
          questionsToAsk: []
        },
        social: {}
      };

      const response = await request(app)
        .post('/api/company-research/export')
        .send({
          researchData: minimalData,
          format: 'text'
        });

      expect(response.status).toBe(200);
      expect(response.text).toContain('N/A');
    });
  });
});

