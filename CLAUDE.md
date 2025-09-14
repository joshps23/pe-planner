
# PE Activity Consultant

A comprehensive web application for Physical Education teachers to plan, visualize, and analyze PE activities with AI-powered assistance using Google Gemini API.

## Standard Workflow for Claude Code

When working with Claude Code on this project, please follow these guidelines:

1. **Start each session** by:
   - **FIRST: Read todo.md** to understand previous work and pending tasks
   - Review relevant files and understand the current state
   - Check what was completed in the last session
   - Identify any unfinished tasks or issues
2. **Create/Update todo.md** with a plan of tasks to complete
3. **Check in with user** before proceeding with implementation
4. **Work through tasks** marking them complete as you go
5. **Provide high-level explanations** of changes made at each step
6. **Implement thoughtful solutions** - make comprehensive changes when they improve the codebase
7. **End each session** by updating todo.md with:
   - A summary of what was completed
   - Any remaining tasks for next session
   - Notes about important changes or decisions made

### Session Documentation
**CRITICAL AT SESSION START**: Always begin by reading todo.md to:
- Understand what was done in previous sessions
- Check for any unresolved issues or bugs
- Review pending tasks and priorities
- Maintain continuity with past work

**IMPORTANT AT SESSION END**: Always update todo.md at the end of each working session to maintain a clear record of:
- Tasks completed during the session
- Changes made to the codebase
- Any issues encountered and how they were resolved
- Next steps for future sessions

This ensures continuity between sessions and helps track the project's progress over time.

## Overview

PE Activity Consultant is a full-featured lesson planning tool designed specifically for PE teachers. It provides an interactive drag-and-drop interface for creating activity layouts, combined with AI analysis to suggest improvements and generate multiple layout variations. The application runs entirely in the browser with serverless backend functions for secure API integration.

## Core Features

### 🏫 Activity Planning
- **Custom Activity Spaces**: Define any playing area dimensions (meters) with automatic aspect ratio calculation
- **Visual Court Layout**: Clean white playing area with optional green border for outdoor spaces
- **Drag-and-Drop Interface**: Intuitive positioning of all elements with visual feedback
- **Multi-Phase Lessons**: Separate planning for warmup, main activity, and cool-down phases
- **Activity Timers**: Built-in countdown timers for each phase with visual display

### 🎯 Equipment & Participants
- **Students/Players**:
  - Attackers (red) and Defenders (blue) with custom names
  - 80px player icons for better visibility
  - Automatic name labels below players
- **Equipment Types**:
  - Traffic Cones - for boundaries and markers
  - Balls - various sports balls
  - Rackets & Shuttlecocks - for racquet sports
  - Practice Nets - portable dividers
  - Field Markers - position indicators
  - Target Hoops - for accuracy drills
  - Benches - for seating/obstacles
  - Floorball Sticks - for floor hockey
  - Frisbees - for disc sports

### 🤖 AI Analysis (Google Gemini)
- **Intelligent Feedback**: Analyzes current layout and provides improvement suggestions
- **Multiple Layout Options**: Generates 3 different layout variations:
  - Beginner-Friendly
  - Skill-Focused
  - High-Engagement
- **Complete Activity Details**: Each AI suggestion includes:
  - Activity name and description
  - Step-by-step instructions
  - Game rules
  - Teaching points
  - Equipment positioning
- **Analysis Persistence**: View last analysis without re-running API calls
- **Smart Positioning**: AI respects court boundaries and keeps elements within playing area

### ✏️ Annotations & Drawing
- **Movement Paths**: Draw arrows to show player movements and ball trajectories
- **Text Annotations**: Add yellow sticky notes with instructions anywhere on court
- **Auto-resize Notes**: Text areas automatically adjust to content
- **Phase-specific**: Annotations and paths can be tied to specific lesson phases

### 👥 Advanced Selection Tools
- **Group Selection**: Select multiple elements with lasso tool
- **Multi-select**: Ctrl/Cmd+click for individual selection
- **Group Operations**: Move grouped elements together
- **Keyboard Shortcuts**:
  - Ctrl/Cmd+G: Group selected
  - Ctrl/Cmd+Shift+G: Ungroup
  - Delete: Remove selected
  - Escape: Clear selection

### 📑 Layer Management
- **Z-index Control**: Right-click context menu for layer ordering
- **Layer Operations**:
  - Bring to Front
  - Send to Back
  - Bring Forward
  - Send Backward
