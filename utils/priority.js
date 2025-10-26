// Priority system utilities for CareConnect

export const PRIORITY_CONFIG = {
  critical: {
    label: 'Critical',
    color: '#dc3545', // Red
    emoji: '🔴',
    description: 'Food, Medicines, Urgent Needs',
    order: 1
  },
  high: {
    label: 'High',
    color: '#fd7e14', // Orange
    emoji: '🟠',
    description: 'Clothes, Blankets, School Kits',
    order: 2
  },
  medium: {
    label: 'Medium',
    color: '#ffc107', // Yellow
    emoji: '🟡',
    description: 'Books, Toys, Non-urgent items',
    order: 3
  },
  low: {
    label: 'Low',
    color: '#28a745', // Green
    emoji: '🟢',
    description: 'Books, Toys, Non-urgent items',
    order: 4
  }
};

export function getPriorityConfig(priority) {
  return PRIORITY_CONFIG[priority] || PRIORITY_CONFIG.medium;
}

export function getPriorityBadge(priority) {
  const config = getPriorityConfig(priority);
  return {
    ...config,
    badgeClass: `badge-${priority}`,
    textColor: priority === 'low' ? '#fff' : '#000'
  };
}

export function sortByPriority(donations) {
  return donations.sort((a, b) => {
    const priorityA = getPriorityConfig(a.priority).order;
    const priorityB = getPriorityConfig(b.priority).order;
    return priorityA - priorityB;
  });
}
