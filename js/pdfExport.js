// PDF Export Module for PE Activity Consultant
// Generates comprehensive PDF documents including court layouts, activity details, and AI suggestions

/**
 * Main PDF export function
 */
async function generatePDF() {
    try {
        // Initialize jsPDF
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF('p', 'mm', 'a4');

        // Get activity details
        const activityData = gatherActivityData();
        const timestamp = new Date().toLocaleString();

        // Page 1: Title and Overview
        addTitlePage(pdf, activityData, timestamp);

        // Page 2: Court Layout Visual
        pdf.addPage();
        await addCourtLayout(pdf);

        // Page 3: Activity Details
        pdf.addPage();
        addActivityDetails(pdf, activityData);

        // Page 4: AI Analysis (if available)
        if (lastAnalysisResults) {
            pdf.addPage();
            addAIAnalysis(pdf);
        }

        // Page 5: Phase-Specific Content
        pdf.addPage();
        addPhaseContent(pdf);

        // Generate filename
        const activityName = activityData.name || 'PE_Plan';
        const date = new Date().toISOString().split('T')[0];
        const filename = `${activityName.replace(/[^a-z0-9]/gi, '_')}_${date}.pdf`;

        // Save the PDF
        pdf.save(filename);

        // Show success message
        showSuccessMessage(`PDF exported successfully as ${filename}`);

    } catch (error) {
        console.error('Error generating PDF:', error);
        alert('Failed to generate PDF. Please try again.');
    }
}

/**
 * Add title page to PDF
 */
function addTitlePage(pdf, activityData, timestamp) {
    // Header background
    pdf.setFillColor(107, 70, 193); // Purple gradient color
    pdf.rect(0, 0, 210, 40, 'F');

    // Title
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(24);
    pdf.text('PE Activity Lesson Plan', 105, 20, { align: 'center' });

    // Reset text color
    pdf.setTextColor(0, 0, 0);

    // Activity Name
    pdf.setFontSize(18);
    pdf.text(activityData.name || 'Unnamed Activity', 20, 60);

    // Details box
    pdf.setDrawColor(200, 200, 200);
    pdf.rect(20, 70, 170, 60, 'S');

    pdf.setFontSize(12);
    let yPos = 80;

    // Lesson Objective
    if (activityData.objective) {
        pdf.setFont(undefined, 'bold');
        pdf.text('Lesson Objective:', 25, yPos);
        pdf.setFont(undefined, 'normal');
        const lines = pdf.splitTextToSize(activityData.objective, 160);
        pdf.text(lines, 25, yPos + 6);
        yPos += 6 + (lines.length * 5);
    }

    // Skills Focus
    if (activityData.skillFocus) {
        pdf.setFont(undefined, 'bold');
        pdf.text('Skills Focus:', 25, yPos + 5);
        pdf.setFont(undefined, 'normal');
        pdf.text(activityData.skillFocus, 25, yPos + 11);
        yPos += 16;
    }

    // Court Dimensions
    pdf.setFont(undefined, 'bold');
    pdf.text('Court Dimensions:', 25, yPos + 5);
    pdf.setFont(undefined, 'normal');
    pdf.text(`${activityData.courtWidth}m × ${activityData.courtHeight}m`, 25, yPos + 11);

    // Footer
    pdf.setFontSize(10);
    pdf.setTextColor(128, 128, 128);
    pdf.text(`Generated on ${timestamp}`, 20, 280);
    pdf.text('PE Activity Consultant', 190, 280, { align: 'right' });
}

/**
 * Capture and add court layout to PDF
 */
