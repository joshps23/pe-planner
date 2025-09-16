// Core variables
let itemCounter = 0;
let draggedElement = null;
let dragOffset = { x: 0, y: 0 };
let currentPhase = 'warmup';
let currentPreviewedLayout = null;
let isDrawingMode = false;
let drawingPath = null;
let drawingStartPoint = null;
let timerInterval = null;
let timerSeconds = 0;
let lessonPlans = JSON.parse(localStorage.getItem('lessonPlans') || '{}');
let currentLayout = 'custom';
let currentSuggestedLayout = null; // For backward compatibility
let currentSuggestedLayouts = null; // For multi-layout support
let selectedLayoutIndex = null;
let lastAnalysisResults = null; // Store last analysis for retrieval
let lastAnalysisTimestamp = null;

// Group selection variables
let selectedElements = new Set();
let isGroupMode = false;
let groups = new Map(); // Map of group ID to Set of element IDs
let nextGroupId = 1;
let isLassoSelecting = false;
let lassoStart = null;
let lassoElement = null;

// Context menu variables
let contextMenuTarget = null;
let currentZIndex = 100;

// Custom prompt variables
let customPromptCallback = null;
let customPromptType = null;

// Custom activity space specification
const courtSpecs = {
    custom: {
        name: 'Custom Activity Space',
        realDimensions: { width: 20, height: 10 }, // default meters
        aspectRatio: 2, // default 2:1
        lines: {}
    }
};

// Helper function to check if we're in landscape mode
function isLandscapeMode() {
    return window.matchMedia("(orientation: landscape)").matches;
}

// Debug visualization helper
function addDebugVisualization(court) {
    // Remove any existing debug markers
    court.querySelectorAll('.debug-boundary, .debug-corner').forEach(m => m.remove());

    const boundaries = CoordinateSystem.getCourtBoundaries(court);

    // Draw debug rectangle showing the actual court boundaries
    const debugMarker = document.createElement('div');
    debugMarker.style.position = 'absolute';
    debugMarker.style.left = '0px';
    debugMarker.style.top = '0px';
    debugMarker.style.width = '100%';
    debugMarker.style.height = '100%';
    debugMarker.style.border = '2px dashed red';
    debugMarker.style.pointerEvents = 'none';
    debugMarker.style.zIndex = '9999';
    debugMarker.className = 'debug-boundary';
    court.appendChild(debugMarker);

    // Add corner markers
    const corners = [
        {x: 0, y: 0, label: '0,0'},
        {x: boundaries.width - 20, y: 0, label: 'TR'},
        {x: 0, y: boundaries.height - 20, label: 'BL'},
        {x: boundaries.width - 20, y: boundaries.height - 20, label: 'BR'}
    ];

    corners.forEach(corner => {
        const marker = document.createElement('div');
        marker.style.position = 'absolute';
        marker.style.left = corner.x + 'px';
        marker.style.top = corner.y + 'px';
        marker.style.width = '20px';
        marker.style.height = '20px';
        marker.style.background = 'red';
        marker.style.color = 'white';
        marker.style.fontSize = '10px';
        marker.style.display = 'flex';
        marker.style.alignItems = 'center';
        marker.style.justifyContent = 'center';
        marker.textContent = corner.label;
        marker.className = 'debug-corner';
        court.appendChild(marker);
    });
}

// Helper function to get mouse position relative to court
function getMousePosition(e, court) {
    const courtRect = court.getBoundingClientRect();
    
    let clientX, clientY;
    if (e.type === 'mousemove' || e.type === 'mousedown') {
        clientX = e.clientX;
        clientY = e.clientY;
    } else {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
    }
    
    // Get position relative to court container
    // No coordinate transformation needed - court stays in natural orientation
    let x = clientX - courtRect.left;
    let y = clientY - courtRect.top;
    
    return { x, y };
}

function addEquipment(type) {
    const court = document.getElementById('court');
    if (!court) {
        console.error('Court element not found!');
        return;
    }

    console.log('Adding equipment:', type);

    const item = document.createElement('div');
    item.className = `draggable-item ${type}`;
    item.id = 'item-' + (++itemCounter);
    item.dataset.phase = currentPhase;

    // Use the new coordinate system for safe initial position
    const position = CoordinateSystem.getSafeInitialPosition(type, court);

    item.style.left = position.x + 'px';
    item.style.top = position.y + 'px';
    item.style.position = 'absolute';
    item.style.zIndex = currentZIndex++; // Set initial z-index
    
    const removeBtn = createRemoveButton(item);
    item.appendChild(removeBtn);
    court.appendChild(item);

    console.log('Equipment added to court:', item);

    makeDraggable(item);
    updateAnalyzeFabState();
}

async function addStudent(type) {
    const court = document.getElementById('court');
    if (!court) {
        console.error('Court element not found!');
        return;
    }

    const studentType = type === 'attacker' ? 'Attacker' :
                       type === 'defender' ? 'Defender' : 'Observer';
    const name = await showCustomPrompt(
        `Add ${studentType}`,
        `Enter student name:`,
        '',
        'text',
        `Leave blank to use default label "${studentType.toUpperCase()}"`
    );

    // If user cancelled, don't add student
    if (name === null) return;

    console.log('Adding student:', type);

    const item = document.createElement('div');
    item.className = `draggable-item student ${type}`;
    item.id = 'item-' + (++itemCounter);
    item.dataset.phase = currentPhase;

    if (name && name.trim()) {
        const nameLabel = document.createElement('div');
        nameLabel.textContent = name.trim();
        nameLabel.style.position = 'absolute';
        nameLabel.style.bottom = '-22px';
        nameLabel.style.left = '50%';
        nameLabel.style.transform = 'translateX(-50%)';
        nameLabel.style.fontSize = '11px';
        nameLabel.style.color = type === 'attacker' ? '#e74c3c' :
                                type === 'defender' ? '#3498db' : '#10b981';
        nameLabel.style.fontWeight = 'bold';
        nameLabel.style.whiteSpace = 'nowrap';
        nameLabel.style.textAlign = 'center';
        nameLabel.style.backgroundColor = 'rgba(255, 255, 255, 0.9)';
        nameLabel.style.padding = '2px 6px';
        nameLabel.style.borderRadius = '4px';
        nameLabel.style.boxShadow = '0 1px 3px rgba(0,0,0,0.15)';
        item.appendChild(nameLabel);
    }
    
    // Use the new coordinate system for safe initial position
    const position = CoordinateSystem.getSafeInitialPosition(type, court);

    item.style.left = position.x + 'px';
    item.style.top = position.y + 'px';
    item.style.position = 'absolute';
    item.style.zIndex = currentZIndex++; // Set initial z-index
    
    const removeBtn = createRemoveButton(item);
    item.appendChild(removeBtn);
    court.appendChild(item);

    console.log('Student added to court:', item);

    makeDraggable(item);
    updateAnalyzeFabState();
}

function makeDraggable(element) {
    element.addEventListener('mousedown', startDrag);
    element.addEventListener('touchstart', startDrag);
    attachContextMenu(element);
}

// Helper function to create remove button with proper touch support
function createRemoveButton(parentElement) {
    const removeBtn = document.createElement('button');
    removeBtn.className = 'remove-btn';
    removeBtn.textContent = '×';

    // Handle both click and touch events
    const handleRemove = (e) => {
        e.stopPropagation();
        e.preventDefault();
        const court = document.getElementById('court');
        if (court && court.contains(parentElement)) {
            court.removeChild(parentElement);
            updateAnalyzeFabState();
        }
    };

    removeBtn.onclick = handleRemove;
    removeBtn.ontouchstart = (e) => {
        e.stopPropagation();
        e.preventDefault();
        handleRemove(e);
    };

    return removeBtn;
}

function startDrag(e) {
    // Don't start drag if user is typing in a textarea
    if (e.target.tagName === 'TEXTAREA' && document.activeElement === e.target) {
        return;
    }
    
    e.preventDefault();
    // Find the draggable element (could be the target itself or a parent)
    const element = e.target.closest('.draggable-item, .annotation') || e.target;
    
    // Handle selection mode
    if (isGroupMode) {
        const isCtrlOrCmd = e.ctrlKey || e.metaKey;
        selectElement(element, isCtrlOrCmd);
        return;
    }
    
    draggedElement = element;
    const court = document.getElementById('court');
    const mousePos = getMousePosition(e, court);

    // Get current element position from style
    const currentLeft = parseInt(draggedElement.style.left) || 0;
    const currentTop = parseInt(draggedElement.style.top) || 0;

    // Calculate offset between mouse position and element position
    dragOffset.x = mousePos.x - currentLeft;
    dragOffset.y = mousePos.y - currentTop;

    if (window.debugMode) {
        const courtRect = court.getBoundingClientRect();
        const elementRect = draggedElement.getBoundingClientRect();
        console.log('=== DRAG START ===');
        console.log('Element position (style):', { left: currentLeft, top: currentTop });
        console.log('Element rect (actual):', {
            top: elementRect.top,
            left: elementRect.left,
            relativeToCourtTop: elementRect.top - courtRect.top,
            relativeToCourtLeft: elementRect.left - courtRect.left
        });
        console.log('Mouse position in court:', mousePos);
        console.log('Calculated drag offset:', dragOffset);
        console.log('Element size:', CoordinateSystem.getElementSize(draggedElement));
        console.log('Court bounds:', {
            width: court.clientWidth,
            height: court.clientHeight,
            rect: courtRect
        });

        // Check for offset mismatch
        const expectedOffsetY = mousePos.y - currentTop;
        const actualOffsetY = dragOffset.y;
        if (Math.abs(expectedOffsetY - actualOffsetY) > 1) {
            console.error('⚠️ OFFSET MISMATCH!', {
                expected: expectedOffsetY,
                actual: actualOffsetY,
                difference: actualOffsetY - expectedOffsetY
            });
        }

        // Check if the element is already at the edge
        const elementSize = CoordinateSystem.getElementSize(draggedElement);
        if (currentTop <= 0) {
            console.warn('⚠️ Element is at/near top edge! Top:', currentTop);
        }
        if (currentTop + elementSize.height >= court.clientHeight) {
            console.warn('⚠️ Element is at bottom edge!');
        }
    }
    
    // Store original z-index before temporarily boosting it
    // If element doesn't have z-index, assign one now
    if (!draggedElement.style.zIndex || draggedElement.style.zIndex === '') {
        draggedElement.style.zIndex = currentZIndex++;
    }
    dragOffset.originalZIndex = draggedElement.style.zIndex;
    
    // Store initial positions if dragging a grouped element
    if (draggedElement.dataset.groupId) {
        const groupId = draggedElement.dataset.groupId;
        dragOffset.groupOffsets = new Map();
        
        court.querySelectorAll(`[data-group-id="${groupId}"]`).forEach(el => {
            if (el !== draggedElement) {
                const left = parseInt(el.style.left) || 0;
                const top = parseInt(el.style.top) || 0;
                dragOffset.groupOffsets.set(el.id, {
                    x: left - currentLeft,
                    y: top - currentTop
                });
            }
        });
    }
    
    document.addEventListener('mousemove', drag);
    document.addEventListener('mouseup', stopDrag);
    document.addEventListener('touchmove', drag);
    document.addEventListener('touchend', stopDrag);
    
    // Add dragging class for visual feedback
    draggedElement.classList.add('dragging');
    // Temporarily boost z-index while dragging
    draggedElement.style.zIndex = '9999';
}

