/**
 * AI Priority Suggestion Service
 * Analyzes donation items and suggests appropriate priority levels
 */

class PrioritySuggestionService {
  constructor() {
    // Define priority rules based on item types
    this.priorityRules = {
      // CRITICAL - Life-saving items
      critical: {
        keywords: ['medicine', 'medication', 'drug', 'injection', 'vaccine', 'insulin', 'oxygen', 'blood', 'plasma', 'emergency', 'urgent', 'critical'],
        priority: 'critical',
        reason: 'Life-saving items require immediate attention',
        color: '#dc3545',
        icon: '🔴'
      },
      
      // HIGH - Perishable or time-sensitive items
      high: {
        keywords: ['food', 'meal', 'bread', 'milk', 'vegetable', 'fruit', 'meat', 'fish', 'dairy', 'perishable', 'fresh', 'cooked', 'hot'],
        priority: 'high',
        reason: 'Food items spoil quickly and need fast delivery',
        color: '#fd7e14',
        icon: '🟡'
      },
      
      // MEDIUM - Essential but not urgent
      medium: {
        keywords: ['clothes', 'clothing', 'shirt', 'pants', 'dress', 'jacket', 'blanket', 'bedding', 'towel', 'school', 'kit', 'stationary', 'uniform'],
        priority: 'medium',
        reason: 'Essential items for daily living',
        color: '#ffc107',
        icon: '🟢'
      },
      
      // LOW - Non-essential items
      low: {
        keywords: ['book', 'toy', 'game', 'entertainment', 'luxury', 'decoration', 'ornament', 'gift', 'novel', 'magazine', 'cd', 'dvd'],
        priority: 'low',
        reason: 'Non-essential items can wait',
        color: '#6c757d',
        icon: '⚪'
      }
    };
  }

  /**
   * Analyze donation item and suggest priority
   * @param {string} itemName - Name of the donation item
   * @param {string} description - Description of the donation
   * @param {string} category - Category of the donation
   * @returns {Object} Priority suggestion with details
   */
  suggestPriority(itemName = '', description = '', category = '') {
    const searchText = `${itemName} ${description} ${category}`.toLowerCase();
    
    // Check for critical items first
    for (const [level, rule] of Object.entries(this.priorityRules)) {
      const hasKeyword = rule.keywords.some(keyword => 
        searchText.includes(keyword.toLowerCase())
      );
      
      if (hasKeyword) {
        return {
          suggestedPriority: rule.priority,
          reason: rule.reason,
          color: rule.color,
          icon: rule.icon,
          confidence: this.calculateConfidence(searchText, rule.keywords),
          source: 'ai'
        };
      }
    }
    
    // Default to medium if no specific keywords found
    return {
      suggestedPriority: 'medium',
      reason: 'Standard priority for general donations',
      color: '#ffc107',
      icon: '🟢',
      confidence: 0.5,
      source: 'ai'
    };
  }

  /**
   * Calculate confidence score based on keyword matches
   * @param {string} searchText - Text to search in
   * @param {Array} keywords - Keywords to match
   * @returns {number} Confidence score (0-1)
   */
  calculateConfidence(searchText, keywords) {
    const matches = keywords.filter(keyword => 
      searchText.includes(keyword.toLowerCase())
    ).length;
    
    return Math.min(matches / keywords.length, 1);
  }

  /**
   * Get priority display information
   * @param {string} priority - Priority level
   * @returns {Object} Display information
   */
  getPriorityDisplay(priority) {
    const priorityMap = {
      'critical': { color: '#dc3545', icon: '🔴', label: 'CRITICAL' },
      'high': { color: '#fd7e14', icon: '🟡', label: 'HIGH' },
      'medium': { color: '#ffc107', icon: '🟢', label: 'MEDIUM' },
      'low': { color: '#6c757d', icon: '⚪', label: 'LOW' }
    };
    
    return priorityMap[priority] || priorityMap['medium'];
  }

  /**
   * Get all available priority options for manual selection
   * @returns {Array} Array of priority options
   */
  getPriorityOptions() {
    return [
      { value: 'critical', label: '🔴 CRITICAL', description: 'Life-saving items' },
      { value: 'high', label: '🟡 HIGH', description: 'Perishable items' },
      { value: 'medium', label: '🟢 MEDIUM', description: 'Essential items' },
      { value: 'low', label: '⚪ LOW', description: 'Non-essential items' }
    ];
  }

  /**
   * Validate priority selection
   * @param {string} priority - Priority to validate
   * @returns {boolean} Whether priority is valid
   */
  isValidPriority(priority) {
    return ['critical', 'high', 'medium', 'low'].includes(priority);
  }

  /**
   * Get priority explanation for donors
   * @param {string} priority - Priority level
   * @returns {string} Explanation text
   */
  getPriorityExplanation(priority) {
    const explanations = {
      'critical': 'Life-saving items like medicines, blood, oxygen that need immediate attention',
      'high': 'Perishable items like food, fresh vegetables that spoil quickly',
      'medium': 'Essential items like clothes, blankets, school supplies for daily living',
      'low': 'Non-essential items like books, toys, entertainment items that can wait'
    };
    
    return explanations[priority] || explanations['medium'];
  }
}

export default new PrioritySuggestionService();