- **Element Duplication**: Quick duplicate via context menu
- **Visual Stacking**: Proper overlap handling for complex layouts

### 💾 Save & Export
- **Local Storage**: Save unlimited lesson plans locally
- **Plan Management**: Load, delete, and organize saved plans
- **Auto-populate**: Lesson titles auto-fill when loading plans
- **Court Dimensions**: Saved with plans for consistency
- **Export to PDF**: (Planned feature) Generate printable lesson plans

## Technical Architecture

### Frontend Structure
```
/
├── badminton-planner.html  # Main application (single-page app)
├── js/
│   ├── main.js             # Core logic, drag-drop, element management
│   ├── api.js              # AI integration, layout capture, analysis
│   └── ui.js               # Modals, tooltips, UI interactions
├── css/
│   └── styles.css          # All styling, responsive design
├── images/
│   ├── attacker.png        # Player graphics
│   └── defender.png
└── test files/
    ├── test.html           # Basic functionality tests
    └── debug.html          # Debug interface
```

### Backend (Serverless)
```
netlify/functions/
└── analyzeLayout.mjs       # ES module for AI analysis
                            # Handles Gemini API calls
                            # 26-second timeout (Netlify Pro)
```

### Key Technologies
- **Frontend**: Vanilla JavaScript, HTML5, CSS3
- **Backend**: Netlify Functions (AWS Lambda)
- **AI Model**: Google Gemini 1.5 Pro (configurable)
- **Deployment**: Netlify with serverless functions
- **Storage**: Browser LocalStorage for plans

## Development Setup

### Prerequisites
- Node.js 14+ and npm
- Netlify CLI (`npm install -g netlify-cli`)
- Google Gemini API key

### Installation
```bash
# Clone repository
git clone [repository-url]
cd pe-planner

# Install dependencies
npm install

# Set up environment variables
echo "GOOGLE_GEMINI_API_KEY=your-api-key" > .env

# Run development server
netlify dev
```

### Environment Variables
- `GOOGLE_GEMINI_API_KEY`: Required for AI analysis
- `GEMINI_MODEL`: Optional, defaults to 'gemini-1.5-pro'
  - Options: 'gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-2.0-flash'

## Code Organization

### main.js - Core Application Logic
- **Drag & Drop System**: Complete implementation with boundary checking
- **Element Management**: Creation, positioning, removal of all elements
- **Phase Management**: Switching between lesson phases
- **Save/Load System**: LocalStorage integration for plans
- **Group Selection**: Lasso tool and multi-select logic
- **Context Menus**: Right-click layer management
- **Custom Prompts**: Modal system for user input

### api.js - AI Integration
- **Layout Capture**: Converts visual layout to structured data
- **Spatial Analysis**: Calculates distances and relationships
- **AI Communication**: Handles Gemini API requests
- **Response Parsing**: Processes AI suggestions and layouts
- **Coordinate Validation**: Ensures elements stay in bounds
- **Error Handling**: Comprehensive error messages

### ui.js - User Interface
- **Modal Management**: AI suggestions and prompts
- **Layout Cards**: Visual preview of AI suggestions
- **Tooltips**: Interactive help system
- **Onboarding**: First-time user tour
- **Success Messages**: User feedback
- **Section Collapsing**: Organized control panels

### styles.css - Visual Design
- **Responsive Layout**: Mobile-first design approach
- **Equipment Graphics**: Pure CSS visual representations
- **Animations**: Smooth transitions and effects
- **Drag Feedback**: Golden glow for dragged elements
- **Theme**: Purple gradient with modern design
- **Court Styling**: Configurable playing area appearance

## AI Integration Details

### Gemini API Configuration
- **Model Selection**: Configurable via environment variable
- **Temperature**: 0.2 for consistent, focused responses
- **Token Limit**: 30,000 tokens for complete responses
- **Timeout**: 25 seconds for API calls
- **Retry Logic**: Automatic fallback on timeouts

### Prompt Engineering
- **Boundary Constraints**: Explicit coordinate ranges (20-80%)
- **Format Enforcement**: Structured JSON response format
- **Equipment Matching**: Maintains user's equipment count
- **Safety Validation**: Triple-layer coordinate checking
- **Activity Context**: Incorporates user's lesson objectives

### Response Processing
- **Format Flexibility**: Handles various JSON structures
- **Coordinate Clamping**: Auto-corrects out-of-bounds positions
- **Field Conversion**: Arrays to strings for consistency
- **Fallback Defaults**: Generates elements if AI fails

## Recent Updates & Fixes

