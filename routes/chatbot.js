import express from "express";
import { query } from "../db.js";
import chatbotService from "../services/chatbotService.js";

const router = express.Router();

// Create new chatbot session
router.post("/api/chatbot/session", async (req, res) => {
  try {
    const { userType = 'guest', userId = null, currentPage = null, language = 'en' } = req.body;
    
    const sessionId = await chatbotService.createSession(userType, userId, currentPage, language);
    
    if (sessionId) {
      res.json({ 
        success: true, 
        sessionId: sessionId,
        botName: chatbotService.botName
      });
    } else {
      res.status(500).json({ 
        success: false, 
        message: "Failed to create session" 
      });
    }
  } catch (error) {
    console.error("Chatbot session creation error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Server error" 
    });
  }
});

// Process chatbot message
router.post("/api/chatbot/message", async (req, res) => {
  try {
    const { sessionId, message, userContext = {} } = req.body;
    
    if (!sessionId || !message) {
      return res.status(400).json({ 
        success: false, 
        message: "Session ID and message are required" 
      });
    }

    const response = await chatbotService.processMessage(sessionId, message, userContext);
    
    res.json({ 
      success: true, 
      ...response 
    });
  } catch (error) {
    console.error("Chatbot message processing error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Server error" 
    });
  }
});

// Get quick suggestions
router.get("/api/chatbot/suggestions", async (req, res) => {
  try {
    const { userType = 'donor', currentPage = 'home', language = 'en' } = req.query;
    
    const suggestions = await chatbotService.getQuickSuggestions(userType, currentPage, language);
    
    res.json({ 
      success: true, 
      suggestions: suggestions 
    });
  } catch (error) {
    console.error("Chatbot suggestions error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Server error" 
    });
  }
});

// Get contextual tips
router.get("/api/chatbot/tips", async (req, res) => {
  try {
    const { currentPage = 'home', language = 'en' } = req.query;
    
    const tips = chatbotService.getContextualTips(currentPage, language);
    
    res.json({ 
      success: true, 
      tips: tips 
    });
  } catch (error) {
    console.error("Chatbot tips error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Server error" 
    });
  }
});

// Get NGO recommendations
router.post("/api/chatbot/recommendations", async (req, res) => {
  try {
    const { city, donationType, language = 'en' } = req.body;
    
    if (!city || !donationType) {
      return res.status(400).json({ 
        success: false, 
        message: "City and donation type are required" 
      });
    }

    const recommendations = await chatbotService.getNGORecommendations(
      { city, donationType }, 
      language
    );
    
    res.json({ 
      success: true, 
      recommendations: recommendations 
    });
  } catch (error) {
    console.error("Chatbot recommendations error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Server error" 
    });
  }
});

// Get urgent needs
router.get("/api/chatbot/urgent-needs", async (req, res) => {
  try {
    const { city, language = 'en' } = req.query;
    
    const urgentNeeds = await chatbotService.getUrgentNeeds(city, language);
    
    res.json({ 
      success: true, 
      urgentNeeds: urgentNeeds 
    });
  } catch (error) {
    console.error("Chatbot urgent needs error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Server error" 
    });
  }
});

// Get conversation history
router.get("/api/chatbot/history/:sessionId", async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { limit = 20 } = req.query;
    
    const result = await query(`
      SELECT user_message, bot_response, response_type, created_at
      FROM chatbot_conversations
      WHERE session_id = ?
      ORDER BY created_at DESC
      LIMIT ?
    `, [sessionId, parseInt(limit)]);

    const history = result[0] || [];
    
    res.json({ 
      success: true, 
      history: history.reverse() // Show oldest first
    });
  } catch (error) {
    console.error("Chatbot history error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Server error" 
    });
  }
});

// Update session context
router.put("/api/chatbot/session/:sessionId", async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { currentPage, userContext } = req.body;
    
    await query(`
      UPDATE chatbot_sessions 
      SET current_page = ?, last_activity = CURRENT_TIMESTAMP
      WHERE session_id = ?
    `, [currentPage, sessionId]);
    
    res.json({ 
      success: true, 
      message: "Session updated" 
    });
  } catch (error) {
    console.error("Chatbot session update error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Server error" 
    });
  }
});

// Get FAQ categories
router.get("/api/chatbot/faq/categories", async (req, res) => {
  try {
    const { language = 'en' } = req.query;
    
    const result = await query(`
      SELECT DISTINCT category, COUNT(*) as count
      FROM chatbot_faq
      WHERE is_active = TRUE
      GROUP BY category
      ORDER BY category
    `);

    const categories = result[0] || [];
    
    res.json({ 
      success: true, 
      categories: categories 
    });
  } catch (error) {
    console.error("Chatbot FAQ categories error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Server error" 
    });
  }
});

// Get FAQ by category
router.get("/api/chatbot/faq/:category", async (req, res) => {
  try {
    const { category } = req.params;
    const { language = 'en' } = req.query;
    
    const questionField = language === 'hi' ? 'question_hi' : 'question_en';
    const answerField = language === 'hi' ? 'answer_hi' : 'answer_en';
    
    const result = await query(`
      SELECT id, ${questionField} as question, ${answerField} as answer, keywords
      FROM chatbot_faq
      WHERE category = ? AND is_active = TRUE
      ORDER BY priority DESC, created_at ASC
    `, [category]);

    const faqs = result[0] || [];
    
    res.json({ 
      success: true, 
      faqs: faqs 
    });
  } catch (error) {
    console.error("Chatbot FAQ error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Server error" 
    });
  }
});

// Search FAQ
router.get("/api/chatbot/faq/search", async (req, res) => {
  try {
    const { q, language = 'en' } = req.query;
    
    if (!q) {
      return res.status(400).json({ 
        success: false, 
        message: "Search query is required" 
      });
    }

    const questionField = language === 'hi' ? 'question_hi' : 'question_en';
    const answerField = language === 'hi' ? 'answer_hi' : 'answer_en';
    
    const result = await query(`
      SELECT id, ${questionField} as question, ${answerField} as answer, category, keywords
      FROM chatbot_faq
      WHERE (${questionField} LIKE ? OR ${answerField} LIKE ? OR keywords LIKE ?) 
      AND is_active = TRUE
      ORDER BY priority DESC
      LIMIT 10
    `, [`%${q}%`, `%${q}%`, `%${q}%`]);

    const faqs = result[0] || [];
    
    res.json({ 
      success: true, 
      faqs: faqs 
    });
  } catch (error) {
    console.error("Chatbot FAQ search error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Server error" 
    });
  }
});

export default router;