function drag(e) {
    if (!draggedElement) return;

    e.preventDefault();
    const court = document.getElementById('court');
    const courtContainer = court.parentElement;
    const mousePos = getMousePosition(e, court);

    // Calculate new position based on mouse position minus offset
    let newX = mousePos.x - dragOffset.x;
    let newY = mousePos.y - dragOffset.y;

    // Debug logging for boundary issues
    if (window.debugMode && draggedElement.classList.contains('cone')) {
        const courtRect = court.getBoundingClientRect();
        console.log('Court dimensions:', court.clientWidth, 'x', court.clientHeight);
        console.log('Court rect:', {
            top: courtRect.top,
            left: courtRect.left,
            width: courtRect.width,
            height: courtRect.height
        });
        console.log('Mouse position in court:', mousePos);
        console.log('Proposed element position:', newX, newY);

        // Check if mouse is actually within court bounds
        if (mousePos.y < 0 || mousePos.y > court.clientHeight) {
            console.warn('⚠️ Mouse Y is outside court bounds!', {
                mouseY: mousePos.y,
                courtHeight: court.clientHeight
            });
        }
    }

    // No constraints - allow free positioning
    // Elements can be positioned anywhere without restrictions
    
    draggedElement.style.left = newX + 'px';
    draggedElement.style.top = newY + 'px';
    
    // Move grouped elements together
    if (draggedElement.dataset.groupId && dragOffset.groupOffsets) {
        const groupId = draggedElement.dataset.groupId;
        court.querySelectorAll(`[data-group-id="${groupId}"]`).forEach(el => {
            if (el !== draggedElement && dragOffset.groupOffsets.has(el.id)) {
                const offset = dragOffset.groupOffsets.get(el.id);
                el.style.left = (newX + offset.x) + 'px';
                el.style.top = (newY + offset.y) + 'px';
            }
        });
    }
}

function stopDrag() {
    if (draggedElement) {
        // Remove dragging class
        draggedElement.classList.remove('dragging');
        
        // Restore original z-index
        if (dragOffset.originalZIndex !== undefined) {
            draggedElement.style.zIndex = dragOffset.originalZIndex;
        } else {
            // If no original z-index was stored, assign a new one
            draggedElement.style.zIndex = currentZIndex++;
        }
        
        // Clear group offsets and original z-index
        if (dragOffset.groupOffsets) {
            delete dragOffset.groupOffsets;
        }
        delete dragOffset.originalZIndex;
        
        draggedElement = null;
    }
    
    document.removeEventListener('mousemove', drag);
    document.removeEventListener('mouseup', stopDrag);
    document.removeEventListener('touchmove', drag);
    document.removeEventListener('touchend', stopDrag);
}

function clearCourt() {
    const court = document.getElementById('court');
    const items = court.querySelectorAll('.draggable-item, .path-line, .path-arrow, .annotation');
    items.forEach(item => court.removeChild(item));
    itemCounter = 0;

    // Hide activity details when clearing court
    hideActivityDetails();

    // Reset analysis state
    window.lastAnalysisTime = null;
    updateAnalyzeFabState();
}

function changeLayout() {
    const court = document.getElementById('court');
    const customDimensions = document.getElementById('customDimensions');
    
    // Set standard class for custom space
    court.className = 'playing-area custom-space';
    
    // Initialize with default dimensions if not set
    const spec = courtSpecs.custom;
    if (spec && spec.realDimensions) {
        const widthInput = document.getElementById('customWidth');
        const heightInput = document.getElementById('customHeight');
        if (!widthInput.value) widthInput.value = spec.realDimensions.width;
        if (!heightInput.value) heightInput.value = spec.realDimensions.height;
    }
    
    // Always show custom dimensions
    if (customDimensions) {
        customDimensions.style.display = 'block';
    }
    
    // Apply custom dimensions
    applyCustomDimensions();
    
    // Clear any existing lines (custom spaces start clean)
    updateCourtLines('custom');
    
    currentLayout = 'custom';
}

function updateCourtLines(layoutType) {
    const courtLines = document.getElementById('courtLines');
    const courtNet = document.getElementById('courtNet');
    
    // Clear existing lines and hide nets for custom spaces
    courtLines.innerHTML = '';
    courtNet.style.display = 'none';
    
    // For custom layouts, we keep it clean with no predefined lines
    // Users can add their own markings using cones, markers, and drawing tools
}

function applyCustomDimensions() {
    const width = parseFloat(document.getElementById('customWidth').value) || 20;
    const height = parseFloat(document.getElementById('customHeight').value) || 10;
    const court = document.getElementById('court');
    const layoutType = 'custom'; // Always custom now

    // Apply custom aspect ratio
    const customRatio = width / height;
    court.style.aspectRatio = `${customRatio} / 1`;

    // Update the courtSpecs for the custom layout
    if (courtSpecs.custom) {
        courtSpecs.custom.realDimensions = { width: width, height: height };
        courtSpecs.custom.aspectRatio = customRatio;
    }

    // Update the aspect ratio display
    updateAspectRatioDisplay(customRatio);

    // Update court lines (will be simplified to remove sport-specific lines)
    updateCourtLines(layoutType);

    // After changing dimensions, revalidate all element positions
    setTimeout(() => {
        revalidateAllElements();
    }, 100); // Small delay to ensure CSS has been applied
}


function revalidateAllElements() {
    // This function is now a no-op to prevent unwanted position adjustments
    // Elements are positioned correctly when created and don't need revalidation
    return;
}

function updateAspectRatioDisplay(ratio) {
    const display = document.getElementById('aspectRatioDisplay');
    if (display) {
        display.textContent = `Aspect Ratio: ${ratio.toFixed(2)}:1`;
        
        // Add helpful context
        if (ratio > 2.5) {
            display.textContent += ' (Very Wide)';
        } else if (ratio > 1.8) {
            display.textContent += ' (Wide)';
        } else if (ratio > 1.2) {
            display.textContent += ' (Moderate)';
        } else {
            display.textContent += ' (Square-ish)';
        }
    }
}

function savePlan() {
    const planName = document.getElementById('planName').value.trim();
    if (!planName) {
        alert('Please enter a lesson plan name');
        return;
    }
    
    const court = document.getElementById('court');
    const items = [];
    
    court.querySelectorAll('.draggable-item').forEach(item => {
        const rect = item.getBoundingClientRect();
        const courtRect = court.getBoundingClientRect();

        // Convert pixel positions to percentages for cross-platform compatibility
        const pixelLeft = parseFloat(item.style.left) || 0;
        const pixelTop = parseFloat(item.style.top) || 0;

        // Use the coordinate system to convert to percentages
        const percentPosition = CoordinateSystem.pixelPositionToPercent(
            { type: item.classList[1] || 'equipment' }, // Get element type from class
            pixelLeft,
            pixelTop,
            court
        );

        items.push({
            id: item.id,
            className: item.className,
            leftPercent: percentPosition.xPercent,  // Store as percentage
            topPercent: percentPosition.yPercent,   // Store as percentage
            // Keep pixel values for backward compatibility
            left: item.style.left,
            top: item.style.top,
            phase: item.dataset.phase || 'warmup',
            text: item.querySelector('div') ? item.querySelector('div').textContent : ''
        });
    });

    const annotations = [];
    court.querySelectorAll('.annotation').forEach(ann => {
        // Convert annotation positions to percentages too
        const pixelLeft = parseFloat(ann.style.left) || 0;
        const pixelTop = parseFloat(ann.style.top) || 0;

        const percentPosition = CoordinateSystem.pixelPositionToPercent(
            { type: 'annotation' },
            pixelLeft,
            pixelTop,
            court
        );

        annotations.push({
            leftPercent: percentPosition.xPercent,  // Store as percentage
            topPercent: percentPosition.yPercent,   // Store as percentage
            // Keep pixel values for backward compatibility
            left: ann.style.left,
            top: ann.style.top,
            text: ann.querySelector('textarea').value,
            phase: ann.dataset.phase || 'warmup'
        });
    });
    
    lessonPlans[planName] = {
        items,
        annotations,
        activityDetails: {
            name: document.getElementById('activityName').value.trim(),
            objective: document.getElementById('lessonObjective').value.trim(),
            rules: document.getElementById('activityRules').value.trim(),
            winningConditions: document.getElementById('winningConditions').value.trim(),
            skillFocus: document.getElementById('skillFocus').value.trim()
        },
        courtDimensions: {
            width: document.getElementById('customWidth').value,
            height: document.getElementById('customHeight').value
        },
        timestamp: new Date().toISOString()
    };
    
    localStorage.setItem('lessonPlans', JSON.stringify(lessonPlans));
    updatePlanSelect();
    alert('Lesson plan saved successfully!');
    document.getElementById('planName').value = '';
}