async function addCourtLayout(pdf) {
    try {
        const court = document.getElementById('court');

        // Temporarily show all elements for capture
        const hiddenElements = court.querySelectorAll('[style*="display: none"]');
        hiddenElements.forEach(el => el.style.display = '');

        // Capture the court
        const canvas = await html2canvas(court, {
            scale: 2,
            backgroundColor: '#ffffff',
            logging: false
        });

        // Restore hidden elements
        hiddenElements.forEach(el => el.style.display = 'none');

        // Add title
        pdf.setFontSize(16);
        pdf.setFont(undefined, 'bold');
        pdf.text('Court Layout', 105, 20, { align: 'center' });

        // Calculate dimensions to fit on page
        const imgWidth = 170;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;

        // Add image to PDF
        const imgData = canvas.toDataURL('image/png');
        pdf.addImage(imgData, 'PNG', 20, 30, imgWidth, Math.min(imgHeight, 200));

        // Add equipment legend
        const yStart = Math.min(imgHeight, 200) + 40;
        pdf.setFontSize(12);
        pdf.setFont(undefined, 'bold');
        pdf.text('Equipment Legend:', 20, yStart);

        pdf.setFont(undefined, 'normal');
        pdf.setFontSize(10);

        const equipment = countEquipment();
        let legendY = yStart + 7;

        Object.entries(equipment).forEach(([type, count]) => {
            if (count > 0) {
                pdf.text(`• ${formatEquipmentName(type)}: ${count}`, 25, legendY);
                legendY += 5;
            }
        });

    } catch (error) {
        console.error('Error capturing court layout:', error);
        pdf.text('Court layout could not be captured', 105, 150, { align: 'center' });
    }
}

/**
 * Add activity details to PDF
 */
function addActivityDetails(pdf, activityData) {
    pdf.setFontSize(16);
    pdf.setFont(undefined, 'bold');
    pdf.text('Activity Details', 20, 20);

    let yPos = 35;

    // Rules
    if (activityData.rules) {
        pdf.setFontSize(14);
        pdf.setFont(undefined, 'bold');
        pdf.text('Rules & Instructions:', 20, yPos);
        pdf.setFont(undefined, 'normal');
        pdf.setFontSize(11);

        const lines = pdf.splitTextToSize(activityData.rules, 170);
        pdf.text(lines, 20, yPos + 7);
        yPos += 7 + (lines.length * 5) + 10;
    }

    // Winning Conditions
    if (activityData.winningConditions) {
        pdf.setFontSize(14);
        pdf.setFont(undefined, 'bold');
        pdf.text('Winning Conditions:', 20, yPos);
        pdf.setFont(undefined, 'normal');
        pdf.setFontSize(11);

        const lines = pdf.splitTextToSize(activityData.winningConditions, 170);
        pdf.text(lines, 20, yPos + 7);
        yPos += 7 + (lines.length * 5) + 10;
    }

    // If we have selected AI layout, add its details
    if (currentSuggestedLayouts && selectedLayoutIndex !== null) {
        const layout = currentSuggestedLayouts.layouts[selectedLayoutIndex];

        // Instructions
        if (layout.instructions) {
            pdf.setFontSize(14);
            pdf.setFont(undefined, 'bold');
            pdf.text('Instructions:', 20, yPos);
            pdf.setFont(undefined, 'normal');
            pdf.setFontSize(11);

            const instructions = Array.isArray(layout.instructions) ? layout.instructions : [layout.instructions];
            yPos += 7;

            instructions.forEach((instruction, index) => {
                const lines = pdf.splitTextToSize(`${index + 1}. ${instruction}`, 165);
                pdf.text(lines, 25, yPos);
                yPos += lines.length * 5 + 2;
            });

            yPos += 8;
        }

        // Teaching Points
        if (layout.teachingPoints) {
            // Check if we need a new page
            if (yPos > 240) {
                pdf.addPage();
                yPos = 20;
            }

            pdf.setFontSize(14);
            pdf.setFont(undefined, 'bold');
            pdf.text('Teaching Points:', 20, yPos);
            pdf.setFont(undefined, 'normal');
            pdf.setFontSize(11);

            const points = Array.isArray(layout.teachingPoints) ? layout.teachingPoints : [layout.teachingPoints];
            yPos += 7;

            points.forEach(point => {
                const lines = pdf.splitTextToSize(`• ${point}`, 165);
                pdf.text(lines, 25, yPos);
                yPos += lines.length * 5 + 2;
            });
        }
    }
}

