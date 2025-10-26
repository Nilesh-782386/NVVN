function increase(id) {
  var numberInput = document.getElementById(id);
  numberInput.value = parseInt(numberInput.value) + 1;
  analyzeAndSuggestPriority();
}

function decrease(id) {
  var numberInput = document.getElementById(id);
  var currentValue = parseInt(numberInput.value);
  if (currentValue > 0) {
    numberInput.value = currentValue - 1;
  }
  analyzeAndSuggestPriority();
}

// Special Items Modal Functions
let isCustomItemActive = false;

function openCustomItemModal() {
  const modal = document.getElementById('specialItemsModal');
  modal.style.display = 'flex';
  
  // Set default values
  document.getElementById('customQuantity').value = 5;
  updateQuantityDisplay(5);
  
  // Focus on description textarea
  setTimeout(() => {
    document.getElementById('customDescription').focus();
  }, 300);
  
  // Prevent body scroll
  document.body.style.overflow = 'hidden';
}

function closeCustomItemModal() {
  const modal = document.getElementById('specialItemsModal');
  modal.style.display = 'none';
  
  // Restore body scroll
  document.body.style.overflow = 'auto';
  
  // Clear values if not saved
  if (!isCustomItemActive) {
    document.getElementById('customDescription').value = '';
    document.getElementById('customQuantity').value = 5;
    updateQuantityDisplay(5);
  }
}

function saveCustomItem() {
  const description = document.getElementById('customDescription').value.trim();
  const quantity = document.getElementById('customQuantity').value;
  
  if (!description) {
    alert('Please describe what you are donating.');
    return;
  }
  
  // Activate custom items
  isCustomItemActive = true;
  const button = document.querySelector('.special-items-button');
  const icon = document.getElementById('specialItemsIcon');
  const text = document.getElementById('specialItemsText');
  
  button.classList.add('active');
  icon.className = 'fas fa-check-circle';
  text.textContent = 'Special Items Added';
  
  // Close modal
  closeCustomItemModal();
  
  // Re-analyze priority
  analyzeAndSuggestPriority();
}

function updateQuantityDisplay(value) {
  document.getElementById('quantityValue').textContent = value;
  analyzeAndSuggestPriority();
}

function analyzeCustomDescription() {
  analyzeAndSuggestPriority();
}

// AI Priority Suggestion Logic
function analyzeAndSuggestPriority() {
  // Get selected items and quantities
  const items = {
    'food': document.getElementById('food')?.value || 0,
    'clothes': document.getElementById('clothes')?.value || 0,
    'books': document.getElementById('books')?.value || 0,
    'toys': document.getElementById('toys')?.value || 0,
    'schoolSupplies': document.getElementById('schoolSupplies')?.value || 0
  };
  
  // Check for custom items
  const isCustomItem = isCustomItemActive;
  const customDescription = document.getElementById('customDescription')?.value || '';
  
  // Check if any items are selected
  const hasItems = Object.values(items).some(qty => parseInt(qty) > 0) || isCustomItem;
  
  if (!hasItems) {
    document.getElementById('aiSuggestion').style.display = 'none';
    return;
  }
  
  // Analyze and suggest priority
  const suggestion = getAIPrioritySuggestion(items, isCustomItem, customDescription);
  
  if (suggestion) {
    displayAISuggestion(suggestion);
    // Auto-select AI suggestion if no manual selection made
    if (!document.querySelector('input[name="final_priority"]:checked')) {
      selectAISuggestion(suggestion.suggestedPriority);
    }
  }
}

