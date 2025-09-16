# PE Activity Consultant - Development Todo List

## Session: 2025-09-17 - UI Fixes & Security Audit

### ✅ Completed Tasks

#### Fixed Header Title Centering
- **Problem**: Title "PE Activity Consultant" was shifted left due to auth container
- **Solution**:
  - Modified `.header-top` to use `justify-content: center`
  - Made auth container absolutely positioned to not affect flow
  - Added `flex: 1` and `text-align: center` to title container
- **Files Modified**:
  - `css/styles.css`: Updated header layout CSS

#### Security Audit for API Keys
- **Performed full codebase scan for exposed credentials**
- **Findings**:
  - Google Gemini API key in `.env` (properly gitignored)
  - Supabase anon key in multiple files (OK - designed to be public)
  - Supabase URL exposed (OK - public information)
- **Recommendations**:
  - Regenerate Google Gemini API key as precaution
  - Keep `.env` in gitignore
  - Continue using Netlify Functions to hide API keys from frontend

#### OAuth Display Name Issue
- **Identified**: Google OAuth shows Supabase URL instead of app name
- **Solutions Provided**:
  - Option 1: Configure custom domain in Supabase (requires Pro plan)
  - Option 2: Set up custom Google OAuth credentials (free)
  - Option 3: Continue with current setup for development

## Session: 2025-09-17 - Google OAuth & Cloud Storage Integration

### ✅ Completed Tasks

#### Google OAuth and Supabase Integration
- **Feature**: User authentication with Google OAuth and cloud storage for lesson plans
- **Implementation**:
  - Created auth.js module for Google OAuth using Supabase
  - Created database.js module for cloud CRUD operations
  - Added authentication UI components to index.html (sign-in button, user dropdown)
  - Added authentication styles to styles.css
  - Updated main.js to integrate cloud storage with existing save/load functions
  - Modified savePlan() to save to cloud when signed in
  - Modified loadPlan() to load from cloud when signed in
  - Modified deletePlan() to delete from cloud when signed in
  - Added async updatePlanSelect() to load plans from cloud/local
  - Added initAuth() call on DOMContentLoaded
- **Key Features**:
  - Automatic migration of local plans to cloud on first login
  - Dual storage strategy (localStorage when logged out, cloud when logged in)
  - Seamless fallback to localStorage when offline
  - Row Level Security (RLS) for user data protection
  - User email and name display in header when logged in
- **Files Modified**:
  - `js/auth.js`: NEW - Complete authentication module
  - `js/database.js`: NEW - Database operations module
  - `index.html`: Added Supabase script and auth UI
  - `css/styles.css`: Added auth-related styles
  - `js/main.js`: Updated save/load/delete functions for cloud integration

#### Fixed Authentication Button Issues
- **Problem**: Sign-in button was not visible and not clickable
- **Root Causes**:
  - Duplicate const declarations between api.js and auth.js preventing auth.js from loading
  - Header ::before pseudo-element blocking clicks with overlay
  - Missing pointer-events and z-index properties
- **Solutions**:
  - Removed duplicate SUPABASE_URL and SUPABASE_ANON_KEY declarations from auth.js
  - Added `pointer-events: none` to header::before overlay
  - Added `z-index: 10` to auth-container
  - Added proper error handling and debugging logs
  - Created fallback functions for debugging
- **Files Modified**:
  - `js/auth.js`: Removed duplicate const declarations, added error handling
  - `css/styles.css`: Fixed pointer-events and z-index issues
  - `index.html`: Added debug fallback scripts

## Session: 2025-09-17 - Observer Player Type & Mobile Context Menu

### ✅ Completed Tasks

