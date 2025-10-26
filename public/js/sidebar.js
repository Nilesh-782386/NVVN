// Enhanced Collapsible Sidebar JavaScript

// Sidebar toggle state
let sidebarCollapsed = false;
let isMobile = window.innerWidth <= 992;

// Initialize sidebar functionality
document.addEventListener('DOMContentLoaded', function() {
    initializeSidebar();
    createMobileToggleButton();
    handleResponsiveChanges();
});

// Initialize sidebar functionality
function initializeSidebar() {
    const sidebar = document.getElementById('sidebar');
    if (!sidebar) return;

    // Check for saved state in localStorage
    const savedState = localStorage.getItem('sidebar-collapsed');
    if (savedState === 'true' && !isMobile) {
        toggleSidebar();
    }

    // Add window resize listener
    window.addEventListener('resize', handleResize);
}

// Toggle sidebar collapse/expand
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const mainContent = document.querySelector('.main-content');
    
    if (!sidebar) return;

    sidebarCollapsed = !sidebarCollapsed;
    
    // Add animating class to prevent pointer events during transition
    sidebar.classList.add('sidebar-animating');
    
    if (sidebarCollapsed) {
        sidebar.classList.add('collapsed');
    } else {
        sidebar.classList.remove('collapsed');
    }
    
    // Save state to localStorage
    localStorage.setItem('sidebar-collapsed', sidebarCollapsed.toString());
    
    // Remove animating class after transition
    setTimeout(() => {
        sidebar.classList.remove('sidebar-animating');
    }, 300);
    
    // Update toggle button icon
    updateToggleIcon();
    
    // Dispatch custom event for other components to listen
    window.dispatchEvent(new CustomEvent('sidebarToggle', { 
        detail: { collapsed: sidebarCollapsed } 
    }));
}

// Update toggle button icon
function updateToggleIcon() {
    const toggleButton = document.querySelector('.sidebar-toggle i');
    if (toggleButton) {
        if (sidebarCollapsed) {
            toggleButton.className = 'fas fa-chevron-right';
        } else {
            toggleButton.className = 'fas fa-bars';
        }
    }
}

// Create mobile toggle button
function createMobileToggleButton() {
    if (document.querySelector('.mobile-sidebar-toggle')) return;
    
    const mobileToggle = document.createElement('button');
    mobileToggle.className = 'mobile-sidebar-toggle';
    mobileToggle.innerHTML = '<i class="fas fa-bars"></i>';
    mobileToggle.onclick = toggleMobileSidebar;
    mobileToggle.setAttribute('aria-label', 'Toggle Navigation');
    
    document.body.appendChild(mobileToggle);
}

// Toggle mobile sidebar
function toggleMobileSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = getOrCreateOverlay();
    
    if (!sidebar) return;
    
    const isOpen = sidebar.classList.contains('mobile-open');
    
    if (isOpen) {
        closeMobileSidebar();
    } else {
        openMobileSidebar();
    }
}

// Open mobile sidebar
function openMobileSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = getOrCreateOverlay();
    
    sidebar.classList.add('mobile-open');
    overlay.classList.add('show');
    document.body.style.overflow = 'hidden';
}

// Close mobile sidebar
function closeMobileSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.querySelector('.sidebar-overlay');
    
    sidebar.classList.remove('mobile-open');
    if (overlay) {
        overlay.classList.remove('show');
    }
    document.body.style.overflow = '';
}

// Get or create overlay for mobile
function getOrCreateOverlay() {
    let overlay = document.querySelector('.sidebar-overlay');
    
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.className = 'sidebar-overlay';
        overlay.onclick = closeMobileSidebar;
        document.body.appendChild(overlay);
    }
    
    return overlay;
}

// Handle window resize
function handleResize() {
    const newIsMobile = window.innerWidth <= 992;
    
    if (newIsMobile !== isMobile) {
        isMobile = newIsMobile;
        handleResponsiveChanges();
    }
}

// Handle responsive changes
function handleResponsiveChanges() {
    const sidebar = document.getElementById('sidebar');
    const mobileToggle = document.querySelector('.mobile-sidebar-toggle');
    
    if (isMobile) {
        // Mobile mode
        if (sidebar) {
            sidebar.classList.remove('collapsed');
            sidebar.classList.remove('mobile-open');
        }
        if (mobileToggle) {
            mobileToggle.style.display = 'flex';
        }
        closeMobileSidebar();
    } else {
        // Desktop mode
        if (sidebar) {
            sidebar.classList.remove('mobile-open');
        }
        if (mobileToggle) {
            mobileToggle.style.display = 'none';
        }
        
        // Restore saved collapsed state
        const savedState = localStorage.getItem('sidebar-collapsed');
        if (savedState === 'true' && !sidebarCollapsed) {
            toggleSidebar();
        }
        
        // Remove mobile overlay
        const overlay = document.querySelector('.sidebar-overlay');
        if (overlay) {
            overlay.classList.remove('show');
        }
        document.body.style.overflow = '';
    }
}

// Smooth scrolling for navigation links
function smoothScrollToSection(targetId) {
    const target = document.getElementById(targetId);
    if (target) {
        target.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
        });
    }
}

// Add hover tooltips for collapsed sidebar
function addCollapsedTooltips() {
    const sidebar = document.getElementById('sidebar');
    if (!sidebar) return;
    
    const navLinks = sidebar.querySelectorAll('.nav-link');
    
    navLinks.forEach(link => {
        if (!link.getAttribute('data-original-title')) {
            const text = link.querySelector('.nav-text');
            if (text) {
                link.setAttribute('data-original-title', text.textContent);
                link.setAttribute('data-bs-placement', 'right');
            }
        }
    });
}

// Initialize tooltips when sidebar is collapsed
document.addEventListener('DOMContentLoaded', function() {
    // Listen for sidebar toggle events
    window.addEventListener('sidebarToggle', function(e) {
        if (e.detail.collapsed) {
            setTimeout(addCollapsedTooltips, 350);
        }
    });
});

// Enhanced keyboard navigation
document.addEventListener('keydown', function(e) {
    // ESC key closes mobile sidebar
    if (e.key === 'Escape' && isMobile) {
        closeMobileSidebar();
    }
    
    // Alt + S toggles sidebar (desktop only)
    if (e.altKey && e.key === 's' && !isMobile) {
        e.preventDefault();
        toggleSidebar();
    }
});

// Auto-hide mobile toggle on scroll (optional enhancement)
let lastScrollTop = 0;
window.addEventListener('scroll', function() {
    if (!isMobile) return;
    
    const mobileToggle = document.querySelector('.mobile-sidebar-toggle');
    if (!mobileToggle) return;
    
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    
    if (scrollTop > lastScrollTop && scrollTop > 100) {
        // Scrolling down
        mobileToggle.style.transform = 'translateY(-80px)';
    } else {
        // Scrolling up or at top
        mobileToggle.style.transform = 'translateY(0)';
    }
    
    lastScrollTop = scrollTop;
}, false);

// Export functions for global access
window.toggleSidebar = toggleSidebar;
window.toggleMobileSidebar = toggleMobileSidebar;
window.closeMobileSidebar = closeMobileSidebar;