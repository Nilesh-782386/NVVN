import { query } from '../db.js';
import { v4 as uuidv4 } from 'uuid';

class ChatbotService {
  constructor() {
    this.botName = 'CareGuide';
    this.defaultLanguage = 'en';
    this.maxRecommendations = 3;
  }

  // Generate unique session ID
  generateSessionId() {
    return uuidv4();
  }

  // Create or get user session
  async createSession(userType = 'guest', userId = null, currentPage = null, language = 'en') {
    try {
      const sessionId = this.generateSessionId();
      
      await query(`
        INSERT INTO chatbot_sessions (session_id, user_type, user_id, current_page, language)
        VALUES (?, ?, ?, ?, ?)
      `, [sessionId, userType, userId, currentPage, language]);

      return sessionId;
    } catch (error) {
      console.error('Error creating chatbot session:', error);
      return null;
    }
  }

  // Get existing session
  async getSession(sessionId) {
    try {
      const result = await query(`
        SELECT * FROM chatbot_sessions WHERE session_id = ? AND is_active = TRUE
      `, [sessionId]);

      return result[0] && result[0][0] ? result[0][0] : null;
    } catch (error) {
      console.error('Error getting chatbot session:', error);
      return null;
    }
  }

  // Update session activity
  async updateSessionActivity(sessionId) {
    try {
      await query(`
        UPDATE chatbot_sessions SET last_activity = CURRENT_TIMESTAMP WHERE session_id = ?
      `, [sessionId]);
    } catch (error) {
      console.error('Error updating session activity:', error);
    }
  }

  // Simple NLP for question matching
  matchQuestion(userMessage, faqQuestions, language = 'en') {
    const message = userMessage.toLowerCase();
    const questionField = language === 'hi' ? 'question_hi' : 'question_en';
    
    // Direct match
    for (const faq of faqQuestions) {
      const question = (faq[questionField] || '').toLowerCase();
      if (question.includes(message) || message.includes(question)) {
        return { faq, score: 1.0, type: 'direct' };
      }
    }

    // Keyword matching
    const keywordMatches = [];
    for (const faq of faqQuestions) {
      const keywords = (faq.keywords || '').toLowerCase().split(',').map(k => k.trim());
      let matchCount = 0;
      
      for (const keyword of keywords) {
        if (message.includes(keyword)) {
          matchCount++;
        }
      }
      
      if (matchCount > 0) {
        const score = matchCount / keywords.length;
        keywordMatches.push({ faq, score, type: 'keyword' });
      }
    }

    // Return best match
    if (keywordMatches.length > 0) {
      keywordMatches.sort((a, b) => b.score - a.score);
      return keywordMatches[0];
    }

    return null;
  }

  // Process user message and generate response
  async processMessage(sessionId, userMessage, userContext = {}) {
    try {
      const session = await this.getSession(sessionId);
      if (!session) {
        return this.getDefaultResponse('en');
      }

      const language = session.language || 'en';
      const userType = session.user_type || 'guest';

      // Update session activity
      await this.updateSessionActivity(sessionId);

      // Get FAQ data
      const faqResult = await query(`
        SELECT * FROM chatbot_faq WHERE is_active = TRUE ORDER BY priority DESC
      `);

      const faqData = faqResult[0] || [];

      // Try to match with FAQ
      const match = this.matchQuestion(userMessage, faqData, language);
      
      let response = null;
      let responseType = 'general';

      if (match && match.score > 0.3) {
        // FAQ match found
        const answerField = language === 'hi' ? 'answer_hi' : 'answer_en';
        response = match.faq[answerField] || match.faq.answer_en;
        responseType = 'faq';
      } else {
        // Check for specific intents
        const intent = this.detectIntent(userMessage, language);
        
        switch (intent.type) {
          case 'ngo_recommendation':
            response = await this.getNGORecommendations(userContext, language);
            responseType = 'recommendation';
            break;
          case 'donation_guidance':
            response = this.getDonationGuidance(intent.step, language);
            responseType = 'guidance';
            break;
          case 'status_tracking':
            response = this.getStatusTrackingGuidance(language);
            responseType = 'guidance';
            break;
          case 'urgent_needs':
            response = await this.getUrgentNeeds(userContext.city, language);
            responseType = 'notification';
            break;
          default:
            response = this.getDefaultResponse(language);
        }
      }

      // Save conversation
      await this.saveConversation(sessionId, userMessage, response, responseType);

      return {
        response: response,
        type: responseType,
        sessionId: sessionId,
        language: language,
        botName: this.botName
      };

    } catch (error) {
      console.error('Error processing chatbot message:', error);
      return {
        response: 'I apologize, but I encountered an error. Please try again or contact support.',
        type: 'error',
        sessionId: sessionId,
        language: 'en',
        botName: this.botName
      };
    }
  }