### 2025-09-13 Enhancements
- **Visual Improvements**: Enhanced drag visibility with golden glow
- **New Equipment**: Added floorball stick and frisbee
- **Modal Redesign**: Custom prompt dialogs with gradient styling
- **Model Update**: Switched to Gemini 2.5 Flash as default
- **Boundary Detection**: Improved white court vs green border logic

### 2025-09-12 Major Release
- **Multiple Layouts**: AI generates 3 layout variations
- **Activity Display**: Full details shown below court
- **Analysis Cache**: "View Last Analysis" functionality
- **Player Sizing**: Increased to 80px for visibility
- **Coordinate Fixes**: Resolved boundary calculation issues

### Technical Improvements
- **ES Modules**: Modern JavaScript module system
- **Background Functions**: Extended timeouts for complex analysis
- **Error Handling**: Specific messages for different failure modes
- **Backward Compatibility**: Handles old saved plan formats

## Usage Workflow

### Creating a Lesson Plan
1. **Set Dimensions**: Define your activity space size in meters
2. **Add Equipment**: Click equipment buttons to add to court
3. **Add Students**: Name students and position them
4. **Set Rules**: Enter activity details and objectives
5. **Draw Paths**: Show movement patterns with arrows
6. **Add Notes**: Place instructional annotations
7. **Save Plan**: Store for future use

### Using AI Analysis
1. **Setup Layout**: Create initial activity arrangement
2. **Analyze**: Click "Analyze Layout" for AI feedback
3. **Review Options**: Browse 3 suggested variations
4. **Preview**: See mini court preview for each option
5. **Apply**: Select and apply preferred layout
6. **View Details**: Activity instructions appear below court

### Managing Phases
1. **Switch Phase**: Click Warm-up/Main/Cool-down buttons
2. **Phase-specific**: Elements are tied to current phase
3. **Set Timers**: Enter duration for each phase
4. **Start Timer**: Countdown displays prominently
5. **Phase Visibility**: Only current phase elements show

## Browser Compatibility
- **Chrome**: Full support (recommended)
- **Firefox**: Full support
- **Safari**: Full support
- **Edge**: Full support
- **Mobile**: Responsive design for tablets/phones

## Performance Optimization
- **Lazy Loading**: Images load on demand
- **Efficient Rendering**: Minimal DOM manipulation
- **LocalStorage**: Fast plan saving/loading
- **Debounced Inputs**: Reduced API calls
- **Caching**: Analysis results stored temporarily

## Security Considerations
- **API Keys**: Server-side only via Netlify Functions
- **Input Validation**: All user inputs sanitized
- **CORS**: Properly configured headers
- **Content Security**: No inline scripts
- **Data Privacy**: All data stored locally

## Future Enhancements (Planned)
- **PDF Export**: Generate printable lesson plans
- **Video Integration**: Add instructional videos
- **Template Library**: Pre-made activity templates
- **Collaboration**: Share plans with other teachers
- **Analytics**: Track lesson effectiveness
- **Mobile App**: Native mobile applications
- **3D Visualization**: Three-dimensional court view
- **Voice Commands**: Hands-free element placement

## Troubleshooting

### Common Issues
- **Elements Not Appearing**: Check browser console for errors
- **AI Analysis Fails**: Verify API key and network connection
- **Slow Performance**: Clear browser cache and reload
- **Layout Issues**: Ensure modern browser version
- **Save Problems**: Check LocalStorage availability

### Debug Mode
Enable debug mode in console:
```javascript
window.debugMode = true
```
This shows court boundary markers and detailed logs.

## Contributing Guidelines
1. **Simplicity First**: Keep changes minimal and focused
2. **Test Thoroughly**: Use test.html and debug.html
3. **Document Changes**: Update CLAUDE.md for major updates
4. **Preserve Compatibility**: Don't break existing saved plans
5. **Follow Patterns**: Match existing code style

## Support & Resources
- **Documentation**: This CLAUDE.md file
- **Test Files**: test.html for basic testing
- **Debug Interface**: debug.html for troubleshooting
- **Console Logs**: Extensive logging for debugging

## License & Credits
- **Framework**: Built with vanilla JavaScript
- **AI Model**: Google Gemini API
- **Hosting**: Netlify serverless platform
- **Icons**: CSS-based equipment representations

---

*Always ensure that elements generated by the AI Suggested Layout feature are positioned accurately within the White Court on user's screen*
- always use context7 for refering to latest documentation with third party libraries or packages