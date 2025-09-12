# PE Activity Consultant

A web application for planning and analyzing Physical Education activities with AI assistance.

## Features

- **Custom Activity Spaces**: Create layouts with user-defined dimensions for any activity space
- **Interactive Elements**: Add and position equipment (cones, balls, nets, etc.) and participants
- **AI Analysis**: Get intelligent feedback on activity layouts using Google Gemini API
- **Visual Annotations**: Add notes and movement paths to layouts
- **Multi-Phase Planning**: Plan warmup, main activity, and cool-down phases

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

## Recent Updates
- Converted from sport-specific layouts to fully customizable dimensions
- Fixed element visibility and positioning issues
- Improved responsive design with proper aspect ratios
- Added secure serverless API integration
