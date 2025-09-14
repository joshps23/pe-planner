// Mobile UI functionality

// Mobile menu toggle
function toggleMobileMenu() {
    const controls = document.querySelector('.controls');
    const menuToggle = document.querySelector('.mobile-menu-toggle');
    const overlay = document.querySelector('.mobile-menu-overlay');

    if (controls.classList.contains('mobile-menu-open')) {
        closeMobileMenu();
    } else {
        controls.classList.add('mobile-menu-open');
        menuToggle.classList.add('active');
        overlay.classList.add('active');
        document.body.style.overflow = 'hidden'; // Prevent background scrolling
    }
}

function closeMobileMenu() {
    const controls = document.querySelector('.controls');
    const menuToggle = document.querySelector('.mobile-menu-toggle');
    const overlay = document.querySelector('.mobile-menu-overlay');

    controls.classList.remove('mobile-menu-open');
    menuToggle.classList.remove('active');
    overlay.classList.remove('active');
    document.body.style.overflow = ''; // Restore scrolling
}

// Mobile bottom navigation
function mobileNavSwitch(section) {
    // Remove active class from all nav items
    document.querySelectorAll('.mobile-nav-item').forEach(item => {
        item.classList.remove('active');
    });

    // Add active class to clicked item
    event.currentTarget.classList.add('active');

    // Close mobile menu if open
    closeMobileMenu();

    // Handle navigation based on section
    switch(section) {
        case 'court':
            // Scroll to court
            document.querySelector('.court-container').scrollIntoView({ behavior: 'smooth' });
            break;
        case 'equipment':
            // Open equipment section
            openMobileMenuSection('Equipment');
            break;
        case 'students':
            // Open students section
            openMobileMenuSection('Students');
            break;
        case 'rules':
            // Open rules section
            openMobileMenuSection('Activity Rules');
            break;
        case 'ai':
            // Show AI analysis
            getAISuggestions();
            break;
    }
}