  // Detect user intent from message
  detectIntent(message, language = 'en') {
    const msg = message.toLowerCase();
    
    // NGO recommendation intent
    if (msg.includes('recommend') || msg.includes('suggest') || msg.includes('which ngo') || 
        msg.includes('best ngo') || msg.includes('suitable ngo')) {
      return { type: 'ngo_recommendation' };
    }

    // Donation guidance intent
    if (msg.includes('how to donate') || msg.includes('donation process') || 
        msg.includes('step by step') || msg.includes('guide')) {
      return { type: 'donation_guidance', step: 'overview' };
    }

    // Status tracking intent
    if (msg.includes('track') || msg.includes('status') || msg.includes('where is') || 
        msg.includes('progress') || msg.includes('update')) {
      return { type: 'status_tracking' };
    }

    // Urgent needs intent
    if (msg.includes('urgent') || msg.includes('emergency') || msg.includes('needed') || 
        msg.includes('critical') || msg.includes('immediate')) {
      return { type: 'urgent_needs' };
    }

    return { type: 'general' };
  }

  // Get NGO recommendations based on context
  async getNGORecommendations(context, language = 'en') {
    try {
      const { city, donationType } = context;
      
      if (!city || !donationType) {
        return language === 'hi' 
          ? 'कृपया अपना शहर और दान का प्रकार बताएं ताकि मैं आपको सबसे अच्छे एनजीओ की सिफारिश कर सकूं।'
          : 'Please provide your city and donation type so I can recommend the best NGOs for you.';
      }

      const result = await query(`
        SELECT nr.*, n.ngo_name, n.primary_phone, n.email
        FROM ngo_recommendations nr
        JOIN ngo_register n ON nr.ngo_id = n.id
        WHERE nr.user_city = ? AND nr.donation_type = ? AND nr.is_active = TRUE
        ORDER BY nr.match_percentage DESC
        LIMIT ?
      `, [city, donationType, parseInt(this.maxRecommendations)]);

      const recommendations = result[0] || [];

      if (recommendations.length === 0) {
        return language === 'hi'
          ? `क्षमा करें, ${city} में ${donationType} के लिए कोई एनजीओ सिफारिश उपलब्ध नहीं है।`
          : `Sorry, no NGO recommendations available for ${donationType} in ${city}.`;
      }

      let response = language === 'hi' 
        ? `आपके ${donationType} दान के लिए शीर्ष ${recommendations.length} अनुशंसित एनजीओ:\n\n`
        : `Top ${recommendations.length} Recommended NGOs for your ${donationType} donation:\n\n`;

      recommendations.forEach((rec, index) => {
        const matchPercent = Math.round(rec.match_percentage);
        const speed = rec.approval_speed_hours ? `${rec.approval_speed_hours}h` : 'N/A';
        const distance = rec.distance_km ? `${rec.distance_km}km` : 'N/A';

        response += `${index + 1}. **${rec.ngo_name}** (${matchPercent}% match)\n`;
        response += `   📍 Distance: ${distance}\n`;
        response += `   ⚡ Approval Speed: ${speed}\n`;
        response += `   📞 Contact: ${rec.primary_phone}\n`;
        if (rec.current_needs) {
          response += `   🎯 Current Needs: ${rec.current_needs}\n`;
        }
        response += `   💡 Reason: ${rec.recommendation_reason}\n\n`;
      });

      return response;

    } catch (error) {
      console.error('Error getting NGO recommendations:', error);
      return language === 'hi'
        ? 'एनजीओ सिफारिशें प्राप्त करने में त्रुटि हुई। कृपया बाद में पुनः प्रयास करें।'
        : 'Error getting NGO recommendations. Please try again later.';
    }
  }

