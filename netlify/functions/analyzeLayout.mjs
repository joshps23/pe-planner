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
    // Use Gemini 1.5 Pro - powerful model with strong reasoning capabilities
    // Can be overridden with GEMINI_MODEL environment variable
    const geminiModel = process.env.GEMINI_MODEL || 'gemini-1.5-pro';
    
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

    // Extract key info from layout data to keep prompt short but informative
    const lines = layoutData.split('\n');
    let activityInfo = '';
    let equipmentCount = { cones: 0, balls: 0, attackers: 0, defenders: 0 };

    for (const line of lines) {
      if (line.includes('Activity Name:') || line.includes('Playing area:')) {
        activityInfo += line + '\n';
      }
      if (line.includes('CONE')) equipmentCount.cones++;
      if (line.includes('BALL')) equipmentCount.balls++;
      if (line.includes('ATTACKER')) equipmentCount.attackers++;
      if (line.includes('DEFENDER')) equipmentCount.defenders++;
    }

    // STRICT FORMAT PROMPT
    let prompt = `PE Layout: ${activityInfo}
Equipment: ${equipmentCount.cones} cones, ${equipmentCount.balls} balls, ${equipmentCount.attackers} attackers, ${equipmentCount.defenders} defenders

Return EXACTLY this format. DO NOT use layoutOptions or any other structure:
===SUGGESTIONS===
One sentence improvement suggestion here
===LAYOUT_OPTIONS===
{"layouts":[{"name":"Activity Name","description":"Brief description","instructions":"How to play","rules":"Game rules","teachingPoints":"Key teaching points","elements":[{"type":"cone","position":{"xPercent":25,"yPercent":25}},{"type":"cone","position":{"xPercent":75,"yPercent":25}},{"type":"cone","position":{"xPercent":25,"yPercent":75}},{"type":"cone","position":{"xPercent":75,"yPercent":75}},{"type":"attacker","position":{"xPercent":35,"yPercent":35}},{"type":"attacker","position":{"xPercent":65,"yPercent":35}},{"type":"attacker","position":{"xPercent":50,"yPercent":65}},{"type":"defender","position":{"xPercent":50,"yPercent":50}},{"type":"ball","position":{"xPercent":50,"yPercent":45}}]}]}
===END===

IMPORTANT: Keep ALL elements within 15-85% of court. Include positions for ALL ${equipmentCount.cones} cones, ${equipmentCount.attackers} attackers, ${equipmentCount.defenders} defenders, and ${equipmentCount.balls} balls.`;

    // Add timeout for the API request - use most of the 26s Netlify allows
    const controller = new AbortController();
    // Set timeout to 25 seconds (Netlify Pro allows 26s max for synchronous functions)
    const timeoutId = setTimeout(() => controller.abort(), 25000); // 25 second timeout for API call

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
          temperature: 0.2,  // Low but allowing some creativity
          topK: 5,           // Minimal variety for better suggestions
          topP: 0.7,         // Focused but not too restrictive
          maxOutputTokens: 4000,  // Reasonable limit for complete responses
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

    // Debug logging to understand response structure
    console.log('API Response received, checking structure...');

    // Check if the response was cut off due to token limit
    if (data.candidates && data.candidates[0] && data.candidates[0].finishReason === 'MAX_TOKENS') {
      console.error('Response hit MAX_TOKENS limit. Model could not complete the response.');
      throw new Error('Response was too long and got cut off. Please try with simpler input.');
    }

    if (data.candidates && data.candidates[0] && data.candidates[0].content &&
        data.candidates[0].content.parts && data.candidates[0].content.parts[0]) {
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

            // Handle alternative format where AI returns layoutOptions instead of layouts
            if (!layoutJson.layouts && layoutJson.layoutOptions && layoutJson.layoutOptions.layouts) {
              console.log('Converting layoutOptions format to expected format');
              layoutJson = { layouts: layoutJson.layoutOptions.layouts };
            }
            
            // Validate and fix coordinates for all layouts
            if (layoutJson && layoutJson.layouts) {
              layoutJson.layouts.forEach(layout => {
                // Ensure elements array exists
                if (!layout.elements || !Array.isArray(layout.elements)) {
                  console.warn('Layout missing elements array, adding default elements');
                  // Add default elements based on equipment count
                  layout.elements = [];

                  // Add cones at corners
                  if (equipmentCount.cones >= 4) {
                    layout.elements.push(
                      {"type":"cone","position":{"xPercent":25,"yPercent":25}},
                      {"type":"cone","position":{"xPercent":75,"yPercent":25}},
                      {"type":"cone","position":{"xPercent":25,"yPercent":75}},
                      {"type":"cone","position":{"xPercent":75,"yPercent":75}}
                    );
                  }

                  // Add attackers
                  for (let i = 0; i < equipmentCount.attackers; i++) {
                    const positions = [
                      {"xPercent":35,"yPercent":35},
                      {"xPercent":65,"yPercent":35},
                      {"xPercent":50,"yPercent":65}
                    ];
                    if (positions[i]) {
                      layout.elements.push({"type":"attacker","position":positions[i]});
                    }
                  }

                  // Add defenders
                  for (let i = 0; i < equipmentCount.defenders; i++) {
                    layout.elements.push({"type":"defender","position":{"xPercent":50,"yPercent":50}});
                  }

                  // Add ball
                  if (equipmentCount.balls > 0) {
                    layout.elements.push({"type":"ball","position":{"xPercent":50,"yPercent":45}});
                  }
                }

                if (layout.elements) {
                  layout.elements.forEach(element => {
                    if (element.position) {
                      // Ensure coordinates are within 15-85% range for safety margin
                      const originalX = element.position.xPercent;
                      const originalY = element.position.yPercent;

                      element.position.xPercent = Math.max(15, Math.min(85, element.position.xPercent || 50));
                      element.position.yPercent = Math.max(15, Math.min(85, element.position.yPercent || 50));

                      if (originalX !== element.position.xPercent || originalY !== element.position.yPercent) {
                        console.log(`Adjusted coordinates for ${element.type}: (${originalX}, ${originalY}) -> (${element.position.xPercent}, ${element.position.yPercent})`);
                      }
                    }
                  });
                }
                if (layout.annotations) {
                  layout.annotations.forEach(annotation => {
                    if (annotation.position) {
                      annotation.position.xPercent = Math.max(15, Math.min(85, annotation.position.xPercent || 50));
                      annotation.position.yPercent = Math.max(15, Math.min(85, annotation.position.yPercent || 50));
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
      console.error('Unexpected API response structure:', JSON.stringify(data, null, 2));
      throw new Error('Unexpected response format from AI. The API response structure may have changed.');
    }
    
  } catch (error) {
    console.error('Error calling Gemini API:', error);
    console.error('Model used:', process.env.GEMINI_MODEL || 'gemini-1.5-flash');
    
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
      errorMessage += `Model error: ${error.message}. Try setting GEMINI_MODEL environment variable to 'gemini-1.5-flash', 'gemini-1.5-pro', or 'gemini-2.0-flash'.`;
      statusCode = 400;
    } else {
      errorMessage += `Error: ${error.message}`;
    }
    
    return new Response(JSON.stringify({ 
      error: errorMessage,
      model: process.env.GEMINI_MODEL || 'gemini-1.5-pro',
      suggestion: statusCode === 504 ? 'Try using gemini-1.5-flash or gemini-1.5-pro model instead' : undefined
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