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
    const layoutType = 'custom'; // Always custom now
    
    // Get real-world dimensions from court specifications
    const spec = courtSpecs.custom;
    let realWorldDimensions;
    
    // Use custom dimensions from user input
    const customWidth = document.getElementById('customWidth').value || spec.realDimensions.width;
    const customHeight = document.getElementById('customHeight').value || spec.realDimensions.height;
    realWorldDimensions = { 
        width: parseFloat(customWidth), 
        height: parseFloat(customHeight), 
        units: 'meters', 
        type: spec.name
    };
    
    const layout = {
        phase: currentPhase,
        courtType: layoutType,
        courtDimensions: {
            pixelWidth: court.clientWidth,
            pixelHeight: court.clientHeight,
            realWorld: realWorldDimensions
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
    
    // Calculate distances and spatial relationships between elements
    layout.spatialRelationships = calculateSpatialRelationships(layout.elements, layout.courtDimensions);
    
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

function calculateSpatialRelationships(elements, courtDimensions) {
    const relationships = [];
    
    // Convert pixel dimensions to meters for distance calculation
    const pixelToMeterRatioX = courtDimensions.realWorld.width / courtDimensions.pixelWidth;
    const pixelToMeterRatioY = courtDimensions.realWorld.height / courtDimensions.pixelHeight;
    
    // Calculate distance between each pair of elements
    for (let i = 0; i < elements.length; i++) {
        for (let j = i + 1; j < elements.length; j++) {
            const elem1 = elements[i];
            const elem2 = elements[j];
            
            // Calculate pixel distance
            const pixelDistanceX = Math.abs(elem2.position.x - elem1.position.x);
            const pixelDistanceY = Math.abs(elem2.position.y - elem1.position.y);
            const pixelDistance = Math.sqrt(pixelDistanceX * pixelDistanceX + pixelDistanceY * pixelDistanceY);
            
            // Convert to real-world meters
            const meterDistanceX = pixelDistanceX * pixelToMeterRatioX;
            const meterDistanceY = pixelDistanceY * pixelToMeterRatioY;
            const meterDistance = Math.sqrt(meterDistanceX * meterDistanceX + meterDistanceY * meterDistanceY);
            
            // Determine relative position
            let relativePosition = '';
            if (Math.abs(pixelDistanceX) > Math.abs(pixelDistanceY)) {
                relativePosition = elem2.position.x > elem1.position.x ? 'right of' : 'left of';
            } else {
                relativePosition = elem2.position.y > elem1.position.y ? 'below' : 'above';
            }
            
            // Create descriptive names for elements
            const elem1Name = elem1.name || `${elem1.role || elem1.type}`;
            const elem2Name = elem2.name || `${elem2.role || elem2.type}`;
            
            relationships.push({
                element1: elem1Name,
                element2: elem2Name,
                distanceMeters: parseFloat(meterDistance.toFixed(1)),
                distancePixels: parseFloat(pixelDistance.toFixed(0)),
                relativePosition: relativePosition,
                description: `${elem1Name} is ${meterDistance.toFixed(1)} meters ${relativePosition} ${elem2Name}`
            });
        }
    }
    
    // Sort by distance for easier analysis
    relationships.sort((a, b) => a.distanceMeters - b.distanceMeters);
    
    return relationships;
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
    description += `- Playing area: ${layout.courtDimensions.realWorld.width}m × ${layout.courtDimensions.realWorld.height}m ${layout.courtDimensions.realWorld.type}\n`;
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
    
    // Add spatial relationships and distances
    if (layout.spatialRelationships && layout.spatialRelationships.length > 0) {
        description += `SPATIAL RELATIONSHIPS & DISTANCES:\n`;
        description += `On this ${layout.courtDimensions.realWorld.width}m × ${layout.courtDimensions.realWorld.height}m ${layout.courtDimensions.realWorld.type}:\n`;
        
        // Limit to top 5 most important relationships to avoid overwhelming the AI
        const importantRelationships = layout.spatialRelationships.slice(0, 5);
        importantRelationships.forEach((rel, index) => {
            description += `${index + 1}. ${rel.description}\n`;
        });
        description += `\n`;
        
        // Add summary of closest and furthest elements
        if (layout.spatialRelationships.length > 0) {
            const closest = layout.spatialRelationships[0];
            const furthest = layout.spatialRelationships[layout.spatialRelationships.length - 1];
            description += `DISTANCE SUMMARY:\n`;
            description += `- Closest elements: ${closest.description}\n`;
            description += `- Furthest elements: ${furthest.description}\n\n`;
        }
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
            let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
            try {
                const errorData = await response.json();
                errorMessage = errorData.error || errorMessage;
            } catch (jsonError) {
                // If response is not JSON (like timeout errors), use the text content
                try {
                    const textError = await response.text();
                    errorMessage = textError || errorMessage;
                } catch (textError) {
                    // Fallback to status text if both JSON and text parsing fail
                }
            }
            throw new Error(errorMessage);
        }
        
        let data;
        try {
            data = await response.json();
        } catch (jsonError) {
            // Handle cases where successful response is not JSON
            const textResponse = await response.text();
            throw new Error(`Invalid response format: ${textResponse.substring(0, 100)}...`);
        }
        
        if (data.suggestions) {
            showAISuggestions(data.suggestions, data.layoutJson);
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