const ResumeAnalysis = require('../models/ResumeAnalysis');
const ProctorSession = require('../models/ProctorSession');

// Comprehensive role-tailored question bank
const ROLE_QUESTION_BANKS = {
  python: [
    {
      id: 101,
      role: 'python',
      question: 'In Python, what is the output of `[i * 2 for i in range(5) if i % 2 == 0]`?',
      options: [
        '[0, 4, 8]',
        '[0, 2, 4, 6, 8]',
        '[2, 6]',
        '[0, 2, 4]'
      ],
      correctIndex: 0,
      explanation: '`range(5)` produces 0, 1, 2, 3, 4. The condition `i % 2 == 0` filters for 0, 2, 4. Multiplying each by 2 yields `[0, 4, 8]`.'
    },
    {
      id: 102,
      role: 'python',
      question: 'What is the Global Interpreter Lock (GIL) in CPython and what is its primary effect?',
      options: [
        'A lock that prevents Python scripts from importing external C libraries',
        'A mutex that allows only one native thread to execute Python bytecode at a time',
        'A memory allocation manager that garbage collects circular references',
        'A compiler flag that enables JIT optimizations'
      ],
      correctIndex: 1,
      explanation: 'The GIL is a mutex in CPython that synchronizes thread execution, preventing multi-threaded CPU-bound Python code from executing in parallel on multiple cores.'
    },
    {
      id: 103,
      role: 'python',
      question: 'Which built-in Python function/keyword transforms a normal function into a generator?',
      options: [
        '`return`',
        '`yield`',
        '`async def`',
        '`lambda`'
      ],
      correctIndex: 1,
      explanation: 'Using `yield` inside a function body causes it to return a generator iterator that produces values lazily on demand.'
    },
    {
      id: 104,
      role: 'python',
      question: 'What is the key difference between `@staticmethod` and `@classmethod` in Python?',
      options: [
        '`@classmethod` receives the class object (`cls`) as first argument, while `@staticmethod` receives no implicit first argument',
        '`@staticmethod` can only access private instance attributes',
        '`@classmethod` is executed at compile time only',
        'There is no difference; they are interchangeable aliases'
      ],
      correctIndex: 0,
      explanation: '`@classmethod` passes the calling class as `cls` allowing factory methods, whereas `@staticmethod` behaves like a plain function bound to the class namespace.'
    },
    {
      id: 105,
      role: 'python',
      question: 'How does Python handle memory management and cleanup of objects with circular references?',
      options: [
        'Exclusively through reference counting (circular references cause permanent memory leaks)',
        'Reference counting supplemented by a cyclic generational garbage collector',
        'By storing all objects in non-volatile virtual memory cache',
        'Through compile-time manual free() statements'
      ],
      correctIndex: 1,
      explanation: 'Python uses reference counting for immediate cleanup and a cyclic garbage collector (`gc` module) that detects and resolves circular reference cycles.'
    }
  ],
  javascript: [
    {
      id: 201,
      role: 'javascript',
      question: 'In modern JavaScript, what is the output of `typeof null` and why?',
      options: [
        'null — because it is a primitive type',
        '"object" — due to a legacy bug in JS type representation where 0x00 tagged objects',
        'undefined — since null represents absence of value',
        '"null" — ES6 standardized it as a distinct string tag'
      ],
      correctIndex: 1,
      explanation: '`typeof null === "object"` is a famous legacy artifact from the initial JS implementation where types were tagged by prefixes.'
    },
    {
      id: 202,
      role: 'javascript',
      question: 'Which of the following best describes how JavaScript Promise microtasks are scheduled vs macrotasks (e.g. `setTimeout`) in the Event Loop?',
      options: [
        'Macrotasks execute before microtasks in every cycle',
        'All microtasks in the microtask queue are drained immediately after the current synchronous script finishes and before the next macrotask is processed',
        'Microtasks run on a separate WebAssembly background thread',
        'Microtasks and macrotasks execute concurrently in parallel'
      ],
      correctIndex: 1,
      explanation: 'Microtasks (`Promise.then`, `queueMicrotask`, `process.nextTick`) have higher priority and drain completely before the event loop advances to the next macrotask.'
    },
    {
      id: 203,
      role: 'javascript',
      question: 'What is a JavaScript Closure?',
      options: [
        'A method to immediately terminate recursive call stacks',
        'A function bundled together with references to its surrounding lexical state / scope',
        'A syntax for declaring private object properties using #',
        'A browser API for closing inactive WebSockets'
      ],
      correctIndex: 1,
      explanation: 'A closure gives an inner function access to its outer enclosing function scope even after the outer function has returned.'
    },
    {
      id: 204,
      role: 'javascript',
      question: 'In React 18+, what is the purpose of `useId()` Hook?',
      options: [
        'Generates unique stable IDs across client and server to prevent hydration mismatches in accessible form inputs',
        'Fetches the candidate ID from MongoDB database',
        'Generates cryptographic UUID tokens for JWT headers',
        'Assigns random CSS classnames to component elements'
      ],
      correctIndex: 0,
      explanation: '`useId` is a React Hook for generating unique, deterministic IDs that are stable across server and client rendering.'
    },
    {
      id: 205,
      role: 'javascript',
      question: 'In Node.js, what library powers the asynchronous non-blocking I/O event loop and thread pool?',
      options: [
        'libuv',
        'V8 TurboFan',
        'glibc',
        'OpenSSL'
      ],
      correctIndex: 0,
      explanation: '`libuv` is the multi-platform C library that handles the event loop, thread pool, async file operations, and networking in Node.js.'
    }
  ],
  fullstack: [
    {
      id: 301,
      role: 'fullstack',
      question: 'Which HTTP status code should a REST API return when a resource is successfully created?',
      options: [
        '200 OK',
        '201 Created',
        '204 No Content',
        '302 Found'
      ],
      correctIndex: 1,
      explanation: 'HTTP 201 Created is the standard response indicating that the request succeeded and a new resource was created.'
    },
    {
      id: 302,
      role: 'fullstack',
      question: 'What is the primary benefit of database indexing in MongoDB / PostgreSQL?',
      options: [
        'Reduces disk storage consumed by documents',
        'Accelerates query lookups from O(N) full table scan to O(log N) tree traversal',
        'Encrypts sensitive table columns at rest',
        'Automatically normalizes database schemas'
      ],
      correctIndex: 1,
      explanation: 'Indexes create B-Tree data structures that allow high-speed O(log N) lookups without scanning every document.'
    },
    {
      id: 303,
      role: 'fullstack',
      question: 'In React, what is the fundamental purpose of the `key` prop when rendering lists of elements?',
      options: [
        'It styles the list items with unique CSS identifiers',
        'It helps React identify which items have changed, been added, or removed for efficient Virtual DOM diffing',
        'It binds click event listeners to the root component',
        'It prevents components from ever re-rendering'
      ],
      correctIndex: 1,
      explanation: 'Keys give elements a stable identity across renders, enabling the React Reconciliation algorithm to reuse DOM nodes.'
    },
    {
      id: 304,
      role: 'fullstack',
      question: 'What is the primary mechanism of Cross-Origin Resource Sharing (CORS)?',
      options: [
        'HTTP request headers where browser and server negotiate whether cross-origin domain requests are permitted',
        'An encryption layer for HTTPS sockets',
        'A client-side cookie storage mechanism',
        'A DNS routing firewall protocol'
      ],
      correctIndex: 0,
      explanation: 'CORS uses HTTP response headers (like `Access-Control-Allow-Origin`) to let servers declare which origins are authorized to access their resources.'
    },
    {
      id: 305,
      role: 'fullstack',
      question: 'Which indexing strategy in MongoDB is best suited for queries sorting or filtering across two separate fields simultaneously?',
      options: [
        'Single Field Index',
        'Compound Index (e.g. `{ status: 1, createdAt: -1 }`)',
        'Geospatial 2dsphere Index',
        'Hashed Index'
      ],
      correctIndex: 1,
      explanation: 'Compound indexes index multiple fields together in a specific order, optimizing multi-field queries and sort operations.'
    }
  ]
};