#### Added Observer Player Type
- **Feature**: Third player type (Observer) with green icon
- **Implementation**:
  - Added observer.png as the third player icon (green)
  - Updated HTML with Observer button in controls
  - Added CSS styles for observer elements (main, alternative, and preview)
  - Modified main.js to handle observer type with green color (#10b981)
  - Updated api.js to capture observers in layout analysis
  - Enhanced Supabase Edge Function to count and handle observers
- **Use Cases**: Observers can serve as referees, judges, scorekeepers, or rotation players
- **Files Modified**:
  - `index.html`: Added Observer button
  - `css/styles.css`: Added observer styles
  - `js/main.js`: Updated addStudent function
  - `js/api.js`: Modified layout capture for observers
  - `supabase/functions/analyze-layout/index-standalone.ts`: Added observer handling

#### Right-Click Role Change Feature
- **Feature**: Players can change roles via right-click context menu
- **Implementation**:
  - Added "Change Role" section to context menu (appears only for players)
  - Created changePlayerRole function that preserves player names
  - Current role is hidden from options to avoid redundancy
  - Name label colors update automatically (red/blue/green)
- **Files Modified**:
  - `index.html`: Added role change options to context menu
  - `js/main.js`: Added changePlayerRole function and menu logic

#### Long-Press Context Menu for Mobile
- **Feature**: Mobile users can long-press (500ms) players to show context menu
- **Implementation**:
  - Added touch event handlers for long-press detection
  - 10px movement threshold prevents accidental triggers
  - Haptic feedback on supported devices
  - Mobile-optimized menu with 44px minimum touch targets
  - Backdrop overlay for easier dismissal
  - No conflicts with drag-and-drop functionality
- **Desktop Compatibility**: Right-click functionality remains unchanged
- **Files Modified**:
  - `js/main.js`: Added long-press handlers and touch support
  - `css/styles.css`: Added mobile-specific context menu styles
  - `index.html`: Added backdrop element for mobile

#### Ball Type Change Feature
- **Feature**: Users can change ball types via context menu (Generic, Basketball, Soccer)
- **Implementation**:
  - Added context menu section for ball type options
  - Created changeBallType function similar to changePlayerRole
  - Ball types displayed as emojis for better recognition:
    - Generic Ball: Yellow CSS-styled ball
    - Basketball: 🏀 emoji
    - Soccer Ball: ⚽ emoji
  - Current ball type hidden from menu options
  - Works with both desktop right-click and mobile long-press
- **Visual Design**: Emojis render natively at 25px size for clear visibility
- **Files Modified**:
  - `index.html`: Added ball type options to context menu
  - `js/main.js`: Added changeBallType function and detection logic
  - `css/styles.css`: Added basketball and soccer ball styles using emoji

## Session: 2025-09-16 - Supabase Edge Functions Integration & AI Improvements

### ✅ Completed Tasks

#### Fixed AI Response Format Compatibility
- **Problem**: TypeError when using Supabase - `suggestions.replace is not a function`
- **Solution**: Updated api.js to handle different response formats from Netlify vs Supabase
- **Changes**: Normalized response handling to work with both endpoints seamlessly

#### Improved AI Prompt for Better Game Instructions
- **Problem 1**: AI was using percentages (e.g., "Zone 1 is 25%-40%") instead of physical landmarks
- **Solution**: Added explicit rules to reference cones physically (e.g., "area between the red and blue cones")
- **Problem 2**: AI described cone zones but didn't include cones in the layout
- **Solution**: Made it MANDATORY to include all equipment in elements array
- **Added validation**: Auto-adds missing cones if AI fails to include them

#### Upgraded AI Model Configuration
- **Changed model**: From `gemini-1.5-flash` to `gemini-2.5-pro` for better quality
- **Increased tokens**: From 10,000 to 30,000 for more comprehensive responses
- **Result**: Higher quality, more detailed activity suggestions

#### Successfully Integrated Supabase Edge Functions
- **Problem**: Netlify Functions timing out (504 Gateway Timeout) due to 26-second limit
- **Root Cause**: Large prompt with 4.7KB example JSON taking too long to process
- **Solution**: Migrated to Supabase Edge Functions with 60-second timeout

#### Implementation Details
1. **Infrastructure Setup**:
   - Installed Supabase CLI via Homebrew
   - Initialized Supabase in project (`supabase init`)
   - Created `analyze-layout` Edge Function

2. **Edge Function Development**:
   - Ported `analyzeLayout.mjs` to TypeScript/Deno
   - Removed large example JSON from prompt (saved ~4.7KB)
   - Switched to `gemini-1.5-flash` model for faster responses
   - Set 55-second timeout (leaving 5-second buffer)
   - Reduced maxOutputTokens from 25000 to 10000

3. **Frontend Integration**:
   - Updated `js/api.js` with toggle between Netlify/Supabase
   - Added Supabase credentials (URL and anon key)
   - Set `window.USE_SUPABASE = true` to enable

4. **Files Created/Modified**:
   - Created: `supabase/functions/analyze-layout/index.ts`
   - Created: `supabase/functions/analyze-layout/index-standalone.ts` (for easy deployment)
   - Created: `supabase/functions/_shared/cors.ts`
   - Modified: `js/api.js` (added Supabase endpoint support)
   - Modified: `.env` (added Supabase credentials)

5. **Deployment Status**:
   - Edge Function ready for deployment
   - User needs to deploy via Supabase dashboard
   - Environment variable `GOOGLE_GEMINI_API_KEY` needs to be set

### 📋 Deployment Instructions for User
1. Go to Supabase dashboard
2. Create new Edge Function called `analyze-layout`
3. Copy contents from `index-standalone.ts`
4. Add environment variable: `GOOGLE_GEMINI_API_KEY`
5. Deploy the function

### 🎯 Results
- **60-second timeout** vs 26-second Netlify limit
- **Faster processing** with optimized prompt
- **Better reliability** for complex layouts
- **Seamless switching** between Netlify and Supabase

## Session: 2025-09-16 - AI Layout Variation Fix & Power-up Improvements

### ✅ Completed Tasks

#### Fixed Duplicate Layout Coordinates in AI Prompt
- **Problem**: All three AI-generated layout variations were returning identical element positions
- **Root Cause**: The example JSON in the prompt showed all three layouts with the exact same coordinates
- **Solution**: Updated the example to show three distinctly different layout patterns
- **Implementation**:
  - **Layout 1 (Ultimate Challenge Arena)**: Wide spread formation with corner cones and center elements
  - **Layout 2 (Battle Royale Showdown)**: Compact central box formation with side zones
  - **Layout 3 (Adventure Quest Champions)**: Progressive linear arrangement for level-based gameplay
- **File Modified**: `netlify/functions/analyzeLayout.mjs` (lines 234)
- **Result**: AI now generates unique positioning strategies for each layout variation

#### Improved Power-up System to be Skill-Based and Realistic
- **Problem**: Power-ups were unrealistic (e.g., "run faster") or unrelated to lesson objectives (e.g., "do jumping jacks")
- **Solution**: Redesigned power-ups to be earned through lesson-specific skills
- **Changes**:
  - Removed magical abilities like "speed boost" and "teleport"
  - Added skill-based activations tied to lesson objectives
  - Power-ups now require demonstrating proper technique
- **New Power-up Examples**:
  - DOUBLE POINTS: Execute skill with proper technique (bounce pass, behind-back dribble)
  - SAFETY ZONE: Complete 5 consecutive passes = 10-second safe zone from tagging
  - FREEZE DEFENDERS: Complete challenge move = defenders count to 3 before moving
  - SKILL CHAIN BONUS: Link 3 different skills = triple points on next score
- **File Modified**: `netlify/functions/analyzeLayout.mjs` (lines 163-172)
- **Result**: Power-ups now reinforce lesson skills rather than arbitrary exercises

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

*Last Updated: 2025-09-17*
*Next Session: Continue enhancing mobile experience and test with users*