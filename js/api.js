// API Configuration and AI Assistant Functions
let geminiApiKey = '';

async function loadApiConfig() {
    // API configuration is now handled by Netlify function
    const statusDiv = document.getElementById('apiKeyStatus');
    const statusText = document.getElementById('apiKeyStatusText');
    
    // Always show ready status since API key is managed serverless
    statusDiv.style.backgroundColor = '#d1fae5';
    statusDiv.style.border = '1px solid #10b981';
    statusText.textContent = '🤖 AI Assistant Ready (Serverless)';
    statusText.style.color = '#065f46';
}

function captureCourtLayout() {
    const court = document.getElementById('court');
    const courtRect = court.getBoundingClientRect();
    const layout = {
        phase: currentPhase,
        courtDimensions: {
            width: court.clientWidth,
            height: court.clientHeight
        },
        activityDetails: {
            name: document.getElementById('activityName').value.trim(),
            objective: document.getElementById('lessonObjective').value.trim(),
            rules: document.getElementById('activityRules').value.trim(),
            winningConditions: document.getElementById('winningConditions').value.trim(),
            skillFocus: document.getElementById('skillFocus').value.trim()
        },
        elements: [],
        annotations: [],
        paths: []
    };
    
    // Capture draggable items (equipment and students)
    court.querySelectorAll('.draggable-item').forEach(item => {
        if (item.style.display !== 'none') {
            const rect = item.getBoundingClientRect();
            const element = {
                type: getElementType(item),
                position: {
                    x: parseInt(item.style.left) || 0,
                    y: parseInt(item.style.top) || 0,
                    // Convert to percentage for better description
                    xPercent: Math.round(((parseInt(item.style.left) || 0) / court.clientWidth) * 100),
                    yPercent: Math.round(((parseInt(item.style.top) || 0) / court.clientHeight) * 100)
                },
                phase: item.dataset.phase || 'warmup'
            };
            
            // Add name for students
            if (item.classList.contains('student')) {
                const nameLabel = item.querySelector('div');
                if (nameLabel && !nameLabel.classList.contains('remove-btn')) {
                    element.name = nameLabel.textContent;
                }
                element.role = item.classList.contains('attacker') ? 'attacker' : 'defender';
            }
            
            layout.elements.push(element);
        }
    });
    
    // Capture annotations
    court.querySelectorAll('.annotation').forEach(ann => {
        if (ann.style.display !== 'none') {
            const textarea = ann.querySelector('textarea');
            if (textarea && textarea.value.trim()) {
                layout.annotations.push({
                    text: textarea.value.trim(),
                    position: {
                        x: parseInt(ann.style.left) || 0,
                        y: parseInt(ann.style.top) || 0,
                        xPercent: Math.round(((parseInt(ann.style.left) || 0) / court.clientWidth) * 100),
                        yPercent: Math.round(((parseInt(ann.style.top) || 0) / court.clientHeight) * 100)
                    },
                    phase: ann.dataset.phase || 'warmup'
                });
            }
        }
    });
    
    // Capture drawing paths
    const lines = court.querySelectorAll('.path-line');
    const arrows = court.querySelectorAll('.path-arrow');
    if (lines.length > 0) {
        layout.paths = Array.from(lines).map((line, index) => {
            return {
                type: 'movement_path',
                startX: parseInt(line.style.left) || 0,
                startY: parseInt(line.style.top) || 0,
                length: parseInt(line.style.width) || 0,
                angle: extractRotationAngle(line.style.transform)
            };
        });
    }
    
    return layout;
}

function getElementType(element) {
    if (element.classList.contains('student')) {
        return element.classList.contains('attacker') ? 'attacker' : 'defender';
    } else if (element.classList.contains('cone')) {
        return 'cone';
    } else if (element.classList.contains('racket')) {
        return 'racket';
    } else if (element.classList.contains('shuttle')) {
        return 'shuttlecock';
    } else if (element.classList.contains('equipment-net')) {
        return 'net';
    } else if (element.classList.contains('marker')) {
        return 'marker';
    } else if (element.classList.contains('hoop')) {
        return 'hoop';
    } else if (element.classList.contains('ball')) {
        return 'ball';
    } else if (element.classList.contains('bench')) {
        return 'bench';
    }
    return 'unknown';
}

function extractRotationAngle(transform) {
    const match = transform.match(/rotate\(([^)]+)\)/);
    return match ? parseFloat(match[1]) : 0;
}