  // Get donation process guidance
  getDonationGuidance(step, language = 'en') {
    const guidance = {
      overview: language === 'hi' 
        ? `दान प्रक्रिया के चरण:\n\n1️⃣ **आइटम चुनें** - अपने दान की वस्तुएं चुनें\n2️⃣ **विवरण भरें** - मात्रा, विवरण और पता जोड़ें\n3️⃣ **फोटो अपलोड करें** - स्पष्ट तस्वीरें लें\n4️⃣ **सबमिट करें** - एनजीओ अनुमोदन के लिए भेजें\n5️⃣ **ट्रैक करें** - अपने डैशबोर्ड में प्रगति देखें\n\n💡 **प्रो टिप:** स्पष्ट फोटो लें ताकि तेजी से अनुमोदन मिले!`
        : `Donation Process Steps:\n\n1️⃣ **Select Items** - Choose your donation items\n2️⃣ **Add Details** - Add quantity, description, and address\n3️⃣ **Upload Photos** - Take clear pictures\n4️⃣ **Submit** - Send for NGO approval\n5️⃣ **Track** - Monitor progress in your dashboard\n\n💡 **Pro Tip:** Take clear photos for faster approval!`,
      
      items: language === 'hi'
        ? `दान आइटम चुनने के लिए:\n\n• **खाद्य पदार्थ:** चावल, गेहूं, दालें, तेल\n• **कपड़े:** सर्दियों के कपड़े, बच्चों के कपड़े\n• **स्कूल सामग्री:** किताबें, कलम, बैग\n• **खिलौने:** शैक्षिक खिलौने, खेल सामग्री\n\n🎯 **सुझाव:** अपने शहर की वर्तमान जरूरतों की जांच करें!`
        : `For selecting donation items:\n\n• **Food Items:** Rice, wheat, pulses, oil\n• **Clothes:** Winter wear, children's clothes\n• **School Supplies:** Books, pens, bags\n• **Toys:** Educational toys, sports equipment\n\n🎯 **Suggestion:** Check current needs in your city!`,
      
      photos: language === 'hi'
        ? `अच्छी फोटो लेने के लिए:\n\n📸 **सुझाव:**\n• अच्छी रोशनी में लें\n• सभी आइटम दिखाएं\n• स्पष्ट और फोकस्ड रखें\n• अलग-अलग कोण से लें\n• लेबल और ब्रांड दिखाएं\n\n⚡ **फायदा:** स्पष्ट फोटो से तेजी से अनुमोदन मिलता है!`
        : `For taking good photos:\n\n📸 **Tips:**\n• Take in good lighting\n• Show all items clearly\n• Keep focused and sharp\n• Take from different angles\n• Show labels and brands\n\n⚡ **Benefit:** Clear photos get faster approval!`
    };

    return guidance[step] || guidance.overview;
  }

  // Get status tracking guidance
  getStatusTrackingGuidance(language = 'en') {
    return language === 'hi'
      ? `दान स्थिति ट्रैक करने के लिए:\n\n1️⃣ **लॉग इन करें** - अपने दानकर्ता खाते में\n2️⃣ **दान इतिहास** - डैशबोर्ड पर क्लिक करें\n3️⃣ **रियल-टाइम अपडेट** - हर 30 सेकंड में अपडेट\n4️⃣ **स्थिति देखें:**\n   • ⏳ पेंडिंग - एनजीओ अनुमोदन की प्रतीक्षा\n   • ✅ अनुमोदित - स्वयंसेवक असाइनमेंट\n   • 🚚 पिकअप - स्वयंसेवक द्वारा उठाया गया\n   • 📦 डिलीवर - सफलतापूर्वक पहुंचाया गया\n\n💡 **सूचना:** आपको हर चरण पर सूचनाएं मिलेंगी!`
      : `To track donation status:\n\n1️⃣ **Login** - To your donor account\n2️⃣ **Donation History** - Click on dashboard\n3️⃣ **Real-time Updates** - Updates every 30 seconds\n4️⃣ **Status Types:**\n   • ⏳ Pending - Waiting for NGO approval\n   • ✅ Approved - Volunteer assignment\n   • 🚚 Picked Up - Collected by volunteer\n   • 📦 Delivered - Successfully delivered\n\n💡 **Note:** You'll get notifications at every step!`;
  }

  // Get urgent needs in city
  async getUrgentNeeds(city, language = 'en') {
    try {
      const result = await query(`
        SELECT * FROM chatbot_notifications 
        WHERE target_audience IN ('donors', 'all') 
        AND (target_city = ? OR target_city IS NULL)
        AND is_active = TRUE 
        AND (expires_at IS NULL OR expires_at > NOW())
        ORDER BY 
          CASE priority 
            WHEN 'urgent' THEN 1 
            WHEN 'high' THEN 2 
            WHEN 'medium' THEN 3 
            ELSE 4 
          END,
          created_at DESC
        LIMIT 3
      `, [city]);

      const notifications = result[0] || [];

      if (notifications.length === 0) {
        return language === 'hi'
          ? 'वर्तमान में कोई तत्काल जरूरत नहीं है। आप अपना दान जारी रख सकते हैं!'
          : 'No urgent needs at the moment. You can continue with your donation!';
      }

      let response = language === 'hi' 
        ? `🚨 **तत्काल जरूरतें** (${city}):\n\n`
        : `🚨 **Urgent Needs** (${city}):\n\n`;

      notifications.forEach((notif, index) => {
        const titleField = language === 'hi' ? 'title_hi' : 'title_en';
        const messageField = language === 'hi' ? 'message_hi' : 'message_en';
        
        response += `${index + 1}. **${notif[titleField] || notif.title_en}**\n`;
        response += `   ${notif[messageField] || notif.message_en}\n\n`;
      });

      return response;

    } catch (error) {
      console.error('Error getting urgent needs:', error);
      return language === 'hi'
        ? 'तत्काल जरूरतें प्राप्त करने में त्रुटि हुई।'
        : 'Error getting urgent needs.';
    }
  }