/**
 * Add AI analysis to PDF
 */
function addAIAnalysis(pdf) {
    pdf.setFontSize(16);
    pdf.setFont(undefined, 'bold');
    pdf.text('AI Analysis & Suggestions', 20, 20);

    let yPos = 35;

    // Add review if available
    if (lastAnalysisResults.review) {
        pdf.setFontSize(14);
        pdf.setFont(undefined, 'bold');
        pdf.text('Layout Review:', 20, yPos);
        pdf.setFont(undefined, 'normal');
        pdf.setFontSize(10);

        // Parse and format the review
        const reviewLines = lastAnalysisResults.review.split('\n').filter(line => line.trim());
        yPos += 7;

        reviewLines.forEach(line => {
            // Handle special formatting
            if (line.includes('Strengths:')) {
                pdf.setFont(undefined, 'bold');
                pdf.setTextColor(16, 185, 129); // Green
                pdf.text('✓ Strengths:', 20, yPos);
                pdf.setFont(undefined, 'normal');
                pdf.setTextColor(0, 0, 0);
                yPos += 6;
            } else if (line.includes('Areas for Improvement:')) {
                pdf.setFont(undefined, 'bold');
                pdf.setTextColor(245, 158, 11); // Orange
                pdf.text('⚠ Areas for Improvement:', 20, yPos);
                pdf.setFont(undefined, 'normal');
                pdf.setTextColor(0, 0, 0);
                yPos += 6;
            } else if (line.includes('Safety Considerations:')) {
                pdf.setFont(undefined, 'bold');
                pdf.setTextColor(239, 68, 68); // Red
                pdf.text('🛡 Safety Considerations:', 20, yPos);
                pdf.setFont(undefined, 'normal');
                pdf.setTextColor(0, 0, 0);
                yPos += 6;
            } else {
                const lines = pdf.splitTextToSize(line, 170);
                pdf.text(lines, 25, yPos);
                yPos += lines.length * 4 + 2;
            }

            // Check if we need a new page
            if (yPos > 270) {
                pdf.addPage();
                yPos = 20;
            }
        });
    }

    // Add suggested layouts summary
    if (currentSuggestedLayouts && currentSuggestedLayouts.layouts) {
        yPos += 10;
        pdf.setFontSize(14);
        pdf.setFont(undefined, 'bold');
        pdf.text('Alternative Layout Options:', 20, yPos);
        pdf.setFont(undefined, 'normal');
        pdf.setFontSize(10);
        yPos += 7;

        currentSuggestedLayouts.layouts.forEach((layout, index) => {
            pdf.setFont(undefined, 'bold');
            pdf.text(`${index + 1}. ${layout.name}`, 25, yPos);
            pdf.setFont(undefined, 'normal');
            yPos += 5;

            const descLines = pdf.splitTextToSize(layout.description, 160);
            pdf.text(descLines, 30, yPos);
            yPos += descLines.length * 4 + 5;
        });
    }
}

/**
 * Add phase-specific content
 */