function generateLayoutDescription(layout) {
    let description = `This is a PE lesson layout for the ${layout.phase} phase:\n\n`;
    
    // Include activity details if provided
    if (layout.activityDetails.name || layout.activityDetails.objective || layout.activityDetails.rules || layout.activityDetails.winningConditions || layout.activityDetails.skillFocus) {
        description += `ACTIVITY DETAILS:\n`;
        if (layout.activityDetails.name) {
            description += `- Activity Name: ${layout.activityDetails.name}\n`;
        }
        if (layout.activityDetails.objective) {
            description += `- Lesson Objective: ${layout.activityDetails.objective}\n`;
        }
        if (layout.activityDetails.skillFocus) {
            description += `- Skills Focus: ${layout.activityDetails.skillFocus}\n`;
        }
        if (layout.activityDetails.rules) {
            description += `- Rules & Instructions: ${layout.activityDetails.rules}\n`;
        }
        if (layout.activityDetails.winningConditions) {
            description += `- Winning Conditions: ${layout.activityDetails.winningConditions}\n`;
        }
        description += `\n`;
    }
    
    description += `PLAYING AREA SETUP:\n`;
    description += `- Playing area dimensions: ${layout.courtDimensions.width}x${layout.courtDimensions.height} pixels\n`;
    description += `- Current phase: ${layout.phase}\n\n`;
    
    if (layout.elements.length > 0) {
        description += `EQUIPMENT & PARTICIPANTS:\n`;
        layout.elements.forEach((element, index) => {
            description += `${index + 1}. ${element.type.toUpperCase()}`;
            if (element.name) {
                description += ` (${element.name})`;
            }
            if (element.role) {
                description += ` - Role: ${element.role}`;
            }
            description += ` at position (${element.xPercent}%, ${element.yPercent}% from top-left)\n`;
        });
        description += `\n`;
    }
    
    if (layout.annotations.length > 0) {
        description += `INSTRUCTOR NOTES:\n`;
        layout.annotations.forEach((ann, index) => {
            description += `${index + 1}. "${ann.text}" at (${ann.xPercent}%, ${ann.yPercent}%)\n`;
        });
        description += `\n`;
    }
    
    if (layout.paths.length > 0) {
        description += `MOVEMENT PATHS:\n`;
        description += `- ${layout.paths.length} movement arrows/paths drawn on playing area\n`;
        description += `- These indicate planned participant movements or object trajectories\n\n`;
    }
    
    return description;
}

function showAIStatus(message, isError = false) {
    const statusDiv = document.getElementById('aiStatus');
    statusDiv.textContent = message;
    statusDiv.style.color = isError ? '#ef4444' : '#6b7280';
    statusDiv.style.display = 'block';
    
    if (!isError) {
        setTimeout(() => {
            statusDiv.style.display = 'none';
        }, 5000);
    }
}

async function analyzeLayout() {
    // Capture current layout
    const layout = captureCourtLayout();
    
    if (layout.elements.length === 0 && layout.annotations.length === 0 && layout.paths.length === 0) {
        alert('Please add some equipment, students, or annotations to the court before analyzing.');
        return;
    }
    
    const description = generateLayoutDescription(layout);
    
    // Show loading status
    showAIStatus('Analyzing layout with AI...', false);
    const analyzeBtn = document.getElementById('analyzeBtn');
    const originalText = analyzeBtn.innerHTML;
    analyzeBtn.innerHTML = '<span>⏳</span> Analyzing...';
    analyzeBtn.disabled = true;
    
    try {
        const response = await fetch('/.netlify/functions/analyzeLayout', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                layoutData: description
            })
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        if (data.suggestions) {
            showAISuggestions(data.suggestions);
            showAIStatus('Analysis complete!', false);
        } else {
            throw new Error('No suggestions received from AI');
        }
        
    } catch (error) {
        console.error('Error calling Netlify function:', error);
        let errorMessage = 'Failed to analyze layout. ';
        
        if (error.message.includes('API_KEY_INVALID')) {
            errorMessage += 'Please check your API key.';
        } else if (error.message.includes('quota')) {
            errorMessage += 'API quota exceeded.';
        } else if (error.message.includes('blocked')) {
            errorMessage += 'Content was blocked by safety filters.';
        } else {
            errorMessage += `Error: ${error.message}`;
        }
        
        showAIStatus(errorMessage, true);
    } finally {
        // Reset button
        analyzeBtn.innerHTML = originalText;
        analyzeBtn.disabled = false;
    }
}