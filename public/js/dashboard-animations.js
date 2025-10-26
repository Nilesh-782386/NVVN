/**
 * Dashboard Animation Controller
 * Handles smooth fade/slide animations between dashboard sections and dynamic map scaling
 */

class DashboardAnimationController {
    constructor() {
        this.isAnimating = false;
        this.animationQueue = [];
        this.init();
    }

    init() {
        // Initialize page load animations
        this.initPageLoadAnimations();
        
        // Initialize navigation animations
        this.initNavigationAnimations();
        
        // Initialize map dynamic scaling
        this.initMapDynamicScaling();
        
        // Initialize content reveal animations
        this.initContentRevealAnimations();
        
        // Initialize intersection observer for scroll animations
        this.initScrollAnimations();
    }

    /**
     * Initialize page load animations
     */
    initPageLoadAnimations() {
        // Add dashboard fade-in class on page load
        document.addEventListener('DOMContentLoaded', () => {
            const dashboard = document.querySelector('.dashboard-container');
            if (dashboard) {
                dashboard.classList.add('page-transition');
                
                // Trigger fade-in animation
                requestAnimationFrame(() => {
                    dashboard.classList.add('loaded');
                });
            }

            // Initialize section animations
            this.initSectionAnimations();
            
            // Initialize grid animations
            this.initGridAnimations();
            
            // Remove loading overlay if present
            this.removeLoadingOverlay();
        });
    }

    /**
     * Initialize section animations with staggered delays
     */
    initSectionAnimations() {
        const sections = document.querySelectorAll('.dashboard-section, .status-overview, .dashboard-stats');
        sections.forEach((section, index) => {
            section.style.animationDelay = `${(index + 1) * 0.1}s`;
            section.classList.add('dashboard-section');
        });
    }

    /**
     * Initialize grid container animations
     */
    initGridAnimations() {
        const grids = document.querySelectorAll('.stats-grid, .content-grid, .charts-grid, .actions-grid');
        grids.forEach((grid, index) => {
            grid.style.animationDelay = `${(index + 2) * 0.1}s`;
        });
    }

    /**
     * Initialize navigation animations for sidebar links
     */
    initNavigationAnimations() {
        const navLinks = document.querySelectorAll('.sidebar .nav-link');
        navLinks.forEach(link => {
            link.classList.add('sidebar-nav-link');
            
            // Add active state handling
            link.addEventListener('click', (e) => {
                this.handleNavigation(e, link);
            });
        });
    }

    /**
     * Handle navigation with smooth transitions
     */
    handleNavigation(event, clickedLink) {
        if (this.isAnimating) return;
        
        // Remove active from all links
        document.querySelectorAll('.sidebar-nav-link').forEach(link => {
            link.classList.remove('active');
        });
        
        // Add active to clicked link
        clickedLink.classList.add('active');
        
        // If navigating to different dashboard, show loading
        const href = clickedLink.getAttribute('href');
        if (href && !href.startsWith('#')) {
            this.showNavigationLoading();
        }
    }

    /**
     * Initialize dynamic map scaling
     */
    initMapDynamicScaling() {
        const maps = document.querySelectorAll('#ngoNetworkMap, #volunteerAreaMap, #donorLocationMap');
        
        maps.forEach(map => {
            if (map) {
                // Ensure maps have proper dynamic scaling
                const container = map.closest('.map-container');
                if (container) {
                    container.style.height = '70vh';
                    container.style.width = '100%';
                    container.classList.add('full-width');
                    
                    // Add responsive scaling
                    this.setupMapResponsiveScaling(container, map);
                }
            }
        });
    }

