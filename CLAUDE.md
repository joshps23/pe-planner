Standard Workflow
1. First think through the problem, read the codebase for relevant files, and write a plan to todo.md.
2. The plan should have a list of todo items that you can check off as you complete them
3. Before you begin working, check in with me and I will verify the plan.
4. Then, begin working on the todo items, marking them as complete as you go.
5. Please every step of the way just give me a high level explanation of what changes you made
6. Make every task and code change you do as simple as possible. We want to avoid making any massive or complex changes. Every change should impact as little code as possible. Everything is about simplicity.
7. Finally, add a review section to the todo.md file with a summary of the changes you made and any other relevant information.


# PE Activity Consultant

A web application for planning and analyzing Physical Education activities with AI assistance.

## Features

- **Custom Activity Spaces**: Create layouts with user-defined dimensions for any activity space
- **Interactive Elements**: Add and position equipment (cones, balls, nets, etc.) and participants
- **AI Analysis**: Get intelligent feedback on activity layouts using Google Gemini API
- **Multiple Layout Suggestions**: AI provides 3 layout variations (Beginner-Friendly, Skill-Focused, High-Engagement)
- **Activity Details Display**: Instructions, rules, and teaching points shown below court after applying layouts
- **Visual Annotations**: Add notes and movement paths to layouts
- **Multi-Phase Planning**: Plan warmup, main activity, and cool-down phases
- **Analysis Persistence**: View last AI analysis without re-running

## Development

### Local Development
Run the development server with Netlify Functions:
```bash
netlify dev
```

### API Configuration
The app uses Netlify Functions for secure API integration with Google Gemini API. No client-side API key configuration needed.

### Project Structure
- `badminton-planner.html` - Main application interface
- `js/main.js` - Core application logic and UI interactions
- `js/api.js` - AI analysis and layout capture functionality
- `js/ui.js` - UI helper functions and modal management
- `css/styles.css` - Application styles
- `netlify/functions/` - Serverless functions for API integration

### Testing
- `test.html` - Basic element addition testing
- `debug.html` - Function debugging interface

## Recent Updates (2025-09-12)

### Latest Session Fixes (Evening)
- **Background Functions**: Extended timeout from 30 seconds to 15 minutes for AI analysis
- **Rules Display Fix**: Fixed ID conflict that prevented activity rules from showing
- **Coordinate System**: Fixed elements rendering outside court boundaries in AI suggestions
- **Larger Players**: Increased player size from 60px to 80px for better visibility
- **Save/Load Enhancement**: Added court dimensions to saved plans
- **Backward Compatibility**: Fixed loading of old saved plans with larger player sizes

### Major Enhancements
- **Multiple Layout Suggestions**: AI now generates 3 different layout variations with complete activity details
- **Activity Details Display**: Instructions, rules, and teaching points display below court after applying layouts
- **Analysis Persistence**: Added "View Last Analysis" button to retrieve previous AI suggestions
- **Improved Layout Accuracy**: Fixed coordinate system to ensure elements stay within court boundaries
- **Extended Timeout**: Netlify Functions now run as background functions (15-minute timeout)

### Bug Fixes
- **Rules Display**: Fixed duplicate ID conflict between input field and display element
- **Element Positioning**: Fixed AI-generated layouts rendering outside court boundaries
- **Saved Plan Loading**: Added boundary validation for backward compatibility with larger players
- **Coordinate Mapping**: Unified coordinate system between elements and annotations
- Fixed element addition issue caused by CSS inheritance (`.playing-area > *` selector)
- Fixed attacker/defender image loading (corrected CSS path references)
- Removed circular backgrounds from player images for cleaner UI
- Fixed cone shadow positioning to stay within element bounds

### Technical Improvements
- **ES Module Functions**: Converted analyzeLayout to modern ES module format (.mjs)
- **Player Size Scaling**: Updated all size-dependent calculations for 80px players
- **Safety Margins**: Proportionally scaled margins and boundaries for larger elements
- **Layout Previews**: Updated suggestion modal previews to match actual element sizes
- Added layout validation function to auto-correct invalid coordinates
- Strengthened AI prompt constraints (20-80% coordinate range)
- Implemented safe default positions for newly added elements
- Added comprehensive boundary validation for loaded plans
