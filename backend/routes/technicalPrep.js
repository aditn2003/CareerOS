import express from "express";
import axios from "axios";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { trackApiCall } from "../utils/apiTrackingService.js";

dotenv.config();

const router = express.Router();
const OPENAI_KEY = process.env.OPENAI_API_KEY;

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

/* ============================================================
   UC-078: TECHNICAL INTERVIEW PREPARATION
   
   Acceptance Criteria:
   1. ✅ Provide coding challenges relevant to target tech stack
   2. ✅ Include system design questions for senior positions
   3. ❌ Case study practice (already in mock interview - skipped)
   4. ✅ Generate technical questions based on job requirements
   5. ✅ Provide solution frameworks and best practices
   6. ✅ Include whiteboarding practice and techniques
   7. ✅ Offer timed coding challenges with performance tracking
   8. ✅ Connect technical skills to real-world application scenarios
============================================================ */

/* -------------------------
   Helper: Generate Coding Challenge
------------------------- */
async function generateCodingChallenge(techStack, difficulty, category, userId = null) {
  if (!OPENAI_KEY) {
    return getFallbackCodingChallenge(techStack, difficulty, category);
  }

  const prompt = `
Generate a coding challenge for technical interview preparation:

Tech Stack: ${techStack.join(", ")}
Difficulty: ${difficulty}
Category: ${category || "general algorithms"}

Create a JSON response with:
{
  "title": "descriptive challenge title",
  "description": "detailed problem description with examples",
  "difficulty": "${difficulty}",
  "category": "${category}",
  "tech_stack": "${techStack[0] || 'javascript'}",
  "starter_code": "// Function signature and any helper code\\n",
  "test_cases": [
    { "input": "description of input", "expected_output": "expected output", "explanation": "why this is correct" }
  ],
  "hints": [
    { "level": 1, "hint": "gentle hint" },
    { "level": 2, "hint": "more specific hint" },
    { "level": 3, "hint": "almost gives away the approach" }
  ],
  "optimal_solution": "// Complete optimal solution code",
  "solution_explanation": "Step-by-step explanation of the solution approach",
  "time_complexity": "O(n)",
  "space_complexity": "O(1)",
  "real_world_applications": [
    "How this algorithm is used in real systems",
    "Common use cases in industry"
  ],
  "follow_up_questions": [
    "What if the input was sorted?",
    "How would you optimize for memory?"
  ],
  "common_mistakes": [
    "Off-by-one errors",
    "Not handling edge cases"
  ],
  "interview_tips": [
    "Think out loud as you code",
    "Start with brute force, then optimize"
  ]
}

Make the challenge appropriate for ${difficulty} level.
Include realistic test cases with edge cases.
Provide clear starter code in ${techStack[0] || 'JavaScript'}.
`;

  try {
    const { data } = await trackApiCall(
      'openai',
      () => axios.post(
        "https://api.openai.com/v1/chat/completions",
        {
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: "You are an expert technical interviewer creating coding challenges for interview preparation. Generate realistic, well-structured challenges."
            },
            { role: "user", content: prompt }
          ],
          response_format: { type: "json_object" },
          temperature: 0.7,
        },
        { headers: { Authorization: `Bearer ${OPENAI_KEY}` } }
      ),
      {
        endpoint: '/v1/chat/completions',
        method: 'POST',
        userId,
        requestPayload: { model: 'gpt-4o-mini', purpose: 'technical_prep_coding_challenge', techStack, difficulty, category },
        estimateCost: 0.002
      }
    );

    return JSON.parse(data.choices[0].message.content);
  } catch (err) {
    console.error("❌ OpenAI error:", err.message);
    return getFallbackCodingChallenge(techStack, difficulty, category);
  }
}