  // Get default response
  getDefaultResponse(language = 'en') {
    const responses = {
      en: `Hello! I'm ${this.botName}, your donation assistant. I can help you with:\n\n• 📋 Donation process guidance\n• 🏢 NGO recommendations\n• 📊 Status tracking\n• ❓ Common questions\n• 🚨 Urgent needs in your area\n\nHow can I assist you today?`,
      hi: `नमस्ते! मैं ${this.botName} हूं, आपका दान सहायक। मैं आपकी मदद कर सकता हूं:\n\n• 📋 दान प्रक्रिया मार्गदर्शन\n• 🏢 एनजीओ सिफारिशें\n• 📊 स्थिति ट्रैकिंग\n• ❓ सामान्य प्रश्न\n• 🚨 आपके क्षेत्र में तत्काल जरूरतें\n\nआज मैं आपकी कैसे मदद कर सकता हूं?`
    };

    return responses[language] || responses.en;
  }

  // Save conversation to database
  async saveConversation(sessionId, userMessage, botResponse, responseType) {
    try {
      await query(`
        INSERT INTO chatbot_conversations (session_id, user_message, bot_response, response_type)
        VALUES (?, ?, ?, ?)
      `, [sessionId, userMessage, botResponse, responseType]);
    } catch (error) {
      console.error('Error saving conversation:', error);
    }
  }

  // Get quick suggestions based on user type and page
  async getQuickSuggestions(userType, currentPage, language = 'en') {
    const suggestions = {
      donor: {
        home: language === 'hi' 
          ? ['दान कैसे करें?', 'मेरे शहर में क्या जरूरत है?', 'दान स्थिति कैसे ट्रैक करें?']
          : ['How to donate?', 'What is needed in my city?', 'How to track donation status?'],
        donate: language === 'hi'
          ? ['कौन सा एनजीओ सुझाएं?', 'फोटो कैसे लें?', 'क्या पैक करना है?']
          : ['Which NGO to suggest?', 'How to take photos?', 'What to pack?'],
        dashboard: language === 'hi'
          ? ['मेरा दान कहां है?', 'कब मिलेगा?', 'स्वयंसेवक कौन है?']
          : ['Where is my donation?', 'When will it arrive?', 'Who is the volunteer?']
      },
      ngo: {
        dashboard: language === 'hi'
          ? ['दैनिक सीमा क्या है?', 'कैसे अनुमोदन करें?', 'स्वयंसेवक कैसे असाइन करें?']
          : ['What is daily limit?', 'How to approve?', 'How to assign volunteer?']
      },
      volunteer: {
        dashboard: language === 'hi'
          ? ['कौन सा दान लें?', 'कैसे पिकअप करें?', 'प्रूफ कैसे अपलोड करें?']
          : ['Which donation to take?', 'How to pickup?', 'How to upload proof?']
      }
    };

    return suggestions[userType]?.[currentPage] || suggestions.donor.home;
  }

  // Get contextual tips based on current page
  getContextualTips(currentPage, language = 'en') {
    const tips = {
      donate: language === 'hi'
        ? '💡 **प्रो टिप:** स्पष्ट फोटो लें और सही मात्रा दर्ज करें ताकि तेजी से अनुमोदन मिले!'
        : '💡 **Pro Tip:** Take clear photos and enter correct quantities for faster approval!',
      dashboard: language === 'hi'
        ? '💡 **प्रो टिप:** आपका दान हर 30 सेकंड में अपडेट होता है। पेज रिफ्रेश करने की जरूरत नहीं!'
        : '💡 **Pro Tip:** Your donation updates every 30 seconds. No need to refresh the page!',
      history: language === 'hi'
        ? '💡 **प्रो टिप:** डिलीवरी प्रूफ देखने के लिए "प्रूफ" बटन पर क्लिक करें!'
        : '💡 **Pro Tip:** Click the "Proof" button to view delivery proof!'
    };

    return tips[currentPage] || '';
  }
}

export default new ChatbotService();
