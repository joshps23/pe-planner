// UI interactions, modals, tooltips, and user interface functions

function addAnnotation() {
    const court = document.getElementById('court');
    const ann = document.createElement('div');
    ann.className = 'annotation';
    ann.style.left = '150px';
    ann.style.top = '150px';
    ann.dataset.phase = currentPhase;
    
    const textarea = document.createElement('textarea');
    textarea.placeholder = 'Enter instruction...';
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
    
    // Initial resize and focus
    autoResizeTextarea(textarea);
    textarea.focus();
}

function toggleSection(header) {
    const section = header.parentElement;
    section.classList.toggle('collapsed');
}

let currentSuggestedLayout = null;

function showAISuggestions(suggestions, layoutJson = null) {
    const modalOverlay = document.getElementById('aiSuggestionsModal');
    const modalContent = document.getElementById('aiSuggestionsModalContent');
    
    // Store the suggested layout JSON for later use
    currentSuggestedLayout = layoutJson;
    
    // Format the suggestions for better readability - more careful processing
    let formattedSuggestions = suggestions
        .replace(/\n\n/g, '<br><br>')  // Double line breaks first
        .replace(/\n/g, '<br>')        // Single line breaks
        .replace(/^(\d+\.\s)/gm, '<br><strong>$1</strong>')  // Bold numbered points at start of line
        .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')  // Bold text between ** (non-greedy)
        .replace(/^\s*<br>/, '');  // Remove leading breaks
    
    modalContent.innerHTML = formattedSuggestions;
    
    // Show/hide the Apply Layout button based on whether we have JSON data
    const applyLayoutBtn = document.getElementById('applyLayoutBtn');
    if (applyLayoutBtn) {
        applyLayoutBtn.style.display = layoutJson ? 'inline-block' : 'none';
    }
    
    modalOverlay.classList.add('show');
}

function clearAISuggestions() {
    const modalOverlay = document.getElementById('aiSuggestionsModal');
    modalOverlay.classList.remove('show');
    document.getElementById('aiSuggestionsModalContent').innerHTML = '';
}

function closeAISuggestionsModal() {
    const modalOverlay = document.getElementById('aiSuggestionsModal');
    modalOverlay.classList.remove('show');
}

// Tooltip and onboarding functionality
let currentTooltip = null;
let tourStep = 0;
const tourSteps = [
    { element: '.control-section:first-child .control-header', text: 'Start by adding equipment to your court! Click to expand.' },
    { element: '[onclick="addEquipment(\'cone\')"]', text: 'Try adding a cone - just click and it appears on the court!' },
    { element: '.badminton-court', text: 'This is your court! Drag items around to position them.' },
    { element: '[data-phase="main"]', text: 'Switch between lesson phases to organize different activities.' },
    { element: '#drawBtn', text: 'Draw movement paths to show how students should move.' }
];

function showTooltip(e) {
    const tooltip = document.getElementById('tooltip');
    const text = e.target.getAttribute('title');
    if (!text) return;
    
    tooltip.textContent = text;
    tooltip.classList.add('show');
    
    const rect = e.target.getBoundingClientRect();
    tooltip.style.left = Math.min(rect.left + (rect.width / 2), window.innerWidth - 120) + 'px';
    tooltip.style.top = (rect.top - 40) + 'px';
    
    currentTooltip = tooltip;
}

function hideTooltip(e) {
    const tooltip = document.getElementById('tooltip');
    tooltip.classList.remove('show');
    currentTooltip = null;
}

function closeOnboarding() {
    document.getElementById('onboardingOverlay').style.display = 'none';
    localStorage.setItem('onboardingCompleted', 'true');
}

function startTour() {
    closeOnboarding();
    tourStep = 0;
    showTourStep();
}

function showTourStep() {
    if (tourStep >= tourSteps.length) {
        showSuccessMessage('Tour completed! You\'re ready to create amazing lesson plans! 🎉');
        return;
    }
    
    const step = tourSteps[tourStep];
    const element = document.querySelector(step.element);
    if (!element) {
        tourStep++;
        showTourStep();
        return;
    }
    
    element.style.position = 'relative';
    element.style.zIndex = '1001';
    element.style.boxShadow = '0 0 0 3px #3b82f6, 0 0 20px rgba(59, 130, 246, 0.3)';
    element.style.borderRadius = '8px';
    
    const tooltip = document.getElementById('tooltip');
    tooltip.innerHTML = step.text + '<br><small>Click anywhere to continue...</small>';
    tooltip.classList.add('show');
    
    const rect = element.getBoundingClientRect();
    tooltip.style.left = Math.min(rect.left + (rect.width / 2), window.innerWidth - 120) + 'px';
    tooltip.style.top = (rect.bottom + 10) + 'px';
    
    const nextStep = () => {
        element.style.position = '';
        element.style.zIndex = '';
        element.style.boxShadow = '';
        tooltip.classList.remove('show');
        document.removeEventListener('click', nextStep);
        tourStep++;
        setTimeout(showTourStep, 500);
    };
    
    setTimeout(() => {
        document.addEventListener('click', nextStep);
    }, 100);
}

function showSuccessMessage(message) {
    const successMsg = document.getElementById('successMessage');
    successMsg.textContent = message;
    successMsg.classList.add('show');
    
    setTimeout(() => {
        successMsg.classList.remove('show');
    }, 4000);
}