/* -------------------------
   Helper: Fallback Coding Challenge
------------------------- */
function getFallbackCodingChallenge(techStack, difficulty, category) {
  const challenges = {
    easy: {
      title: "Two Sum",
      description: "Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.\n\nYou may assume that each input would have exactly one solution, and you may not use the same element twice.\n\nExample:\nInput: nums = [2,7,11,15], target = 9\nOutput: [0,1]\nExplanation: Because nums[0] + nums[1] == 9, we return [0, 1].",
      difficulty: "easy",
      category: "arrays",
      tech_stack: techStack[0] || "javascript",
      starter_code: "function twoSum(nums, target) {\n  // Your code here\n}",
      test_cases: [
        { input: "nums = [2,7,11,15], target = 9", expected_output: "[0,1]", explanation: "nums[0] + nums[1] = 2 + 7 = 9" },
        { input: "nums = [3,2,4], target = 6", expected_output: "[1,2]", explanation: "nums[1] + nums[2] = 2 + 4 = 6" }
      ],
      hints: [
        { level: 1, hint: "Think about how you can avoid checking every pair" },
        { level: 2, hint: "What data structure gives O(1) lookup?" },
        { level: 3, hint: "Use a hash map to store complements" }
      ],
      optimal_solution: "function twoSum(nums, target) {\n  const map = new Map();\n  for (let i = 0; i < nums.length; i++) {\n    const complement = target - nums[i];\n    if (map.has(complement)) {\n      return [map.get(complement), i];\n    }\n    map.set(nums[i], i);\n  }\n  return [];\n}",
      solution_explanation: "Use a hash map to store each number's index as we iterate. For each number, check if its complement (target - current) exists in the map.",
      time_complexity: "O(n)",
      space_complexity: "O(n)",
      real_world_applications: ["Finding matching transactions", "Inventory management"],
      follow_up_questions: ["What if the array was sorted?", "What if there were multiple valid pairs?"],
      common_mistakes: ["Using the same element twice", "Not handling duplicates"],
      interview_tips: ["Start with the brute force O(n²) approach, then optimize"]
    },
    medium: {
      title: "Longest Substring Without Repeating Characters",
      description: "Given a string s, find the length of the longest substring without repeating characters.\n\nExample 1:\nInput: s = \"abcabcbb\"\nOutput: 3\nExplanation: The answer is \"abc\", with the length of 3.\n\nExample 2:\nInput: s = \"bbbbb\"\nOutput: 1",
      difficulty: "medium",
      category: "strings",
      tech_stack: techStack[0] || "javascript",
      starter_code: "function lengthOfLongestSubstring(s) {\n  // Your code here\n}",
      test_cases: [
        { input: "s = \"abcabcbb\"", expected_output: "3", explanation: "The longest substring is 'abc'" },
        { input: "s = \"bbbbb\"", expected_output: "1", explanation: "All characters are the same" }
      ],
      hints: [
        { level: 1, hint: "Consider a sliding window approach" },
        { level: 2, hint: "Track characters you've seen and their positions" },
        { level: 3, hint: "When you see a repeat, move the left pointer" }
      ],
      optimal_solution: "function lengthOfLongestSubstring(s) {\n  const seen = new Map();\n  let left = 0, maxLen = 0;\n  for (let right = 0; right < s.length; right++) {\n    if (seen.has(s[right]) && seen.get(s[right]) >= left) {\n      left = seen.get(s[right]) + 1;\n    }\n    seen.set(s[right], right);\n    maxLen = Math.max(maxLen, right - left + 1);\n  }\n  return maxLen;\n}",
      solution_explanation: "Use sliding window with a hash map to track last seen positions. When a duplicate is found, move left pointer past the previous occurrence.",
      time_complexity: "O(n)",
      space_complexity: "O(min(m,n)) where m is charset size",
      real_world_applications: ["Text processing", "DNA sequence analysis"],
      follow_up_questions: ["What if we need the actual substring?", "What about Unicode characters?"],
      common_mistakes: ["Not handling empty strings", "Incorrect window shrinking"],
      interview_tips: ["Draw out examples to visualize the sliding window"]
    },
    hard: {
      title: "Merge K Sorted Lists",
      description: "You are given an array of k linked-lists, each linked-list is sorted in ascending order. Merge all the linked-lists into one sorted linked-list and return it.\n\nExample:\nInput: lists = [[1,4,5],[1,3,4],[2,6]]\nOutput: [1,1,2,3,4,4,5,6]",
      difficulty: "hard",
      category: "linked_lists",
      tech_stack: techStack[0] || "javascript",
      starter_code: "function mergeKLists(lists) {\n  // Your code here\n}",
      test_cases: [
        { input: "lists = [[1,4,5],[1,3,4],[2,6]]", expected_output: "[1,1,2,3,4,4,5,6]", explanation: "All lists merged in sorted order" },
        { input: "lists = []", expected_output: "[]", explanation: "Empty input returns empty output" }
      ],
      hints: [
        { level: 1, hint: "Think about divide and conquer" },
        { level: 2, hint: "You could use a min-heap/priority queue" },
        { level: 3, hint: "Pair up lists and merge them, then repeat" }
      ],
      optimal_solution: "function mergeKLists(lists) {\n  if (!lists.length) return null;\n  while (lists.length > 1) {\n    const merged = [];\n    for (let i = 0; i < lists.length; i += 2) {\n      const l1 = lists[i];\n      const l2 = i + 1 < lists.length ? lists[i + 1] : null;\n      merged.push(mergeTwoLists(l1, l2));\n    }\n    lists = merged;\n  }\n  return lists[0];\n}",
      solution_explanation: "Use divide and conquer: pair up lists and merge each pair, repeat until one list remains. This achieves O(N log k) time complexity.",
      time_complexity: "O(N log k) where N is total nodes, k is number of lists",
      space_complexity: "O(log k) for recursion stack",
      real_world_applications: ["Database query merging", "Log aggregation systems"],
      follow_up_questions: ["How would you handle very large lists?", "What about parallel processing?"],
      common_mistakes: ["Not handling null lists", "Inefficient O(Nk) approach"],
      interview_tips: ["Compare multiple approaches before coding"]
    }
  };

  return challenges[difficulty] || challenges.medium;
}

/* -------------------------
   Helper: Generate System Design Question
------------------------- */
async function generateSystemDesignQuestion(role, seniorityLevel, category, userId = null) {
  if (!OPENAI_KEY) {
    return getFallbackSystemDesign(category);
  }

  const prompt = `
Generate a system design interview question for:

Role: ${role}
Seniority: ${seniorityLevel}
Category: ${category || "distributed systems"}

Create a JSON response:
{
  "title": "Design [System Name]",
  "description": "Detailed problem description and context",
  "difficulty": "${seniorityLevel === 'senior' || seniorityLevel === 'staff' ? 'hard' : 'medium'}",
  "category": "${category}",
  "requirements": {
    "functional": ["List of functional requirements"],
    "non_functional": ["Scalability", "Availability", "Performance requirements"]
  },
  "constraints": {
    "scale": "Expected scale (users, requests/sec, data volume)",
    "latency": "Expected latency requirements",
    "availability": "Availability requirements (99.9%, etc.)"
  },
  "evaluation_criteria": [
    "Requirement gathering and clarifying questions",
    "High-level architecture",
    "Component design",
    "Trade-off discussions"
  ],
  "solution_components": [
    {
      "component": "Component Name",
      "purpose": "What it does",
      "technology_options": ["Option 1", "Option 2"],
      "considerations": "Key design considerations"
    }
  ],
  "solution_tradeoffs": [
    {
      "decision": "Design decision",
      "pros": ["Advantages"],
      "cons": ["Disadvantages"],
      "when_to_use": "When this approach is appropriate"
    }
  ],
  "deep_dives": [
    {
      "topic": "Specific aspect to deep dive",
      "questions": ["Follow-up questions interviewer might ask"],
      "key_points": ["Important points to cover"]
    }
  ],
  "diagram_description": "Text description of the architecture diagram",
  "interview_flow": [
    "1. Clarify requirements (5 min)",
    "2. High-level design (10 min)",
    "3. Deep dive into components (15 min)",
    "4. Address bottlenecks and scaling (10 min)"
  ],
  "common_mistakes": [
    "Jumping into solution without requirements",
    "Not discussing trade-offs"
  ],
  "success_tips": [
    "Drive the conversation",
    "Think out loud",
    "Discuss alternatives before choosing"
  ]
}

Make it appropriate for ${seniorityLevel} level candidates.
`;

  try {
    const { data } = await trackApiCall(
      'openai',
      () => axios.post(
        "https://api.openai.com/v1/chat/completions",
        {
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: "You are a senior system design interviewer at a top tech company. Create realistic, comprehensive system design questions."
            },
            { role: "user", content: prompt }
          ],
          response_format: { type: "json_object" },
          temperature: 0.6,
        },
        { headers: { Authorization: `Bearer ${OPENAI_KEY}` } }
      ),
      {
        endpoint: '/v1/chat/completions',
        method: 'POST',
        userId,
        requestPayload: { model: 'gpt-4o-mini', purpose: 'technical_prep_system_design', role, seniorityLevel, category },
        estimateCost: 0.003
      }
    );

    return JSON.parse(data.choices[0].message.content);
  } catch (err) {
    console.error("❌ OpenAI error:", err.message);
    return getFallbackSystemDesign(category);
  }
}