function getAIPrioritySuggestion(items, isCustomItem = false, customDescription = '') {
  // Priority rules (simplified version of the service)
  const priorityRules = {
    'critical': {
      keywords: ['medicine', 'medication', 'drug', 'injection', 'vaccine', 'insulin', 'oxygen', 'blood', 'plasma', 'emergency', 'urgent', 'critical', 'medical', 'hospital', 'baby food', 'infant'],
      priority: 'critical',
      reason: 'Life-saving items require immediate attention',
      icon: '🔴'
    },
    'high': {
      keywords: ['food', 'meal', 'bread', 'milk', 'vegetable', 'fruit', 'meat', 'fish', 'dairy', 'perishable', 'fresh', 'cooked', 'hot', 'baby food', 'formula'],
      priority: 'high',
      reason: 'Food items spoil quickly and need fast delivery',
      icon: '🟡'
    },
    'medium': {
      keywords: ['clothes', 'clothing', 'shirt', 'pants', 'dress', 'jacket', 'blanket', 'bedding', 'towel', 'school', 'kit', 'stationary', 'uniform', 'electronics', 'phone', 'laptop', 'computer'],
      priority: 'medium',
      reason: 'Essential items for daily living',
      icon: '🟢'
    },
    'low': {
      keywords: ['book', 'toy', 'game', 'entertainment', 'luxury', 'decoration', 'ornament', 'gift', 'novel', 'magazine', 'cd', 'dvd', 'furniture', 'sofa', 'table', 'chair'],
      priority: 'low',
      reason: 'Non-essential items can wait',
      icon: '⚪'
    }
  };
  
  // Analyze custom description first if present
  if (isCustomItem && customDescription) {
    const description = customDescription.toLowerCase();
    
    // Check for critical items
    if (priorityRules.critical.keywords.some(keyword => description.includes(keyword))) {
      return {
        suggestedPriority: 'critical',
        reason: 'Life-saving items require immediate attention',
        icon: '🔴',
        confidence: 95
      };
    }
    
    // Check for high priority items
    if (priorityRules.high.keywords.some(keyword => description.includes(keyword))) {
      return {
        suggestedPriority: 'high',
        reason: 'Perishable items need fast delivery',
        icon: '🟡',
        confidence: 90
      };
    }
    
    // Check for medium priority items
    if (priorityRules.medium.keywords.some(keyword => description.includes(keyword))) {
      return {
        suggestedPriority: 'medium',
        reason: 'Essential items for daily living',
        icon: '🟢',
        confidence: 85
      };
    }
    
    // Check for low priority items
    if (priorityRules.low.keywords.some(keyword => description.includes(keyword))) {
      return {
        suggestedPriority: 'low',
        reason: 'Non-essential items can wait',
        icon: '⚪',
        confidence: 80
      };
    }
    
    // Default for custom items
    return {
      suggestedPriority: 'medium',
      reason: 'Custom items - standard priority',
      icon: '🟢',
      confidence: 70
    };
  }
  
  // Check for regular items
  if (items.food > 0) {
    return {
      suggestedPriority: 'high',
      reason: 'Food items spoil quickly and need fast delivery',
      icon: '🟡',
      confidence: 95
    };
  }
  
  if (items.clothes > 0) {
    return {
      suggestedPriority: 'medium',
      reason: 'Essential items for daily living',
      icon: '🟢',
      confidence: 85
    };
  }
  
  if (items.books > 0 || items.toys > 0) {
    return {
      suggestedPriority: 'low',
      reason: 'Non-essential items can wait',
      icon: '⚪',
      confidence: 80
    };
  }
  
  if (items.schoolSupplies > 0) {
    return {
      suggestedPriority: 'medium',
      reason: 'School supplies are essential for education',
      icon: '🟢',
      confidence: 90
    };
  }
  
  // Default
  return {
    suggestedPriority: 'medium',
    reason: 'Standard priority for general donations',
    icon: '🟢',
    confidence: 70
  };
}

function displayAISuggestion(suggestion) {
  // Show in main form if not in modal
  const aiSuggestion = document.getElementById('aiSuggestion');
  if (aiSuggestion) {
    const aiSuggestionBadge = document.getElementById('aiSuggestionBadge');
    const aiSuggestionReason = document.getElementById('aiSuggestionReason');
    const aiConfidence = document.getElementById('aiConfidence');
    
    aiSuggestionBadge.textContent = `${suggestion.icon} ${suggestion.suggestedPriority.toUpperCase()} PRIORITY`;
    aiSuggestionReason.textContent = suggestion.reason;
    aiConfidence.textContent = suggestion.confidence;
    
    aiSuggestion.style.display = 'block';
  }
  
  // Show in modal if modal is open
  const modalAiSuggestion = document.getElementById('modalAiSuggestion');
  if (modalAiSuggestion && modalAiSuggestion.offsetParent !== null) {
    const modalAiSuggestionBadge = document.getElementById('modalAiSuggestionBadge');
    const modalAiSuggestionReason = document.getElementById('modalAiSuggestionReason');
    const modalAiConfidence = document.getElementById('modalAiConfidence');
    
    modalAiSuggestionBadge.textContent = `${suggestion.icon} ${suggestion.suggestedPriority.toUpperCase()} PRIORITY`;
    modalAiSuggestionReason.textContent = suggestion.reason;
    modalAiConfidence.textContent = suggestion.confidence;
    
    modalAiSuggestion.style.display = 'block';
  }
  
  // Store AI suggestion in hidden field
  document.getElementById('ai_suggested_priority').value = suggestion.suggestedPriority;
}

function selectAISuggestion(priority) {
  const radioButton = document.getElementById(`priority_${priority}`);
  if (radioButton) {
    radioButton.checked = true;
    document.getElementById('is_manual_override').value = 'false';
  }
}

// Track manual priority selection
document.addEventListener('DOMContentLoaded', function() {
  const priorityRadios = document.querySelectorAll('input[name="final_priority"]');
  
  priorityRadios.forEach(radio => {
    radio.addEventListener('change', function() {
      document.getElementById('is_manual_override').value = 'true';
    });
  });
  
  // Close modal when clicking outside
  document.addEventListener('click', function(event) {
    const modal = document.getElementById('specialItemsModal');
    if (event.target === modal) {
      closeCustomItemModal();
    }
  });
  
  // Close modal with Escape key
  document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
      const modal = document.getElementById('specialItemsModal');
      if (modal.style.display === 'flex') {
        closeCustomItemModal();
      }
    }
  });
  
  // Initial analysis
  analyzeAndSuggestPriority();
});
