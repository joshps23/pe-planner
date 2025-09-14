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

// Global variables are declared in main.js

function showAISuggestions(suggestions, layoutJson = null) {
    const modalOverlay = document.getElementById('aiSuggestionsModal');
    const suggestionsTextDiv = document.getElementById('aiSuggestionsText');
    const layoutOptionsContainer = document.getElementById('layoutOptionsContainer');
    const layoutCardsDiv = document.getElementById('layoutCards');
    
    // Store the suggested layouts JSON for later use
    currentSuggestedLayouts = layoutJson;
    selectedLayoutIndex = null;
    
    // Format the suggestions for better readability
    let formattedSuggestions = suggestions
        .replace(/\n\n/g, '<br><br>')
        .replace(/\n/g, '<br>')
        .replace(/^(\d+\.\s)/gm, '<br><strong>$1</strong>')
        .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
        .replace(/^\s*<br>/, '');
    
    suggestionsTextDiv.innerHTML = formattedSuggestions;
    
    // Handle multiple layouts or single layout
    if (layoutJson && layoutJson.layouts && Array.isArray(layoutJson.layouts)) {
        // Multiple layouts - show options
        layoutCardsDiv.innerHTML = '';
        layoutJson.layouts.forEach((layout, index) => {
            const cardElement = createLayoutCard(layout, index);
            layoutCardsDiv.appendChild(cardElement);
        });
        layoutOptionsContainer.style.display = 'block';

        // Show the preview button
        const previewBtn = document.getElementById('previewLayoutBtn');
        if (previewBtn) {
            previewBtn.style.display = 'inline-block';
        }

        // Automatically select the first layout
        if (layoutJson.layouts.length > 0) {
            setTimeout(() => selectLayout(0), 100);
        }
    } else if (layoutJson) {
        // Single layout (backward compatibility)
        currentSuggestedLayouts = { layouts: [layoutJson] };
        selectedLayoutIndex = 0;
        layoutOptionsContainer.style.display = 'none';
    } else {
        // No layouts
        layoutOptionsContainer.style.display = 'none';
    }
    
    // Update Apply Layout button visibility
    updateApplyLayoutButton();
    
    // Show "Run New Analysis" button if this is a stored analysis being viewed
    const newAnalysisBtn = document.getElementById('newAnalysisBtn');
    if (newAnalysisBtn && lastAnalysisResults) {
        newAnalysisBtn.style.display = 'inline-block';
    }
    
    modalOverlay.classList.add('show');
}

function createLayoutCard(layout, index) {
    const card = document.createElement('div');
    card.className = 'layout-card';
    card.onclick = () => selectLayout(index);
    
    card.innerHTML = `
        <div class="layout-card-header">
            <h4 class="layout-card-title">${layout.name}</h4>
            <div class="layout-card-selected-icon">✓</div>
        </div>
        <div class="layout-card-description">${layout.description}</div>
        <div class="layout-card-preview">
            <div class="layout-preview-court" id="preview-court-${index}"></div>
        </div>
        <div class="layout-card-features">
            ${layout.elements?.length || 0} elements • ${layout.annotations?.length || 0} notes
        </div>
    `;
    
    // Generate preview
    setTimeout(() => generateLayoutPreview(layout, index), 10);
    
    return card;
}

function generateLayoutPreview(layout, index) {
    const previewCourt = document.getElementById(`preview-court-${index}`);
    if (!previewCourt) return;
    
    // Clear existing preview
    previewCourt.innerHTML = '';
    
    // Add elements to preview
    layout.elements.forEach(element => {
        const previewElement = document.createElement('div');
        previewElement.className = `layout-preview-element ${element.type}`;
        previewElement.style.left = `${element.position.xPercent}%`;
        previewElement.style.top = `${element.position.yPercent}%`;
        previewCourt.appendChild(previewElement);
    });
}

function selectLayout(index) {
    selectedLayoutIndex = index;

    // Update card selection visual state
    document.querySelectorAll('.layout-card').forEach((card, i) => {
        card.classList.toggle('selected', i === index);
    });

    // Show activity details for selected layout
    if (currentSuggestedLayouts && currentSuggestedLayouts.layouts && currentSuggestedLayouts.layouts[index]) {
        showLayoutDetails(currentSuggestedLayouts.layouts[index]);
    }

    // Update Apply Layout button
    updateApplyLayoutButton();
}

