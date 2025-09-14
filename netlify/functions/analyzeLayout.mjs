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
    const { layoutData, courtBoundaries } = JSON.parse(event.body);

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
    let lessonObjective = '';
    let skillsFocus = '';
    let rules = '';
    let equipmentCount = { cones: 0, balls: 0, attackers: 0, defenders: 0 };

    for (const line of lines) {
      if (line.includes('Activity Name:')) {
        activityInfo += line + '\n';
      }
      if (line.includes('Lesson Objective:')) {
        lessonObjective = line.replace('- Lesson Objective:', '').trim();
      }
      if (line.includes('Skills Focus:')) {
        skillsFocus = line.replace('- Skills Focus:', '').trim();
      }
      if (line.includes('Rules & Instructions:')) {
        rules = line.replace('- Rules & Instructions:', '').trim();
      }
      if (line.includes('Playing area:')) {
        activityInfo += line + '\n';
      }
      if (line.includes('CONE')) equipmentCount.cones++;
      if (line.includes('BALL')) equipmentCount.balls++;
      if (line.includes('ATTACKER')) equipmentCount.attackers++;
      if (line.includes('DEFENDER')) equipmentCount.defenders++;
    }

    // Log extracted details for debugging
    console.log('Activity details extracted:', {
      lessonObjective,
      skillsFocus,
      rules,
      activityInfo: activityInfo.trim()
    });

    // Use dynamic boundaries if provided, otherwise use defaults
    const boundaries = courtBoundaries || {
      topLeftX: 20,
      topLeftY: 20,
      bottomRightX: 80,
      bottomRightY: 80
    };

    const centerX = Math.round((boundaries.topLeftX + boundaries.bottomRightX) / 2);
    const centerY = Math.round((boundaries.topLeftY + boundaries.bottomRightY) / 2);

    // STRICT FORMAT PROMPT WITH CLEAR BOUNDARIES
    let prompt = `PE ACTIVITY ANALYSIS REQUEST

LESSON DETAILS:
${activityInfo}${lessonObjective ? `Lesson Objective: ${lessonObjective}\n` : ''}${skillsFocus ? `Skills Focus: ${skillsFocus}\n` : ''}${rules ? `Rules: ${rules}\n` : ''}
Equipment Count: ${equipmentCount.cones} cones, ${equipmentCount.balls} balls, ${equipmentCount.attackers} attackers, ${equipmentCount.defenders} defenders

IMPORTANT: Your analysis and layout suggestions MUST be directly related to the lesson objective above.
- If the objective is about "dribbling with hands", suggest basketball/handball drills
- If the objective is about "passing", suggest passing drills
- If the objective is about "shooting", suggest shooting drills
- DO NOT mention unrelated sports or skills

COURT BOUNDARIES:
- The WHITE COURT area spans from coordinates (${boundaries.topLeftX}%, ${boundaries.topLeftY}%) to (${boundaries.bottomRightX}%, ${boundaries.bottomRightY}%)
- Top-left corner of white court: xPercent=${boundaries.topLeftX}, yPercent=${boundaries.topLeftY}
- Bottom-right corner of white court: xPercent=${boundaries.bottomRightX}, yPercent=${boundaries.bottomRightY}
- Center of white court: xPercent=${centerX}, yPercent=${centerY}
- Anything outside ${boundaries.topLeftX}-${boundaries.bottomRightX}% (X) and ${boundaries.topLeftY}-${boundaries.bottomRightY}% (Y) range is in the GREEN BORDER (forbidden area)

CRITICAL FORMAT RULES:
1. Use ONLY the exact format shown between ===SUGGESTIONS=== and ===END===
2. Do NOT create your own JSON structure
3. Do NOT use "layoutOptions", "suggestions" as array, or any other format
4. teachingPoints must be a STRING, not an array

CRITICAL POSITIONING RULES:
- ALL elements MUST be within ${boundaries.topLeftX}-${boundaries.bottomRightX}% (X) and ${boundaries.topLeftY}-${boundaries.bottomRightY}% (Y) range to stay inside the white court area
- The white court has a green border - elements must NOT be placed in the green border area
- Use xPercent values between ${boundaries.topLeftX} and ${boundaries.bottomRightX} ONLY
- Use yPercent values between ${boundaries.topLeftY} and ${boundaries.bottomRightY} ONLY
- Any values outside these ranges will place elements in the green border (FORBIDDEN)

Based on the lesson objective "${lessonObjective || 'general PE activity'}", provide analysis and layout suggestions that directly support this objective.

Return response in EXACTLY this format:
===SUGGESTIONS===
Write one sentence improvement suggestion specifically related to the lesson objective
===LAYOUT_OPTIONS===
{"layouts":[{"name":"Activity Name","description":"Brief description","instructions":"How to play instructions","rules":"List game rules here","teachingPoints":"Key teaching points as a single string","elements":[{"type":"cone","position":{"xPercent":${boundaries.topLeftX + 10},"yPercent":${boundaries.topLeftY + 10}}},{"type":"cone","position":{"xPercent":${boundaries.bottomRightX - 10},"yPercent":${boundaries.topLeftY + 10}}},{"type":"cone","position":{"xPercent":${boundaries.topLeftX + 10},"yPercent":${boundaries.bottomRightY - 10}}},{"type":"cone","position":{"xPercent":${boundaries.bottomRightX - 10},"yPercent":${boundaries.bottomRightY - 10}}},{"type":"attacker","position":{"xPercent":${boundaries.topLeftX + 20},"yPercent":${boundaries.topLeftY + 20}}},{"type":"attacker","position":{"xPercent":${boundaries.bottomRightX - 20},"yPercent":${boundaries.topLeftY + 20}}},{"type":"attacker","position":{"xPercent":${centerX},"yPercent":${boundaries.bottomRightY - 20}}},{"type":"defender","position":{"xPercent":${centerX},"yPercent":${centerY}}},{"type":"ball","position":{"xPercent":${centerX},"yPercent":${centerY - 5}}}]}]}
===END===

IMPORTANT: Keep ALL elements within ${boundaries.topLeftX}-${boundaries.bottomRightX}% (X) and ${boundaries.topLeftY}-${boundaries.bottomRightY}% (Y) range. Include ALL ${equipmentCount.cones} cones, ${equipmentCount.attackers} attackers, ${equipmentCount.defenders} defenders, ${equipmentCount.balls} balls.`;

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
          maxOutputTokens: 30000,  // High limit required for Gemini 2.5 Flash to avoid abortion
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
            // If suggestions is accidentally an array in string form, extract the first item
            if (suggestions.startsWith('[') && suggestions.endsWith(']')) {
              try {
                const suggestionsArray = JSON.parse(suggestions);
                suggestions = Array.isArray(suggestionsArray) ? suggestionsArray[0] : suggestions;
              } catch (e) {
                // Keep as is if not valid JSON
              }
            }
          }

          if (layoutsMatch) {
            let layoutsStr = layoutsMatch[1].trim();
            // Handle markdown code blocks that some models add
            layoutsStr = layoutsStr.replace(/^```json\s*/i, '').replace(/```\s*$/, '');
            layoutsStr = layoutsStr.replace(/```\s*$/, '');

            // Try to parse the JSON
            layoutJson = JSON.parse(layoutsStr);

            // Handle various alternative formats the AI might return
            if (!layoutJson.layouts) {
              // Handle layoutOptions structure
              if (layoutJson.layoutOptions && layoutJson.layoutOptions.layouts) {
                console.log('Converting layoutOptions format to expected format');
                layoutJson = { layouts: layoutJson.layoutOptions.layouts };
              }
              // Handle direct array of layouts
              else if (Array.isArray(layoutJson)) {
                console.log('Converting array format to expected format');
                layoutJson = { layouts: layoutJson };
              }
              // Handle single layout object
              else if (layoutJson.name && layoutJson.elements) {
                console.log('Converting single layout to array format');
                layoutJson = { layouts: [layoutJson] };
              }
            }

            // Ensure teachingPoints is a string, not an array
            if (layoutJson && layoutJson.layouts) {
              layoutJson.layouts.forEach(layout => {
                if (Array.isArray(layout.teachingPoints)) {
                  layout.teachingPoints = layout.teachingPoints.join(' ');
                }
                if (Array.isArray(layout.rules)) {
                  layout.rules = layout.rules.join(' ');
                }
              });
            }
            
            // Validate and fix coordinates for all layouts
            if (layoutJson && layoutJson.layouts) {
              layoutJson.layouts.forEach(layout => {
                // Ensure elements array exists
                if (!layout.elements || !Array.isArray(layout.elements)) {
                  console.warn('Layout missing elements array, adding default elements');
                  // Add default elements based on equipment count
                  layout.elements = [];

                  // Add cones at corners (within dynamic boundaries)
                  if (equipmentCount.cones >= 4) {
                    layout.elements.push(
                      {"type":"cone","position":{"xPercent":boundaries.topLeftX + 10,"yPercent":boundaries.topLeftY + 10}},
                      {"type":"cone","position":{"xPercent":boundaries.bottomRightX - 10,"yPercent":boundaries.topLeftY + 10}},
                      {"type":"cone","position":{"xPercent":boundaries.topLeftX + 10,"yPercent":boundaries.bottomRightY - 10}},
                      {"type":"cone","position":{"xPercent":boundaries.bottomRightX - 10,"yPercent":boundaries.bottomRightY - 10}}
                    );
                  }

                  // Add attackers
                  for (let i = 0; i < equipmentCount.attackers; i++) {
                    const positions = [
                      {"xPercent":boundaries.topLeftX + 20,"yPercent":boundaries.topLeftY + 20},
                      {"xPercent":boundaries.bottomRightX - 20,"yPercent":boundaries.topLeftY + 20},
                      {"xPercent":centerX,"yPercent":boundaries.bottomRightY - 20}
                    ];
                    if (positions[i]) {
                      layout.elements.push({"type":"attacker","position":positions[i]});
                    }
                  }

                  // Add defenders
                  for (let i = 0; i < equipmentCount.defenders; i++) {
                    layout.elements.push({"type":"defender","position":{"xPercent":centerX,"yPercent":centerY}});
                  }

                  // Add ball
                  if (equipmentCount.balls > 0) {
                    layout.elements.push({"type":"ball","position":{"xPercent":centerX,"yPercent":centerY - 5}});
                  }
                }

                if (layout.elements) {
                  layout.elements.forEach(element => {
                    if (element.position) {
                      // Ensure coordinates are within the dynamic boundaries to stay in white court area
                      const originalX = element.position.xPercent;
                      const originalY = element.position.yPercent;

                      element.position.xPercent = Math.max(boundaries.topLeftX, Math.min(boundaries.bottomRightX, element.position.xPercent || centerX));
                      element.position.yPercent = Math.max(boundaries.topLeftY, Math.min(boundaries.bottomRightY, element.position.yPercent || centerY));

                      if (originalX !== element.position.xPercent || originalY !== element.position.yPercent) {
                        console.log(`Adjusted coordinates for ${element.type}: (${originalX}, ${originalY}) -> (${element.position.xPercent}, ${element.position.yPercent})`);
                      }
                    }
                  });
                }
                if (layout.annotations) {
                  layout.annotations.forEach(annotation => {
                    if (annotation.position) {
                      annotation.position.xPercent = Math.max(boundaries.topLeftX, Math.min(boundaries.bottomRightX, annotation.position.xPercent || centerX));
                      annotation.position.yPercent = Math.max(boundaries.topLeftY, Math.min(boundaries.bottomRightY, annotation.position.yPercent || centerY));
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