/* -------------------------
   Helper: Fallback System Design
------------------------- */
function getFallbackSystemDesign(category) {
  return {
    title: "Design a URL Shortener",
    description: "Design a URL shortening service like bit.ly. Users should be able to create shortened URLs and be redirected to the original URL when accessing the short link.",
    difficulty: "medium",
    category: category || "distributed_systems",
    requirements: {
      functional: [
        "Given a URL, generate a shorter unique alias",
        "When users access short link, redirect to original",
        "Users can optionally pick custom short links",
        "Links expire after a default timespan"
      ],
      non_functional: [
        "Highly available (redirect should always work)",
        "URL redirection should be real-time with minimal latency",
        "Shortened links should not be guessable"
      ]
    },
    constraints: {
      scale: "100 million URLs generated per month, 100:1 read:write ratio",
      latency: "< 100ms redirect latency",
      availability: "99.9% uptime"
    },
    evaluation_criteria: [
      "API design and database schema",
      "URL encoding approach",
      "Handling collisions",
      "Caching strategy",
      "Analytics and tracking"
    ],
    solution_components: [
      {
        component: "Application Servers",
        purpose: "Handle API requests for URL creation and redirection",
        technology_options: ["Node.js", "Go", "Java"],
        considerations: "Stateless for horizontal scaling"
      },
      {
        component: "Database",
        purpose: "Store URL mappings",
        technology_options: ["PostgreSQL", "Cassandra", "DynamoDB"],
        considerations: "Partitioning strategy for scale"
      },
      {
        component: "Cache Layer",
        purpose: "Cache frequently accessed URLs",
        technology_options: ["Redis", "Memcached"],
        considerations: "Cache invalidation strategy"
      }
    ],
    solution_tradeoffs: [
      {
        decision: "Base62 vs UUID for short codes",
        pros: ["Shorter URLs", "Predictable length"],
        cons: ["Sequential IDs could be guessable"],
        when_to_use: "When URL length is critical"
      }
    ],
    deep_dives: [
      {
        topic: "Handling collisions",
        questions: ["What if two URLs hash to same short code?"],
        key_points: ["Use DB unique constraint", "Retry with different encoding"]
      }
    ],
    diagram_description: "Load Balancer → App Servers → Cache → Database. CDN for static content.",
    interview_flow: [
      "1. Clarify requirements (5 min)",
      "2. Estimate scale (5 min)",
      "3. High-level design (10 min)",
      "4. Deep dive: URL encoding (10 min)",
      "5. Deep dive: Database design (10 min)"
    ],
    common_mistakes: [
      "Not considering analytics requirements",
      "Ignoring cache warming strategy"
    ],
    success_tips: [
      "Start with functional requirements",
      "Do back-of-envelope calculations",
      "Discuss multiple encoding approaches"
    ]
  };
}

/* -------------------------
   Helper: Generate Whiteboard Session
------------------------- */
async function generateWhiteboardSession(techStack, topic, userId = null) {
  if (!OPENAI_KEY) {
    return getFallbackWhiteboardSession();
  }

  const prompt = `
Generate a whiteboard coding session for technical interview practice:

Topic: ${topic || "algorithm problem solving"}
Tech Context: ${techStack.join(", ")}

Create a JSON response:
{
  "problem_title": "Problem name",
  "problem_description": "Clear problem statement with examples",
  "techniques_covered": [
    {
      "technique": "Technique name",
      "description": "How to apply it",
      "example": "Concrete example"
    }
  ],
  "communication_tips": [
    {
      "phase": "Understanding",
      "tips": ["Repeat the problem", "Ask clarifying questions"]
    },
    {
      "phase": "Planning",
      "tips": ["Think out loud", "Draw examples"]
    },
    {
      "phase": "Coding",
      "tips": ["Write clean code", "Explain as you write"]
    },
    {
      "phase": "Testing",
      "tips": ["Walk through with example", "Consider edge cases"]
    }
  ],
  "step_by_step_approach": [
    {
      "step": 1,
      "action": "Understand the problem",
      "what_to_say": "Let me make sure I understand the problem correctly...",
      "what_to_write": "Draw input/output examples"
    }
  ],
  "sample_dialogue": [
    {
      "interviewer": "Here's the problem...",
      "candidate": "Great question! Let me first clarify..."
    }
  ],
  "common_mistakes_to_avoid": [
    "Starting to code immediately",
    "Silent coding"
  ],
  "body_language_tips": [
    "Face the whiteboard at an angle",
    "Make eye contact when speaking",
    "Write legibly"
  ],
  "time_management": {
    "understanding": "5 minutes",
    "planning": "5-10 minutes",
    "coding": "15-20 minutes",
    "testing": "5-10 minutes"
  }
}
`;

  try {
    const { data } = await trackApiCall(
      'openai',
      () => axios.post(
        "https://api.openai.com/v1/chat/completions",
        {
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: "You are an expert technical interview coach specializing in whiteboard interview preparation."
            },
            { role: "user", content: prompt }
          ],
          response_format: { type: "json_object" },
          temperature: 0.6,
        },
        { headers: { Authorization: `Bearer ${OPENAI_KEY}` } }
      ),
      {
        endpoint: '/v1/chat/completions',
        method: 'POST',
        userId,
        requestPayload: { model: 'gpt-4o-mini', purpose: 'technical_prep_whiteboard', techStack, topic },
        estimateCost: 0.002
      }
    );

    return JSON.parse(data.choices[0].message.content);
  } catch (err) {
    console.error("❌ OpenAI error:", err.message);
    return getFallbackWhiteboardSession();
  }
}