// 1. Fetch Role-Tailored Assessment Questions from Backend
const getAssessmentQuestions = async (req, res) => {
  try {
    const { role = 'fullstack', candidateId, count = 5 } = req.query;

    const normalizedRole = role.toLowerCase().trim();
    let selectedQuestions = [];

    if (normalizedRole.includes('python') || normalizedRole.includes('django') || normalizedRole.includes('flask') || normalizedRole.includes('fastapi')) {
      selectedQuestions = ROLE_QUESTION_BANKS.python;
    } else if (normalizedRole.includes('js') || normalizedRole.includes('javascript') || normalizedRole.includes('react') || normalizedRole.includes('node') || normalizedRole.includes('frontend')) {
      selectedQuestions = ROLE_QUESTION_BANKS.javascript;
    } else {
      selectedQuestions = ROLE_QUESTION_BANKS.fullstack;
    }

    // Try finding candidate details if candidateId is supplied
    let candidateName = 'Candidate';
    let targetRole = role;

    if (candidateId && candidateId.match(/^[0-9a-fA-F]{24}$/)) {
      try {
        const cand = await ResumeAnalysis.findById(candidateId);
        if (cand?.candidateDetails) {
          candidateName = cand.candidateDetails.fullName || candidateName;
          targetRole = cand.candidateDetails.targetRole || targetRole;
        }
      } catch (e) {
        // Fallback
      }
    }

    return res.status(200).json({
      success: true,
      role: targetRole,
      candidateName,
      total: selectedQuestions.length,
      questions: selectedQuestions.slice(0, Number(count) || 5)
    });
  } catch (error) {
    console.error('Failed to get assessment questions:', error);
    return res.status(500).json({ success: false, error: 'Failed to retrieve assessment questions', details: error.message });
  }
};

// 2. Submit Assessment Exam
const submitAssessment = async (req, res) => {
  try {
    const { candidateId, sessionId, answers, score, correctCount, totalQuestions, proctorMetrics } = req.body;

    const submissionId = `SUB-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 900 + 100)}`;

    if (sessionId && sessionId.match(/^[0-9a-fA-F]{24}$/)) {
      try {
        const session = await ProctorSession.findById(sessionId);
        if (session) {
          session.examResult = {
            score: Number(score) || 0,
            correctCount: Number(correctCount) || 0,
            totalQuestions: Number(totalQuestions) || 5,
            submissionId,
            submittedAt: new Date()
          };
          if (proctorMetrics) {
            session.proctorMetrics = proctorMetrics;
          }
          if (session.status !== 'terminated') {
            session.status = session.violations?.length >= 3 ? 'flagged' : 'completed';
          }
          await session.save();
        }
      } catch (e) {
        console.warn('Could not update proctor session on submit:', e.message);
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Assessment submitted successfully and saved to backend database.',
      submissionId,
      score,
      correctCount,
      totalQuestions
    });
  } catch (error) {
    console.error('Failed to submit assessment:', error);
    return res.status(500).json({ success: false, error: 'Failed to submit assessment', details: error.message });
  }
};

module.exports = {
  getAssessmentQuestions,
  submitAssessment
};