function addPhaseContent(pdf) {
    pdf.setFontSize(16);
    pdf.setFont(undefined, 'bold');
    pdf.text('Lesson Phases', 20, 20);

    const phases = [
        { name: 'Warm-up', id: 'warmup', timer: document.getElementById('warmupTimer')?.dataset.duration },
        { name: 'Main Activity', id: 'main', timer: document.getElementById('mainTimer')?.dataset.duration },
        { name: 'Cool-down', id: 'cooldown', timer: document.getElementById('cooldownTimer')?.dataset.duration }
    ];

    let yPos = 35;

    phases.forEach(phase => {
        pdf.setFontSize(14);
        pdf.setFont(undefined, 'bold');
        pdf.text(`${phase.name}:`, 20, yPos);

        // Add timer if set
        if (phase.timer) {
            pdf.setFont(undefined, 'normal');
            pdf.setFontSize(11);
            pdf.text(`Duration: ${phase.timer} seconds`, 100, yPos);
        }

        // Count elements in this phase
        const elements = document.querySelectorAll(`[data-phase="${phase.id}"]`);
        pdf.setFont(undefined, 'normal');
        pdf.setFontSize(10);
        pdf.text(`${elements.length} elements configured`, 25, yPos + 6);

        yPos += 20;
    });

    // Add notes section
    yPos += 10;
    pdf.setFontSize(14);
    pdf.setFont(undefined, 'bold');
    pdf.text('Additional Notes:', 20, yPos);

    pdf.setFont(undefined, 'normal');
    pdf.setFontSize(10);

    // Count annotations
    const annotations = document.querySelectorAll('.annotation');
    if (annotations.length > 0) {
        const notes = [];
        annotations.forEach(ann => {
            const text = ann.querySelector('textarea')?.value;
            if (text) notes.push(text);
        });

        yPos += 7;
        notes.forEach((note, index) => {
            const lines = pdf.splitTextToSize(`${index + 1}. ${note}`, 170);
            pdf.text(lines, 25, yPos);
            yPos += lines.length * 4 + 3;
        });
    } else {
        pdf.text('No additional notes', 25, yPos + 7);
    }
}

/**
 * Gather all activity data from the form and court
 */
function gatherActivityData() {
    return {
        name: document.getElementById('activityName')?.value || 'Unnamed Activity',
        objective: document.getElementById('lessonObjective')?.value || '',
        rules: document.getElementById('activityRules')?.value || '',
        winningConditions: document.getElementById('winningConditions')?.value || '',
        skillFocus: document.getElementById('skillFocus')?.value || '',
        courtWidth: document.getElementById('customWidth')?.value || '13.4',
        courtHeight: document.getElementById('customHeight')?.value || '6.1'
    };
}

/**
 * Count equipment on the court
 */
function countEquipment() {
    const court = document.getElementById('court');
    const equipment = {};

    court.querySelectorAll('.equipment').forEach(item => {
        const type = item.classList[1]; // Get equipment type from second class
        equipment[type] = (equipment[type] || 0) + 1;
    });

    // Count students
    const attackers = court.querySelectorAll('.attacker').length;
    const defenders = court.querySelectorAll('.defender').length;

    if (attackers > 0) equipment.attackers = attackers;
    if (defenders > 0) equipment.defenders = defenders;

    return equipment;
}

/**
 * Format equipment name for display
 */
function formatEquipmentName(type) {
    const names = {
        'cone': 'Traffic Cones',
        'ball': 'Balls',
        'hoop': 'Target Hoops',
        'net': 'Practice Nets',
        'bench': 'Benches',
        'marker': 'Field Markers',
        'racket': 'Rackets',
        'shuttle': 'Shuttlecocks',
        'floorball-stick': 'Floorball Sticks',
        'frisbee': 'Frisbees',
        'attackers': 'Attackers (Red)',
        'defenders': 'Defenders (Blue)'
    };

    return names[type] || type.charAt(0).toUpperCase() + type.slice(1);
}

/**
 * Show success message
 */
function showSuccessMessage(message) {
    // Create a temporary success message
    const successDiv = document.createElement('div');
    successDiv.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: linear-gradient(135deg, #10b981, #059669);
        color: white;
        padding: 15px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        z-index: 10000;
        animation: slideIn 0.3s ease-out;
    `;
    successDiv.textContent = '✅ ' + message;

    document.body.appendChild(successDiv);

    setTimeout(() => {
        successDiv.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(() => successDiv.remove(), 300);
    }, 3000);
}

// Make the function available globally
window.generatePDF = generatePDF;