function showLayoutDetails(layout) {
    const detailsPanel = document.getElementById('selectedLayoutDetails');
    const detailsContent = document.getElementById('layoutDetailsContent');

    if (!detailsPanel || !detailsContent) {
        console.error('Details panel elements not found');
        return;
    }

    console.log('Showing details for layout:', layout.name);

    // Build HTML for layout details
    let html = `
        <h4>${layout.name || 'Activity Layout'}</h4>
        <p>${layout.description || ''}</p>
    `;

    // Check if instructions is an array or string and handle both
    if (layout.instructions) {
        const instructionsList = Array.isArray(layout.instructions) ? layout.instructions : [layout.instructions];
        if (instructionsList.length > 0 && instructionsList[0]) {
            html += `
                <h4>📋 Instructions:</h4>
                <ol>
                    ${instructionsList.map(inst => `<li>${inst}</li>`).join('')}
                </ol>
            `;
        }
    }

    // Check if rules is an array or string and handle both
    if (layout.rules) {
        const rulesList = Array.isArray(layout.rules) ? layout.rules : [layout.rules];
        if (rulesList.length > 0 && rulesList[0]) {
            html += `
                <h4>📏 Rules:</h4>
                <ul>
                    ${rulesList.map(rule => `<li>${rule}</li>`).join('')}
                </ul>
            `;
        }
    }

    // Check if teachingPoints is an array or string and handle both
    if (layout.teachingPoints) {
        const pointsList = Array.isArray(layout.teachingPoints) ? layout.teachingPoints : [layout.teachingPoints];
        if (pointsList.length > 0 && pointsList[0]) {
            html += `
                <h4>🎯 Teaching Points:</h4>
                <ul>
                    ${pointsList.map(point => `<li>${point}</li>`).join('')}
                </ul>
            `;
        }
    }

    detailsContent.innerHTML = html;
    detailsPanel.style.display = 'block';
}

function updateApplyLayoutButton() {
    const previewLayoutBtn = document.getElementById('previewLayoutBtn');
    if (previewLayoutBtn) {
        const hasLayouts = currentSuggestedLayouts &&
                          currentSuggestedLayouts.layouts &&
                          currentSuggestedLayouts.layouts.length > 0;

        const hasSelection = selectedLayoutIndex !== null ||
                           (currentSuggestedLayouts && currentSuggestedLayouts.layouts && currentSuggestedLayouts.layouts.length === 1);

        previewLayoutBtn.style.display = hasLayouts && hasSelection ? 'inline-block' : 'none';

        // Update button text based on selection
        if (hasSelection && currentSuggestedLayouts && currentSuggestedLayouts.layouts) {
            const layoutIndex = selectedLayoutIndex !== null ? selectedLayoutIndex : 0;
            const layoutName = currentSuggestedLayouts.layouts[layoutIndex]?.name || 'Layout';
            previewLayoutBtn.innerHTML = `<span>👁️</span> Preview ${layoutName}`;
        }
    }
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

// Loading Modal Functions
function showLoadingModal() {
    const modal = document.getElementById('loadingModal');
    if (modal) {
        modal.style.display = 'flex';
        // Reset animation by removing and re-adding
        const progressBar = modal.querySelector('.loading-progress-bar');
        if (progressBar) {
            progressBar.style.animation = 'none';
            setTimeout(() => {
                progressBar.style.animation = 'loadingProgress 3s ease-in-out infinite';
            }, 10);
        }

        // Randomize loading tips
        const tips = [
            "💡 Tip: AI will suggest 3 different layout variations",
            "💡 Tip: Each layout includes instructions and teaching points",
            "💡 Tip: You can preview layouts before applying them",
            "💡 Tip: AI considers your lesson objectives for better suggestions",
            "💡 Tip: Layouts are optimized for your specified court dimensions"
        ];
        const tipElement = modal.querySelector('.loading-tip');
        if (tipElement) {
            tipElement.textContent = tips[Math.floor(Math.random() * tips.length)];
        }
    }
}

function hideLoadingModal() {
    const modal = document.getElementById('loadingModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

function updateLoadingMessage(message) {
    const modal = document.getElementById('loadingModal');
    if (modal) {
        const messageElement = modal.querySelector('.loading-message');
        if (messageElement) {
            messageElement.textContent = message;
        }
    }
}