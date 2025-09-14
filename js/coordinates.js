// Centralized coordinate system and element size management
// This module provides consistent positioning and boundary checking across the application

// Define all element sizes in one place
const ELEMENT_SIZES = {
    // Students/Players
    attacker: { width: 80, height: 80 },
    defender: { width: 80, height: 80 },
    student: { width: 80, height: 80 }, // Generic student size

    // Equipment
    cone: { width: 30, height: 30 },
    ball: { width: 25, height: 25 },
    hoop: { width: 35, height: 35 },
    'equipment-net': { width: 80, height: 20 },
    net: { width: 80, height: 20 }, // Alias for equipment-net
    bench: { width: 80, height: 20 },
    marker: { width: 25, height: 35 },
    racket: { width: 25, height: 40 },
    shuttle: { width: 20, height: 30 },
    shuttlecock: { width: 20, height: 30 }, // Alias
    'floorball-stick': { width: 40, height: 40 },
    frisbee: { width: 35, height: 35 },

    // Annotations
    annotation: { width: 120, height: 60 }
};

// Default element size for unknown types
const DEFAULT_ELEMENT_SIZE = { width: 30, height: 30 };

/**
 * Get the size of an element based on its type or class
 * @param {HTMLElement|Object} element - DOM element or object with type property
 * @returns {{width: number, height: number}} Element dimensions
 */
function getElementSize(element) {
    let type = null;

    // Handle DOM elements
    if (element instanceof HTMLElement) {
        // Check for specific classes
        if (element.classList.contains('annotation')) {
            type = 'annotation';
        } else if (element.classList.contains('attacker')) {
            type = 'attacker';
        } else if (element.classList.contains('defender')) {
            type = 'defender';
        } else if (element.classList.contains('student')) {
            type = 'student';
        } else {
            // Try to extract type from class list
            for (const className of element.classList) {
                if (ELEMENT_SIZES[className]) {
                    type = className;
                    break;
                }
            }
        }
    }
    // Handle plain objects with type property
    else if (element && element.type) {
        type = element.type;
    }

    // Return size or default
    return ELEMENT_SIZES[type] || DEFAULT_ELEMENT_SIZE;
}

/**
 * Convert percentage coordinates to pixel coordinates
 * @param {number} percent - Percentage value (0-100)
 * @param {number} dimension - Total dimension in pixels
 * @returns {number} Pixel value
 */
function percentToPixel(percent, dimension) {
    return (percent / 100) * dimension;
}

/**
 * Convert pixel coordinates to percentage coordinates
 * @param {number} pixel - Pixel value
 * @param {number} dimension - Total dimension in pixels
 * @returns {number} Percentage value (0-100)
 */
function pixelToPercent(pixel, dimension) {
    return (pixel / dimension) * 100;
}

/**
 * Get the court boundaries for positioning elements
 * @param {HTMLElement} court - The court element
 * @returns {{width: number, height: number, minX: number, maxX: number, minY: number, maxY: number}}
 */
function getCourtBoundaries(court) {
    // Use clientWidth/clientHeight which gives us the content area (excluding border)
    const width = court.clientWidth;
    const height = court.clientHeight;

    // Check if this is a custom space with a border
    const computedStyle = window.getComputedStyle(court);
    const borderTop = parseFloat(computedStyle.borderTopWidth) || 0;
    const borderLeft = parseFloat(computedStyle.borderLeftWidth) || 0;

    // For debugging: log if dimensions seem unusual
    if (window.debugMode && (width === 0 || height === 0)) {
        console.warn('Court has zero dimensions!', { width, height });
    }

    // For custom spaces with borders, we need to allow negative positioning
    // to account for the border width so elements can visually reach the edge
    const minX = -borderLeft;
    const minY = -borderTop;

    return {
        width: width,
        height: height,
        minX: minX,
        maxX: width,
        minY: minY,
        maxY: height,
        borderTop: borderTop,
        borderLeft: borderLeft
    };
}

/**
 * Validate and clamp element position to stay within court boundaries
 * @param {string|Object} elementType - Element type string or element object
 * @param {number} x - X position (pixels)
 * @param {number} y - Y position (pixels)
 * @param {HTMLElement} court - The court element
 * @param {boolean} isPercentage - Whether x,y are percentages (default: false)
 * @returns {{x: number, y: number, clamped: boolean}} Validated position and whether it was clamped
 */