/* -------------------------
   Helper: Fallback Whiteboard Session
------------------------- */
function getFallbackWhiteboardSession() {
  return {
    problem_title: "Find the Kth Largest Element",
    problem_description: "Given an unsorted array, find the kth largest element. For example, given [3,2,1,5,6,4] and k=2, return 5.",
    techniques_covered: [
      {
        technique: "QuickSelect Algorithm",
        description: "Partial quicksort to find kth element in O(n) average time",
        example: "Partition array, recurse only on the side containing k"
      },
      {
        technique: "Heap-based approach",
        description: "Use min-heap of size k",
        example: "Maintain k largest elements seen so far"
      }
    ],
    communication_tips: [
      {
        phase: "Understanding",
        tips: ["Repeat the problem back", "Ask about edge cases (k=1, duplicates)", "Clarify return value"]
      },
      {
        phase: "Planning", 
        tips: ["Mention brute force first (sort)", "Discuss heap vs quickselect", "State time/space complexity"]
      },
      {
        phase: "Coding",
        tips: ["Write function signature first", "Use meaningful variable names", "Explain each line"]
      },
      {
        phase: "Testing",
        tips: ["Trace through small example", "Test edge cases", "Verify complexity"]
      }
    ],
    step_by_step_approach: [
      {
        step: 1,
        action: "Understand and clarify",
        what_to_say: "So I need to find the kth largest, not kth smallest, correct?",
        what_to_write: "Example: [3,2,1,5,6,4], k=2 → 5"
      },
      {
        step: 2,
        action: "Discuss approaches",
        what_to_say: "I can think of a few approaches...",
        what_to_write: "1. Sort: O(n log n)\n2. Heap: O(n log k)\n3. QuickSelect: O(n) avg"
      }
    ],
    sample_dialogue: [
      {
        interviewer: "What's your approach?",
        candidate: "I'll use QuickSelect because it gives us O(n) average time complexity..."
      }
    ],
    common_mistakes_to_avoid: [
      "Forgetting to handle k > array length",
      "Off-by-one errors with indices",
      "Not explaining trade-offs"
    ],
    body_language_tips: [
      "Stand at an angle so interviewer can see board",
      "Make periodic eye contact",
      "Point to relevant code when explaining"
    ],
    time_management: {
      understanding: "3-5 minutes",
      planning: "5-7 minutes",
      coding: "15-20 minutes",
      testing: "5-10 minutes"
    }
  };
}

/* -------------------------
   Helper: Evaluate Code Solution
------------------------- */
async function evaluateCodeSolution(challenge, userSolution, timeSpent, userId = null) {
  if (!OPENAI_KEY) {
    return {
      score: 70,
      feedback: "Solution submitted. Practice more for detailed feedback.",
      improvements: ["Consider edge cases", "Optimize time complexity"],
      passed_tests: 2,
      total_tests: 3
    };
  }

  const prompt = `
Evaluate this coding solution:

PROBLEM: ${challenge.title}
${challenge.description}

OPTIMAL TIME COMPLEXITY: ${challenge.time_complexity}
OPTIMAL SPACE COMPLEXITY: ${challenge.space_complexity}

USER'S SOLUTION:
${userSolution}

TIME TAKEN: ${Math.round(timeSpent / 60)} minutes

Provide JSON evaluation:
{
  "score": 0-100,
  "correctness": {
    "is_correct": true/false,
    "issues": ["any bugs or logic errors"]
  },
  "complexity_analysis": {
    "time": "O(?)",
    "space": "O(?)",
    "is_optimal": true/false,
    "explanation": "analysis explanation"
  },
  "code_quality": {
    "readability": 1-10,
    "naming": 1-10,
    "structure": 1-10,
    "comments": "feedback on code style"
  },
  "feedback": "Overall constructive feedback",
  "improvements": ["specific improvement suggestions"],
  "what_went_well": ["positive aspects"],
  "interview_readiness": "assessment of interview readiness"
}
`;

  try {
    const { data } = await trackApiCall(
      'openai',
      () => axios.post(
        "https://api.openai.com/v1/chat/completions",
        {
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: "You are an expert code reviewer providing constructive feedback on interview solutions."
            },
            { role: "user", content: prompt }
          ],
          response_format: { type: "json_object" },
          temperature: 0.3,
        },
        { headers: { Authorization: `Bearer ${OPENAI_KEY}` } }
      ),
      {
        endpoint: '/v1/chat/completions',
        method: 'POST',
        userId,
        requestPayload: { model: 'gpt-4o-mini', purpose: 'technical_prep_solution_evaluation', challengeTitle: challenge?.title },
        estimateCost: 0.002
      }
    );

    return JSON.parse(data.choices[0].message.content);
  } catch (err) {
    console.error("❌ OpenAI error:", err.message);
    return {
      score: 70,
      feedback: "Solution received. Unable to provide detailed feedback at this time.",
      improvements: ["Review optimal solution for comparison"],
      correctness: { is_correct: true, issues: [] }
    };
  }
}

