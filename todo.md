# PE Activity Consultant - Development Todo List

## Session: 2025-09-16 - Cross-Platform Coordinate Mapping Fix

### ✅ Completed Tasks

#### Fixed Mobile-Desktop Coordinate Mapping Issue
- **Problem**: Elements positioned incorrectly when plans saved on desktop were loaded on mobile (and vice versa)
- **Root Cause**: Positions were saved as pixel values that didn't scale to different screen sizes
- **Solution**: Implemented percentage-based coordinate system
- **Implementation**:
  1. **Updated savePlan() function** (js/main.js:543-604):
     - Now converts pixel positions to percentages before saving
     - Stores both percentage and pixel values for backward compatibility
     - Uses CoordinateSystem.pixelPositionToPercent() for conversion

  2. **Updated loadPlan() function** (js/main.js:667-820):
     - Detects if saved plan uses new percentage format or old pixel format
     - For new format: Converts percentages to pixels based on current court size
     - For old format: Estimates original court dimensions and converts to percentages
     - Handles both items and annotations

  3. **Backward Compatibility**:
     - Automatically detects old pixel-based saves
     - Converts old format to percentages on load
     - Adjusts for mobile vs desktop original save context
     - Maintains compatibility with all existing saved plans

- **Technical Details**:
  - Desktop court max-width: 900px
  - Mobile court: variable width based on viewport
  - Percentages stored as 0-100 values relative to court dimensions
  - Element center positions calculated for accurate placement

## Session: 2025-09-16 - Gamification Enhancement for Fun Activities

### ✅ Completed Tasks

#### 1. Enhanced AI Prompts with Gamification Framework
- **Problem**: AI suggestions were too technical and lacked fun, engaging elements
- **Solution**: Complete overhaul of AI prompts to emphasize game-like activities
- **Implementation**:
  - Added comprehensive gamification requirements section
  - Included scoring systems, power-ups, and achievements
  - Added themed narratives (escape the lava, treasure hunt, zombie tag)
  - Emphasized competition elements and celebration moments
- **File Modified**: `netlify/functions/analyzeLayout.mjs`

#### 2. Transformed Layout Names to Be Game-Themed
- **Changes**:
  - "Constraint-Based Discovery" → "Ultimate Challenge Arena"
  - "Game-Based Learning" → "Battle Royale Showdown"
  - "Adaptive Challenge" → "Adventure Quest Champions"
- **Impact**: Layout names now immediately convey excitement and fun

#### 3. Redesigned CRAFT Framework for Gaming
- **Original**: Academic focus on pedagogy principles
- **New**: Game-based learning with fun elements:
  - Constraints → Power-up zones, danger zones, time bombs
  - Representative → Video game scenarios, sports star challenges
  - Adaptation → Bronze/Silver/Gold tiers, unlock abilities
  - Variability → Style points, trick shots, signature moves
  - Task → Tutorial/Story/Challenge/Boss Battle modes

#### 4. Added Skill-Level Game Modes
- **Beginner**: "Rookie League" with extra lives and guaranteed success
- **Intermediate**: "Champion Challenge" with quests and achievements
- **Advanced**: "Legendary Mode" with boss battles and elite skills
- **Mixed**: "Multiverse Mode" with adaptive challenges for all

#### 5. Implemented Exciting Game Instructions
- **Before**: "Practice dribbling through cones"
- **After**: "Navigate the LASER MAZE without triggering alarms!"
- **Elements Added**:
  - Clear scoring systems (10 pts per gate, 50 pt combos)
  - Special abilities (FREEZE, SHIELD, TURBO powers)
  - Victory conditions and celebration moments
  - Team battles and elimination rounds

#### 6. Added Activity Theme Options
- **Themes Available**:
  - Superhero Training
  - Space Mission
  - Pirate Adventure
  - Ninja Academy
  - Zombie Survival
  - Video Game IRL
  - Olympics Training
  - Fantasy Quest

### 📊 Impact Summary
- Activities now include clear game mechanics (points, lives, levels)
- Instructions use exciting, energetic language
- Every activity has win conditions and celebrations
- Students have agency through choices and power-ups
- Emphasis shifted from "exercise" to "epic adventure"

## Session: 2025-09-15 - UI/UX Improvements & Domain Migration

### ✅ Completed Tasks

#### 1. Added Accessible Floating Analyze Button
- **Problem**: "Analyze Layout" button was buried at the bottom of sidebar, requiring scrolling
- **Solution**: Created floating action button (FAB) positioned at bottom-right of court
- **Implementation**:
  - Added FAB HTML structure to court container
  - Styled with purple gradient matching theme
  - Desktop-only visibility (mobile has existing FAB)
  - Added keyboard shortcut: Ctrl+Shift+A (Cmd+Shift+A on Mac)
  - Pulsing animation when court has elements but no analysis done
  - Updates state when elements are added/removed
- **Files Modified**:
  - `index.html`: Added FAB button structure
  - `css/styles.css`: Added FAB styling and animations
  - `js/main.js`: Added keyboard shortcut handler and state management
  - `js/api.js`: Added analysis state tracking

