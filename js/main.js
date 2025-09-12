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
    
    item.style.left = '50px';
    item.style.top = '50px';
    item.style.position = 'absolute';
    
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

function addStudent(type) {
    const name = prompt(`Enter student name (or leave blank for ${type.toUpperCase()}):`)
    const court = document.getElementById('court');
    if (!court) {
        console.error('Court element not found!');
        return;
    }
    
    console.log('Adding student:', type);
    
    const item = document.createElement('div');
    item.className = `draggable-item student ${type}`;
    item.id = 'item-' + (++itemCounter);
    item.dataset.phase = currentPhase;
    
    if (name && name.trim()) {
        const nameLabel = document.createElement('div');
        nameLabel.textContent = name.trim();
        nameLabel.style.position = 'absolute';
        nameLabel.style.bottom = '-15px';
        nameLabel.style.left = '50%';
        nameLabel.style.transform = 'translateX(-50%)';
        nameLabel.style.fontSize = '8px';
        nameLabel.style.color = type === 'attacker' ? '#e74c3c' : '#3498db';
        nameLabel.style.fontWeight = 'bold';
        nameLabel.style.whiteSpace = 'nowrap';
        item.appendChild(nameLabel);
    }
    
    item.style.left = '100px';
    item.style.top = '100px';
    item.style.position = 'absolute';
    
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
}

function startDrag(e) {
    // Don't start drag if user is typing in a textarea
    if (e.target.tagName === 'TEXTAREA' && document.activeElement === e.target) {
        return;
    }
    
    e.preventDefault();
    // Find the draggable element (could be the target itself or a parent)
    draggedElement = e.target.closest('.draggable-item, .annotation') || e.target;
    
    const court = document.getElementById('court');
    const mousePos = getMousePosition(e, court);
    
    // Get current element position
    const currentLeft = parseInt(draggedElement.style.left) || 0;
    const currentTop = parseInt(draggedElement.style.top) || 0;
    
    // Calculate offset between mouse position and element position
    dragOffset.x = mousePos.x - currentLeft;
    dragOffset.y = mousePos.y - currentTop;
    
    document.addEventListener('mousemove', drag);
    document.addEventListener('mouseup', stopDrag);
    document.addEventListener('touchmove', drag);
    document.addEventListener('touchend', stopDrag);
    
    draggedElement.style.zIndex = '1000';
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
}

function stopDrag() {
    if (draggedElement) {
        draggedElement.style.zIndex = 'auto';
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
    
    plan.items.forEach(itemData => {
        const item = document.createElement('div');
        item.className = itemData.className;
        item.id = itemData.id;
        item.style.left = itemData.left;
        item.style.top = itemData.top;
        item.dataset.phase = itemData.phase || 'warmup';
        
        if (itemData.text && item.classList.contains('student')) {
            const nameLabel = document.createElement('div');
            nameLabel.textContent = itemData.text;
            nameLabel.style.position = 'absolute';
            nameLabel.style.bottom = '-15px';
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
        ann.style.left = annData.left;
        ann.style.top = annData.top;
        ann.dataset.phase = annData.phase || 'warmup';
        
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
    
    // Add keyboard shortcuts for modal
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            const aiModal = document.getElementById('aiSuggestionsModal');
            if (aiModal.classList.contains('show')) {
                closeAISuggestionsModal();
            }
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
    
    // Validate and clamp coordinates to 0-100 range
    let xPercent = element.position.xPercent || 50;
    let yPercent = element.position.yPercent || 50;
    
    // Clamp to valid range
    xPercent = Math.max(0, Math.min(100, xPercent));
    yPercent = Math.max(0, Math.min(100, yPercent));
    
    // Log warning if coordinates were adjusted
    if (xPercent !== element.position.xPercent || yPercent !== element.position.yPercent) {
        console.warn(`Adjusted coordinates for ${element.type}: (${element.position.xPercent}, ${element.position.yPercent}) -> (${xPercent}, ${yPercent})`);
    }
    
    // Calculate element size for boundary checking
    const isStudent = (element.type === 'attacker' || element.type === 'defender');
    const elementSize = isStudent ? 100 : 40; // Students are 100px, equipment is 40px
    
    // Calculate pixel positions with boundary consideration
    const maxX = courtWidth - elementSize;
    const maxY = courtHeight - elementSize;
    
    let x = (xPercent / 100) * courtWidth;
    let y = (yPercent / 100) * courtHeight;
    
    // Ensure elements don't go past court boundaries
    x = Math.max(0, Math.min(maxX, x));
    y = Math.max(0, Math.min(maxY, y));
    
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
            nameLabel.style.bottom = '-15px';
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
    
    // Validate and clamp coordinates to 0-100 range
    let xPercent = annotation.position.xPercent || 50;
    let yPercent = annotation.position.yPercent || 50;
    
    // Clamp to valid range
    xPercent = Math.max(0, Math.min(100, xPercent));
    yPercent = Math.max(0, Math.min(100, yPercent));
    
    // Log warning if coordinates were adjusted
    if (xPercent !== annotation.position.xPercent || yPercent !== annotation.position.yPercent) {
        console.warn(`Adjusted annotation coordinates: (${annotation.position.xPercent}, ${annotation.position.yPercent}) -> (${xPercent}, ${yPercent})`);
    }
    
    // Annotations are typically small, but add some margin
    const annotationWidth = 120; // Approximate width of annotation
    const annotationHeight = 60;  // Approximate height of annotation
    
    const maxX = courtWidth - annotationWidth;
    const maxY = courtHeight - annotationHeight;
    
    let x = (xPercent / 100) * courtWidth;
    let y = (yPercent / 100) * courtHeight;
    
    // Ensure annotations don't go past court boundaries
    x = Math.max(0, Math.min(maxX, x));
    y = Math.max(0, Math.min(maxY, y));
    
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

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Initialize API configuration
    loadApiConfig();
    
    // Set initial court layout (default is badminton)
    changeLayout();
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
window.closeAISuggestionsModal = closeAISuggestionsModal;
window.toggleSection = toggleSection;
window.closeOnboarding = closeOnboarding;
window.startTour = startTour;