// Core variables
let itemCounter = 0;
let draggedElement = null;
let dragOffset = { x: 0, y: 0 };
let currentPhase = 'warmup';
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
    
    // Use safe default position (40% from edges)
    const safeXPercent = 40; 
    const safeYPercent = 40;
    const safetyMargin = 20;
    
    const elementWidth = 30; // Default element size
    const elementHeight = 30;
    
    const courtWidth = court.clientWidth;
    const courtHeight = court.clientHeight;
    const availableWidth = courtWidth - elementWidth - (2 * safetyMargin);
    const availableHeight = courtHeight - elementHeight - (2 * safetyMargin);
    
    const safeX = safetyMargin + (safeXPercent / 100) * availableWidth;
    const safeY = safetyMargin + (safeYPercent / 100) * availableHeight;
    
    item.style.left = safeX + 'px';
    item.style.top = safeY + 'px';
    item.style.position = 'absolute';
    item.style.zIndex = currentZIndex++; // Set initial z-index
    
    const removeBtn = document.createElement('button');
    removeBtn.className = 'remove-btn';
    removeBtn.textContent = '×';
    removeBtn.onclick = (e) => {
        e.stopPropagation();
        court.removeChild(item);
    };
    
    item.appendChild(removeBtn);
    court.appendChild(item);
    
    console.log('Equipment added to court:', item);
    
    makeDraggable(item);
}

async function addStudent(type) {
    const court = document.getElementById('court');
    if (!court) {
        console.error('Court element not found!');
        return;
    }
    
    const studentType = type === 'attacker' ? 'Attacker' : 'Defender';
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
        nameLabel.style.color = type === 'attacker' ? '#e74c3c' : '#3498db';
        nameLabel.style.fontWeight = 'bold';
        nameLabel.style.whiteSpace = 'nowrap';
        nameLabel.style.textAlign = 'center';
        nameLabel.style.backgroundColor = 'rgba(255, 255, 255, 0.9)';
        nameLabel.style.padding = '2px 6px';
        nameLabel.style.borderRadius = '4px';
        nameLabel.style.boxShadow = '0 1px 3px rgba(0,0,0,0.15)';
        item.appendChild(nameLabel);
    }
    
    // Use safe default position for students (45% from edges for variation)
    const safeXPercent = 45; 
    const safeYPercent = 45;
    const safetyMargin = 20;
    
    const elementWidth = 80; // Student size
    const elementHeight = 80;
    
    const courtWidth = court.clientWidth;
    const courtHeight = court.clientHeight;
    const availableWidth = courtWidth - elementWidth - (2 * safetyMargin);
    const availableHeight = courtHeight - elementHeight - (2 * safetyMargin);
    
    const safeX = safetyMargin + (safeXPercent / 100) * availableWidth;
    const safeY = safetyMargin + (safeYPercent / 100) * availableHeight;
    
    item.style.left = safeX + 'px';
    item.style.top = safeY + 'px';
    item.style.position = 'absolute';
    item.style.zIndex = currentZIndex++; // Set initial z-index
    
    const removeBtn = document.createElement('button');
    removeBtn.className = 'remove-btn';
    removeBtn.textContent = '×';
    removeBtn.onclick = (e) => {
        e.stopPropagation();
        court.removeChild(item);
    };
    
    item.appendChild(removeBtn);
    court.appendChild(item);
    
    console.log('Student added to court:', item);
    
    makeDraggable(item);
}