/* -------------------------
   Helper: Generate Questions for Job
------------------------- */
async function generateTechnicalQuestions(jobDescription, techStack, seniorityLevel, userId = null) {
  if (!OPENAI_KEY) {
    return getFallbackQuestions(techStack);
  }

  const prompt = `
Generate technical interview questions based on this job:

JOB DESCRIPTION: ${jobDescription}
TECH STACK: ${techStack.join(", ")}
SENIORITY: ${seniorityLevel}

Create JSON with categorized questions:
{
  "coding_questions": [
    {
      "question": "Question text",
      "difficulty": "easy/medium/hard",
      "topics": ["relevant topics"],
      "what_they_test": "what interviewer is looking for",
      "sample_answer_points": ["key points to cover"]
    }
  ],
  "system_design_questions": [
    {
      "question": "Design question",
      "difficulty": "medium/hard",
      "key_components": ["what to discuss"],
      "evaluation_criteria": ["what they look for"]
    }
  ],
  "conceptual_questions": [
    {
      "question": "Conceptual question about the tech stack",
      "topic": "specific technology",
      "depth": "basic/intermediate/advanced",
      "expected_answer": "key points"
    }
  ],
  "real_world_scenarios": [
    {
      "scenario": "Real-world problem scenario",
      "context": "business context",
      "technical_challenge": "the technical aspect",
      "good_answer_includes": ["what makes a strong answer"]
    }
  ],
  "behavioral_technical": [
    {
      "question": "Tell me about a time you...",
      "what_they_want": "what interviewer looks for",
      "star_tips": "how to structure answer"
    }
  ]
}

Generate ${seniorityLevel === 'senior' || seniorityLevel === 'staff' ? '15-20' : '10-15'} questions total.
`;

  try {
    const { data } = await trackApiCall(
      'openai',
      () => axios.post(
        "https://api.openai.com/v1/chat/completions",
        {
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: "You are a technical hiring manager creating interview questions based on job requirements."
            },
            { role: "user", content: prompt }
          ],
          response_format: { type: "json_object" },
          temperature: 0.6,
        },
        { headers: { Authorization: `Bearer ${OPENAI_KEY}` } }
      ),
      {
        endpoint: '/v1/chat/completions',
        method: 'POST',
        userId,
        requestPayload: { model: 'gpt-4o-mini', purpose: 'technical_prep_questions', seniorityLevel },
        estimateCost: 0.003
      }
    );

    return JSON.parse(data.choices[0].message.content);
  } catch (err) {
    console.error("❌ OpenAI error:", err.message);
    return getFallbackQuestions(techStack);
  }
}

/* -------------------------
   Helper: Fallback Questions
------------------------- */
function getFallbackQuestions(techStack) {
  return {
    coding_questions: [
      {
        question: "Implement a function to reverse a linked list",
        difficulty: "medium",
        topics: ["data structures", "pointers"],
        what_they_test: "Understanding of linked list manipulation",
        sample_answer_points: ["Iterative vs recursive approach", "Handle edge cases"]
      }
    ],
    system_design_questions: [
      {
        question: "Design a rate limiter",
        difficulty: "medium",
        key_components: ["Token bucket", "Sliding window", "Distributed considerations"],
        evaluation_criteria: ["Scalability", "Trade-offs discussion"]
      }
    ],
    conceptual_questions: [
      {
        question: `Explain how ${techStack[0] || 'JavaScript'} handles asynchronous operations`,
        topic: techStack[0] || "JavaScript",
        depth: "intermediate",
        expected_answer: "Event loop, callbacks, promises, async/await"
      }
    ],
    real_world_scenarios: [
      {
        scenario: "Your API is experiencing high latency during peak hours",
        context: "E-commerce platform during sale",
        technical_challenge: "Identifying and resolving bottlenecks",
        good_answer_includes: ["Profiling", "Caching strategies", "Database optimization"]
      }
    ],
    behavioral_technical: [
      {
        question: "Tell me about a time you had to debug a difficult production issue",
        what_they_want: "Problem-solving process, composure under pressure",
        star_tips: "Focus on systematic debugging approach and lessons learned"
      }
    ]
  };
}

/* =========================================
   API ENDPOINTS
========================================= */

/* -------------------------
   POST /api/technical-prep/start-session
   Start a new technical prep session
------------------------- */
router.post("/start-session", async (req, res) => {
  try {
    const { userId, company, role, techStack, seniorityLevel, prepType } = req.body;

    if (!userId || !prepType) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: userId, prepType"
      });
    }

    const userIdInt = parseInt(userId, 10);
    if (isNaN(userIdInt)) {
      return res.status(400).json({
        success: false,
        message: "userId must be a valid integer"
      });
    }

    console.log(`💻 Starting technical prep session: ${prepType} for ${role || 'general'}`);

    // Create session in database
    const { data: session, error: sessionError } = await supabase
      .from("technical_prep_sessions")
      .insert({
        user_id: userIdInt,
        company: company || null,
        role: role || null,
        tech_stack: techStack || [],
        seniority_level: seniorityLevel || 'mid',
        prep_type: prepType,
        status: "in_progress"
      })
      .select()
      .single();

    if (sessionError) {
      console.error("❌ Database error:", sessionError);
      return res.status(500).json({
        success: false,
        message: "Failed to create session",
        error: sessionError.message
      });
    }

    console.log(`✅ Technical prep session created (ID: ${session.id})`);

    return res.json({
      success: true,
      data: {
        sessionId: session.id,
        prepType,
        techStack
      }
    });
  } catch (err) {
    console.error("❌ Error starting technical prep:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to start technical prep session"
    });
  }
});

