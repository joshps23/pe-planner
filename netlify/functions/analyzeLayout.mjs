export default async (request, context) => {
  const event = {
    httpMethod: request.method,
    body: await request.text(),
    headers: Object.fromEntries(request.headers)
  };

  if (event.httpMethod !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Content-Type': 'application/json'
      }
    });
  }

  if (event.httpMethod === 'OPTIONS') {
    return new Response('', {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      }
    });
  }

  try {
    const { layoutData } = JSON.parse(event.body);
    
    if (!layoutData) {
      return new Response(JSON.stringify({ error: 'Layout data is required' }), {
        status: 400,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Content-Type': 'application/json'
        }
      });
    }

    const geminiApiKey = process.env.GOOGLE_GEMINI_API_KEY
    // Use fastest model to ensure response within timeout
    // Even with Pro tier, complex prompts can timeout
    const geminiModel = process.env.GEMINI_MODEL || 'gemini-1.5-flash'; // Fastest model for reliability
    
    if (!geminiApiKey) {
      return new Response(JSON.stringify({ error: 'API key not configured' }), {
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Content-Type': 'application/json'
        }
      });
    }
    
    console.log(`Using Gemini model: ${geminiModel}`);

    let prompt = `You are an expert Physical Education teacher with experience across multiple sports and activities. Please analyze this lesson layout and provide constructive feedback and suggestions.

IMPORTANT COURT BOUNDARY INFORMATION:
- The court is a rectangular playing area visible on screen
- Court boundaries: x coordinates from 0 (left edge) to 100 (right edge), y coordinates from 0 (top edge) to 100 (bottom edge)
- ALL elements MUST be placed within these boundaries using percentage coordinates
- To ensure elements remain visible within the court, use coordinates between 20% and 80% only
- Elements placed outside 20-80% range will appear outside the court boundaries

The layout data below uses percentage coordinates where (0,0) is top-left corner and (100,100) is bottom-right corner of the court.

${layoutData}

Based on the activity details, court/field layout, and current phase, please provide:
1. Assessment of the current setup (strengths and potential issues) - describe positioning and distances in METERS
2. How well the layout supports the stated activity objectives and rules
3. Specific suggestions to improve the activity effectiveness with real-world measurements
4. Safety considerations and risk management with appropriate spacing distances in METERS  
5. Alternative variations or progressions for this activity
6. Tips for student engagement and maximizing learning outcomes

Focus on practical, real-world measurements and distances that a PE teacher can implement, not screen coordinates.`;

    // Add specific guidance based on activity details
    if (layoutData.includes('Activity Name:') || layoutData.includes('Rules & Instructions:')) {
      prompt += `\n\nPay special attention to how the setup supports the specific activity rules and objectives described. Consider whether the equipment placement, student positioning, and space usage optimize the learning experience for the stated goals. If no specific sport is mentioned, analyze the layout based on the equipment and activity description provided.`;
    } else {
      prompt += `\n\nSince no specific activity details are provided, analyze the setup based on the visible equipment and student positioning. Make suggestions that would work for the types of activities that could be conducted with the current equipment layout.`;
    }
    
    prompt += `\n\nKeep your response practical, actionable, and suitable for a PE teacher. Focus on pedagogy, safety, and student engagement. Adapt your advice to the specific sport/activity indicated by the equipment and activity description.

RESPONSE FORMAT - OPTIMIZED FOR SPEED:
Provide a concise analysis and ONE improved layout:

===SUGGESTIONS===
[Brief but helpful analysis - 3-4 key points maximum]

===LAYOUT_OPTIONS===
{
  "layouts": [
    {
      "name": "Optimized Layout",
      "description": "Improved setup based on your activity",
      "instructions": "How to run this activity (2-3 sentences)",
      "rules": "2-3 clear rules",
      "teachingPoints": "2-3 key coaching points",
      "elements": [
        {
          "type": "cone|ball|hoop|net|racket|shuttle|marker|bench|attacker|defender|floorball-stick|frisbee",
          "position": {
            "xPercent": 50,
            "yPercent": 50
          }
        }
      ],
      "annotations": [
        {
          "text": "Key point",
          "position": {
            "xPercent": 50,
            "yPercent": 20
          }
        }
      ]
    }
  ]
}
===END===

Keep response CONCISE. Generate ONE high-quality layout that best improves the current setup.

CRITICAL COORDINATE REQUIREMENTS:
- The court is a rectangular area with coordinates from (0,0) at top-left to (100,100) at bottom-right
- xPercent and yPercent represent percentage positions within the court boundaries
- xPercent: 0 = left edge of court, 100 = right edge of court
- yPercent: 0 = top edge of court, 100 = bottom edge of court
- IMPORTANT: Elements MUST be placed INSIDE the court area between 20-80% to ensure visibility
- STRICT positioning rules for ALL elements:
  - Minimum: xPercent = 20, yPercent = 20 (safety margin from edges)
  - Maximum: xPercent = 80, yPercent = 80 (safety margin from edges)
  - Center of court: xPercent = 50, yPercent = 50
- NEVER place elements outside the 20-80 range or they will appear outside the court
- Examples of VALID coordinates: 25, 35, 45, 50, 55, 65, 75
- Examples of INVALID coordinates: 0, 5, 10, 15, 85, 90, 95, 100, -10, 105

POSITIONING EXAMPLES FOR REFERENCE:
- Center court element: xPercent: 50, yPercent: 50
- Left side element: xPercent: 30, yPercent: 50  
- Right side element: xPercent: 70, yPercent: 50
- Front center: xPercent: 50, yPercent: 30
- Back center: xPercent: 50, yPercent: 70
- Safe corner positioning: xPercent: 25, yPercent: 25 (front-left)

Make realistic improvements based on the activity type and objectives for each variation.`;

    // Add timeout for the API request - keep it shorter for reliability
    const controller = new AbortController();
    // Set timeout to 20 seconds to ensure completion even with network delays
    const timeoutId = setTimeout(() => controller.abort(), 20000); // 20 second timeout for API call

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${geminiApiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }],
        generationConfig: {
          temperature: 0.5,  // Lower for faster, more focused responses
          topK: 20,          // Reduced for speed while maintaining quality
          topP: 0.85,        // More focused generation
          maxOutputTokens: 2048,  // Enough for one complete layout with details
          candidateCount: 1
        }
      })
    });

    // Clear timeout if request succeeds
    clearTimeout(timeoutId);

    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      
      // Handle 504 Gateway Timeout specifically
      if (response.status === 504) {
        errorMessage = `Request timed out (504). The ${geminiModel} model took too long to respond. Try again or use a different model.`;
      } else {
        try {
          const errorData = await response.json();
          errorMessage = errorData.error?.message || errorMessage;
        } catch {
          // If we can't parse the error response, use the default message
        }
      }
      
      throw new Error(errorMessage);
    }

    const data = await response.json();
    
    if (data.candidates && data.candidates[0] && data.candidates[0].content) {
      const fullResponse = data.candidates[0].content.parts[0].text;
      
      // Parse the response to extract suggestions and JSON
      let suggestions = fullResponse;
      let layoutJson = null;
      
      if (fullResponse.includes('===SUGGESTIONS===') && fullResponse.includes('===LAYOUT_OPTIONS===')) {
        try {
          const suggestionsMatch = fullResponse.match(/===SUGGESTIONS===\s*([\s\S]*?)===LAYOUT_OPTIONS===/);
          const layoutsMatch = fullResponse.match(/===LAYOUT_OPTIONS===\s*([\s\S]*?)===END===/);
          
          if (suggestionsMatch) {
            suggestions = suggestionsMatch[1].trim();
          }
          
          if (layoutsMatch) {
            let layoutsStr = layoutsMatch[1].trim();
            // Handle markdown code blocks that some models add
            layoutsStr = layoutsStr.replace(/^```json\s*/i, '').replace(/```\s*$/, '');
            layoutJson = JSON.parse(layoutsStr);
            
            // Validate and fix coordinates for all layouts
            if (layoutJson && layoutJson.layouts) {
              layoutJson.layouts.forEach(layout => {
                if (layout.elements) {
                  layout.elements.forEach(element => {
                    if (element.position) {
                      // Ensure coordinates are within 20-80% range
                      const originalX = element.position.xPercent;
                      const originalY = element.position.yPercent;
                      
                      element.position.xPercent = Math.max(20, Math.min(80, element.position.xPercent || 50));
                      element.position.yPercent = Math.max(20, Math.min(80, element.position.yPercent || 50));
                      
                      if (originalX !== element.position.xPercent || originalY !== element.position.yPercent) {
                        console.log(`Adjusted coordinates for ${element.type}: (${originalX}, ${originalY}) -> (${element.position.xPercent}, ${element.position.yPercent})`);
                      }
                    }
                  });
                }
                if (layout.annotations) {
                  layout.annotations.forEach(annotation => {
                    if (annotation.position) {
                      annotation.position.xPercent = Math.max(20, Math.min(80, annotation.position.xPercent || 50));
                      annotation.position.yPercent = Math.max(20, Math.min(80, annotation.position.yPercent || 50));
                    }
                  });
                }
              });
            }
          }
        } catch (parseError) {
          console.log('Error parsing structured response:', parseError);
          // If parsing fails, just use the full response as suggestions
        }
      }
      
      return new Response(JSON.stringify({ suggestions, layoutJson }), {
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Content-Type': 'application/json'
        }
      });
    } else {
      throw new Error('No suggestions received from AI');
    }
    
  } catch (error) {
    console.error('Error calling Gemini API:', error);
    console.error('Model used:', process.env.GEMINI_MODEL || 'gemini-2.5-flash');
    
    let errorMessage = 'Failed to analyze layout. ';
    let statusCode = 500;
    
    if (error.name === 'AbortError') {
      errorMessage += 'Request timed out. The AI service is taking too long to respond. Please try again.';
      statusCode = 504;
    } else if (error.message.includes('504')) {
      errorMessage = error.message; // Use our custom 504 message
      statusCode = 504;
    } else if (error.message.includes('API_KEY_INVALID')) {
      errorMessage += 'Please check your API key.';
      statusCode = 401;
    } else if (error.message.includes('quota')) {
      errorMessage += 'API quota exceeded. Please try again later.';
      statusCode = 429;
    } else if (error.message.includes('blocked')) {
      errorMessage += 'Content was blocked by safety filters.';
      statusCode = 400;
    } else if (error.message.includes('model')) {
      errorMessage += `Model error: ${error.message}. Try setting GEMINI_MODEL environment variable to 'gemini-1.5-pro' or 'gemini-2.0-flash'.`;
      statusCode = 400;
    } else {
      errorMessage += `Error: ${error.message}`;
    }
    
    return new Response(JSON.stringify({ 
      error: errorMessage,
      model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
      suggestion: statusCode === 504 ? 'Try using gemini-2.0-flash or gemini-1.5-pro model instead' : undefined
    }), {
      status: statusCode,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Content-Type': 'application/json'
      }
    });
  }
};

export const config = {
  type: "experimental-background",
};