function loadPlan() {
    const select = document.getElementById('savedPlans');
    const planName = select.value;
    if (!planName) {
        alert('Please select a lesson plan to load');
        return;
    }
    
    clearCourt();
    const plan = lessonPlans[planName];
    const court = document.getElementById('court');
    
    // Populate the lesson plan title field with the loaded plan's name
    document.getElementById('planName').value = planName;
    
    // Load activity details if they exist
    if (plan.activityDetails) {
        document.getElementById('activityName').value = plan.activityDetails.name || '';
        document.getElementById('lessonObjective').value = plan.activityDetails.objective || '';
        document.getElementById('activityRules').value = plan.activityDetails.rules || '';
        document.getElementById('winningConditions').value = plan.activityDetails.winningConditions || '';
        document.getElementById('skillFocus').value = plan.activityDetails.skillFocus || '';
    } else {
        // Clear fields if no activity details saved
        document.getElementById('activityName').value = '';
        document.getElementById('lessonObjective').value = '';
        document.getElementById('activityRules').value = '';
        document.getElementById('winningConditions').value = '';
        document.getElementById('skillFocus').value = '';
    }
    
    // Load court dimensions if they exist
    if (plan.courtDimensions) {
        document.getElementById('customWidth').value = plan.courtDimensions.width || '13.4';
        document.getElementById('customHeight').value = plan.courtDimensions.height || '6.1';
        applyCustomDimensions();
    }
    
    plan.items.forEach(itemData => {
        const item = document.createElement('div');
        item.className = itemData.className;
        item.id = itemData.id;
        item.dataset.phase = itemData.phase || 'warmup';

        let x, y;

        // Check if plan uses percentage-based positioning (new format)
        if (itemData.leftPercent !== undefined && itemData.topPercent !== undefined) {
            // New format: Convert percentages to pixels for current court size
            const elementType = itemData.className.split(' ')[1] || 'equipment';
            const position = CoordinateSystem.percentPositionToPixels(
                {
                    type: elementType,
                    position: {
                        xPercent: itemData.leftPercent,
                        yPercent: itemData.topPercent
                    }
                },
                court
            );
            x = position.x;
            y = position.y;
        } else {
            // Old format: Parse pixel values and convert to percentages, then back to pixels
            // This ensures proper scaling for old saves
            const pixelLeft = parseInt(itemData.left) || 0;
            const pixelTop = parseInt(itemData.top) || 0;

            // Get original court dimensions from when the plan was saved
            const savedCourtWidth = plan.courtDimensions ? (plan.courtDimensions.width || 13.4) : 13.4;
            const savedCourtHeight = plan.courtDimensions ? (plan.courtDimensions.height || 6.1) : 6.1;
            const savedAspectRatio = savedCourtWidth / savedCourtHeight;

            // Get current court dimensions to calculate scaling
            const currentCourtBounds = CoordinateSystem.getCourtBoundaries(court);

            // For old saves, we need to estimate the original court pixel dimensions
            // Desktop typically has max-width: 900px, but we should check actual width
            let estimatedOriginalWidth = 900; // Default desktop width

            // If loading on mobile (narrower screen), adjust estimation
            if (window.innerWidth <= 768) {
                // Old mobile saves likely used full width minus padding
                estimatedOriginalWidth = window.innerWidth - 40;
            }

            const estimatedOriginalHeight = estimatedOriginalWidth / savedAspectRatio;

            // Convert old pixel positions to percentages
            const xPercent = (pixelLeft / estimatedOriginalWidth) * 100;
            const yPercent = (pixelTop / estimatedOriginalHeight) * 100;

            // Now convert percentages to pixels for current court
            const elementType = itemData.className.split(' ')[1] || 'equipment';
            const position = CoordinateSystem.percentPositionToPixels(
                {
                    type: elementType,
                    position: {
                        xPercent: xPercent,
                        yPercent: yPercent
                    }
                },
                court
            );
            x = position.x;
            y = position.y;
        }

        // Apply coordinates
        item.style.position = 'absolute';  // CRITICAL: Elements must be absolutely positioned
        item.style.left = x + 'px';
        item.style.top = y + 'px';
        
        if (itemData.text && item.classList.contains('student')) {
            const nameLabel = document.createElement('div');
            nameLabel.textContent = itemData.text;
            nameLabel.style.position = 'absolute';
            nameLabel.style.bottom = '-20px';
            nameLabel.style.left = '50%';
            nameLabel.style.transform = 'translateX(-50%)';
            nameLabel.style.fontSize = '8px';
            nameLabel.style.color = item.classList.contains('attacker') ? '#e74c3c' : '#3498db';
            nameLabel.style.fontWeight = 'bold';
            nameLabel.style.whiteSpace = 'nowrap';
            item.appendChild(nameLabel);
        }
        
        const removeBtn = createRemoveButton(item);
        item.appendChild(removeBtn);
        court.appendChild(item);
        makeDraggable(item);
    });
    
    plan.annotations.forEach(annData => {
        const ann = document.createElement('div');
        ann.className = 'annotation';
        ann.dataset.phase = annData.phase || 'warmup';

        let x, y;

        // Check if plan uses percentage-based positioning (new format)
        if (annData.leftPercent !== undefined && annData.topPercent !== undefined) {
            // New format: Convert percentages to pixels for current court size
            const position = CoordinateSystem.percentPositionToPixels(
                {
                    type: 'annotation',
                    position: {
                        xPercent: annData.leftPercent,
                        yPercent: annData.topPercent
                    }
                },
                court
            );
            x = position.x;
            y = position.y;
        } else {
            // Old format: Parse pixel values and convert to percentages, then back to pixels
            const pixelLeft = parseInt(annData.left) || 0;
            const pixelTop = parseInt(annData.top) || 0;

            // Get original court dimensions from when the plan was saved
            const savedCourtWidth = plan.courtDimensions ? (plan.courtDimensions.width || 13.4) : 13.4;
            const savedCourtHeight = plan.courtDimensions ? (plan.courtDimensions.height || 6.1) : 6.1;
            const savedAspectRatio = savedCourtWidth / savedCourtHeight;

            // Get current court dimensions to calculate scaling
            const currentCourtBounds = CoordinateSystem.getCourtBoundaries(court);

            // For old saves, we need to estimate the original court pixel dimensions
            // Desktop typically has max-width: 900px, but we should check actual width
            let estimatedOriginalWidth = 900; // Default desktop width

            // If loading on mobile (narrower screen), adjust estimation
            if (window.innerWidth <= 768) {
                // Old mobile saves likely used full width minus padding
                estimatedOriginalWidth = window.innerWidth - 40;
            }

            const estimatedOriginalHeight = estimatedOriginalWidth / savedAspectRatio;

            // Convert old pixel positions to percentages
            const xPercent = (pixelLeft / estimatedOriginalWidth) * 100;
            const yPercent = (pixelTop / estimatedOriginalHeight) * 100;

            // Now convert percentages to pixels for current court
            const position = CoordinateSystem.percentPositionToPixels(
                {
                    type: 'annotation',
                    position: {
                        xPercent: xPercent,
                        yPercent: yPercent
                    }
                },
                court
            );
            x = position.x;
            y = position.y;
        }

        // Allow annotations to extend slightly outside court (for notes on edges)
        const elementSize = CoordinateSystem.getElementSize(ann);
        const boundaries = CoordinateSystem.getCourtBoundaries(court);
        const safetyMargin = 10;
        const maxX = boundaries.width - elementSize.width + safetyMargin;
        const maxY = boundaries.height - elementSize.height + safetyMargin;

        // Clamp with slight negative allowed
        x = Math.max(-safetyMargin, Math.min(maxX, x));
        y = Math.max(-safetyMargin, Math.min(maxY, y));

        // Apply validated coordinates
        ann.style.position = 'absolute';  // CRITICAL: Annotations must be absolutely positioned
        ann.style.left = x + 'px';
        ann.style.top = y + 'px';
        
        const textarea = document.createElement('textarea');
        textarea.value = annData.text;
        textarea.rows = 1;
        
        // Add input event listener for auto-resizing
        textarea.addEventListener('input', function() {
            autoResizeTextarea(this);
        });
        
        // Add focus and blur events for better UX
        textarea.addEventListener('focus', function() {
            ann.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.4), 0 0 0 2px #3b82f6';
        });
        
        textarea.addEventListener('blur', function() {
            ann.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.3)';
        });
        
        ann.appendChild(textarea);
        
        const removeBtn = createRemoveButton(ann);
        ann.appendChild(removeBtn);
        
        court.appendChild(ann);
        makeDraggable(ann);
        
        // Auto-resize to fit loaded content
        autoResizeTextarea(textarea);
    });
    
    itemCounter = Math.max(...plan.items.map(item => parseInt(item.id.split('-')[1]))) || 0;
    switchPhase(currentPhase);

    // Initialize z-indexes for loaded elements
    initializeZIndexes();

    // Revalidate all positions after loading
    setTimeout(() => {
        revalidateAllElements();
    }, 100); // Small delay to ensure DOM is updated
}

function deletePlan() {
    const select = document.getElementById('savedPlans');
    const planName = select.value;
    if (!planName) {
        alert('Please select a lesson plan to delete');
        return;
    }
    
    if (confirm(`Are you sure you want to delete "${planName}"?`)) {
        delete lessonPlans[planName];
        localStorage.setItem('lessonPlans', JSON.stringify(lessonPlans));
        updatePlanSelect();
        alert('Lesson plan deleted successfully!');
    }
}

function updatePlanSelect() {
    const select = document.getElementById('savedPlans');
    select.innerHTML = '<option value="">Select saved plan...</option>';
    Object.keys(lessonPlans).forEach(planName => {
        const option = document.createElement('option');
        option.value = planName;
        option.textContent = planName;
        select.appendChild(option);
    });
}

function switchPhase(phase) {
    currentPhase = phase;
    document.querySelectorAll('.phase-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`[data-phase="${phase}"]`).classList.add('active');
    
    const court = document.getElementById('court');
    court.querySelectorAll('.draggable-item, .annotation').forEach(item => {
        const itemPhase = item.dataset.phase || 'warmup';
        item.style.display = itemPhase === phase ? 'flex' : 'none';
    });
}

function toggleDrawing() {
    isDrawingMode = !isDrawingMode;
    const btn = document.getElementById('drawBtn');
    const court = document.getElementById('court');
    
    if (isDrawingMode) {
        btn.textContent = 'Stop Drawing';
        btn.style.backgroundColor = '#e74c3c';
        court.classList.add('drawing-mode');
        court.addEventListener('click', handleDrawingClick);
    } else {
        btn.textContent = 'Draw Paths';
        btn.style.backgroundColor = '#9b59b6';
        court.classList.remove('drawing-mode');
        court.removeEventListener('click', handleDrawingClick);
        drawingPath = null;
        drawingStartPoint = null;
    }
}

function handleDrawingClick(e) {
    if (!isDrawingMode || e.target.classList.contains('draggable-item')) return;
    
    const court = document.getElementById('court');
    const rect = court.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    if (!drawingStartPoint) {
        drawingStartPoint = { x, y };
    } else {
        drawPath(drawingStartPoint, { x, y });
        drawingStartPoint = null;
    }
}

function drawPath(start, end) {
    const court = document.getElementById('court');
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const length = Math.sqrt(dx * dx + dy * dy);
    const angle = Math.atan2(dy, dx) * 180 / Math.PI;
    
    const line = document.createElement('div');
    line.className = 'path-line';
    line.style.left = start.x + 'px';
    line.style.top = start.y + 'px';
    line.style.width = length + 'px';
    line.style.transform = `rotate(${angle}deg)`;
    court.appendChild(line);
    
    const arrow = document.createElement('div');
    arrow.className = 'path-arrow';
    arrow.style.left = (end.x - 8) + 'px';
    arrow.style.top = (end.y - 4) + 'px';
    arrow.style.transform = `rotate(${angle}deg)`;
    court.appendChild(arrow);
}

function clearPaths() {
    const court = document.getElementById('court');
    court.querySelectorAll('.path-line, .path-arrow').forEach(path => {
        court.removeChild(path);
    });
}

function autoResizeTextarea(textarea) {
    // Reset height to auto to get the correct scrollHeight
    textarea.style.height = 'auto';
    
    // Set height based on scroll height, with some padding
    const newHeight = Math.max(16, textarea.scrollHeight);
    textarea.style.height = newHeight + 'px';
    
    // Also adjust width based on content
    const tempDiv = document.createElement('div');
    tempDiv.style.position = 'absolute';
    tempDiv.style.visibility = 'hidden';
    tempDiv.style.fontSize = '11px';
    tempDiv.style.fontFamily = textarea.style.fontFamily || 'inherit';
    tempDiv.style.whiteSpace = 'pre-wrap';
    tempDiv.style.wordBreak = 'break-word';
    tempDiv.textContent = textarea.value || textarea.placeholder;
    
    document.body.appendChild(tempDiv);
    const contentWidth = Math.max(80, Math.min(300, tempDiv.offsetWidth + 20));
    document.body.removeChild(tempDiv);
    
    // Set the textarea width
    textarea.parentElement.style.width = contentWidth + 'px';
}

function startTimer() {
    const minutes = parseInt(document.getElementById('timerMinutes').value) || 0;
    const seconds = parseInt(document.getElementById('timerSeconds').value) || 0;
    timerSeconds = minutes * 60 + seconds;
    
    if (timerSeconds <= 0) {
        alert('Please set a valid time');
        return;
    }
    
    timerInterval = setInterval(() => {
        timerSeconds--;
        updateTimerDisplay();
        
        if (timerSeconds <= 0) {
            stopTimer();
            alert('Time\'s up!');
        }
    }, 1000);
}

function stopTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
}