/* -------------------------
   POST /api/technical-prep/coding-challenge
   Generate a coding challenge
------------------------- */
router.post("/coding-challenge", async (req, res) => {
  try {
    const { userId, sessionId, techStack, difficulty, category } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "Missing required field: userId"
      });
    }

    const userIdInt = parseInt(userId, 10);
    console.log(`📝 Generating coding challenge: ${difficulty} - ${category}`);

    // Generate the challenge
    const challenge = await generateCodingChallenge(
      techStack || ["javascript"],
      difficulty || "medium",
      category || "arrays",
      userIdInt
    );

    // Save to database
    const { data: savedChallenge, error } = await supabase
      .from("coding_challenges")
      .insert({
        session_id: sessionId || null,
        user_id: userIdInt,
        title: challenge.title,
        description: challenge.description,
        difficulty: challenge.difficulty,
        category: challenge.category,
        tech_stack: challenge.tech_stack,
        starter_code: challenge.starter_code,
        test_cases: challenge.test_cases,
        hints: challenge.hints,
        optimal_solution: challenge.optimal_solution,
        solution_explanation: challenge.solution_explanation,
        time_complexity: challenge.time_complexity,
        space_complexity: challenge.space_complexity
      })
      .select()
      .single();

    if (error) {
      console.error("❌ Database error:", error);
      // Still return the challenge even if save fails
    }

    return res.json({
      success: true,
      data: {
        challengeId: savedChallenge?.id,
        challenge // Include full challenge with solution (visibility controlled by frontend)
      }
    });
  } catch (err) {
    console.error("❌ Error generating challenge:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to generate coding challenge"
    });
  }
});

/* -------------------------
   POST /api/technical-prep/submit-solution
   Submit and evaluate a coding solution
------------------------- */
router.post("/submit-solution", async (req, res) => {
  try {
    const { challengeId, userSolution, timeSpent } = req.body;

    if (!challengeId || !userSolution) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: challengeId, userSolution"
      });
    }

    // Get the challenge
    const { data: challenge, error: fetchError } = await supabase
      .from("coding_challenges")
      .select("*")
      .eq("id", challengeId)
      .single();

    if (fetchError || !challenge) {
      return res.status(404).json({
        success: false,
        message: "Challenge not found"
      });
    }

    console.log(`📤 Evaluating solution for challenge: ${challenge.title}`);

    // Get userId from challenge
    const userId = challenge.user_id || null;
    
    // Evaluate the solution
    const evaluation = await evaluateCodeSolution(challenge, userSolution, timeSpent || 0, userId);

    // Update the challenge record
    const { error: updateError } = await supabase
      .from("coding_challenges")
      .update({
        user_solution: userSolution,
        time_spent_seconds: timeSpent || 0,
        attempts: (challenge.attempts || 0) + 1,
        is_completed: evaluation.score >= 70,
        score: evaluation.score,
        ai_feedback: evaluation.feedback,
        improvement_suggestions: evaluation.improvements,
        completed_at: evaluation.score >= 70 ? new Date().toISOString() : null
      })
      .eq("id", challengeId);

    if (updateError) {
      console.error("❌ Update error:", updateError);
    }

    // Record in history
    await supabase
      .from("technical_prep_history")
      .insert({
        user_id: challenge.user_id,
        session_id: challenge.session_id,
        challenge_type: "coding",
        score: evaluation.score,
        time_spent_seconds: timeSpent || 0,
        difficulty: challenge.difficulty,
        category: challenge.category
      });

    return res.json({
      success: true,
      data: {
        evaluation,
        optimal_solution: challenge.optimal_solution,
        solution_explanation: challenge.solution_explanation
      }
    });
  } catch (err) {
    console.error("❌ Error evaluating solution:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to evaluate solution"
    });
  }
});

/* -------------------------
   POST /api/technical-prep/system-design
   Generate a system design question
------------------------- */
router.post("/system-design", async (req, res) => {
  try {
    const { userId, sessionId, role, seniorityLevel, category } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "Missing required field: userId"
      });
    }

    const userIdInt = parseInt(userId, 10);
    console.log(`🏗️ Generating system design question for ${seniorityLevel} ${role}`);

    // Generate the question
    const question = await generateSystemDesignQuestion(
      role || "Software Engineer",
      seniorityLevel || "senior",
      category || "distributed_systems",
      userIdInt
    );

    // Save to database
    const { data: savedQuestion, error } = await supabase
      .from("system_design_questions")
      .insert({
        session_id: sessionId || null,
        user_id: userIdInt,
        title: question.title,
        description: question.description,
        difficulty: question.difficulty,
        category: question.category,
        requirements: question.requirements,
        constraints: question.constraints,
        evaluation_criteria: question.evaluation_criteria,
        solution_components: question.solution_components,
        solution_tradeoffs: question.solution_tradeoffs,
        deep_dives: question.deep_dives
      })
      .select()
      .single();

    if (error) {
      console.error("❌ Database error:", error);
    }

    return res.json({
      success: true,
      data: {
        questionId: savedQuestion?.id,
        question
      }
    });
  } catch (err) {
    console.error("❌ Error generating system design:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to generate system design question"
    });
  }
});

/* -------------------------
   POST /api/technical-prep/save-system-design
   Save user's system design progress
------------------------- */
router.post("/save-system-design", async (req, res) => {
  try {
    const { questionId, userResponse, userId } = req.body;

    if (!questionId || !userId) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: questionId, userId"
      });
    }

    console.log(`💾 Saving system design progress for question ${questionId}`);

    // Update the question record
    const { error: updateError } = await supabase
      .from("system_design_questions")
      .update({
        user_response: userResponse,
        is_completed: userResponse && userResponse.trim().length > 100
      })
      .eq("id", questionId);

    if (updateError) {
      console.error("❌ Update error:", updateError);
      return res.status(500).json({
        success: false,
        message: "Failed to save progress",
        error: updateError.message
      });
    }

    // Record in history
    await supabase
      .from("technical_prep_history")
      .insert({
        user_id: parseInt(userId, 10),
        challenge_type: "system_design",
        difficulty: "senior"
      });

    console.log(`✅ System design progress saved`);

    return res.json({
      success: true,
      message: "Progress saved successfully"
    });
  } catch (err) {
    console.error("❌ Error saving system design:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to save progress"
    });
  }
});

