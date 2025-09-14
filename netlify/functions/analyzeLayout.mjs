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

  let modelToUse = null; // Track which model was actually used

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

    // List of valid models in order of preference
    const validModels = [
      'gemini-2.5-flash',    // Latest flash model (if available)
      'gemini-2.0-flash',    // Stable flash model
      'gemini-1.5-flash',    // Older stable flash
      'gemini-1.5-pro'       // Most capable stable model
    ];

    // Use configured model or fall back to default
    let requestedModel = process.env.GEMINI_MODEL || 'gemini-1.5-pro';
    let geminiModel = requestedModel;

    // Validate model name
    if (!validModels.includes(requestedModel)) {
      console.warn(`Requested model '${requestedModel}' not in valid list. Falling back to gemini-1.5-pro`);
      geminiModel = 'gemini-1.5-pro';
    }

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

    // SIMPLIFIED COORDINATE SYSTEM - Always use 0-100% for the white court area
    // This avoids confusion between container percentages and court percentages

    // STRICT FORMAT PROMPT WITH SIMPLIFIED COORDINATES
    let prompt = `PE ACTIVITY ANALYSIS REQUEST

LESSON DETAILS:
${activityInfo}${lessonObjective ? `Lesson Objective: ${lessonObjective}\n` : ''}${skillsFocus ? `Skills Focus: ${skillsFocus}\n` : ''}${rules ? `Rules: ${rules}\n` : ''}
Equipment Count: ${equipmentCount.cones} cones, ${equipmentCount.balls} balls, ${equipmentCount.attackers} attackers, ${equipmentCount.defenders} defenders

IMPORTANT: Your analysis and layout suggestions MUST be directly related to the lesson objective above.
- If the objective is about "dribbling with hands", suggest basketball/handball drills
- If the objective is about "passing", suggest passing drills
- If the objective is about "shooting", suggest shooting drills
- DO NOT mention unrelated sports or skills

COORDINATE SYSTEM:
- The playing area (white court) uses a 0-100% coordinate system
- 0% is the left/top edge of the playing area
- 100% is the right/bottom edge of the playing area
- 50% is the center of the playing area
- IMPORTANT: Positions are CENTER-BASED (the percentage represents where the CENTER of the element will be)
- ALL positions must be between 5% and 95% to ensure elements stay fully within bounds
- Safe zones: Left zone (10-30%), Center zone (40-60%), Right zone (70-90%)

CRITICAL FORMAT RULES:
1. Use ONLY the exact format shown between ===SUGGESTIONS=== and ===END===
2. Do NOT create your own JSON structure
3. You MUST provide EXACTLY 3 different layout variations in the layouts array
4. teachingPoints must be a STRING, not an array
5. Each layout must have a unique name and different element positions

CRITICAL POSITIONING RULES:
- Use xPercent and yPercent values between 25 and 70 ONLY (to keep elements and their full size within white court)
- This ensures elements are fully visible within the playing area accounting for their size
- Center of court is at (50, 50)
- Safe corners are at (30,30), (70,30), (30,70), (70,70)
- For station layouts: Left station (x: 30-40%), Center station (x: 45-55%), Right station (x: 60-70%)
- IMPORTANT: Never use Y values below 25 or above 70 to ensure elements don't extend outside white court
- Remember that players are 80px tall and cones are 30px, so positions near edges need extra margin
- Maximum Y for any element should be 70% to prevent overflow

Based on the lesson objective "${lessonObjective || 'general PE activity'}", provide analysis and 3 DIFFERENT layout variations:

LAYOUT 1: "Beginner-Friendly" - Simple movements, clear zones, easier to understand
- If mentioning stations, create visible station zones with cones
- Example: For 3 stations, place cone pairs at x=25%, x=50%, x=75%

LAYOUT 2: "Skill-Focused" - Emphasizes technique development and skill practice
- Create distinct practice areas that match the instructions
- If describing "Station 1: dribble around cone", place that cone at a specific station position

LAYOUT 3: "High-Engagement" - Maximum participation, dynamic movement, competitive elements
- Set up clear game boundaries and player positions
- Ensure layout visually supports the competitive format described

IMPORTANT INSTRUCTION REQUIREMENTS:
1. Your element positions MUST match your instructions. If you mention "3 stations", create 3 distinct zones with cones marking each station.
2. Instructions MUST specify what EACH player type does:
   - If layout has attackers: Specify their exact role (e.g., "Attackers: Dribble through cones using crossover technique")
   - If layout has defenders: Specify their exact role (e.g., "Defenders: Shadow attackers without contact, attempt steal on whistle")
   - If layout has both: Explain interaction (e.g., "Attackers try to dribble past defenders to opposite cone")
3. Never leave any player role undefined - every player on the court needs clear instructions

Return response in EXACTLY this format:
===SUGGESTIONS===
Write one sentence improvement suggestion specifically related to the lesson objective
===LAYOUT_OPTIONS===
{"layouts":[{"name":"Beginner-Friendly Zone Practice","description":"Simple setup with clear zones for beginners","instructions":"Attackers: Station 1 - dribble around cone and back, Station 2 - weave through cones, Station 3 - pass to defender and receive back. Defenders: Act as passive defenders at each station, provide light pressure without stealing","rules":"Complete each station before moving to next, 30 seconds per station","teachingPoints":"Focus on ball control and spatial awareness for attackers, proper defensive stance for defenders","elements":[{"type":"cone","position":{"xPercent":25,"yPercent":30}},{"type":"cone","position":{"xPercent":25,"yPercent":65}},{"type":"cone","position":{"xPercent":50,"yPercent":30}},{"type":"cone","position":{"xPercent":50,"yPercent":65}},{"type":"cone","position":{"xPercent":75,"yPercent":30}},{"type":"cone","position":{"xPercent":75,"yPercent":65}},{"type":"attacker","position":{"xPercent":25,"yPercent":50}},{"type":"attacker","position":{"xPercent":50,"yPercent":50}},{"type":"attacker","position":{"xPercent":75,"yPercent":50}},{"type":"defender","position":{"xPercent":50,"yPercent":70}},{"type":"ball","position":{"xPercent":25,"yPercent":50}}]},{"name":"Skill Development Stations","description":"Progressive skill stations with increasing difficulty","instructions":"Attackers: Station 1 - crossover dribble around cone, Station 2 - behind-the-back dribble around cone, Station 3 - speed dribble through gate. Defenders: Rotate between stations providing progressive pressure - light at Station 1, moderate at Station 2, active defense at Station 3","rules":"30 seconds per station, switch roles after each round","teachingPoints":"Attackers focus on ball control under pressure, defenders work on footwork and positioning","elements":[{"type":"cone","position":{"xPercent":25,"yPercent":30}},{"type":"cone","position":{"xPercent":25,"yPercent":65}},{"type":"cone","position":{"xPercent":50,"yPercent":30}},{"type":"cone","position":{"xPercent":50,"yPercent":65}},{"type":"cone","position":{"xPercent":75,"yPercent":30}},{"type":"cone","position":{"xPercent":75,"yPercent":65}},{"type":"attacker","position":{"xPercent":25,"yPercent":50}},{"type":"attacker","position":{"xPercent":50,"yPercent":50}},{"type":"attacker","position":{"xPercent":75,"yPercent":50}},{"type":"defender","position":{"xPercent":50,"yPercent":30}},{"type":"ball","position":{"xPercent":25,"yPercent":50}}]},{"name":"Dynamic Competition Game","description":"Fast-paced 3v1 keep-away drill","instructions":"Attackers maintain possession while defender tries to intercept","rules":"5 passes = 1 point, defender switches after interception","teachingPoints":"Quick decision making and communication","elements":[{"type":"cone","position":{"xPercent":30,"yPercent":30}},{"type":"cone","position":{"xPercent":70,"yPercent":30}},{"type":"cone","position":{"xPercent":30,"yPercent":65}},{"type":"cone","position":{"xPercent":70,"yPercent":65}},{"type":"attacker","position":{"xPercent":30,"yPercent":35}},{"type":"attacker","position":{"xPercent":70,"yPercent":35}},{"type":"attacker","position":{"xPercent":50,"yPercent":60}},{"type":"defender","position":{"xPercent":50,"yPercent":45}},{"type":"ball","position":{"xPercent":30,"yPercent":35}}]}]}
===END===

IMPORTANT: You MUST provide exactly 3 layouts. Each layout must:
1. Have different element positions (don't just copy the same positions)
2. Match its theme (Beginner/Skill/Engagement)
3. Keep ALL elements within 25-70% range for both X and Y coordinates
4. Include ALL ${equipmentCount.cones} cones, ${equipmentCount.attackers} attackers, ${equipmentCount.defenders} defenders, ${equipmentCount.balls} balls`;

    // Function to make API call with timeout
    async function callGeminiAPI(model, promptText) {
      const controller = new AbortController();
      // Set timeout to 25 seconds to avoid Netlify dev's 30-second limit
      const timeoutId = setTimeout(() => {
        console.error(`API call timeout after 25 seconds for model: ${model}`);
        controller.abort();
      }, 25000); // 25 second timeout for API call

      console.log(`Starting API call to Gemini with model: ${model} at ${new Date().toISOString()}`);

      const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiApiKey}`;
      console.log(`Calling API URL: ${apiUrl.replace(geminiApiKey, 'REDACTED')}`);

      try {
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          signal: controller.signal,
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: promptText
              }]
            }],
            generationConfig: {
              temperature: 0.2,  // Low but allowing some creativity
              topK: 5,           // Minimal variety for better suggestions
              topP: 0.7,         // Focused but not too restrictive
              maxOutputTokens: 25000,  // Reduced for faster responses in dev environment
              candidateCount: 1
            }
          })
        });

        // Clear timeout if request succeeds
        clearTimeout(timeoutId);
        console.log(`API response received at ${new Date().toISOString()} - Status: ${response.status}`);
        return response;
      } catch (error) {
        clearTimeout(timeoutId);
        throw error;
      }
    }

    // Try API call with fallback to different models
    let response = null;
    modelToUse = geminiModel;
    const modelFallbackChain = [geminiModel];

    // Add fallback models if the requested model fails
    // Prioritize gemini-1.5-pro as fallback since it's more reliable
    if (geminiModel === 'gemini-2.5-flash') {
      modelFallbackChain.push('gemini-1.5-pro', 'gemini-2.0-flash', 'gemini-1.5-flash');
    } else if (geminiModel === 'gemini-2.0-flash') {
      modelFallbackChain.push('gemini-1.5-pro', 'gemini-1.5-flash');
    } else if (geminiModel === 'gemini-1.5-flash') {
      modelFallbackChain.push('gemini-1.5-pro');
    }

    console.log(`Model fallback chain: ${modelFallbackChain.join(' -> ')}`);
    let lastError = null;

    for (let i = 0; i < modelFallbackChain.length; i++) {
      const model = modelFallbackChain[i];
      const isLastModel = i === modelFallbackChain.length - 1;

      try {
        console.log(`[${i + 1}/${modelFallbackChain.length}] Attempting API call with model: ${model}`);
        response = await callGeminiAPI(model, prompt);
        modelToUse = model;

        // If we got a successful response, break out of the loop
        if (response && response.ok) {
          console.log(`✅ Successfully used model: ${model}`);
          break;
        } else if (response) {
          console.warn(`❌ Model ${model} returned status ${response.status}, trying next model...`);
          lastError = new Error(`HTTP ${response.status}: ${response.statusText}`);
          response = null; // Clear response for next attempt
        }
      } catch (error) {
        console.error(`❌ Failed to call API with model ${model}: ${error.message}`);
        lastError = error;
        response = null; // Clear response for next attempt

        // If it's a timeout, log it clearly and try fallback
        if (error.name === 'AbortError') {
          console.log(`⏱️ Model ${model} timed out after 25 seconds`);
          if (!isLastModel) {
            console.log(`🔄 Trying fallback model: ${modelFallbackChain[i + 1]}...`);
          }
        }

        if (isLastModel) {
          // This was the last model in the chain, throw the stored error
          console.error(`❌ All models in the fallback chain failed`);
          throw lastError || error;
        }
        // Otherwise, continue to next model
      }
    }

    if (!response || !response.ok) {
      let errorMessage = 'Failed to get response from any model';

      if (response) {
        errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      }

      // Handle 504 Gateway Timeout specifically
      if (response && response.status === 504) {
        errorMessage = `Request timed out (504). The ${modelToUse} model took too long to respond. Try again or use a different model.`;
      } else if (response) {
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
            
            // Validate and fix coordinates for all layouts (using simplified 0-100% system)
            if (layoutJson && layoutJson.layouts) {
              layoutJson.layouts.forEach(layout => {
                // Ensure elements array exists
                if (!layout.elements || !Array.isArray(layout.elements)) {
                  console.warn('Layout missing elements array, adding default elements');
                  // Add default elements based on equipment count
                  layout.elements = [];

                  // Add cones at corners (using safe 30-70% coordinates)
                  if (equipmentCount.cones >= 4) {
                    layout.elements.push(
                      {"type":"cone","position":{"xPercent":30,"yPercent":30}},
                      {"type":"cone","position":{"xPercent":70,"yPercent":30}},
                      {"type":"cone","position":{"xPercent":30,"yPercent":70}},
                      {"type":"cone","position":{"xPercent":70,"yPercent":70}}
                    );
                  }

                  // Add attackers
                  for (let i = 0; i < equipmentCount.attackers; i++) {
                    const positions = [
                      {"xPercent":30,"yPercent":30},
                      {"xPercent":70,"yPercent":30},
                      {"xPercent":50,"yPercent":70}
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
                      // Ensure coordinates are within safe bounds (5-95% for center-based positioning)
                      const originalX = element.position.xPercent;
                      const originalY = element.position.yPercent;

                      element.position.xPercent = Math.max(25, Math.min(70, element.position.xPercent || 50));
                      element.position.yPercent = Math.max(25, Math.min(70, element.position.yPercent || 50));

                      if (originalX !== element.position.xPercent || originalY !== element.position.yPercent) {
                        console.log(`Adjusted coordinates for ${element.type}: (${originalX}, ${originalY}) -> (${element.position.xPercent}, ${element.position.yPercent})`);
                      }
                    }
                  });
                }
                if (layout.annotations) {
                  layout.annotations.forEach(annotation => {
                    if (annotation.position) {
                      annotation.position.xPercent = Math.max(25, Math.min(70, annotation.position.xPercent || 50));
                      annotation.position.yPercent = Math.max(25, Math.min(70, annotation.position.yPercent || 50));
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
      
      // Add info about which model was used if fallback occurred
      const response_data = { suggestions, layoutJson };
      if (modelToUse !== geminiModel) {
        response_data.modelUsed = modelToUse;
        response_data.modelFallback = true;
        console.log(`🔄 Fallback occurred: Originally requested ${geminiModel}, but successfully used ${modelToUse}`);
      }

      return new Response(JSON.stringify(response_data), {
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
    console.error('Model attempted:', modelToUse || process.env.GEMINI_MODEL || 'gemini-1.5-pro');
    
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
      model: modelToUse || process.env.GEMINI_MODEL || 'gemini-1.5-pro',
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