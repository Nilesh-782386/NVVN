/**
 * Enhanced Notification System for Desktop
 * Professional slide-in notifications with larger badges optimized for laptop/desktop
 */

class EnhancedNotificationManager {
    constructor() {
        this.container = null;
        this.notifications = [];
        this.maxNotifications = 5;
        this.defaultDuration = 5000;
        this.init();
    }

    init() {
        // Create notification container if it doesn't exist
        this.container = document.querySelector('.notification-container');
        if (!this.container) {
            this.container = document.createElement('div');
            this.container.className = 'notification-container';
            document.body.appendChild(this.container);
        }

        // Add notification stack wrapper
        if (!this.container.querySelector('.notification-stack')) {
            const stack = document.createElement('div');
            stack.className = 'notification-stack';
            this.container.appendChild(stack);
        }
    }

    /**
     * Show enhanced notification with slide-in animation
     * @param {string} message - Notification message
     * @param {string} type - Notification type (success, error, warning, info)
     * @param {Object} options - Additional options
     */
    show(message, type = 'info', options = {}) {
        const {
            duration = this.defaultDuration,
            position = 'top-right', // top-right, center
            icon = null,
            persistent = false,
            priority = 'normal' // normal, high
        } = options;

        // Remove oldest notification if we've reached the limit
        if (this.notifications.length >= this.maxNotifications) {
            this.remove(this.notifications[0]);
        }

        // Create notification element
        const notification = this.createNotification(message, type, {
            icon,
            persistent,
            priority,
            position
        });

        // Add to container
        const stack = this.container.querySelector('.notification-stack');
        stack.appendChild(notification);
        this.notifications.push(notification);

        // Apply position-specific container class
        if (position === 'center') {
            this.container.classList.add('center');
        } else {
            this.container.classList.remove('center');
        }

        // Trigger slide-in animation
        requestAnimationFrame(() => {
            notification.classList.add('show');
        });

        // Auto-remove after duration (unless persistent)
        if (!persistent && duration > 0) {
            setTimeout(() => {
                this.remove(notification);
            }, duration);
        }

        return notification;
    }

    createNotification(message, type, options) {
        const { icon, persistent, priority, position } = options;
        
        const notification = document.createElement('div');
        notification.className = `enhanced-notification ${type}`;
        
        if (priority === 'high') {
            notification.classList.add('high-priority');
        }

        // Get appropriate icon
        const notificationIcon = icon || this.getDefaultIcon(type);

        notification.innerHTML = `
            <div class="notification-content">
                <div class="notification-icon">
                    <i class="fas ${notificationIcon}"></i>
                </div>
                <div class="notification-text">${message}</div>
                <button class="notification-close" onclick="notificationManager.remove(this.closest('.enhanced-notification'))">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            ${!persistent ? '<div class="notification-progress"></div>' : ''}
        `;

        return notification;
    }

    getDefaultIcon(type) {
        const icons = {
            success: 'fa-check-circle',
            error: 'fa-exclamation-circle',
            danger: 'fa-exclamation-triangle',
            warning: 'fa-exclamation-triangle',
            info: 'fa-info-circle'
        };
        return icons[type] || 'fa-info-circle';
    }

    remove(notification) {
        if (!notification || !notification.parentNode) return;

        notification.classList.add('slide-out');
        
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
                this.notifications = this.notifications.filter(n => n !== notification);
            }
        }, 400);
    }

    /**
     * Show success notification
     */
    success(message, options = {}) {
        return this.show(message, 'success', options);
    }

    /**
     * Show error notification
     */
    error(message, options = {}) {
        return this.show(message, 'error', options);
    }

    /**
     * Show warning notification
     */
    warning(message, options = {}) {
        return this.show(message, 'warning', options);
    }

    /**
     * Show info notification
     */
    info(message, options = {}) {
        return this.show(message, 'info', options);
    }

    /**
     * Clear all notifications
     */
    clear() {
        this.notifications.forEach(notification => {
            this.remove(notification);
        });
    }

    /**
     * Update badge counter with enhanced desktop styling
     */
    updateBadgeCounter(element, count, type = 'error') {
        // Remove existing badge
        const existingBadge = element.querySelector('.desktop-badge-counter');
        if (existingBadge) {
            existingBadge.remove();
        }

        if (count > 0) {
            const badge = document.createElement('span');
            badge.className = `desktop-badge-counter ${type}`;
            
            // Use large badge for high counts
            if (count > 99) {
                badge.classList.add('large');
                badge.textContent = '99+';
            } else {
                badge.textContent = count;
            }

            element.style.position = 'relative';
            element.appendChild(badge);
        }
    }

    /**
     * Create desktop-optimized confirmation dialog
     */
    confirm(message, title = 'Confirm Action', options = {}) {
        return new Promise((resolve) => {
            const {
                confirmText = 'Confirm',
                cancelText = 'Cancel',
                type = 'warning',
                persistent = true
            } = options;

            const confirmMessage = `
                <div style="margin-bottom: 1rem;">
                    <strong style="font-size: 1.1rem; display: block; margin-bottom: 0.5rem;">${title}</strong>
                    <span>${message}</span>
                </div>
                <div style="display: flex; gap: 1rem; justify-content: flex-end;">
                    <button class="btn btn-secondary btn-sm" onclick="notificationManager.handleConfirm(false, this)">
                        ${cancelText}
                    </button>
                    <button class="btn btn-${type === 'warning' ? 'warning' : 'primary'} btn-sm" onclick="notificationManager.handleConfirm(true, this)">
                        ${confirmText}
                    </button>
                </div>
            `;

            const notification = this.show(confirmMessage, type, {
                persistent,
                position: 'center',
                icon: 'fa-question-circle'
            });

            // Store resolve function for callback
            notification._resolve = resolve;
        });
    }

    handleConfirm(result, buttonElement) {
        const notification = buttonElement.closest('.enhanced-notification');
        if (notification && notification._resolve) {
            notification._resolve(result);
            this.remove(notification);
        }
    }
}

// Create global notification manager instance
const notificationManager = new EnhancedNotificationManager();

// Legacy compatibility function
function showNotification(message, type = 'info', options = {}) {
    return notificationManager.show(message, type, options);
}

// Enhanced desktop notification functions
function showDesktopNotification(message, type = 'info', options = {}) {
    return notificationManager.show(message, type, {
        ...options,
        position: 'top-right'
    });
}

function showCenterNotification(message, type = 'info', options = {}) {
    return notificationManager.show(message, type, {
        ...options,
        position: 'center',
        persistent: true
    });
}

function updateDesktopBadge(element, count, type = 'error') {
    return notificationManager.updateBadgeCounter(element, count, type);
}

function showDesktopConfirm(message, title, options = {}) {
    return notificationManager.confirm(message, title, options);
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        notificationManager,
        showNotification,
        showDesktopNotification,
        showCenterNotification,
        updateDesktopBadge,
        showDesktopConfirm
    };
}