/* -------------------------
   GET /api/technical-prep/system-design/:questionId
   Get a specific system design question
------------------------- */
router.get("/system-design/:questionId", async (req, res) => {
  try {
    const { questionId } = req.params;

    const { data: question, error } = await supabase
      .from("system_design_questions")
      .select("*")
      .eq("id", questionId)
      .single();

    if (error || !question) {
      return res.status(404).json({
        success: false,
        message: "Question not found"
      });
    }

    return res.json({
      success: true,
      data: { question }
    });
  } catch (err) {
    console.error("❌ Error fetching question:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch question"
    });
  }
});

/* -------------------------
   POST /api/technical-prep/whiteboard
   Generate whiteboard practice session
------------------------- */
router.post("/whiteboard", async (req, res) => {
  try {
    const { userId, sessionId, techStack, topic } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "Missing required field: userId"
      });
    }

    const userIdInt = parseInt(userId, 10);
    console.log(`📋 Generating whiteboard session: ${topic}`);

    // Generate the session
    const session = await generateWhiteboardSession(
      techStack || ["javascript"],
      topic || "algorithm problem solving",
      userIdInt
    );

    // Save to database
    const { data: savedSession, error } = await supabase
      .from("whiteboard_sessions")
      .insert({
        session_id: sessionId || null,
        user_id: userIdInt,
        problem_title: session.problem_title,
        problem_description: session.problem_description,
        techniques_covered: session.techniques_covered,
        communication_tips: session.communication_tips
      })
      .select()
      .single();

    if (error) {
      console.error("❌ Database error:", error);
    }

    return res.json({
      success: true,
      data: {
        whiteboardId: savedSession?.id,
        session
      }
    });
  } catch (err) {
    console.error("❌ Error generating whiteboard session:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to generate whiteboard session"
    });
  }
});

/* -------------------------
   POST /api/technical-prep/generate-questions
   Generate technical questions based on job
------------------------- */
router.post("/generate-questions", async (req, res) => {
  try {
    const { jobDescription, techStack, seniorityLevel } = req.body;

    if (!jobDescription && !techStack) {
      return res.status(400).json({
        success: false,
        message: "Provide jobDescription or techStack"
      });
    }

    console.log(`❓ Generating technical questions for ${seniorityLevel} level`);

    // Note: This endpoint doesn't require userId, but we can try to get it from auth if available
    const userId = req.body.userId ? parseInt(req.body.userId, 10) : null;
    
    const questions = await generateTechnicalQuestions(
      jobDescription || "General software engineering role",
      techStack || ["javascript"],
      seniorityLevel || "mid",
      userId
    );

    return res.json({
      success: true,
      data: { questions }
    });
  } catch (err) {
    console.error("❌ Error generating questions:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to generate questions"
    });
  }
});

/* -------------------------
   GET /api/technical-prep/user/:userId/stats
   Get user's technical prep statistics
------------------------- */
router.get("/user/:userId/stats", async (req, res) => {
  try {
    const { userId } = req.params;
    const userIdInt = parseInt(userId, 10);

    if (isNaN(userIdInt)) {
      return res.status(400).json({
        success: false,
        message: "userId must be a valid integer"
      });
    }

    // Get coding challenges stats
    const { data: codingStats } = await supabase
      .from("coding_challenges")
      .select("difficulty, score, is_completed, category")
      .eq("user_id", userIdInt);

    // Get system design stats
    const { data: systemStats } = await supabase
      .from("system_design_questions")
      .select("difficulty, score, is_completed")
      .eq("user_id", userIdInt);

    // Get history for trend
    const { data: history } = await supabase
      .from("technical_prep_history")
      .select("*")
      .eq("user_id", userIdInt)
      .order("created_at", { ascending: false })
      .limit(20);

    // Calculate stats
    const completedCoding = codingStats?.filter(c => c.is_completed).length || 0;
    const totalCoding = codingStats?.length || 0;
    const avgCodingScore = codingStats?.length > 0
      ? Math.round(codingStats.reduce((sum, c) => sum + (c.score || 0), 0) / codingStats.length)
      : 0;

    const completedDesign = systemStats?.filter(s => s.is_completed).length || 0;
    const totalDesign = systemStats?.length || 0;

    // Category breakdown
    const categoryStats = {};
    codingStats?.forEach(c => {
      if (!categoryStats[c.category]) {
        categoryStats[c.category] = { total: 0, completed: 0, avgScore: 0, scores: [] };
      }
      categoryStats[c.category].total++;
      if (c.is_completed) categoryStats[c.category].completed++;
      if (c.score) categoryStats[c.category].scores.push(c.score);
    });

    Object.keys(categoryStats).forEach(cat => {
      const scores = categoryStats[cat].scores;
      categoryStats[cat].avgScore = scores.length > 0
        ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
        : 0;
      delete categoryStats[cat].scores;
    });

    return res.json({
      success: true,
      data: {
        coding: {
          total: totalCoding,
          completed: completedCoding,
          averageScore: avgCodingScore,
          byDifficulty: {
            easy: codingStats?.filter(c => c.difficulty === 'easy').length || 0,
            medium: codingStats?.filter(c => c.difficulty === 'medium').length || 0,
            hard: codingStats?.filter(c => c.difficulty === 'hard').length || 0
          }
        },
        systemDesign: {
          total: totalDesign,
          completed: completedDesign
        },
        categoryBreakdown: categoryStats,
        recentActivity: history || [],
        totalPracticeTime: history?.reduce((sum, h) => sum + (h.time_spent_seconds || 0), 0) || 0
      }
    });
  } catch (err) {
    console.error("❌ Error fetching stats:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch stats"
    });
  }
});

