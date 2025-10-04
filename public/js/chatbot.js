class CareConnectChatbot {
  constructor() {
    this.isOpen = false;
    this.sessionId = null;
    this.currentLanguage = 'en';
    this.userType = 'guest';
    this.currentPage = 'home';
    this.isTyping = false;
    
    this.init();
  }

  init() {
    this.createChatWidget();
    this.createChatInterface();
    this.bindEvents();
    this.createSession();
  }

  createChatWidget() {
    // Create floating chat button
    const chatButton = document.createElement('div');
    chatButton.id = 'chatbot-button';
    chatButton.innerHTML = `
      <div class="chatbot-icon">
        <i class="fas fa-robot"></i>
        <span class="chatbot-badge" id="chatbot-badge" style="display: none;">1</span>
      </div>
      <div class="chatbot-tooltip">
        <span>Ask CareGuide</span>
      </div>
    `;
    
    // Create chat interface
    const chatInterface = document.createElement('div');
    chatInterface.id = 'chatbot-interface';
    chatInterface.innerHTML = `
      <div class="chatbot-header">
        <div class="chatbot-title">
          <i class="fas fa-robot"></i>
          <span>CareGuide</span>
          <span class="chatbot-subtitle">Your Donation Assistant</span>
        </div>
        <div class="chatbot-controls">
          <button class="chatbot-minimize" id="chatbot-minimize">
            <i class="fas fa-minus"></i>
          </button>
          <button class="chatbot-close" id="chatbot-close">
            <i class="fas fa-times"></i>
          </button>
        </div>
      </div>
      
      <div class="chatbot-body">
        <div class="chatbot-messages" id="chatbot-messages">
          <div class="chatbot-welcome">
            <div class="welcome-message">
              <i class="fas fa-heart text-primary"></i>
              <h5>Welcome to CareGuide!</h5>
              <p>I'm here to help you with donations, NGO recommendations, and any questions you have.</p>
            </div>
          </div>
        </div>
        
        <div class="chatbot-suggestions" id="chatbot-suggestions">
          <!-- Quick suggestions will be loaded here -->
        </div>
        
        <div class="chatbot-typing" id="chatbot-typing" style="display: none;">
          <div class="typing-indicator">
            <span></span>
            <span></span>
            <span></span>
          </div>
          <span>CareGuide is typing...</span>
        </div>
      </div>
      
      <div class="chatbot-footer">
        <div class="chatbot-input-container">
          <input type="text" id="chatbot-input" placeholder="Type your message..." maxlength="500">
          <button id="chatbot-send" disabled>
            <i class="fas fa-paper-plane"></i>
          </button>
        </div>
        <div class="chatbot-actions">
          <button class="chatbot-action-btn" id="chatbot-language" title="Switch Language">
            <i class="fas fa-language"></i>
            <span>EN</span>
          </button>
          <button class="chatbot-action-btn" id="chatbot-clear" title="Clear Chat">
            <i class="fas fa-trash"></i>
          </button>
        </div>
      </div>
    `;
    
    // Add to page
    document.body.appendChild(chatButton);
    document.body.appendChild(chatInterface);
    
    // Add CSS
    this.addStyles();
  }

  addStyles() {
    const styles = `
      <style>
        /* Chatbot Widget Styles */
        #chatbot-button {
          position: fixed;
          bottom: 20px;
          right: 20px;
          width: 60px;
          height: 60px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border-radius: 50%;
          cursor: pointer;
          box-shadow: 0 4px 20px rgba(102, 126, 234, 0.4);
          z-index: 1000;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        #chatbot-button:hover {
          transform: scale(1.1);
          box-shadow: 0 6px 25px rgba(102, 126, 234, 0.6);
        }
        
        .chatbot-icon {
          position: relative;
          color: white;
          font-size: 24px;
        }
        
        .chatbot-badge {
          position: absolute;
          top: -8px;
          right: -8px;
          background: #ff4757;
          color: white;
          border-radius: 50%;
          width: 20px;
          height: 20px;
          font-size: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
        }
        
        .chatbot-tooltip {
          position: absolute;
          right: 70px;
          top: 50%;
          transform: translateY(-50%);
          background: #333;
          color: white;
          padding: 8px 12px;
          border-radius: 6px;
          font-size: 14px;
          white-space: nowrap;
          opacity: 0;
          pointer-events: none;
          transition: opacity 0.3s ease;
        }
        
        .chatbot-tooltip::after {
          content: '';
          position: absolute;
          left: 100%;
          top: 50%;
          transform: translateY(-50%);
          border: 6px solid transparent;
          border-left-color: #333;
        }
        
        #chatbot-button:hover .chatbot-tooltip {
          opacity: 1;
        }
        
        #chatbot-interface {
          position: fixed;
          bottom: 90px;
          right: 20px;
          width: 350px;
          height: 500px;
          background: white;
          border-radius: 15px;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
          z-index: 999;
          display: none;
          flex-direction: column;
          overflow: hidden;
          border: 1px solid #e9ecef;
        }
        
        .chatbot-header {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 15px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        
        .chatbot-title {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        
        .chatbot-title i {
          font-size: 18px;
        }
        
        .chatbot-subtitle {
          font-size: 12px;
          opacity: 0.8;
        }
        
        .chatbot-controls {
          display: flex;
          gap: 8px;
        }
        
        .chatbot-controls button {
          background: rgba(255, 255, 255, 0.2);
          border: none;
          color: white;
          width: 30px;
          height: 30px;
          border-radius: 50%;
          cursor: pointer;
          transition: background 0.3s ease;
        }
        
        .chatbot-controls button:hover {
          background: rgba(255, 255, 255, 0.3);
        }
        
        .chatbot-body {
          flex: 1;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }
        
        .chatbot-messages {
          flex: 1;
          padding: 15px;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        
        .chatbot-welcome {
          text-align: center;
          padding: 20px 0;
        }
        
        .welcome-message h5 {
          margin: 10px 0 5px 0;
          color: #333;
        }
        
        .welcome-message p {
          color: #666;
          font-size: 14px;
          margin: 0;
        }
        
        .message {
          max-width: 80%;
          padding: 10px 15px;
          border-radius: 18px;
          font-size: 14px;
          line-height: 1.4;
          word-wrap: break-word;
        }
        
        .message.user {
          background: #667eea;
          color: white;
          align-self: flex-end;
          border-bottom-right-radius: 5px;
        }
        
        .message.bot {
          background: #f8f9fa;
          color: #333;
          align-self: flex-start;
          border-bottom-left-radius: 5px;
          border: 1px solid #e9ecef;
        }
        
        .message-time {
          font-size: 11px;
          opacity: 0.7;
          margin-top: 5px;
        }
        
        .chatbot-suggestions {
          padding: 10px 15px;
          border-top: 1px solid #e9ecef;
          background: #f8f9fa;
        }
        
        .suggestion-chip {
          display: inline-block;
          background: white;
          border: 1px solid #dee2e6;
          border-radius: 20px;
          padding: 6px 12px;
          margin: 3px;
          font-size: 12px;
          cursor: pointer;
          transition: all 0.3s ease;
        }
        
        .suggestion-chip:hover {
          background: #667eea;
          color: white;
          border-color: #667eea;
        }
        
        .chatbot-typing {
          padding: 10px 15px;
          display: flex;
          align-items: center;
          gap: 10px;
          color: #666;
          font-size: 12px;
        }
        
        .typing-indicator {
          display: flex;
          gap: 3px;
        }
        
        .typing-indicator span {
          width: 6px;
          height: 6px;
          background: #667eea;
          border-radius: 50%;
          animation: typing 1.4s infinite ease-in-out;
        }
        
        .typing-indicator span:nth-child(1) { animation-delay: -0.32s; }
        .typing-indicator span:nth-child(2) { animation-delay: -0.16s; }
        
        @keyframes typing {
          0%, 80%, 100% { transform: scale(0.8); opacity: 0.5; }
          40% { transform: scale(1); opacity: 1; }
        }
        
        .chatbot-footer {
          border-top: 1px solid #e9ecef;
          padding: 15px;
        }
        
        .chatbot-input-container {
          display: flex;
          gap: 10px;
          margin-bottom: 10px;
        }
        
        #chatbot-input {
          flex: 1;
          border: 1px solid #dee2e6;
          border-radius: 20px;
          padding: 10px 15px;
          font-size: 14px;
          outline: none;
          transition: border-color 0.3s ease;
        }
        
        #chatbot-input:focus {
          border-color: #667eea;
        }
        
        #chatbot-send {
          background: #667eea;
          border: none;
          color: white;
          width: 40px;
          height: 40px;
          border-radius: 50%;
          cursor: pointer;
          transition: all 0.3s ease;
        }
        
        #chatbot-send:hover:not(:disabled) {
          background: #5a6fd8;
          transform: scale(1.05);
        }
        
        #chatbot-send:disabled {
          background: #ccc;
          cursor: not-allowed;
        }
        
        .chatbot-actions {
          display: flex;
          justify-content: center;
          gap: 15px;
        }
        
        .chatbot-action-btn {
          background: none;
          border: none;
          color: #666;
          cursor: pointer;
          font-size: 12px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 2px;
          transition: color 0.3s ease;
        }
        
        .chatbot-action-btn:hover {
          color: #667eea;
        }
        
        .chatbot-action-btn i {
          font-size: 16px;
        }
        
        /* Mobile Responsive */
        @media (max-width: 768px) {
          #chatbot-interface {
            width: calc(100vw - 40px);
            height: calc(100vh - 120px);
            bottom: 20px;
            right: 20px;
          }
          
          #chatbot-button {
            bottom: 20px;
            right: 20px;
          }
        }
        
        /* Dark mode support */
        @media (prefers-color-scheme: dark) {
          #chatbot-interface {
            background: #2d3748;
            border-color: #4a5568;
          }
          
          .message.bot {
            background: #4a5568;
            color: #e2e8f0;
            border-color: #4a5568;
          }
          
          .chatbot-suggestions {
            background: #4a5568;
            border-color: #4a5568;
          }
          
          .suggestion-chip {
            background: #2d3748;
            color: #e2e8f0;
            border-color: #4a5568;
          }
          
          #chatbot-input {
            background: #4a5568;
            border-color: #4a5568;
            color: #e2e8f0;
          }
          
          .welcome-message h5 {
            color: #e2e8f0;
          }
          
          .welcome-message p {
            color: #a0aec0;
          }
        }
      </style>
    `;
    
    document.head.insertAdjacentHTML('beforeend', styles);
  }

  bindEvents() {
    // Chat button click
    document.getElementById('chatbot-button').addEventListener('click', () => {
      this.toggleChat();
    });

    // Close button
    document.getElementById('chatbot-close').addEventListener('click', () => {
      this.closeChat();
    });

    // Minimize button
    document.getElementById('chatbot-minimize').addEventListener('click', () => {
      this.minimizeChat();
    });

    // Send message
    document.getElementById('chatbot-send').addEventListener('click', () => {
      this.sendMessage();
    });

    // Input enter key
    document.getElementById('chatbot-input').addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.sendMessage();
      }
    });

    // Input change
    document.getElementById('chatbot-input').addEventListener('input', (e) => {
      const sendBtn = document.getElementById('chatbot-send');
      sendBtn.disabled = !e.target.value.trim();
    });

    // Language toggle
    document.getElementById('chatbot-language').addEventListener('click', () => {
      this.toggleLanguage();
    });

    // Clear chat
    document.getElementById('chatbot-clear').addEventListener('click', () => {
      this.clearChat();
    });

    // Click outside to close
    document.addEventListener('click', (e) => {
      if (this.isOpen && !e.target.closest('#chatbot-interface') && !e.target.closest('#chatbot-button')) {
        this.closeChat();
      }
    });
  }

  async createSession() {
    try {
      // Detect user type and current page
      const userType = this.detectUserType();
      const currentPage = this.detectCurrentPage();
      
      const response = await fetch('/api/chatbot/session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userType: userType,
          currentPage: currentPage,
          language: this.currentLanguage
        })
      });

      const result = await response.json();
      
      if (result.success) {
        this.sessionId = result.sessionId;
        this.loadQuickSuggestions();
      }
    } catch (error) {
      console.error('Error creating chatbot session:', error);
    }
  }

  detectUserType() {
    const path = window.location.pathname;
    if (path.includes('/ngo-dashboard')) return 'ngo';
    if (path.includes('/volunteer-dashboard')) return 'volunteer';
    if (path.includes('/user') || path.includes('/donation-history')) return 'donor';
    return 'guest';
  }

  detectCurrentPage() {
    const path = window.location.pathname;
    if (path === '/' || path.includes('/index')) return 'home';
    if (path.includes('/donate')) return 'donate';
    if (path.includes('/donation-history')) return 'history';
    if (path.includes('/user')) return 'dashboard';
    if (path.includes('/ngo-dashboard')) return 'ngo-dashboard';
    if (path.includes('/volunteer-dashboard')) return 'volunteer-dashboard';
    return 'home';
  }

  async loadQuickSuggestions() {
    try {
      const response = await fetch(`/api/chatbot/suggestions?userType=${this.userType}&currentPage=${this.currentPage}&language=${this.currentLanguage}`);
      const result = await response.json();
      
      if (result.success) {
        this.displaySuggestions(result.suggestions);
      }
    } catch (error) {
      console.error('Error loading suggestions:', error);
    }
  }

  displaySuggestions(suggestions) {
    const container = document.getElementById('chatbot-suggestions');
    container.innerHTML = '';
    
    suggestions.forEach(suggestion => {
      const chip = document.createElement('span');
      chip.className = 'suggestion-chip';
      chip.textContent = suggestion;
      chip.addEventListener('click', () => {
        this.sendSuggestion(suggestion);
      });
      container.appendChild(chip);
    });
  }

  sendSuggestion(suggestion) {
    document.getElementById('chatbot-input').value = suggestion;
    this.sendMessage();
  }

  toggleChat() {
    if (this.isOpen) {
      this.closeChat();
    } else {
      this.openChat();
    }
  }

  openChat() {
    const interface = document.getElementById('chatbot-interface');
    interface.style.display = 'flex';
    this.isOpen = true;
    
    // Focus input
    setTimeout(() => {
      document.getElementById('chatbot-input').focus();
    }, 100);
    
    // Hide badge
    document.getElementById('chatbot-badge').style.display = 'none';
  }

  closeChat() {
    const interface = document.getElementById('chatbot-interface');
    interface.style.display = 'none';
    this.isOpen = false;
  }

  minimizeChat() {
    this.closeChat();
  }

  async sendMessage() {
    const input = document.getElementById('chatbot-input');
    const message = input.value.trim();
    
    if (!message || !this.sessionId) return;
    
    // Clear input
    input.value = '';
    document.getElementById('chatbot-send').disabled = true;
    
    // Add user message
    this.addMessage(message, 'user');
    
    // Show typing indicator
    this.showTyping();
    
    try {
      // Get user context
      const userContext = {
        city: this.getUserCity(),
        donationType: this.getCurrentDonationType()
      };
      
      const response = await fetch('/api/chatbot/message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId: this.sessionId,
          message: message,
          userContext: userContext
        })
      });

      const result = await response.json();
      
      if (result.success) {
        this.addMessage(result.response, 'bot');
      } else {
        this.addMessage('Sorry, I encountered an error. Please try again.', 'bot');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      this.addMessage('Sorry, I\'m having trouble connecting. Please try again later.', 'bot');
    } finally {
      this.hideTyping();
    }
  }

  addMessage(message, sender) {
    const messagesContainer = document.getElementById('chatbot-messages');
    
    // Remove welcome message if it exists
    const welcome = messagesContainer.querySelector('.chatbot-welcome');
    if (welcome) {
      welcome.remove();
    }
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}`;
    
    // Format message (handle line breaks and basic formatting)
    const formattedMessage = message
      .replace(/\n/g, '<br>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>');
    
    messageDiv.innerHTML = `
      <div>${formattedMessage}</div>
      <div class="message-time">${new Date().toLocaleTimeString()}</div>
    `;
    
    messagesContainer.appendChild(messageDiv);
    
    // Scroll to bottom
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  showTyping() {
    document.getElementById('chatbot-typing').style.display = 'flex';
    this.isTyping = true;
  }

  hideTyping() {
    document.getElementById('chatbot-typing').style.display = 'none';
    this.isTyping = false;
  }

  toggleLanguage() {
    this.currentLanguage = this.currentLanguage === 'en' ? 'hi' : 'en';
    const langBtn = document.getElementById('chatbot-language');
    langBtn.querySelector('span').textContent = this.currentLanguage.toUpperCase();
    
    // Reload suggestions
    this.loadQuickSuggestions();
    
    // Update placeholder
    const input = document.getElementById('chatbot-input');
    input.placeholder = this.currentLanguage === 'en' 
      ? 'Type your message...' 
      : 'अपना संदेश टाइप करें...';
  }

  clearChat() {
    const messagesContainer = document.getElementById('chatbot-messages');
    messagesContainer.innerHTML = `
      <div class="chatbot-welcome">
        <div class="welcome-message">
          <i class="fas fa-heart text-primary"></i>
          <h5>Welcome to CareGuide!</h5>
          <p>I'm here to help you with donations, NGO recommendations, and any questions you have.</p>
        </div>
      </div>
    `;
  }

  getUserCity() {
    // Try to get city from various sources
    const cityInput = document.querySelector('input[name="city"]');
    if (cityInput) return cityInput.value;
    
    // Check URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('city')) return urlParams.get('city');
    
    return 'Pune'; // Default
  }

  getCurrentDonationType() {
    // Check if user is on donation page and has selected items
    const selectedItems = [];
    
    const checkboxes = document.querySelectorAll('input[type="checkbox"]:checked');
    checkboxes.forEach(checkbox => {
      if (checkbox.name.includes('books')) selectedItems.push('books');
      if (checkbox.name.includes('clothes')) selectedItems.push('clothes');
      if (checkbox.name.includes('grains')) selectedItems.push('food');
      if (checkbox.name.includes('footwear')) selectedItems.push('footwear');
      if (checkbox.name.includes('toys')) selectedItems.push('toys');
      if (checkbox.name.includes('school_supplies')) selectedItems.push('school_supplies');
    });
    
    return selectedItems.length > 0 ? selectedItems[0] : null;
  }

  showNotification(message) {
    // Show notification badge
    const badge = document.getElementById('chatbot-badge');
    badge.textContent = '1';
    badge.style.display = 'flex';
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
      badge.style.display = 'none';
    }, 5000);
  }
}

// Initialize chatbot when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.careConnectChatbot = new CareConnectChatbot();
});

// Export for global access
window.CareConnectChatbot = CareConnectChatbot;
