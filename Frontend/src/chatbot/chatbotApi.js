import apiClient from '../api/apiClient';

export const chatbotApi = {
  /**
   * Send a question to the backend HirePulse Chatbot.
   * @param {string} message - User query
   * @param {Array} history - Previous messages [{ role: 'user'|'assistant', content: string }]
   * @param {Object} context - Optional page/role context
   */
  async sendMessage(message, history = [], context = {}) {
    const response = await apiClient.post('/api/v1/chatbot/chat', {
      message,
      history,
      context,
    });
    return response.data;
  },

  /**
   * Fetch initial greeting and starter questions.
   */
  async getStarters() {
    try {
      const response = await apiClient.get('/api/v1/chatbot/starter');
      return response.data;
    } catch {
      return {
        greeting: "👋 Hi! I'm the **HirePulse Platform Assistant**. We currently offer technical courses with AI ATS screening and proctored evaluations. How can I help you today?",
        suggested_questions: [
          "How many courses are there in HirePulse?",
          "Which roles & experience are eligible for each course?",
          "How does AI ATS shortlisting work?",
          "What happens during the AI Voice Interview?"
        ]
      };
    }
  },
};