function updateTimerDisplay() {
    const minutes = Math.floor(timerSeconds / 60);
    const seconds = timerSeconds % 60;
    document.getElementById('phaseTimer').textContent = 
        `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

function exportToPDF() {
    alert('PDF export feature would integrate with a library like jsPDF or html2canvas. This is a demo showing where the feature would be implemented.');
}

// Function to update FAB pulse state
function updateAnalyzeFabState() {
    const fab = document.getElementById('analyzeFab');
    if (!fab) return;

    const court = document.getElementById('court');
    const hasElements = court.querySelectorAll('.draggable-item, .annotation').length > 0;

    if (hasElements && !window.lastAnalysisTime) {
        fab.classList.add('pulse');
    } else {
        fab.classList.remove('pulse');
    }
}

// Initialize
window.addEventListener('load', () => {
    updatePlanSelect();
    switchPhase('warmup');
    
    // Initialize with default custom dimensions
    const defaultSpec = courtSpecs.custom;
    document.getElementById('customWidth').value = defaultSpec.realDimensions.width;
    document.getElementById('customHeight').value = defaultSpec.realDimensions.height;
    applyCustomDimensions(); // This will set the aspect ratio display
    
    // Load API configuration
    loadApiConfig();
    
    // Show onboarding for first-time users
    if (!localStorage.getItem('onboardingCompleted')) {
        document.getElementById('onboardingOverlay').style.display = 'flex';
    } else {
        document.getElementById('onboardingOverlay').style.display = 'none';
    }
    
    // Add tooltip functionality
    document.querySelectorAll('[title]').forEach(element => {
        element.addEventListener('mouseenter', showTooltip);
        element.addEventListener('mouseleave', hideTooltip);
    });
    
    // Add keyboard shortcuts for modal and grouping
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            const aiModal = document.getElementById('aiSuggestionsModal');
            if (aiModal.classList.contains('show')) {
                closeAISuggestionsModal();
            } else if (isGroupMode) {
                toggleGroupMode();
            }
        }
        
        // Group/Ungroup shortcuts
        if ((e.ctrlKey || e.metaKey) && e.key === 'g') {
            e.preventDefault();
            if (e.shiftKey) {
                ungroupSelected();
            } else {
                groupSelected();
            }
        }
        
        // Select all
        if ((e.ctrlKey || e.metaKey) && e.key === 'a' && isGroupMode) {
            e.preventDefault();
            const court = document.getElementById('court');
            court.querySelectorAll('.draggable-item, .annotation').forEach(el => {
                if (el.style.display !== 'none') {
                    el.classList.add('selected');
                    selectedElements.add(el.id);
                }
            });
            updateSelectionInfo();
        }

        // Analyze Layout shortcut
        if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'A') {
            e.preventDefault();
            analyzeLayout();
        }
        
        // Delete selected elements
        if (e.key === 'Delete' && selectedElements.size > 0) {
            e.preventDefault();
            selectedElements.forEach(id => {
                const element = document.getElementById(id);
                if (element) {
                    element.remove();
                }
            });
            clearSelection();
        }
    });
    
    // Close modal when clicking outside of it
    document.getElementById('aiSuggestionsModal').addEventListener('click', function(e) {
        if (e.target === this) {
            closeAISuggestionsModal();
        }
    });
});

// Apply suggested layout from JSON
function applyLayoutFromJson() {
    if (!currentSuggestedLayout) {
        alert('No layout suggestion available to apply.');
        return;
    }
    
    // Confirm with user before clearing current layout
    if (!confirm('This will replace your current layout with the AI suggestion. Continue?')) {
        return;
    }
    
    const court = document.getElementById('court');

    // STEP 1: Clear draggable items and show visual feedback
    console.log('🧹 Clearing court for fresh layout...');

    // Clear existing draggable items and annotations
    court.querySelectorAll('.draggable-item, .annotation, .path-line, .path-arrow').forEach(item => {
        item.remove();
    });

    // Add visual feedback - show empty court briefly
    court.style.backgroundColor = '#f0f0f0';
    court.style.transition = 'background-color 0.3s ease';

    // STEP 2: Reset the court state
    resetCourtToFreshState(court);

    // Reset item counter and tracking
    itemCounter = 0;
    window.conePositions = [];
    window.lastCourtDimensions = null;

    // STEP 3: Apply new layout after delay
    setTimeout(() => {
        // Ensure court has white background (remove any gradient)
        court.style.background = 'white';
        court.style.backgroundColor = 'white';

        // Make sure court has custom-space class for white appearance
        if (!court.classList.contains('custom-space')) {
            court.classList.add('custom-space');
        }

        console.log('✨ Applying fresh layout from current suggestion');

        // CRITICAL FIX: Capture court dimensions once and use for all elements
        // This ensures consistent positioning even with staggered animations
        const fixedCourtDimensions = {
            width: court.clientWidth,
            height: court.clientHeight
        };
        console.log(`📏 Fixed court dimensions for layout: ${fixedCourtDimensions.width}x${fixedCourtDimensions.height}`);

        try {
            // Apply elements with staggered animation
            if (currentSuggestedLayout.elements) {
                currentSuggestedLayout.elements.forEach((element, index) => {
                    setTimeout(() => {
                        createElementFromJson(element, court, fixedCourtDimensions);
                    }, index * 50);
                });
            }
        
            // Apply annotations with delay
            if (currentSuggestedLayout.annotations) {
                currentSuggestedLayout.annotations.forEach((annotation, index) => {
                    setTimeout(() => {
                        createAnnotationFromJson(annotation, court, fixedCourtDimensions);
                    }, (currentSuggestedLayout.elements?.length || 0) * 50 + index * 50);
                });
            }

            // Show success message after all elements
            const totalDelay = ((currentSuggestedLayout.elements?.length || 0) + (currentSuggestedLayout.annotations?.length || 0)) * 50;
            setTimeout(() => {
                // Show success message
                showSuccessMessage('Suggested layout applied successfully!');

                // Initialize z-indexes for new elements
                initializeZIndexes();

                // Close the suggestions modal
                closeAISuggestionsModal();

                console.log('✅ Fresh layout applied successfully');
            }, totalDelay + 100);

        } catch (error) {
            console.error('Error applying layout:', error);
            alert('Error applying layout. Please check the console for details.');
            // Reset court background on error
            court.style.background = 'white';
            court.style.background = 'white';
            court.style.backgroundColor = 'white';
        }
    }, 300); // Wait 300ms to show empty court
}

/**
 * Completely reset the court to a fresh state, clearing any accumulated offsets or styles
 * This ensures AI-suggested layouts start from a clean slate
 */
function resetCourtToFreshState(court) {
    console.log('Resetting court to fresh state...');

    // Clear any inline styles that might have been added (except essential ones)
    const preservedStyles = {
        aspectRatio: court.style.aspectRatio // Preserve aspect ratio for custom spaces
    };

    // Reset transforms and positioning that might cause offsets
    court.style.transform = '';
    court.style.translate = '';
    court.style.position = 'relative'; // Ensure it's relative for absolute children
    court.style.top = '';
    court.style.left = '';
    court.style.marginTop = '';
    court.style.marginLeft = '';
    court.style.paddingTop = '';
    court.style.paddingLeft = '';

    // Restore preserved styles
    court.style.aspectRatio = preservedStyles.aspectRatio;

    // Clear any data attributes that might affect positioning
    delete court.dataset.offsetX;
    delete court.dataset.offsetY;

    // Reset any dynamically added classes (preserve essential ones)
    const essentialClasses = ['playing-area', 'custom-space', 'badminton-court'];
    const currentClasses = Array.from(court.classList);
    currentClasses.forEach(className => {
        if (!essentialClasses.includes(className)) {
            court.classList.remove(className);
        }
    });

    // Reset scroll position if any
    court.scrollTop = 0;
    court.scrollLeft = 0;

    // Clear any cached coordinate calculations
    if (window.CoordinateSystem) {
        // Force coordinate system to recalculate boundaries
        delete window.CoordinateSystem._cachedBoundaries;
    }

    // Clear any global state that might affect positioning
    window.lastMouseX = null;
    window.lastMouseY = null;
    window.dragOffsetX = 0;
    window.dragOffsetY = 0;

    // Reset global drag variables
    if (draggedElement) {
        draggedElement.classList.remove('dragging');
        draggedElement = null;
    }
    dragOffset = { x: 0, y: 0 };

    // Force the browser to recalculate layout
    void court.offsetHeight; // Force reflow

    // Verify court is in expected state
    const computedStyle = window.getComputedStyle(court);
    if (computedStyle.position !== 'relative') {
        console.warn('Court position is not relative, fixing...');
        court.style.position = 'relative';
    }

    console.log('Court reset complete. Fresh state ready for AI layout.');
}

function displayActivityDetails(layout) {
    const detailsSection = document.getElementById('activityDetailsSection');
    const titleElement = document.getElementById('activityTitle');
    const instructionsElement = document.getElementById('activityInstructions');
    const rulesElement = document.getElementById('activityDisplayRules');
    const teachingPointsElement = document.getElementById('activityTeachingPoints');
    
    if (!detailsSection) return;
    
    // Set the content
    titleElement.textContent = layout.name || 'Activity Layout';
    instructionsElement.textContent = layout.instructions || 'No instructions provided';
    rulesElement.textContent = layout.rules || 'No rules provided';
    teachingPointsElement.textContent = layout.teachingPoints || 'No teaching points provided';
    
    // Show the section with smooth animation
    detailsSection.style.display = 'block';
    setTimeout(() => {
        detailsSection.classList.add('show');
    }, 10);
}

function hideActivityDetails() {
    const detailsSection = document.getElementById('activityDetailsSection');
    if (detailsSection) {
        detailsSection.classList.remove('show');
        setTimeout(() => {
            detailsSection.style.display = 'none';
        }, 300);
    }
}

// Preview functionality
function previewSelectedLayout() {
    if (!currentSuggestedLayouts || !currentSuggestedLayouts.layouts) {
        alert('No layout suggestions available to preview.');
        return;
    }

    // Determine which layout to preview
    let layoutToPreview;
    if (selectedLayoutIndex !== null && currentSuggestedLayouts.layouts[selectedLayoutIndex]) {
        layoutToPreview = currentSuggestedLayouts.layouts[selectedLayoutIndex];
    } else if (currentSuggestedLayouts.layouts.length === 1) {
        layoutToPreview = currentSuggestedLayouts.layouts[0];
    } else {
        alert('Please select a layout option first.');
        return;
    }

    // Store for later application
    currentPreviewedLayout = layoutToPreview;

    // Open preview modal
    const previewModal = document.getElementById('layoutPreviewModal');
    previewModal.classList.add('show');

    // Create preview court if it doesn't exist
    let previewCourt = document.getElementById('previewCourt');
    if (!previewCourt) {
        const container = document.getElementById('previewCourtContainer');
        previewCourt = document.createElement('div');
        previewCourt.id = 'previewCourt';
        container.appendChild(previewCourt);
    }

    // Clear preview court
    previewCourt.innerHTML = '';

    // Apply same court style as main court
    const mainCourt = document.getElementById('court');
    const computedStyle = window.getComputedStyle(mainCourt);
    previewCourt.style.borderColor = computedStyle.borderColor;
    previewCourt.style.borderWidth = computedStyle.borderWidth;

    // Capture dimensions for consistent positioning
    const fixedCourtDimensions = {
        width: previewCourt.clientWidth,
        height: previewCourt.clientHeight
    };

    // Debug: Log preview court dimensions
    console.log('🔍 Preview Court Dimensions:', fixedCourtDimensions);
    console.log('🔍 Preview Border Style:', window.getComputedStyle(previewCourt).borderWidth);
    if (layoutToPreview.elements && layoutToPreview.elements.length > 0) {
        console.log('🔍 Preview elements:');
        layoutToPreview.elements.slice(0, 3).forEach(el => {
            console.log(`  - ${el.type} at (${el.position?.xPercent}%, ${el.position?.yPercent}%)`);
        });
    }

    // Apply layout to preview court
    if (layoutToPreview.elements) {
        layoutToPreview.elements.forEach((element) => {
            createElementInPreview(element, previewCourt, fixedCourtDimensions);
        });
    }

    if (layoutToPreview.annotations) {
        layoutToPreview.annotations.forEach((annotation) => {
            createAnnotationInPreview(annotation, previewCourt, fixedCourtDimensions);
        });
    }

    // Display activity details in preview
    displayPreviewActivityDetails(layoutToPreview);
}

function createElementInPreview(element, previewCourt, fixedDimensions) {
    // Similar to createElementFromJson but without drag functionality
    const position = CoordinateSystem.percentPositionToPixels(element, previewCourt, fixedDimensions);

    let newElement;
    const itemId = 'preview-' + Date.now() + '-' + Math.random();

    switch(element.type) {
        case 'cone':
            newElement = document.createElement('div');
            newElement.className = 'cone draggable-item';
            break;
        case 'ball':
            newElement = document.createElement('div');
            newElement.className = 'ball draggable-item';
            break;
        case 'student':
        case 'attacker':
        case 'defender':
            newElement = document.createElement('div');
            newElement.className = `${element.type} draggable-item`;
            if (element.name) {
                const nameLabel = document.createElement('span');
                nameLabel.className = 'student-name';
                nameLabel.textContent = element.name;
                newElement.appendChild(nameLabel);
            }
            break;
        case 'racket':
            newElement = document.createElement('div');
            newElement.className = 'racket draggable-item';
            break;
        case 'shuttlecock':
            newElement = document.createElement('div');
            newElement.className = 'shuttlecock draggable-item';
            break;
        case 'net':
            newElement = document.createElement('div');
            newElement.className = 'net draggable-item';
            break;
        case 'marker':
            newElement = document.createElement('div');
            newElement.className = 'marker draggable-item';
            break;
        case 'hoop':
            newElement = document.createElement('div');
            newElement.className = 'hoop draggable-item';
            break;
        case 'bench':
            newElement = document.createElement('div');
            newElement.className = 'bench draggable-item';
            break;
        case 'floorball_stick':
            newElement = document.createElement('div');
            newElement.className = 'floorball-stick draggable-item';
            break;
        case 'frisbee':
            newElement = document.createElement('div');
            newElement.className = 'frisbee draggable-item';
            break;
        default:
            console.warn('Unknown element type:', element.type);
            return;
    }

    newElement.id = itemId;
    newElement.style.position = 'absolute';
    newElement.style.left = position.x + 'px';
    newElement.style.top = position.y + 'px';
    newElement.dataset.phase = currentPhase;

    previewCourt.appendChild(newElement);
}

function createAnnotationInPreview(annotation, previewCourt, fixedDimensions) {
    const position = CoordinateSystem.percentPositionToPixels(annotation, previewCourt, fixedDimensions);

    const annotationDiv = document.createElement('div');
    annotationDiv.className = 'annotation';
    annotationDiv.style.position = 'absolute';
    annotationDiv.style.left = position.x + 'px';
    annotationDiv.style.top = position.y + 'px';
    annotationDiv.dataset.phase = currentPhase;

    const textarea = document.createElement('textarea');
    textarea.value = annotation.text;
    textarea.readOnly = true;
    textarea.rows = 2;
    textarea.cols = 20;

    annotationDiv.appendChild(textarea);
    previewCourt.appendChild(annotationDiv);
}

function displayPreviewActivityDetails(layout) {
    const detailsContainer = document.getElementById('previewActivityDetails');

    if (!detailsContainer) {
        console.error('Preview activity details container not found');
        return;
    }

    console.log('Displaying preview details for layout:', layout);

    let html = `
        <h3>${layout.name || 'Activity Layout'}</h3>
        <p style="color: #64748b; margin-bottom: 20px;">${layout.description || ''}</p>
    `;

    // Add skill level indicator if available
    const skillLevel = document.getElementById('studentSkillLevel')?.value || 'intermediate';
    html += `
        <div style="margin-bottom: 15px;">
            <span style="padding: 4px 12px; display: inline-block; background: ${
                skillLevel === 'beginner' ? '#dcfce7' :
                skillLevel === 'intermediate' ? '#fef3c7' :
                skillLevel === 'advanced' ? '#fee2e2' :
                '#e0e7ff'
            }; color: ${
                skillLevel === 'beginner' ? '#166534' :
                skillLevel === 'intermediate' ? '#92400e' :
                skillLevel === 'advanced' ? '#991b1b' :
                '#3730a3'
            }; border-radius: 12px; font-size: 12px; font-weight: 600;">
                🎯 ${skillLevel.charAt(0).toUpperCase() + skillLevel.slice(1)} Level
            </span>
        </div>
    `;

    // Handle instructions (array or string)
    if (layout.instructions) {
        const instructionsList = Array.isArray(layout.instructions) ? layout.instructions : [layout.instructions];
        if (instructionsList.length > 0 && instructionsList[0]) {
            html += `
                <h4>📋 Instructions:</h4>
                <ol style="padding-left: 20px; margin-bottom: 20px;">
                    ${instructionsList.map(inst => `<li style="margin-bottom: 8px; line-height: 1.6;">${inst}</li>`).join('')}
                </ol>
            `;
        }
    }

    // Handle rules (array or string)
    if (layout.rules) {
        const rulesList = Array.isArray(layout.rules) ? layout.rules : [layout.rules];
        if (rulesList.length > 0 && rulesList[0]) {
            html += `
                <h4>📏 Rules:</h4>
                <ul style="padding-left: 20px; margin-bottom: 20px;">
                    ${rulesList.map(rule => `<li style="margin-bottom: 8px; line-height: 1.6;">${rule}</li>`).join('')}
                </ul>
            `;
        }
    }

    // Handle teaching points (array or string)
    if (layout.teachingPoints) {
        const pointsList = Array.isArray(layout.teachingPoints) ? layout.teachingPoints : [layout.teachingPoints];
        if (pointsList.length > 0 && pointsList[0]) {
            html += `
                <h4>🎯 Teaching Points:</h4>
                <ul style="padding-left: 20px; margin-bottom: 20px;">
                    ${pointsList.map(point => `<li style="margin-bottom: 8px; line-height: 1.6;">${point}</li>`).join('')}
                </ul>
            `;
        }
    }

    // Add note if no details available
    if (!layout.instructions && !layout.rules && !layout.teachingPoints) {
        html += `
            <div style="padding: 20px; background: #f1f5f9; border-radius: 8px; text-align: center; color: #64748b;">
                <p>💡 No additional activity details available for this layout.</p>
                <p style="font-size: 12px; margin-top: 10px;">The AI-generated layout focuses on equipment positioning.</p>
            </div>
        `;
    }

    detailsContainer.innerHTML = html;
    detailsContainer.style.display = 'block';
    detailsContainer.style.visibility = 'visible';

    // Ensure container is scrollable
    detailsContainer.style.overflowY = 'auto';
    detailsContainer.style.maxHeight = '100%';

    console.log('Preview details displayed successfully');
}

function switchPreviewTab(tab) {
    const courtContainer = document.getElementById('previewCourtContainer');
    const detailsContainer = document.getElementById('previewActivityDetails');
    const tabs = document.querySelectorAll('.preview-tab');

    // Update tab active states
    tabs.forEach(t => t.classList.remove('active'));
    event.target.closest('.preview-tab').classList.add('active');

    // Show/hide content based on selected tab
    if (tab === 'court') {
        courtContainer.classList.remove('tab-hidden');
        detailsContainer.classList.add('tab-hidden');
    } else {
        courtContainer.classList.add('tab-hidden');
        detailsContainer.classList.remove('tab-hidden');
    }
}

function closeLayoutPreviewModal() {
    const modal = document.getElementById('layoutPreviewModal');
    modal.classList.remove('show');

    // Clear preview court
    const previewCourt = document.getElementById('previewCourt');
    if (previewCourt) {
        previewCourt.innerHTML = '';
    }

    // Reset tabs to default
    const courtContainer = document.getElementById('previewCourtContainer');
    const detailsContainer = document.getElementById('previewActivityDetails');
    if (courtContainer) courtContainer.classList.remove('tab-hidden');
    if (detailsContainer) detailsContainer.classList.remove('tab-hidden');

    const tabs = document.querySelectorAll('.preview-tab');
    tabs.forEach((t, i) => {
        if (i === 0) t.classList.add('active');
        else t.classList.remove('active');
    });
}

function applyPreviewedLayout() {
    if (!currentPreviewedLayout) {
        alert('No layout to apply.');
        return;
    }

    // Close preview modal
    closeLayoutPreviewModal();

    // Close AI suggestions modal
    closeAISuggestionsModal();

    // Apply layout to main court
    applyLayoutToMainCourt(currentPreviewedLayout);
}

function applyLayoutToMainCourt(layoutToApply) {
    // Confirm with user before clearing current layout
    if (!confirm(`This will replace your current layout with "${layoutToApply.name}". Continue?`)) {
        return;
    }

    const court = document.getElementById('court');

    // Clear existing items
    court.querySelectorAll('.draggable-item, .annotation, .path-line, .path-arrow').forEach(item => {
        item.remove();
    });

    // Reset court state
    resetCourtToFreshState(court);

    // Reset counters
    itemCounter = 0;
    window.conePositions = [];
    window.lastCourtDimensions = null;

    // Apply new layout with fixed dimensions
    setTimeout(() => {
        // Ensure court has white background (remove any gradient)
        court.style.background = 'white';
        court.style.backgroundColor = 'white';

        // Make sure court has custom-space class for white appearance
        if (!court.classList.contains('custom-space')) {
            court.classList.add('custom-space');
        }

        // Get the actual inner dimensions of the court (white area only)
        const computedStyle = window.getComputedStyle(court);
        const borderTop = parseFloat(computedStyle.borderTopWidth) || 0;
        const borderBottom = parseFloat(computedStyle.borderBottomWidth) || 0;
        const borderLeft = parseFloat(computedStyle.borderLeftWidth) || 0;
        const borderRight = parseFloat(computedStyle.borderRightWidth) || 0;
        const paddingTop = parseFloat(computedStyle.paddingTop) || 0;
        const paddingBottom = parseFloat(computedStyle.paddingBottom) || 0;
        const paddingLeft = parseFloat(computedStyle.paddingLeft) || 0;
        const paddingRight = parseFloat(computedStyle.paddingRight) || 0;

        // Use the inner dimensions (excluding borders but including padding area for positioning)
        const fixedCourtDimensions = {
            width: court.clientWidth,  // clientWidth excludes border but includes padding
            height: court.clientHeight // clientHeight excludes border but includes padding
        };

        // Debug: Check for any padding that might affect positioning
        if (paddingTop || paddingBottom || paddingLeft || paddingRight) {
            console.warn('⚠️ Court has padding which may affect element positioning!');
            console.warn(`  Padding (T/R/B/L): ${paddingTop}, ${paddingRight}, ${paddingBottom}, ${paddingLeft}`);
        }

        // Debug: Log court dimensions and first few elements
        console.log('📐 Main Court Dimensions (inner):', fixedCourtDimensions);
        console.log('📐 Court Total Size (outer):', court.offsetWidth, 'x', court.offsetHeight);
        console.log('📐 Court Borders (T/R/B/L):', borderTop, borderRight, borderBottom, borderLeft);
        if (layoutToApply.elements && layoutToApply.elements.length > 0) {
            console.log('📍 First few elements to apply:');
            layoutToApply.elements.slice(0, 3).forEach(el => {
                console.log(`  - ${el.type} at (${el.position?.xPercent}%, ${el.position?.yPercent}%)`);
            });
        }

        try {
            if (layoutToApply.elements) {
                layoutToApply.elements.forEach((element, index) => {
                    setTimeout(() => {
                        // Get fresh court reference to ensure consistency
                        const currentCourt = document.getElementById('court');
                        createElementFromJson(element, currentCourt, fixedCourtDimensions);
                    }, index * 50);
                });
            }

            if (layoutToApply.annotations) {
                layoutToApply.annotations.forEach((annotation, index) => {
                    setTimeout(() => {
                        createAnnotationFromJson(annotation, court, fixedCourtDimensions);
                    }, (layoutToApply.elements?.length || 0) * 50 + index * 50);
                });
            }

            const totalDelay = ((layoutToApply.elements?.length || 0) + (layoutToApply.annotations?.length || 0)) * 50;
            setTimeout(() => {
                showSuccessMessage(`"${layoutToApply.name}" applied successfully!`);
                displayActivityDetails(layoutToApply);
                initializeZIndexes();
            }, totalDelay + 100);

        } catch (error) {
            console.error('Error applying layout:', error);
            alert('Error applying layout. Please check the console for details.');
            court.style.background = 'white';
            court.style.backgroundColor = 'white';
        }
    }, 300);
}

function applySelectedLayout() {
    if (!currentSuggestedLayouts || !currentSuggestedLayouts.layouts) {
        alert('No layout suggestions available to apply.');
        return;
    }
    
    // Determine which layout to apply
    let layoutToApply;
    if (selectedLayoutIndex !== null && currentSuggestedLayouts.layouts[selectedLayoutIndex]) {
        layoutToApply = currentSuggestedLayouts.layouts[selectedLayoutIndex];
    } else if (currentSuggestedLayouts.layouts.length === 1) {
        layoutToApply = currentSuggestedLayouts.layouts[0];
    } else {
        alert('Please select a layout option first.');
        return;
    }
    
    // Confirm with user before clearing current layout
    if (!confirm(`This will replace your current layout with "${layoutToApply.name}". Continue?`)) {
        return;
    }
    
    const court = document.getElementById('court');

    // STEP 1: Clear draggable items and annotations (but preserve court lines)
    console.log('🧹 Clearing court for fresh layout...');

    // Remove only draggable items, annotations, paths - preserve court structure
    court.querySelectorAll('.draggable-item, .annotation, .path-line, .path-arrow').forEach(item => {
        item.remove();
    });

    // Add visual feedback - show empty court briefly
    court.style.backgroundColor = '#f0f0f0';
    court.style.transition = 'background-color 0.3s ease';

    // STEP 2: Reset the court state
    resetCourtToFreshState(court);

    // Store initial court dimensions for debugging
    const initialCourtWidth = court.clientWidth;
    const initialCourtHeight = court.clientHeight;
    console.log(`Court dimensions after reset: ${initialCourtWidth}x${initialCourtHeight}`);

    // Clear tracking data
    window.conePositions = [];
    window.lastCourtDimensions = null;
    itemCounter = 0;

    // Force layout recalculation
    court.offsetHeight; // Force reflow

    // Verify court has valid dimensions
    if (court.clientWidth === 0 || court.clientHeight === 0) {
        console.error('Court has invalid dimensions!', {
            width: court.clientWidth,
            height: court.clientHeight
        });
        setTimeout(() => applySelectedLayout(), 100);
        return;
    }

    // STEP 3: Add delay to make reset visible, then apply new layout
    setTimeout(() => {
        // Ensure court has white background (remove any gradient)
        court.style.background = 'white';
        court.style.backgroundColor = 'white';

        // Make sure court has custom-space class for white appearance
        if (!court.classList.contains('custom-space')) {
            court.classList.add('custom-space');
        }

        console.log('✨ Applying fresh layout:', layoutToApply.name);

        // CRITICAL FIX: Capture court dimensions once for consistent positioning
        const fixedCourtDimensions = {
            width: court.clientWidth,
            height: court.clientHeight
        };
        console.log(`📏 Fixed court dimensions for selected layout: ${fixedCourtDimensions.width}x${fixedCourtDimensions.height}`);

        try {
            // Apply elements (equipment and students)
            if (layoutToApply.elements) {
                layoutToApply.elements.forEach((element, index) => {
                    // Add elements with slight delay for visual effect
                    setTimeout(() => {
                        createElementFromJson(element, court, fixedCourtDimensions);
                    }, index * 50);
                });
            }

            // Apply annotations with delay
            if (layoutToApply.annotations) {
                layoutToApply.annotations.forEach((annotation, index) => {
                    setTimeout(() => {
                        createAnnotationFromJson(annotation, court, fixedCourtDimensions);
                    }, (layoutToApply.elements?.length || 0) * 50 + index * 50);
                });
            }

            // Show success message after all elements are added
            const totalDelay = ((layoutToApply.elements?.length || 0) + (layoutToApply.annotations?.length || 0)) * 50;
            setTimeout(() => {
                showSuccessMessage(`"${layoutToApply.name}" applied successfully!`);

                // Display activity details below the court
                displayActivityDetails(layoutToApply);

                // Initialize z-indexes for new elements
                initializeZIndexes();

                // Close the suggestions modal
                closeAISuggestionsModal();

                // Final check of court dimensions
                const finalCourtWidth = court.clientWidth;
                const finalCourtHeight = court.clientHeight;
                console.log(`✅ Layout applied. Final court dimensions: ${finalCourtWidth}x${finalCourtHeight}`);

                if (finalCourtWidth !== initialCourtWidth || finalCourtHeight !== initialCourtHeight) {
                    console.error(`⚠️ Court dimensions changed during layout!`);
                }
            }, totalDelay + 100);

        } catch (error) {
            console.error('Error applying layout:', error);
            alert('Error applying layout. Please check the console for details.');
            // Reset court background on error
            court.style.background = 'white';
            court.style.background = 'white';
            court.style.backgroundColor = 'white';
        }
    }, 300); // Wait 300ms to show empty court
}

function createElementFromJson(element, court, fixedDimensions) {
    // Ensure court has the correct positioning context
    if (court.style.position !== 'relative' && court.style.position !== 'absolute') {
        console.warn('⚠️ Court element does not have position:relative or absolute!');
        court.style.position = 'relative';
    }

    // Use fixed dimensions if provided (for AI layouts), otherwise use current court dimensions
    const courtDimensions = fixedDimensions || { width: court.clientWidth, height: court.clientHeight };

    if (window.debugMode) {
        console.log(`\n=== CREATING ELEMENT: ${element.type} ===`);
        console.log(`Input coordinates: (${element.position?.xPercent}%, ${element.position?.yPercent}%)`);
        console.log(`Using court dimensions: ${courtDimensions.width}x${courtDimensions.height}px`);
    }

    // Track court dimensions for consistency
    if (!window.lastCourtDimensions) {
        window.lastCourtDimensions = courtDimensions;
    } else {
        if (window.lastCourtDimensions.width !== courtDimensions.width ||
            window.lastCourtDimensions.height !== courtDimensions.height) {
            console.error('⚠️ COURT DIMENSIONS CHANGED!');
            console.error(`  Was: ${window.lastCourtDimensions.width}x${window.lastCourtDimensions.height}`);
            console.error(`  Now: ${courtDimensions.width}x${courtDimensions.height}`);
        }
        window.lastCourtDimensions = courtDimensions;
    }

    // Extra debugging for cone positioning
    if (window.debugMode && element.type === 'cone') {
        console.log('CONE DEBUG - Raw position:', element.position);
    }
    
    // Use the new coordinate system to convert percentage to pixels with validation
    // Pass fixed dimensions to ensure consistent positioning
    const position = CoordinateSystem.percentPositionToPixels(element, court, courtDimensions);

    if (position.clamped) {
        console.warn(`Element ${element.type} position was adjusted to stay within court boundaries`);
    }

    // DEBUG: Log every element's position conversion
    console.log(`📍 ${element.type} position:`, {
        input: `(${element.position?.xPercent}%, ${element.position?.yPercent}%)`,
        output: `(${position.x.toFixed(2)}px, ${position.y.toFixed(2)}px)`,
        courtDims: `${courtDimensions.width}x${courtDimensions.height}`,
        courtElement: court.id,
        courtClasses: court.className
    });

    // ALWAYS check for Y-axis consistency (not just in debug mode)
    if (element.type === 'cone') {
        // Store cone positions to check for symmetry
        if (!window.conePositions) window.conePositions = [];
        window.conePositions.push({
            xPercent: element.position?.xPercent,
            yPercent: element.position?.yPercent,
            x: position.x,
            y: position.y
        });

        // Always log cone creation for debugging
        console.log(`Created cone at (${element.position?.xPercent}%, ${element.position?.yPercent}%) -> pixel position (${position.x.toFixed(2)}, ${position.y.toFixed(2)})`);

        // Check if we have matching Y coordinates
        const sameLevelCones = window.conePositions.filter(c =>
            Math.abs(c.yPercent - element.position?.yPercent) < 0.1
        );
        if (sameLevelCones.length > 1) {
            const yPositions = sameLevelCones.map(c => c.y);
            const yDifference = Math.max(...yPositions) - Math.min(...yPositions);

            console.log(`Checking Y-axis alignment for cones at Y=${element.position?.yPercent}%:`);
            sameLevelCones.forEach(c => {
                console.log(`  Cone at X=${c.xPercent}% -> pixel Y=${c.y.toFixed(2)}`);
            });

            if (yDifference > 0.5) {
                console.error(`⚠️ Y-AXIS MISMATCH DETECTED!`);
                console.error(`  Cones at Y=${element.position?.yPercent}% have different pixel Y positions!`);
                console.error(`  Y pixel positions:`, yPositions.map(y => y.toFixed(2)));
                console.error(`  Difference: ${yDifference.toFixed(2)}px`);
                console.error(`  This will cause visual asymmetry!`);
            } else {
                console.log(`✅ Y-axis alignment OK (difference: ${yDifference.toFixed(2)}px)`);
            }
        }
    }

    // Debug mode visualization
    if (window.debugMode) {
        addDebugVisualization(court);
    }


    if (element.type === 'attacker' || element.type === 'defender' || element.type === 'observer') {
        // Create student element
        const item = document.createElement('div');
        item.className = `draggable-item student ${element.type}`;
        item.id = 'item-' + (++itemCounter);
        item.dataset.phase = currentPhase;

        // Add name label if provided
        if (element.name) {
            const nameLabel = document.createElement('div');
            nameLabel.textContent = element.name;
            nameLabel.style.position = 'absolute';
            nameLabel.style.bottom = '-20px';
            nameLabel.style.left = '50%';
            nameLabel.style.transform = 'translateX(-50%)';
            nameLabel.style.fontSize = '8px';
            nameLabel.style.color = element.type === 'attacker' ? '#e74c3c' :
                                    element.type === 'defender' ? '#3498db' : '#10b981';
            nameLabel.style.fontWeight = 'bold';
            nameLabel.style.whiteSpace = 'nowrap';
            item.appendChild(nameLabel);
        }

        // Add remove button with touch support
        const removeBtn = createRemoveButton(item);
        item.appendChild(removeBtn);

        // Set position directly - ensure absolute positioning
        item.style.position = 'absolute';
        item.style.left = position.x + 'px';
        item.style.top = position.y + 'px';

        // Append to DOM
        court.appendChild(item);

        // Verify actual position after adding to DOM
        setTimeout(() => {
            const actualRect = item.getBoundingClientRect();
            const courtRect = court.getBoundingClientRect();
            const relativeY = actualRect.top - courtRect.top;
            const expectedY = position.y;

            if (Math.abs(relativeY - expectedY) > 5) {
                console.error(`⚠️ POSITION MISMATCH for ${element.type}!`);
                console.error(`  Expected Y: ${expectedY.toFixed(2)}px`);
                console.error(`  Actual Y: ${relativeY.toFixed(2)}px`);
                console.error(`  Difference: ${(relativeY - expectedY).toFixed(2)}px`);
                console.error(`  Court height: ${court.clientHeight}px`);
                console.error(`  Court offsetHeight: ${court.offsetHeight}px`);
            }
        }, 0);

        makeDraggable(item);
        
    } else {
        // Create equipment element
        const item = document.createElement('div');
        item.className = `draggable-item ${element.type}`;
        item.id = 'item-' + (++itemCounter);
        item.dataset.phase = currentPhase;

        // Add remove button with touch support
        const removeBtn = createRemoveButton(item);
        item.appendChild(removeBtn);

        // Set position directly - ensure absolute positioning
        item.style.position = 'absolute';
        item.style.left = position.x + 'px';
        item.style.top = position.y + 'px';

        // Append to DOM
        court.appendChild(item);

        // Verify actual position after adding to DOM
        setTimeout(() => {
            const actualRect = item.getBoundingClientRect();
            const courtRect = court.getBoundingClientRect();
            const relativeY = actualRect.top - courtRect.top;
            const expectedY = position.y;

            if (Math.abs(relativeY - expectedY) > 5) {
                console.error(`⚠️ POSITION MISMATCH for ${element.type}!`);
                console.error(`  Expected Y: ${expectedY.toFixed(2)}px`);
                console.error(`  Actual Y: ${relativeY.toFixed(2)}px`);
                console.error(`  Difference: ${(relativeY - expectedY).toFixed(2)}px`);
                console.error(`  Court height: ${court.clientHeight}px`);
                console.error(`  Court offsetHeight: ${court.offsetHeight}px`);
            }
        }, 0);

        makeDraggable(item);
    }
}

function createAnnotationFromJson(annotation, court, fixedDimensions) {
    // Use fixed dimensions if provided (for AI layouts), otherwise use current court dimensions
    const courtDimensions = fixedDimensions || { width: court.clientWidth, height: court.clientHeight };
    // Use the new coordinate system to convert percentage to pixels with validation
    // Pass fixed dimensions to ensure consistent positioning
    const position = CoordinateSystem.percentPositionToPixels(annotation, court, courtDimensions);

    if (position.clamped) {
        console.warn(`Annotation position was adjusted to stay within court boundaries`);
    }
    
    const annotationDiv = document.createElement('div');
    annotationDiv.className = 'annotation';
    annotationDiv.dataset.phase = currentPhase;
    annotationDiv.style.left = position.x + 'px';
    annotationDiv.style.top = position.y + 'px';
    
    const textarea = document.createElement('textarea');
    textarea.value = annotation.text;
    textarea.placeholder = 'Add note...';
    textarea.rows = 2;
    textarea.cols = 20;
    
    const removeBtn = createRemoveButton(annotationDiv);

    annotationDiv.appendChild(textarea);
    annotationDiv.appendChild(removeBtn);
    court.appendChild(annotationDiv);
    makeDraggable(annotationDiv);
}

// Group selection functions
function toggleGroupMode() {
    isGroupMode = !isGroupMode;
    const court = document.getElementById('court');
    const btn = document.getElementById('groupModeBtn');
    
    if (isGroupMode) {
        court.classList.add('group-mode');
        btn.classList.add('active');
        btn.innerHTML = '<span>✅</span> Selection Active';
        
        // Disable drawing mode if active
        if (isDrawingMode) {
            toggleDrawing();
        }
        
        // Add lasso selection handlers
        court.addEventListener('mousedown', startLassoSelection);
    } else {
        court.classList.remove('group-mode');
        btn.classList.remove('active');
        btn.innerHTML = '<span>🔲</span> Selection Mode';
        clearSelection();
        
        // Remove lasso selection handlers
        court.removeEventListener('mousedown', startLassoSelection);
    }
}

function selectElement(element, addToSelection = false) {
    if (!addToSelection && !element.classList.contains('selected')) {
        clearSelection();
    }
    
    if (element.classList.contains('selected')) {
        // Deselect
        element.classList.remove('selected');
        selectedElements.delete(element.id);
    } else {
        // Select
        element.classList.add('selected');
        selectedElements.add(element.id);
    }
    
    updateSelectionInfo();
}

function clearSelection() {
    selectedElements.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.classList.remove('selected');
        }
    });
    selectedElements.clear();
    updateSelectionInfo();
}

function updateSelectionInfo() {
    const count = selectedElements.size;
    const selectionCount = document.getElementById('selectionCount');
    const groupBtn = document.getElementById('groupBtn');
    const ungroupBtn = document.getElementById('ungroupBtn');
    
    if (count === 0) {
        selectionCount.textContent = 'No elements selected';
        groupBtn.disabled = true;
        ungroupBtn.disabled = true;
    } else if (count === 1) {
        selectionCount.textContent = '1 element selected';
        groupBtn.disabled = true;
        ungroupBtn.disabled = false;
    } else {
        selectionCount.textContent = `${count} elements selected`;
        groupBtn.disabled = false;
        ungroupBtn.disabled = false;
    }
}

function groupSelected() {
    if (selectedElements.size < 2) return;
    
    const groupId = `group-${nextGroupId++}`;
    const groupSet = new Set(selectedElements);
    groups.set(groupId, groupSet);
    
    // Add group attributes to elements
    selectedElements.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.dataset.groupId = groupId;
            element.classList.add('grouped');
        }
    });
    
    clearSelection();
}

function ungroupSelected() {
    selectedElements.forEach(id => {
        const element = document.getElementById(id);
        if (element && element.dataset.groupId) {
            const groupId = element.dataset.groupId;
            
            // Remove from groups map
            if (groups.has(groupId)) {
                groups.delete(groupId);
            }
            
            // Remove group attributes from all elements in the group
            const court = document.getElementById('court');
            court.querySelectorAll(`[data-group-id="${groupId}"]`).forEach(el => {
                delete el.dataset.groupId;
                el.classList.remove('grouped');
            });
        }
    });
    
    clearSelection();
}

// Lasso selection functions
function startLassoSelection(e) {
    // Only start lasso if clicking on empty court area
    if (e.target.id !== 'court') return;
    if (!isGroupMode) return;
    
    e.preventDefault();
    isLassoSelecting = true;
    const court = document.getElementById('court');
    const rect = court.getBoundingClientRect();
    
    lassoStart = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
    };
    
    // Create lasso element
    lassoElement = document.createElement('div');
    lassoElement.className = 'selection-lasso';
    lassoElement.style.left = lassoStart.x + 'px';
    lassoElement.style.top = lassoStart.y + 'px';
    lassoElement.style.width = '0px';
    lassoElement.style.height = '0px';
    court.appendChild(lassoElement);
    
    document.addEventListener('mousemove', updateLassoSelection);
    document.addEventListener('mouseup', endLassoSelection);
}

function updateLassoSelection(e) {
    if (!isLassoSelecting || !lassoElement) return;
    
    const court = document.getElementById('court');
    const rect = court.getBoundingClientRect();
    const currentX = e.clientX - rect.left;
    const currentY = e.clientY - rect.top;
    
    const width = Math.abs(currentX - lassoStart.x);
    const height = Math.abs(currentY - lassoStart.y);
    const left = Math.min(currentX, lassoStart.x);
    const top = Math.min(currentY, lassoStart.y);
    
    lassoElement.style.left = left + 'px';
    lassoElement.style.top = top + 'px';
    lassoElement.style.width = width + 'px';
    lassoElement.style.height = height + 'px';
}

function endLassoSelection(e) {
    if (!isLassoSelecting || !lassoElement) return;
    
    const court = document.getElementById('court');
    const lassoRect = lassoElement.getBoundingClientRect();
    const courtRect = court.getBoundingClientRect();
    
    // Clear previous selection if not holding Ctrl/Cmd
    if (!e.ctrlKey && !e.metaKey) {
        clearSelection();
    }
    
    // Select elements within lasso
    court.querySelectorAll('.draggable-item, .annotation').forEach(el => {
        if (el.style.display === 'none') return;
        
        const elRect = el.getBoundingClientRect();
        const elCenterX = elRect.left + elRect.width / 2;
        const elCenterY = elRect.top + elRect.height / 2;
        
        // Check if element center is within lasso
        if (elCenterX >= lassoRect.left && elCenterX <= lassoRect.right &&
            elCenterY >= lassoRect.top && elCenterY <= lassoRect.bottom) {
            el.classList.add('selected');
            selectedElements.add(el.id);
        }
    });
    
    // Clean up
    if (lassoElement) {
        court.removeChild(lassoElement);
        lassoElement = null;
    }
    isLassoSelecting = false;
    lassoStart = null;
    
    document.removeEventListener('mousemove', updateLassoSelection);
    document.removeEventListener('mouseup', endLassoSelection);
    
    updateSelectionInfo();
}

// Custom prompt modal functions
function showCustomPrompt(title, message, defaultValue = '', type = 'text', hint = '') {
    return new Promise((resolve) => {
        const modal = document.getElementById('customPromptModal');
        const titleEl = document.getElementById('promptTitle');
        const messageEl = document.getElementById('promptMessage');
        const input = document.getElementById('promptInput');
        const hintEl = document.getElementById('promptHint');
        
        titleEl.textContent = title;
        messageEl.textContent = message;
        input.value = defaultValue;
        input.type = type;
        hintEl.textContent = hint;
        
        customPromptCallback = resolve;
        customPromptType = type;
        
        modal.style.display = 'flex';
        
        // Focus input after modal animation
        setTimeout(() => {
            input.focus();
            input.select();
        }, 100);
        
        // Handle enter key
        input.onkeydown = (e) => {
            if (e.key === 'Enter') {
                submitCustomPrompt();
            } else if (e.key === 'Escape') {
                closeCustomPrompt();
            }
        };
    });
}

function submitCustomPrompt() {
    const modal = document.getElementById('customPromptModal');
    const input = document.getElementById('promptInput');
    
    if (customPromptCallback) {
        customPromptCallback(input.value);
        customPromptCallback = null;
    }
    
    modal.style.display = 'none';
    input.value = '';
}

function closeCustomPrompt() {
    const modal = document.getElementById('customPromptModal');
    const input = document.getElementById('promptInput');
    
    if (customPromptCallback) {
        customPromptCallback(null);
        customPromptCallback = null;
    }
    
    modal.style.display = 'none';
    input.value = '';
}

// Initialize z-index for all elements on the court
function initializeZIndexes() {
    const court = document.getElementById('court');
    let zIndex = 100;
    court.querySelectorAll('.draggable-item, .annotation').forEach(el => {
        if (!el.style.zIndex || el.style.zIndex === '') {
            el.style.zIndex = zIndex++;
        }
    });
    currentZIndex = Math.max(currentZIndex, zIndex);
}

// Context menu functions
function showContextMenu(e, element) {
    e.preventDefault();
    e.stopPropagation();

    // Ensure all elements have z-index before showing menu
    initializeZIndexes();

    const contextMenu = document.getElementById('contextMenu');
    contextMenuTarget = element;

    // Show/hide role change section based on whether it's a student
    const roleChangeSection = document.getElementById('roleChangeSection');
    if (element.classList.contains('student')) {
        roleChangeSection.style.display = 'block';

        // Hide the current role option
        const currentRole = element.classList.contains('attacker') ? 'attacker' :
                           element.classList.contains('defender') ? 'defender' : 'observer';

        // Show all role options
        roleChangeSection.querySelectorAll('.context-menu-item').forEach(item => {
            item.style.display = 'flex';
        });

        // Optionally hide the current role to avoid redundant option
        if (currentRole === 'attacker') {
            roleChangeSection.children[0].style.display = 'none';
        } else if (currentRole === 'defender') {
            roleChangeSection.children[1].style.display = 'none';
        } else if (currentRole === 'observer') {
            roleChangeSection.children[2].style.display = 'none';
        }
    } else {
        roleChangeSection.style.display = 'none';
    }

    // Position the context menu at cursor location
    contextMenu.style.left = e.clientX + 'px';
    contextMenu.style.top = e.clientY + 'px';
    contextMenu.style.display = 'block';

    // Hide menu when clicking elsewhere
    document.addEventListener('click', hideContextMenu);
}

function hideContextMenu() {
    const contextMenu = document.getElementById('contextMenu');
    contextMenu.style.display = 'none';
    document.removeEventListener('click', hideContextMenu);
}

function bringToFront() {
    if (contextMenuTarget) {
        // Find the maximum z-index among all elements
        const court = document.getElementById('court');
        let maxZ = 0;
        court.querySelectorAll('.draggable-item, .annotation').forEach(el => {
            const z = parseInt(el.style.zIndex) || 10;
            if (z > maxZ) maxZ = z;
        });
        
        // Set target to one more than maximum
        contextMenuTarget.style.zIndex = maxZ + 1;
        currentZIndex = Math.max(currentZIndex, maxZ + 2);
    }
    hideContextMenu();
}

function sendToBack() {
    if (contextMenuTarget) {
        const court = document.getElementById('court');
        
        // First ensure all elements have z-index
        initializeZIndexes();
        
        // Find all z-indexes
        const zIndexes = [];
        court.querySelectorAll('.draggable-item, .annotation').forEach(el => {
            if (el !== contextMenuTarget) {
                const z = parseInt(el.style.zIndex) || 100;
                zIndexes.push(z);
            }
        });
        
        // Set target to 1, and shift all others up if needed
        contextMenuTarget.style.zIndex = '1';
        
        // Shift other elements up to make room
        court.querySelectorAll('.draggable-item, .annotation').forEach(el => {
            if (el !== contextMenuTarget) {
                const currentZ = parseInt(el.style.zIndex) || 100;
                if (currentZ <= 1) {
                    el.style.zIndex = currentZ + 1;
                }
            }
        });
    }
    hideContextMenu();
}

function bringForward() {
    if (contextMenuTarget) {
        const currentZ = parseInt(contextMenuTarget.style.zIndex) || 10;
        contextMenuTarget.style.zIndex = currentZ + 1;
        currentZIndex = Math.max(currentZIndex, currentZ + 1);
    }
    hideContextMenu();
}

function sendBackward() {
    if (contextMenuTarget) {
        const currentZ = parseInt(contextMenuTarget.style.zIndex) || 10;
        if (currentZ > 1) {
            contextMenuTarget.style.zIndex = currentZ - 1;
        }
    }
    hideContextMenu();
}

function duplicateElement() {
    if (contextMenuTarget) {
        const court = document.getElementById('court');
        const clone = contextMenuTarget.cloneNode(true);
        
        // Generate new ID
        clone.id = 'item-' + (++itemCounter);
        
        // Offset position slightly
        const currentLeft = parseInt(contextMenuTarget.style.left) || 0;
        const currentTop = parseInt(contextMenuTarget.style.top) || 0;
        clone.style.left = (currentLeft + 20) + 'px';
        clone.style.top = (currentTop + 20) + 'px';
        
        // Remove any selection or group classes
        clone.classList.remove('selected', 'grouped');
        delete clone.dataset.groupId;
        
        // Re-attach event handlers
        makeDraggable(clone);
        attachContextMenu(clone);
        
        // Re-attach remove button handler with touch support
        const removeBtn = clone.querySelector('.remove-btn');
        if (removeBtn) {
            const handleRemove = (e) => {
                e.stopPropagation();
                e.preventDefault();
                court.removeChild(clone);
            };
            removeBtn.onclick = handleRemove;
            removeBtn.ontouchstart = (e) => {
                e.stopPropagation();
                e.preventDefault();
                handleRemove(e);
            };
        }
        
        court.appendChild(clone);
    }
    hideContextMenu();
}

function deleteElement() {
    if (contextMenuTarget) {
        contextMenuTarget.remove();
        contextMenuTarget = null;
    }
    hideContextMenu();
}

function changePlayerRole(newRole) {
    if (!contextMenuTarget || !contextMenuTarget.classList.contains('student')) {
        hideContextMenu();
        return;
    }

    // Get the current name if it exists
    const nameLabel = contextMenuTarget.querySelector('div');
    let playerName = null;
    if (nameLabel && nameLabel.style.position === 'absolute' && nameLabel.style.bottom) {
        playerName = nameLabel.textContent;
    }

    // Remove all role classes
    contextMenuTarget.classList.remove('attacker', 'defender', 'observer');

    // Add the new role class
    contextMenuTarget.classList.add(newRole);

    // Update the name label color if it exists
    if (nameLabel && playerName) {
        const newColor = newRole === 'attacker' ? '#e74c3c' :
                        newRole === 'defender' ? '#3498db' : '#10b981';
        nameLabel.style.color = newColor;
    }

    hideContextMenu();

    // Trigger analyze button state update in case this affects the layout
    updateAnalyzeFabState();
}

function attachContextMenu(element) {
    element.addEventListener('contextmenu', (e) => showContextMenu(e, element));
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('PE Activity Consultant loaded.');
    console.log('TIP: Type "window.debugMode = true" in console then re-apply layout to see court boundary markers');

    // Initialize API configuration
    loadApiConfig();
    
    // Set initial court layout (default is badminton)
    changeLayout();
    
    // Initialize z-indexes for any existing elements
    initializeZIndexes();
    
    // Prevent default context menu on court
    document.getElementById('court').addEventListener('contextmenu', (e) => {
        if (e.target.id === 'court') {
            e.preventDefault();
        }
    });
});

// Make all functions globally accessible for HTML onclick handlers
window.addEquipment = addEquipment;
window.addStudent = addStudent;
window.addAnnotation = addAnnotation;
window.clearCourt = clearCourt;
window.clearPaths = clearPaths;
window.changeLayout = changeLayout;
window.switchPhase = switchPhase;
window.toggleDrawing = toggleDrawing;
window.startTimer = startTimer;
window.stopTimer = stopTimer;
window.savePlan = savePlan;
window.loadPlan = loadPlan;
window.deletePlan = deletePlan;
window.exportToPDF = exportToPDF;
window.analyzeLayout = analyzeLayout;
window.applyLayoutFromJson = applyLayoutFromJson;
window.applySelectedLayout = applySelectedLayout;
window.previewSelectedLayout = previewSelectedLayout;
window.closeLayoutPreviewModal = closeLayoutPreviewModal;
window.applyPreviewedLayout = applyPreviewedLayout;
window.switchPreviewTab = switchPreviewTab;
window.viewLastAnalysis = viewLastAnalysis;
window.runNewAnalysis = runNewAnalysis;
window.updateAnalyzeButton = updateAnalyzeButton;
window.closeAISuggestionsModal = closeAISuggestionsModal;
window.toggleSection = toggleSection;
window.closeOnboarding = closeOnboarding;
window.startTour = startTour;
window.toggleGroupMode = toggleGroupMode;
window.groupSelected = groupSelected;
window.ungroupSelected = ungroupSelected;
window.clearSelection = clearSelection;
window.bringToFront = bringToFront;
window.sendToBack = sendToBack;
window.bringForward = bringForward;
window.sendBackward = sendBackward;
window.duplicateElement = duplicateElement;
window.deleteElement = deleteElement;
window.changePlayerRole = changePlayerRole;
window.submitCustomPrompt = submitCustomPrompt;
window.closeCustomPrompt = closeCustomPrompt;