    /**
     * Setup responsive map scaling based on viewport
     */
    setupMapResponsiveScaling(container, map) {
        const updateMapSize = () => {
            const width = window.innerWidth;
            
            if (width >= 1200) {
                // Desktop scaling
                container.style.height = '70vh';
                container.style.minHeight = '500px';
                container.style.maxHeight = '800px';
                map.style.height = '70vh';
                map.style.width = '100%';
            } else if (width >= 768) {
                // Tablet scaling
                container.style.height = '60vh';
                container.style.minHeight = '400px';
                map.style.height = '60vh';
                map.style.width = '100%';
            } else {
                // Mobile scaling
                container.style.height = '50vh';
                container.style.minHeight = '300px';
                map.style.height = '50vh';
                map.style.width = '100%';
            }
        };

        // Initial setup
        updateMapSize();
        
        // Update on resize with debouncing
        let resizeTimeout;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(updateMapSize, 150);
        });
    }

    /**
     * Initialize content reveal animations
     */
    initContentRevealAnimations() {
        const contents = document.querySelectorAll('.section-card, .stat-card, .status-card');
        contents.forEach(content => {
            content.classList.add('content-reveal');
            
            // Reveal after a delay
            setTimeout(() => {
                content.classList.add('revealed');
            }, 100);
        });
    }

    /**
     * Initialize scroll-based animations using Intersection Observer
     */
    initScrollAnimations() {
        const observerOptions = {
            threshold: 0.1,
            rootMargin: '0px 0px -100px 0px'
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('animate-in');
                }
            });
        }, observerOptions);

        // Observe elements for scroll animations
        const elementsToAnimate = document.querySelectorAll(
            '.chart-container, .table, .action-card, .volunteer-card'
        );
        
        elementsToAnimate.forEach(el => {
            observer.observe(el);
        });
    }

    /**
     * Show navigation loading overlay
     */
    showNavigationLoading() {
        const overlay = document.createElement('div');
        overlay.className = 'page-loading-overlay';
        overlay.innerHTML = `
            <div class="loading-content">
                <i class="fas fa-spinner"></i>
                <p>Loading Dashboard...</p>
            </div>
        `;
        
        document.body.appendChild(overlay);
        
        // Remove overlay after navigation
        setTimeout(() => {
            overlay.classList.add('fade-out');
            setTimeout(() => {
                if (overlay.parentNode) {
                    overlay.parentNode.removeChild(overlay);
                }
            }, 500);
        }, 1000);
    }

    /**
     * Remove loading overlay
     */
    removeLoadingOverlay() {
        const overlay = document.querySelector('.page-loading-overlay');
        if (overlay) {
            overlay.classList.add('fade-out');
            setTimeout(() => {
                if (overlay.parentNode) {
                    overlay.parentNode.removeChild(overlay);
                }
            }, 500);
        }
    }

    /**
     * Add smooth tab content transitions for internal tabs
     */
    addTabTransitions() {
        const tabButtons = document.querySelectorAll('[data-bs-toggle="tab"]');
        const tabContents = document.querySelectorAll('.tab-pane');
        
        tabButtons.forEach(button => {
            button.addEventListener('shown.bs.tab', (event) => {
                const targetId = event.target.getAttribute('data-bs-target');
                const targetContent = document.querySelector(targetId);
                
                if (targetContent) {
                    targetContent.classList.add('tab-content');
                    
                    requestAnimationFrame(() => {
                        targetContent.classList.add('active');
                    });
                }
            });
            
            button.addEventListener('hide.bs.tab', (event) => {
                const targetId = event.target.getAttribute('data-bs-target');
                const targetContent = document.querySelector(targetId);
                
                if (targetContent) {
                    targetContent.classList.remove('active');
                }
            });
        });
    }

    /**
     * Enhanced map hover effects
     */
    enhanceMapInteractions() {
        const mapContainers = document.querySelectorAll('.map-container');
        
        mapContainers.forEach(container => {
            container.addEventListener('mouseenter', () => {
                if (window.innerWidth >= 1200) {
                    container.style.transform = 'scale(1.02)';
                    container.style.boxShadow = '0 15px 40px rgba(0,0,0,0.2)';
                }
            });
            
            container.addEventListener('mouseleave', () => {
                container.style.transform = 'scale(1)';
                container.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)';
            });
        });
    }

    /**
     * Stagger card animations for better visual flow
     */
    staggerCardAnimations() {
        const cardGroups = [
            document.querySelectorAll('.stat-card'),
            document.querySelectorAll('.status-card'),
            document.querySelectorAll('.section-card')
        ];

        cardGroups.forEach(cards => {
            cards.forEach((card, index) => {
                card.style.animationDelay = `${index * 0.1}s`;
            });
        });
    }

    /**
     * Initialize all animations
     */
    initializeAllAnimations() {
        this.addTabTransitions();
        this.enhanceMapInteractions();
        this.staggerCardAnimations();
    }
}

// Initialize dashboard animations when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    const animationController = new DashboardAnimationController();
    animationController.initializeAllAnimations();
});

// Export for potential external use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DashboardAnimationController;
}