function validateElementPosition(elementType, x, y, court, isPercentage = false) {
    const boundaries = getCourtBoundaries(court);
    const elementSize = getElementSize(elementType);

    // Convert percentages to pixels if needed
    let pixelX = isPercentage ? percentToPixel(x, boundaries.width) : x;
    let pixelY = isPercentage ? percentToPixel(y, boundaries.height) : y;

    // Store original values to detect clamping
    const originalX = pixelX;
    const originalY = pixelY;

    // Calculate max positions (element positioned by top-left corner)
    const maxX = boundaries.width - elementSize.width;
    const maxY = boundaries.height - elementSize.height;

    // Clamp to boundaries (using minX and minY from boundaries which accounts for borders)
    pixelX = Math.max(boundaries.minX, Math.min(maxX, pixelX));
    pixelY = Math.max(boundaries.minY, Math.min(maxY, pixelY));

    return {
        x: pixelX,
        y: pixelY,
        clamped: (pixelX !== originalX || pixelY !== originalY)
    };
}

/**
 * Convert element position from percentage to pixel with validation
 * @param {Object} element - Element object with type and position
 * @param {HTMLElement} court - The court element
 * @returns {{x: number, y: number}} Validated pixel position
 */
function percentPositionToPixels(element, court) {
    const boundaries = getCourtBoundaries(court);
    const elementSize = getElementSize(element);

    // Get percentage position (with defaults)
    const xPercent = element.position?.xPercent ?? 50;
    const yPercent = element.position?.yPercent ?? 50;

    // Convert to pixels (center-based to top-left based)
    const centerX = percentToPixel(xPercent, boundaries.width);
    const centerY = percentToPixel(yPercent, boundaries.height);

    // Calculate top-left position
    const x = centerX - (elementSize.width / 2);
    const y = centerY - (elementSize.height / 2);

    // Validate and return
    return validateElementPosition(element, x, y, court);
}

/**
 * Convert element position from pixels to percentage
 * @param {Object} element - Element object with type
 * @param {number} x - X position in pixels (top-left)
 * @param {number} y - Y position in pixels (top-left)
 * @param {HTMLElement} court - The court element
 * @returns {{xPercent: number, yPercent: number}} Percentage position (center-based)
 */
function pixelPositionToPercent(element, x, y, court) {
    const boundaries = getCourtBoundaries(court);
    const elementSize = getElementSize(element);

    // Calculate center position from top-left
    const centerX = x + (elementSize.width / 2);
    const centerY = y + (elementSize.height / 2);

    // Convert to percentages
    const xPercent = pixelToPercent(centerX, boundaries.width);
    const yPercent = pixelToPercent(centerY, boundaries.height);

    // Clamp percentages to valid range (0-100)
    return {
        xPercent: Math.max(0, Math.min(100, xPercent)),
        yPercent: Math.max(0, Math.min(100, yPercent))
    };
}

/**
 * Get safe initial position for a new element
 * @param {string} elementType - Type of element
 * @param {HTMLElement} court - The court element
 * @returns {{x: number, y: number}} Safe pixel position
 */
function getSafeInitialPosition(elementType, court) {
    const boundaries = getCourtBoundaries(court);
    const elementSize = getElementSize(elementType);

    // Default to 40% from top-left (safe center-ish position)
    const defaultX = boundaries.width * 0.4;
    const defaultY = boundaries.height * 0.4;

    // Validate to ensure it fits
    return validateElementPosition(elementType, defaultX, defaultY, court);
}

/**
 * Check if a position is within court boundaries
 * @param {Object} position - {x, y} position in pixels
 * @param {Object} elementSize - {width, height} of element
 * @param {HTMLElement} court - The court element
 * @returns {boolean} Whether position is valid
 */
function isPositionInBounds(position, elementSize, court) {
    const boundaries = getCourtBoundaries(court);

    return position.x >= 0 &&
           position.y >= 0 &&
           (position.x + elementSize.width) <= boundaries.width &&
           (position.y + elementSize.height) <= boundaries.height;
}

// Export functions for use in other modules
window.CoordinateSystem = {
    ELEMENT_SIZES,
    DEFAULT_ELEMENT_SIZE,
    getElementSize,
    percentToPixel,
    pixelToPercent,
    getCourtBoundaries,
    validateElementPosition,
    percentPositionToPixels,
    pixelPositionToPercent,
    getSafeInitialPosition,
    isPositionInBounds
};