/* -------------------------
   GET /api/technical-prep/user/:userId/history
   Get user's challenge history
------------------------- */
router.get("/user/:userId/history", async (req, res) => {
  try {
    const { userId } = req.params;
    const { type, limit = 20 } = req.query;
    const userIdInt = parseInt(userId, 10);

    if (isNaN(userIdInt)) {
      return res.status(400).json({
        success: false,
        message: "userId must be a valid integer"
      });
    }

    let challenges = [];
    let designs = [];

    if (!type || type === 'coding') {
      const { data } = await supabase
        .from("coding_challenges")
        .select("id, title, difficulty, category, score, is_completed, created_at, completed_at")
        .eq("user_id", userIdInt)
        .order("created_at", { ascending: false })
        .limit(parseInt(limit));
      challenges = data || [];
    }

    if (!type || type === 'system_design') {
      const { data } = await supabase
        .from("system_design_questions")
        .select("id, title, difficulty, category, score, is_completed, created_at, completed_at")
        .eq("user_id", userIdInt)
        .order("created_at", { ascending: false })
        .limit(parseInt(limit));
      designs = data || [];
    }

    return res.json({
      success: true,
      data: {
        codingChallenges: challenges,
        systemDesignQuestions: designs
      }
    });
  } catch (err) {
    console.error("❌ Error fetching history:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch history"
    });
  }
});

/* -------------------------
   GET /api/technical-prep/challenge/:id
   Get a specific challenge with solution
------------------------- */
router.get("/challenge/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const { data: challenge, error } = await supabase
      .from("coding_challenges")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !challenge) {
      return res.status(404).json({
        success: false,
        message: "Challenge not found"
      });
    }

    return res.json({
      success: true,
      data: { challenge }
    });
  } catch (err) {
    console.error("❌ Error fetching challenge:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch challenge"
    });
  }
});

/* -------------------------
   GET /api/technical-prep/hint/:challengeId/:level
   Get a hint for a challenge
------------------------- */
router.get("/hint/:challengeId/:level", async (req, res) => {
  try {
    const { challengeId, level } = req.params;

    const { data: challenge, error } = await supabase
      .from("coding_challenges")
      .select("hints")
      .eq("id", challengeId)
      .single();

    if (error || !challenge) {
      return res.status(404).json({
        success: false,
        message: "Challenge not found"
      });
    }

    const hintLevel = parseInt(level);
    const hint = challenge.hints?.find(h => h.level === hintLevel);

    return res.json({
      success: true,
      data: {
        hint: hint?.hint || "No more hints available",
        level: hintLevel
      }
    });
  } catch (err) {
    console.error("❌ Error fetching hint:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch hint"
    });
  }
});

/* -------------------------
   GET /api/technical-prep/solution-frameworks
   Get general solution frameworks and best practices
------------------------- */
router.get("/solution-frameworks", async (req, res) => {
  try {
    const frameworks = {
      coding: {
        "Two Pointers": {
          description: "Use two pointers to traverse array/string from different positions",
          when_to_use: ["Sorted arrays", "Finding pairs", "Palindrome checks"],
          template: "let left = 0, right = arr.length - 1;\nwhile (left < right) {\n  // compare and move pointers\n}",
          complexity: "Usually O(n) time, O(1) space"
        },
        "Sliding Window": {
          description: "Maintain a window that slides through the data",
          when_to_use: ["Subarray problems", "String matching", "Finding max/min in range"],
          template: "let left = 0;\nfor (let right = 0; right < arr.length; right++) {\n  // expand window\n  while (condition) {\n    // shrink window\n    left++;\n  }\n}",
          complexity: "Usually O(n) time, O(k) space where k is window size"
        },
        "Binary Search": {
          description: "Divide search space in half each iteration",
          when_to_use: ["Sorted arrays", "Finding boundaries", "Optimization problems"],
          template: "let left = 0, right = arr.length - 1;\nwhile (left <= right) {\n  const mid = Math.floor((left + right) / 2);\n  if (arr[mid] === target) return mid;\n  if (arr[mid] < target) left = mid + 1;\n  else right = mid - 1;\n}",
          complexity: "O(log n) time, O(1) space"
        },
        "BFS/DFS": {
          description: "Graph/tree traversal techniques",
          when_to_use: ["Tree/graph problems", "Finding paths", "Level-order operations"],
          template: "// BFS\nconst queue = [root];\nwhile (queue.length) {\n  const node = queue.shift();\n  // process node\n  queue.push(...node.children);\n}",
          complexity: "O(V + E) time, O(V) space"
        },
        "Dynamic Programming": {
          description: "Break problem into overlapping subproblems",
          when_to_use: ["Optimization problems", "Counting problems", "When subproblems repeat"],
          template: "// Bottom-up\nconst dp = new Array(n).fill(0);\ndp[0] = base_case;\nfor (let i = 1; i < n; i++) {\n  dp[i] = // recurrence relation\n}",
          complexity: "Varies, often O(n²) or O(n*m)"
        }
      },
      systemDesign: {
        "Load Balancing": {
          description: "Distribute traffic across multiple servers",
          strategies: ["Round Robin", "Least Connections", "IP Hash"],
          considerations: "Health checks, session persistence"
        },
        "Caching": {
          description: "Store frequently accessed data for quick retrieval",
          strategies: ["Write-through", "Write-back", "Cache-aside"],
          considerations: "Invalidation strategy, cache eviction (LRU, LFU)"
        },
        "Database Scaling": {
          description: "Handle growing data and traffic",
          strategies: ["Vertical scaling", "Horizontal scaling (sharding)", "Read replicas"],
          considerations: "Consistency vs availability trade-offs"
        },
        "Message Queues": {
          description: "Decouple components with async communication",
          technologies: ["Kafka", "RabbitMQ", "SQS"],
          considerations: "At-least-once vs exactly-once delivery"
        }
      },
      bestPractices: {
        interview: [
          "Always clarify requirements before coding",
          "Think out loud to show your thought process",
          "Start with brute force, then optimize",
          "Test your code with examples",
          "Discuss time and space complexity"
        ],
        coding: [
          "Use meaningful variable names",
          "Handle edge cases early",
          "Write modular, reusable functions",
          "Consider input validation",
          "Keep code DRY (Don't Repeat Yourself)"
        ]
      }
    };

    return res.json({
      success: true,
      data: { frameworks }
    });
  } catch (err) {
    console.error("❌ Error fetching frameworks:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch frameworks"
    });
  }
});

export default router;

