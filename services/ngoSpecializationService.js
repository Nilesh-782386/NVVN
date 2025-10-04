// NGO Specialization Service
// Handles NGO specialization compatibility with donation items

class NGOSpecializationService {
  constructor() {
    // Define NGO types and their allowed items
    this.ngoTypes = {
      food: {
        name: 'Food NGO',
        icon: '🍎',
        specializedItems: ['grains', 'food', 'water'],
        description: 'Specializes in: Food, Grains, Water'
      },
      clothing: {
        name: 'Clothing NGO',
        icon: '👕',
        specializedItems: ['clothes', 'footwear', 'blankets'],
        description: 'Specializes in: Clothes, Blankets, Footwear'
      },
      education: {
        name: 'Education NGO',
        icon: '📚',
        specializedItems: ['books', 'toys', 'school_supplies'],
        description: 'Specializes in: Books, School Supplies, Toys'
      },
      medical: {
        name: 'Medical NGO',
        icon: '🏥',
        specializedItems: ['medicine', 'medical', 'health'],
        description: 'Specializes in: Medicines, Medical Equipment'
      },
      elderly_care: {
        name: 'Elderly Care NGO',
        icon: '👴',
        specializedItems: ['food', 'medicine', 'clothes'],
        description: 'Specializes in: Food, Medicine, Clothes'
      },
      multi_purpose: {
        name: 'Multi-purpose NGO',
        icon: '🔄',
        specializedItems: ['all'],
        description: 'Specializes in: All Items'
      }
    };

    // Universal items that all NGOs can approve (if can_accept_universal is true)
    this.universalItems = ['food', 'medicine', 'medical', 'water', 'grains', 'emergency'];
  }

  /**
   * Check if an NGO can approve a specific donation
   * @param {string} ngoType - NGO's type
   * @param {boolean} canAcceptUniversal - Whether NGO can accept universal items
   * @param {Object} donation - Donation object
   * @returns {Object} - Compatibility result
   */
  canApproveDonation(ngoType, canAcceptUniversal, donation) {
    // Multi-purpose NGOs can approve everything
    if (ngoType === 'multi_purpose') {
      return {
        canApprove: true,
        reason: 'Multi-purpose NGO - Can approve all items',
        matchType: 'multi_purpose',
        matchPercentage: 100,
        buttonText: 'APPROVE (Multi-purpose)',
        buttonClass: 'btn-success'
      };
    }

    // Check if NGO type exists
    const ngoTypeInfo = this.ngoTypes[ngoType];
    if (!ngoTypeInfo) {
      return {
        canApprove: false,
        reason: 'Unknown NGO type',
        matchType: 'none',
        matchPercentage: 0,
        buttonText: 'VIEW ONLY',
        buttonClass: 'btn-secondary'
      };
    }

    // Check if it's a universal item and NGO can accept universal items
    if (canAcceptUniversal && this.isUniversalItem(donation)) {
      return {
        canApprove: true,
        reason: 'Universal item - All NGOs can approve',
        matchType: 'universal',
        matchPercentage: 95,
        buttonText: 'APPROVE (Universal)',
        buttonClass: 'btn-primary'
      };
    }

    // Check if donation matches NGO's specialized items
    const hasMatchingItems = this.checkSpecializedItemMatch(donation, ngoTypeInfo.specializedItems);
    
    if (hasMatchingItems) {
      return {
        canApprove: true,
        reason: `${ngoTypeInfo.name} - Specialization match`,
        matchType: 'specialized',
        matchPercentage: 90,
        buttonText: 'APPROVE (Specialized)',
        buttonClass: 'btn-success'
      };
    }

    return {
      canApprove: false,
      reason: `${ngoTypeInfo.name} - Outside your specialization`,
      matchType: 'none',
      matchPercentage: 0,
      buttonText: 'VIEW ONLY',
      buttonClass: 'btn-secondary'
    };
  }

  /**
   * Check if donation is a universal item
   * @param {Object} donation - Donation object
   * @returns {boolean} - Whether it's a universal item
   */
  isUniversalItem(donation) {
    // Check regular donation items
    if (donation.grains > 0) return true; // Food/Grains are universal
    
    // Check custom items
    if (donation.is_custom_item && donation.custom_description) {
      const description = donation.custom_description.toLowerCase();
      return this.universalItems.some(item => description.includes(item));
    }

    return false;
  }

  /**
   * Check if donation items match NGO's specialized items
   * @param {Object} donation - Donation object
   * @param {Array} specializedItems - Items the NGO specializes in
   * @returns {boolean} - Whether there's a match
   */
  checkSpecializedItemMatch(donation, specializedItems) {
    // If NGO specializes in all items
    if (specializedItems.includes('all')) return true;

    // Check regular donation items
    if (donation.books > 0 && specializedItems.includes('books')) return true;
    if (donation.clothes > 0 && specializedItems.includes('clothes')) return true;
    if (donation.grains > 0 && specializedItems.includes('grains')) return true;
    if (donation.footwear > 0 && specializedItems.includes('footwear')) return true;
    if (donation.toys > 0 && specializedItems.includes('toys')) return true;
    if (donation.school_supplies > 0 && specializedItems.includes('school_supplies')) return true;

    // Check custom items
    if (donation.is_custom_item && donation.custom_description) {
      const description = donation.custom_description.toLowerCase();
      return specializedItems.some(item => description.includes(item));
    }

    return false;
  }

  /**
   * Get NGO type information
   * @param {string} ngoType - NGO type
   * @returns {Object} - NGO type information
   */
  getNGOTypeInfo(ngoType) {
    return this.ngoTypes[ngoType] || this.ngoTypes.multi_purpose;
  }

  /**
   * Get all NGO types
   * @returns {Object} - All NGO types
   */
  getAllNGOTypes() {
    return this.ngoTypes;
  }

  /**
   * Get allowed items for an NGO type
   * @param {string} ngoType - NGO type
   * @param {boolean} canAcceptUniversal - Whether NGO can accept universal items
   * @returns {Array} - List of allowed items
   */
  getAllowedItems(ngoType, canAcceptUniversal) {
    const ngoTypeInfo = this.ngoTypes[ngoType];
    if (!ngoTypeInfo) return [];

    let allowedItems = [...ngoTypeInfo.specializedItems];
    
    if (canAcceptUniversal) {
      allowedItems = [...allowedItems, ...this.universalItems];
    }

    // Remove duplicates
    return [...new Set(allowedItems)];
  }

  /**
   * Get match explanation for display
   * @param {Object} compatibility - Compatibility result
   * @returns {string} - Human-readable explanation
   */
  getMatchExplanation(compatibility) {
    switch (compatibility.matchType) {
      case 'multi_purpose':
        return '🔄 Multi-purpose NGO - Can approve all items';
      case 'universal':
        return '🌍 Universal item - Essential for all NGOs';
      case 'specialized':
        return '✅ Specialization match - Perfect fit';
      case 'none':
        return '❌ Outside specialization - View only';
      default:
        return '❓ Unknown compatibility';
    }
  }

  /**
   * Get button styling based on compatibility
   * @param {Object} compatibility - Compatibility result
   * @returns {Object} - Button styling info
   */
  getButtonStyling(compatibility) {
    return {
      class: compatibility.buttonClass,
      text: compatibility.buttonText,
      disabled: !compatibility.canApprove,
      title: compatibility.reason
    };
  }
}

export default new NGOSpecializationService();