#### 2. Fixed Cone Visual Background Issue
- **Problem**: Cones had white rectangular background making them look unpolished
- **Solution**: Made cone background transparent
- **Changes**:
  - Set `background: transparent` on `.cone` class
  - Removed `box-shadow` from main element
  - Moved shadow to cone base for realistic effect
- **File Modified**: `css/styles.css`

#### 3. Moved App to Root Domain
- **Problem**: App was at /badminton-planner.html instead of root
- **Solution**: Renamed main file to index.html
- **Implementation**:
  - Removed old redirect index.html
  - Renamed badminton-planner.html to index.html
  - Updated server.js reference
  - Created _redirects file for Netlify (301 redirect from old URL)
  - Created backup as badminton-planner-backup.html
- **Files Modified**:
  - Renamed main HTML file
  - `server.js`: Updated to serve index.html
  - `_redirects`: Created for URL redirect
- **Result**: App now accessible at https://pe-planner.netlify.app/

#### 4. Added School Logo as Favicon
- **Implementation**:
  - Copied school logo from iCloud to project as favicon.png
  - Added favicon link in index.html head section
- **Files Modified**:
  - `index.html`: Added favicon reference
  - `favicon.png`: New file added

#### 5. Fixed Coordinate System Issues
- **Problem**: Elements appeared in wrong positions when applying AI layouts
- **Solutions**:
  - Ensured court has white background and custom-space class
  - Added position:relative to court, position:absolute to elements
  - Added debug logging for coordinate conversions
  - Check for padding that might affect positioning
- **Files Modified**: `js/main.js`

### 📚 Documentation Updates
- Updated CLAUDE.md with:
  - New file structure (index.html, mobile.js, coordinates.js, etc.)
  - Recent updates section for 2025-09-15
  - All recent enhancements and fixes
- Updated todo.md with completed tasks from this session

## Session: 2025-09-14 - CRAFT Framework & Mobile Optimization

### ✅ Completed Tasks

#### 1. Implemented CRAFT Framework for Non-Linear Pedagogy
- Integrated Constraints, Representative, Adaptation, Functional variability, Task simplification principles
- AI now generates activities following CRAFT methodology
- Added structured instructions with clear constraints and variations

#### 2. Complete Mobile UI/UX Overhaul
- Created mobile.js for mobile-specific functionality
- Added hamburger menu for navigation
- Implemented bottom navigation bar
- Added floating action button (FAB) for quick actions
- Responsive design adjustments for all screen sizes

#### 3. Preview Modal Redesign
- Changed from side-by-side to vertical layout for better readability
- Increased font sizes and spacing
- Full-width text areas for instructions
- Better mobile responsiveness

#### 4. Added Differentiated Instruction Levels
- AI now provides skill-appropriate content:
  - Beginner-Friendly
  - Skill-Focused
  - High-Engagement
- Instructions adapt based on selected skill level

#### 5. Overlap Prevention
- AI layouts now prevent defenders and attackers from overlapping
- Implemented collision detection in analyzeLayout.mjs
- Automatic position adjustment when overlaps detected

## Previous Sessions

### Session: 2025-09-13 - Preview Feature Implementation

#### Part 4: Implemented Activity Layout Preview Before Application
- Added new `layoutPreviewModal` with larger width (1200px)
- Created preview court that displays layouts without affecting main court
- Added side panel showing activity details
- Changed workflow: Select layout → Preview → Apply if desired
- Elements are non-draggable in preview (read-only view)

#### Part 5: Fixed Staggered Animation Y-Axis Misalignment
- Problem: Elements with same Y coordinates appeared at different heights
- Root cause: Court dimensions changing between staggered animations
- Solution: Capture dimensions once and use for all elements
- Result: Perfect horizontal alignment maintained

### Session: 2025-09-12 - Major Release

#### Multiple Layout Generation
- AI now generates 3 different layout variations
- Each with unique approach (Beginner/Skill/Engagement)
- Full activity details displayed below court
- "View Last Analysis" functionality added
- Player icons increased to 80px for better visibility

## Pending Tasks 📋

### High Priority
- [ ] PDF Export functionality
- [ ] Template library for common activities
- [ ] Activity analytics and tracking

### Medium Priority
- [ ] Video integration for instructional content
- [ ] Collaboration features for sharing plans
- [ ] 3D court visualization option

### Low Priority
- [ ] Voice commands for element placement
- [ ] Native mobile applications
- [ ] Advanced animation effects

## Bug Tracking 🐛

### Currently No Known Bugs
All reported issues have been resolved.

## Notes 📝

### Important Reminders
- Always test mobile responsiveness after UI changes
- Maintain backward compatibility for saved plans
- Keep AI prompts under token limits
- Test with different screen sizes and browsers

### API Configuration
- Using Gemini 1.5 Pro as default model
- 25-second timeout for API calls
- Fallback chain: Primary → gemini-1.5-pro → gemini-2.0-flash → gemini-1.5-flash

### Deployment
- Hosted on Netlify
- Serverless functions for API calls
- Automatic deployment from GitHub main branch
- Environment variables set in Netlify dashboard

---

*Last Updated: 2025-09-16*
*Next Session: Test gamified activities with users and gather feedback*