function openMobileMenuSection(sectionName) {
    // Open mobile menu
    toggleMobileMenu();

    // Find and expand the section
    setTimeout(() => {
        const sections = document.querySelectorAll('.control-header h3');
        sections.forEach(header => {
            if (header.textContent.includes(sectionName)) {
                const section = header.closest('.control-section');
                if (section && section.classList.contains('collapsed')) {
                    header.closest('.control-header').click();
                }
                // Scroll to section
                section.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    }, 300);
}

// Mobile FAB menu
function toggleFabMenu() {
    const fabMenu = document.getElementById('mobileFabMenu');
    const fabIcon = document.getElementById('fabIcon');

    if (fabMenu.classList.contains('active')) {
        fabMenu.classList.remove('active');
        fabIcon.textContent = '+';
        fabIcon.style.transform = 'rotate(0deg)';
    } else {
        fabMenu.classList.add('active');
        fabIcon.textContent = '×';
        fabIcon.style.transform = 'rotate(45deg)';
    }
}

// Court zoom functionality
let courtZoomLevel = 1;
const ZOOM_STEP = 0.25;
const MAX_ZOOM = 2;
const MIN_ZOOM = 0.5;

function zoomCourt(direction) {
    const court = document.getElementById('court');

    if (direction === 'in') {
        courtZoomLevel = Math.min(courtZoomLevel + ZOOM_STEP, MAX_ZOOM);
    } else {
        courtZoomLevel = Math.max(courtZoomLevel - ZOOM_STEP, MIN_ZOOM);
    }

    court.style.transform = `scale(${courtZoomLevel})`;

    // Add visual feedback
    const zoomDisplay = document.createElement('div');
    zoomDisplay.textContent = `${Math.round(courtZoomLevel * 100)}%`;
    zoomDisplay.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: rgba(0, 0, 0, 0.7);
        color: white;
        padding: 8px 16px;
        border-radius: 20px;
        font-size: 14px;
        z-index: 9999;
        pointer-events: none;
    `;
    document.body.appendChild(zoomDisplay);

    setTimeout(() => {
        zoomDisplay.remove();
    }, 1000);
}

// Touch gesture support for court panning
let isPanning = false;
let startX = 0;
let startY = 0;
let scrollLeft = 0;
let scrollTop = 0;

function initTouchGestures() {
    const courtContainer = document.querySelector('.court-container');

    if (!courtContainer) return;

    // Touch events for mobile
    courtContainer.addEventListener('touchstart', handleTouchStart, { passive: false });
    courtContainer.addEventListener('touchmove', handleTouchMove, { passive: false });
    courtContainer.addEventListener('touchend', handleTouchEnd);

    // Mouse events for testing on desktop
    courtContainer.addEventListener('mousedown', handleMouseDown);
    courtContainer.addEventListener('mousemove', handleMouseMove);
    courtContainer.addEventListener('mouseup', handleMouseUp);
    courtContainer.addEventListener('mouseleave', handleMouseUp);
}

function handleTouchStart(e) {
    if (e.touches.length === 2) {
        // Pinch zoom gesture
        handlePinchStart(e);
    } else if (e.touches.length === 1) {
        // Pan gesture
        const touch = e.touches[0];
        startX = touch.pageX - e.currentTarget.offsetLeft;
        startY = touch.pageY - e.currentTarget.offsetTop;
        scrollLeft = e.currentTarget.scrollLeft;
        scrollTop = e.currentTarget.scrollTop;
        isPanning = true;
    }
}

function handleTouchMove(e) {
    if (e.touches.length === 2) {
        handlePinchMove(e);
        e.preventDefault();
    } else if (isPanning && e.touches.length === 1) {
        e.preventDefault();
        const touch = e.touches[0];
        const x = touch.pageX - e.currentTarget.offsetLeft;
        const y = touch.pageY - e.currentTarget.offsetTop;
        const walkX = (x - startX) * 1.5;
        const walkY = (y - startY) * 1.5;
        e.currentTarget.scrollLeft = scrollLeft - walkX;
        e.currentTarget.scrollTop = scrollTop - walkY;
    }
}

function handleTouchEnd(e) {
    isPanning = false;
    handlePinchEnd(e);
}

// Pinch zoom support
let initialDistance = 0;
let initialZoom = 1;

function handlePinchStart(e) {
    const touch1 = e.touches[0];
    const touch2 = e.touches[1];
    initialDistance = Math.hypot(
        touch2.pageX - touch1.pageX,
        touch2.pageY - touch1.pageY
    );
    initialZoom = courtZoomLevel;
}

function handlePinchMove(e) {
    if (e.touches.length !== 2) return;

    const touch1 = e.touches[0];
    const touch2 = e.touches[1];
    const currentDistance = Math.hypot(
        touch2.pageX - touch1.pageX,
        touch2.pageY - touch1.pageY
    );

    const scale = currentDistance / initialDistance;
    courtZoomLevel = Math.min(Math.max(initialZoom * scale, MIN_ZOOM), MAX_ZOOM);

    const court = document.getElementById('court');
    court.style.transform = `scale(${courtZoomLevel})`;
}

function handlePinchEnd(e) {
    initialDistance = 0;
}

// Mouse events for desktop testing
function handleMouseDown(e) {
    isPanning = true;
    startX = e.pageX - e.currentTarget.offsetLeft;
    startY = e.pageY - e.currentTarget.offsetTop;
    scrollLeft = e.currentTarget.scrollLeft;
    scrollTop = e.currentTarget.scrollTop;
    e.currentTarget.style.cursor = 'grabbing';
}

function handleMouseMove(e) {
    if (!isPanning) return;
    e.preventDefault();
    const x = e.pageX - e.currentTarget.offsetLeft;
    const y = e.pageY - e.currentTarget.offsetTop;
    const walkX = (x - startX) * 2;
    const walkY = (y - startY) * 2;
    e.currentTarget.scrollLeft = scrollLeft - walkX;
    e.currentTarget.scrollTop = scrollTop - walkY;
}

function handleMouseUp(e) {
    isPanning = false;
    if (e.currentTarget) {
        e.currentTarget.style.cursor = 'grab';
    }
}

// Responsive layout adjustments
function checkMobileView() {
    const isMobile = window.innerWidth <= 768;
    const zoomControls = document.querySelector('.court-zoom-controls');

    if (zoomControls) {
        zoomControls.style.display = isMobile ? 'flex' : 'none';
    }

    // Adjust court container for mobile
    const courtContainer = document.querySelector('.court-container');
    if (courtContainer && isMobile) {
        courtContainer.style.overflow = 'auto';
        courtContainer.style.cursor = 'grab';
    }
}

// Initialize mobile features on page load
document.addEventListener('DOMContentLoaded', function() {
    checkMobileView();
    initTouchGestures();

    // Add resize listener
    let resizeTimer;
    window.addEventListener('resize', function() {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(function() {
            checkMobileView();
        }, 250);
    });

    // Close mobile menu on escape key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            closeMobileMenu();
        }
    });

    // Prevent double-tap zoom on mobile
    let lastTouchEnd = 0;
    document.addEventListener('touchend', function(e) {
        const now = Date.now();
        if (now - lastTouchEnd <= 300) {
            e.preventDefault();
        }
        lastTouchEnd = now;
    }, false);
});

// Swipe gesture for mobile menu
let touchStartX = 0;
let touchEndX = 0;

document.addEventListener('touchstart', function(e) {
    touchStartX = e.changedTouches[0].screenX;
}, false);

document.addEventListener('touchend', function(e) {
    touchEndX = e.changedTouches[0].screenX;
    handleSwipeGesture();
}, false);

function handleSwipeGesture() {
    const swipeThreshold = 50;
    const swipeDistance = touchEndX - touchStartX;

    // Swipe right to open menu (from left edge)
    if (swipeDistance > swipeThreshold && touchStartX < 50) {
        toggleMobileMenu();
    }

    // Swipe left to close menu
    if (swipeDistance < -swipeThreshold) {
        const controls = document.querySelector('.controls');
        if (controls.classList.contains('mobile-menu-open')) {
            closeMobileMenu();
        }
    }
}

// Mobile-optimized drag and drop
function enhanceMobileDragDrop() {
    const elements = document.querySelectorAll('.equipment, .student');

    elements.forEach(element => {
        // Add visual feedback for touch
        element.addEventListener('touchstart', function() {
            this.style.opacity = '0.7';
            this.style.transform = 'scale(1.1)';
        });

        element.addEventListener('touchend', function() {
            this.style.opacity = '1';
            this.style.transform = 'scale(1)';
        });
    });
}

// Call this when new elements are added to the court
window.enhanceMobileDragDrop = enhanceMobileDragDrop;