function makeDraggable(element) {
    element.addEventListener('mousedown', startDrag);
    element.addEventListener('touchstart', startDrag);
    attachContextMenu(element);
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
    
    // Get current element position
    const currentLeft = parseInt(draggedElement.style.left) || 0;
    const currentTop = parseInt(draggedElement.style.top) || 0;
    
    // Calculate offset between mouse position and element position
    dragOffset.x = mousePos.x - currentLeft;
    dragOffset.y = mousePos.y - currentTop;
    
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
    
    // For annotations/notes, allow dragging outside court boundaries
    // but constrain to the court container area
    if (draggedElement.classList.contains('annotation')) {
        const elementRect = draggedElement.getBoundingClientRect();
        const containerRect = courtContainer.getBoundingClientRect();
        const courtRect = court.getBoundingClientRect();
        
        // Calculate relative position within the court container
        const containerMaxX = courtContainer.clientWidth - elementRect.width;
        const containerMaxY = courtContainer.clientHeight - elementRect.height;
        
        // Allow movement within the entire court container
        newX = Math.max(-20, Math.min(newX, containerMaxX));
        newY = Math.max(-20, Math.min(newY, containerMaxY));
    } else {
        // For equipment and students, constrain to court boundaries
        const elementRect = draggedElement.getBoundingClientRect();
        const courtRect = court.getBoundingClientRect();
        const maxX = court.clientWidth - (elementRect.width);
        const maxY = court.clientHeight - (elementRect.height);
        
        newX = Math.max(0, Math.min(newX, maxX));
        newY = Math.max(0, Math.min(newY, maxY));
    }
    
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
    
    // Don't clear court items - let users keep their placements with new dimensions
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
        items.push({
            id: item.id,
            className: item.className,
            left: item.style.left,
            top: item.style.top,
            phase: item.dataset.phase || 'warmup',
            text: item.querySelector('div') ? item.querySelector('div').textContent : ''
        });
    });
    
    const annotations = [];
    court.querySelectorAll('.annotation').forEach(ann => {
        annotations.push({
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
        
        // Validate and adjust coordinates for larger player sizes
        const courtWidth = court.clientWidth;
        const courtHeight = court.clientHeight;
        
        // Determine element size based on type
        let elementWidth, elementHeight;
        if (item.classList.contains('student') || item.classList.contains('attacker') || item.classList.contains('defender')) {
            elementWidth = elementHeight = 80; // Current player size
        } else if (item.classList.contains('cone')) {
            elementWidth = elementHeight = 30;
        } else if (item.classList.contains('ball')) {
            elementWidth = elementHeight = 25;
        } else if (item.classList.contains('hoop')) {
            elementWidth = elementHeight = 35;
        } else {
            elementWidth = elementHeight = 30; // Default
        }
        
        // Parse saved coordinates
        let x = parseInt(itemData.left) || 0;
        let y = parseInt(itemData.top) || 0;
        
        // Apply boundary validation with safety margin
        const safetyMargin = 20;
        const maxX = courtWidth - elementWidth - safetyMargin;
        const maxY = courtHeight - elementHeight - safetyMargin;
        
        // Clamp coordinates to safe boundaries
        x = Math.max(safetyMargin, Math.min(maxX, x));
        y = Math.max(safetyMargin, Math.min(maxY, y));
        
        // Apply validated coordinates
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
        
        const removeBtn = document.createElement('button');
        removeBtn.className = 'remove-btn';
        removeBtn.textContent = '×';
        removeBtn.onclick = (e) => {
            e.stopPropagation();
            court.removeChild(item);
        };
        
        item.appendChild(removeBtn);
        court.appendChild(item);
        makeDraggable(item);
    });
    
    plan.annotations.forEach(annData => {
        const ann = document.createElement('div');
        ann.className = 'annotation';
        ann.dataset.phase = annData.phase || 'warmup';
        
        // Validate and adjust annotation coordinates
        const courtWidth = court.clientWidth;
        const courtHeight = court.clientHeight;
        
        // Annotation dimensions
        const annotationWidth = 120;
        const annotationHeight = 60;
        
        // Parse saved coordinates
        let x = parseInt(annData.left) || 0;
        let y = parseInt(annData.top) || 0;
        
        // Apply boundary validation with safety margin
        const safetyMargin = 13;
        const maxX = courtWidth - annotationWidth - safetyMargin;
        const maxY = courtHeight - annotationHeight - safetyMargin;
        
        // Clamp coordinates to safe boundaries
        x = Math.max(safetyMargin, Math.min(maxX, x));
        y = Math.max(safetyMargin, Math.min(maxY, y));
        
        // Apply validated coordinates
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
        
        const removeBtn = document.createElement('button');
        removeBtn.className = 'remove-btn';
        removeBtn.textContent = '×';
        removeBtn.onclick = (e) => {
            e.stopPropagation();
            court.removeChild(ann);
        };
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
    
    // Clear existing draggable items and annotations
    court.querySelectorAll('.draggable-item, .annotation, .path-line, .path-arrow').forEach(item => {
        item.remove();
    });
    
    // Reset item counter to ensure unique IDs
    itemCounter = 0;
    
    try {
        // Apply elements (equipment and students)
        if (currentSuggestedLayout.elements) {
            currentSuggestedLayout.elements.forEach(element => {
                createElementFromJson(element, court);
            });
        }
        
        // Apply annotations
        if (currentSuggestedLayout.annotations) {
            currentSuggestedLayout.annotations.forEach(annotation => {
                createAnnotationFromJson(annotation, court);
            });
        }
        
        // Show success message
        alert('Suggested layout applied successfully!');
        
        // Initialize z-indexes for new elements
        initializeZIndexes();
        
        // Close the suggestions modal
        closeAISuggestionsModal();
        
    } catch (error) {
        console.error('Error applying layout:', error);
        alert('Error applying layout. Please check the console for details.');
    }
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
    
    // Clear existing draggable items and annotations
    court.querySelectorAll('.draggable-item, .annotation, .path-line, .path-arrow').forEach(item => {
        item.remove();
    });
    
    // Reset item counter to ensure unique IDs
    itemCounter = 0;
    
    try {
        // Apply elements (equipment and students)
        if (layoutToApply.elements) {
            layoutToApply.elements.forEach(element => {
                createElementFromJson(element, court);
            });
        }
        
        // Apply annotations
        if (layoutToApply.annotations) {
            layoutToApply.annotations.forEach(annotation => {
                createAnnotationFromJson(annotation, court);
            });
        }
        
        // Show success message
        showSuccessMessage(`"${layoutToApply.name}" applied successfully!`);
        
        // Display activity details below the court
        displayActivityDetails(layoutToApply);
        
        // Initialize z-indexes for new elements
        initializeZIndexes();
        
        // Close the suggestions modal
        closeAISuggestionsModal();
        
    } catch (error) {
        console.error('Error applying layout:', error);
        alert('Error applying layout. Please check the console for details.');
    }
}

function createElementFromJson(element, court) {
    // Convert percentage positions to pixels with validation
    const courtWidth = court.clientWidth;
    const courtHeight = court.clientHeight;
    
    // Validate and clamp coordinates to safe range (20-80%)
    let xPercent = element.position.xPercent || 50;
    let yPercent = element.position.yPercent || 50;
    
    // Pre-validate coordinates with strict safe bounds
    const originalX = xPercent;
    const originalY = yPercent;
    
    // Clamp to safe range (20-80%) to ensure elements stay within court boundaries
    xPercent = Math.max(20, Math.min(80, xPercent));
    yPercent = Math.max(20, Math.min(80, yPercent));
    
    // Log warning if coordinates were adjusted
    if (xPercent !== originalX || yPercent !== originalY) {
        console.warn(`Pre-validated coordinates for ${element.type}: (${originalX}, ${originalY}) -> (${xPercent}, ${yPercent}) - clamped to safe range`);
    }
    
    // Calculate element size for boundary checking based on type
    let elementWidth, elementHeight;
    
    switch (element.type) {
        case 'attacker':
        case 'defender':
            elementWidth = elementHeight = 80;
            break;
        case 'cone':
            elementWidth = elementHeight = 30;
            break;
        case 'ball':
            elementWidth = elementHeight = 25;
            break;
        case 'equipment-net':
        case 'net':
            elementWidth = 80;
            elementHeight = 20;
            break;
        case 'bench':
            elementWidth = 80;
            elementHeight = 20;
            break;
        case 'hoop':
            elementWidth = elementHeight = 40;
            break;
        default:
            // Default size for other equipment
            elementWidth = elementHeight = 30;
    }
    
    // Calculate pixel positions with proper boundary consideration
    // Use a safety margin of 10px to prevent elements from touching the edges
    const safetyMargin = 13;
    
    // Calculate available space for positioning (court minus element size minus margins)
    const availableWidth = courtWidth - elementWidth - (2 * safetyMargin);
    const availableHeight = courtHeight - elementHeight - (2 * safetyMargin);
    
    // Convert percentage to pixel position within available space
    // 0% = safetyMargin, 100% = courtWidth - elementWidth - safetyMargin
    let x = safetyMargin + (xPercent / 100) * availableWidth;
    let y = safetyMargin + (yPercent / 100) * availableHeight;
    
    // Double-check boundaries (should not be needed with correct calculation)
    x = Math.max(safetyMargin, Math.min(courtWidth - elementWidth - safetyMargin, x));
    y = Math.max(safetyMargin, Math.min(courtHeight - elementHeight - safetyMargin, y));
    
    if (element.type === 'attacker' || element.type === 'defender') {
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
            nameLabel.style.color = element.type === 'attacker' ? '#e74c3c' : '#3498db';
            nameLabel.style.fontWeight = 'bold';
            nameLabel.style.whiteSpace = 'nowrap';
            item.appendChild(nameLabel);
        }
        
        // Position element
        item.style.left = x + 'px';
        item.style.top = y + 'px';
        
        // Add remove button
        const removeBtn = document.createElement('button');
        removeBtn.className = 'remove-btn';
        removeBtn.textContent = '×';
        removeBtn.onclick = (e) => {
            e.stopPropagation();
            court.removeChild(item);
        };
        
        item.appendChild(removeBtn);
        court.appendChild(item);
        makeDraggable(item);
        
    } else {
        // Create equipment element
        const item = document.createElement('div');
        item.className = `draggable-item ${element.type}`;
        item.id = 'item-' + (++itemCounter);
        item.dataset.phase = currentPhase;
        
        // Position element
        item.style.left = x + 'px';
        item.style.top = y + 'px';
        
        // Add remove button
        const removeBtn = document.createElement('button');
        removeBtn.className = 'remove-btn';
        removeBtn.textContent = '×';
        removeBtn.onclick = (e) => {
            e.stopPropagation();
            court.removeChild(item);
        };
        
        item.appendChild(removeBtn);
        court.appendChild(item);
        makeDraggable(item);
    }
}

function createAnnotationFromJson(annotation, court) {
    // Convert percentage positions to pixels with validation
    const courtWidth = court.clientWidth;
    const courtHeight = court.clientHeight;
    
    // Validate and clamp coordinates to safe range (20-80%) - same as elements
    let xPercent = annotation.position.xPercent || 50;
    let yPercent = annotation.position.yPercent || 50;
    
    // Pre-validate coordinates with strict safe bounds to match element positioning
    const originalX = xPercent;
    const originalY = yPercent;
    
    // Clamp to safe range (20-80%) to ensure annotations stay within court boundaries
    xPercent = Math.max(20, Math.min(80, xPercent));
    yPercent = Math.max(20, Math.min(80, yPercent));
    
    // Log warning if coordinates were adjusted
    if (xPercent !== originalX || yPercent !== originalY) {
        console.warn(`Pre-validated annotation coordinates: (${originalX}, ${originalY}) -> (${xPercent}, ${yPercent}) - clamped to safe range`);
    }
    
    // Annotations dimensions
    const annotationWidth = 120; // Approximate width of annotation
    const annotationHeight = 60;  // Approximate height of annotation
    
    // Use same safety margin system as elements
    const safetyMargin = 13;
    
    // Calculate available space for positioning (court minus annotation size minus margins)
    const availableWidth = courtWidth - annotationWidth - (2 * safetyMargin);
    const availableHeight = courtHeight - annotationHeight - (2 * safetyMargin);
    
    // Convert percentage to pixel position within available space
    // 0% = safetyMargin, 100% = courtWidth - annotationWidth - safetyMargin
    let x = safetyMargin + (xPercent / 100) * availableWidth;
    let y = safetyMargin + (yPercent / 100) * availableHeight;
    
    // Double-check boundaries (should not be needed with correct calculation)
    x = Math.max(safetyMargin, Math.min(courtWidth - annotationWidth - safetyMargin, x));
    y = Math.max(safetyMargin, Math.min(courtHeight - annotationHeight - safetyMargin, y));
    
    const annotationDiv = document.createElement('div');
    annotationDiv.className = 'annotation';
    annotationDiv.dataset.phase = currentPhase;
    annotationDiv.style.left = x + 'px';
    annotationDiv.style.top = y + 'px';
    
    const textarea = document.createElement('textarea');
    textarea.value = annotation.text;
    textarea.placeholder = 'Add note...';
    textarea.rows = 2;
    textarea.cols = 20;
    
    const removeBtn = document.createElement('button');
    removeBtn.className = 'remove-btn';
    removeBtn.textContent = '×';
    removeBtn.onclick = (e) => {
        e.stopPropagation();
        court.removeChild(annotationDiv);
    };
    
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
        
        // Re-attach remove button handler
        const removeBtn = clone.querySelector('.remove-btn');
        if (removeBtn) {
            removeBtn.onclick = (e) => {
                e.stopPropagation();
                court.removeChild(clone);
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

function attachContextMenu(element) {
    element.addEventListener('contextmenu', (e) => showContextMenu(e, element));
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
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
window.submitCustomPrompt = submitCustomPrompt;
window.closeCustomPrompt = closeCustomPrompt;