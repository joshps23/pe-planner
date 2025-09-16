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
        'Content-Type': 'application/json; charset=utf-8'
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

  // Sanitize function to remove problematic Unicode characters
  function sanitizeString(str) {
    if (!str) return '';
    // Remove control characters and fix Unicode issues
    return str
      .replace(/[\u0000-\u0008\u000B-\u000C\u000E-\u001F\u007F-\u009F]/g, '') // Control characters
      .replace(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])/g, '') // Orphaned high surrogates
      .replace(/(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g, '') // Orphaned low surrogates
      .replace(/[\uFFFE\uFFFF]/g, '') // Invalid characters
      .normalize('NFC'); // Normalize Unicode
  }

  let modelToUse = null; // Track which model was actually used

  try {
    const requestBody = JSON.parse(event.body);
    const { layoutData: rawLayoutData } = requestBody;

    if (!rawLayoutData) {
      return new Response(JSON.stringify({ error: 'Layout data is required' }), {
        status: 400,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Content-Type': 'application/json; charset=utf-8'
        }
      });
    }

    // Sanitize the layout data
    const layoutData = sanitizeString(rawLayoutData);

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
          'Content-Type': 'application/json; charset=utf-8'
        }
      });
    }
    
    console.log(`Using Gemini model: ${geminiModel}`);

    // Extract key info from layout data to keep prompt short but informative
    const lines = layoutData.split('\n');
    let activityInfo = '';
    let lessonObjective = '';
    let skillsFocus = '';
    let studentSkillLevel = 'intermediate';
    let rules = '';
    let equipmentCount = { cones: 0, balls: 0, attackers: 0, defenders: 0 };

    for (const line of lines) {
      if (line.includes('Activity Name:')) {
        activityInfo += line + '\n';
      }
      if (line.includes('Lesson Objective:')) {
        lessonObjective = sanitizeString(line.replace('- Lesson Objective:', '').trim());
      }
      if (line.includes('Skills Focus:')) {
        skillsFocus = sanitizeString(line.replace('- Skills Focus:', '').trim());
      }
      if (line.includes('Student Skill Level:')) {
        studentSkillLevel = sanitizeString(line.replace('- Student Skill Level:', '').trim());
      }
      if (line.includes('Rules & Instructions:')) {
        rules = sanitizeString(line.replace('- Rules & Instructions:', '').trim());
      }
      if (line.includes('Playing area:')) {
        activityInfo += line + '\n';
      }
      if (line.includes('CONE')) equipmentCount.cones++;
      if (line.includes('BALL')) equipmentCount.balls++;
      if (line.includes('ATTACKER')) equipmentCount.attackers++;
      if (line.includes('DEFENDER')) equipmentCount.defenders++;
    }

    activityInfo = sanitizeString(activityInfo);

    // Log extracted details for debugging
    console.log('Activity details extracted:', {
      lessonObjective,
      skillsFocus,
      studentSkillLevel,
      rules,
      activityInfo: activityInfo.trim()
    });

    // Generate full layout description for analysis
    const layoutDescription = `${activityInfo}${lessonObjective ? `Lesson Objective: ${lessonObjective}\n` : ''}${skillsFocus ? `Skills Focus: ${skillsFocus}\n` : ''}Student Skill Level: ${studentSkillLevel}\n${rules ? `Rules: ${rules}\n` : ''}
Equipment Count: ${equipmentCount.cones} cones, ${equipmentCount.balls} balls, ${equipmentCount.attackers} attackers, ${equipmentCount.defenders} defenders

Full Layout Data:
${layoutData}`;

    // CLEANED PROMPT WITHOUT EMOJIS
    let prompt = `PE ACTIVITY ANALYSIS - CREATE FUN GAMES!

LESSON: ${lessonObjective || 'general PE'} | Skill Level: ${studentSkillLevel}
Equipment: ${equipmentCount.cones} cones, ${equipmentCount.balls} balls, ${equipmentCount.attackers} attackers, ${equipmentCount.defenders} defenders

TASK: Review the layout, then suggest 3 EXCITING GAME variations.

MAKE IT FUN - Include:
- Points/scoring (10pts per goal, bonuses, combos)
- Power-ups (FREEZE, SHIELD, TURBO abilities)
- Game themes (Lava maze, Treasure hunt, Battle arena)
- Win conditions (Last team standing, Most points, Beat the boss)
- Celebrations (Victory zone, Team chants)

COORDINATE SYSTEM:
- The playing area (white court) uses a 0-100% coordinate system
- 0% is the left/top edge of the playing area
- 100% is the right/bottom edge of the playing area
- 50% is the center of the playing area
- IMPORTANT: Positions are CENTER-BASED (the percentage represents where the CENTER of the element will be)
- ALL positions must be between 5% and 95% to ensure elements stay fully within bounds
- Safe zones: Left zone (10-30%), Center zone (40-60%), Right zone (70-90%)

CRITICAL FORMAT RULES:
1. Use ONLY the exact format shown between the markers
2. Provide a detailed review FIRST, then suggestions, then layout options
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

CRITICAL NO-OVERLAP RULES:
- NEVER place two elements at the exact same coordinates
- Minimum spacing between ANY two elements should be at least 5% in either X or Y direction
- Attackers and defenders MUST be at different positions - NO OVERLAPPING
- If you have multiple attackers, space them at least 10% apart
- If you have multiple defenders, space them at least 10% apart
- Attackers and defenders should be at least 15% apart to avoid overlap
- Balls should not overlap with players - place them nearby but offset by at least 5%
- Check every element position to ensure no two elements share the same (x,y) coordinates

REVIEW REQUIREMENTS:
Your review must analyze these specific aspects of the submitted layout:
1. **Alignment with Objectives**: How well does the current layout support the stated lesson objective and skills focus?
2. **Safety Assessment**: Are there any safety concerns with current positioning? Is there adequate spacing between participants?
3. **Engagement Level**: Will all students be actively engaged or are some standing idle?
4. **Skill Development**: Does the layout facilitate proper skill progression and practice?
5. **Space Utilization**: Is the court space being used effectively or are there underutilized areas?
6. **Equipment Usage**: Are the equipment pieces positioned optimally for the activity?
7. **Clear Instructions**: Based on the layout, will students understand what to do?
8. **Difficulty Appropriateness**: Is the layout suitable for the intended skill level?

Based on the lesson objective "${lessonObjective || 'general PE activity'}", provide a comprehensive review and 3 DIFFERENT layout variations:

STUDENT SKILL LEVEL: ${studentSkillLevel}

SKILL MODES:
${studentSkillLevel === 'beginner' ? 'EASY: Extra lives, bigger targets, guaranteed fun!' : studentSkillLevel === 'advanced' ? 'HARD: Boss battles, combos, sudden death rounds!' : 'MEDIUM: Quests, achievements, special abilities!'}

3 GAME LAYOUTS:
1. "Ultimate Arena" - Points, power zones, combos
2. "Battle Royale" - Lives, eliminations, last team standing
3. "Adventure Quest" - Levels, boss battles, treasures

MAKE INSTRUCTIONS EXCITING:
- Not "practice dribbling" -> "Navigate the LASER MAZE!"
- Attackers = TREASURE HUNTERS, Defenders = GUARDIANS
- Cones = Lava/Power zones, Balls = Golden treasures
- Include: Points, lives, special moves, victory celebrations

Return EXACTLY this format:
===REVIEW===
Brief review: Strengths, Fun Factor (1-10), how to make it MORE game-like
===SUGGESTIONS===
2-3 ways to add fun (points, power-ups, themes)
===LAYOUT_OPTIONS===
{"layouts":[{"name":"Ultimate Challenge Arena","description":"Epic point-scoring adventure with power zones and special abilities!","instructions":"GAME MODE for ${studentSkillLevel}: Welcome to the Ultimate Challenge Arena! Attackers are TREASURE HUNTERS collecting points by dribbling through cone gates (10 pts each). Defenders are GUARDIANS protecting the treasure zones. POWER-UP ZONE: Center court gives 2X points for 5 seconds! COMBO BONUS: Pass through 3 gates in 10 seconds for MEGA POINTS (50 pts)!","rules":"GAME RULES: 3-minute rounds, team with most points wins! SPECIAL ABILITIES: Attackers can call FREEZE once per round (defenders stop for 3 seconds). Defenders can create a FORCE FIELD (link arms) once per round for 5 seconds. SUDDEN DEATH: Tie? Golden ball worth 100 points appears!","teachingPoints":"PRO TIPS: Use fake moves to earn style points! Team combos unlock bonus achievements! Speed bursts through gates = extra points! Victory dance in the end zone after scoring!","elements":[{"type":"cone","position":{"xPercent":25,"yPercent":30}},{"type":"cone","position":{"xPercent":25,"yPercent":65}},{"type":"cone","position":{"xPercent":50,"yPercent":30}},{"type":"cone","position":{"xPercent":50,"yPercent":65}},{"type":"cone","position":{"xPercent":70,"yPercent":30}},{"type":"cone","position":{"xPercent":70,"yPercent":65}},{"type":"attacker","position":{"xPercent":30,"yPercent":45}},{"type":"attacker","position":{"xPercent":60,"yPercent":50}},{"type":"defender","position":{"xPercent":45,"yPercent":60}},{"type":"ball","position":{"xPercent":30,"yPercent":40}}]},{"name":"Battle Royale Showdown","description":"Intense team battle with eliminations and epic comebacks!","instructions":"BATTLE MODE for ${studentSkillLevel}: RED TEAM vs BLUE TEAM in the ultimate showdown! Each player has 3 LIVES shown by cone tokens. GET TAGGED = LOSE A LIFE! Last team with players standing wins! REVIVAL CHALLENGE: Eliminated players can earn a life back by completing the sideline skill challenge in 30 seconds!","rules":"BATTLE RULES: NO CAMPING (must move every 5 seconds)! POWER MOVES: SHIELD = 5-second immunity (once per life), TURBO = super speed for 3 seconds (once per game). BOSS MODE: When down to 1 player, they become the BOSS with double speed! VICTORY CONDITION: Eliminate all opponents or have most lives when time expires!","teachingPoints":"CHAMPION STRATEGIES: Use teamwork for combo attacks! Save power moves for critical moments! Create distractions for surprise attacks! Celebrate every elimination with team chant!","elements":[{"type":"cone","position":{"xPercent":25,"yPercent":30}},{"type":"cone","position":{"xPercent":25,"yPercent":65}},{"type":"cone","position":{"xPercent":50,"yPercent":30}},{"type":"cone","position":{"xPercent":50,"yPercent":65}},{"type":"cone","position":{"xPercent":70,"yPercent":30}},{"type":"cone","position":{"xPercent":70,"yPercent":65}},{"type":"attacker","position":{"xPercent":25,"yPercent":45}},{"type":"attacker","position":{"xPercent":50,"yPercent":50}},{"type":"defender","position":{"xPercent":70,"yPercent":45}},{"type":"ball","position":{"xPercent":25,"yPercent":40}}]},{"name":"Adventure Quest Champions","description":"Level-based adventure with boss battles and treasure hunting!","instructions":"QUEST MODE for ${studentSkillLevel}: MISSION - Complete 3 LEVELS to become CHAMPIONS! LEVEL 1: Navigate the Lava Maze (cones = lava) without touching! LEVEL 2: Defeat the Guardian (defender) using skill moves! LEVEL 3: BOSS BATTLE - All attackers vs all defenders for the GOLDEN TREASURE (ball)! Each level completed = new special ability unlocked!","rules":"QUEST RULES: 2 minutes per level! SPECIAL ABILITIES: Level 1 unlock = DASH (burst of speed), Level 2 unlock = PHASE (dodge one tag), Level 3 = ULTIMATE (team super move)! BONUS CHALLENGES: Hidden treasures (cones) worth extra points! EPIC FINALE: Winners perform victory celebration for bonus XP!","teachingPoints":"HERO TRAINING: Master each level before advancing! Use abilities strategically! Work as a team in boss battles! Create your own victory dance! Encourage fallen teammates!","elements":[{"type":"cone","position":{"xPercent":30,"yPercent":30}},{"type":"cone","position":{"xPercent":65,"yPercent":30}},{"type":"cone","position":{"xPercent":30,"yPercent":65}},{"type":"cone","position":{"xPercent":65,"yPercent":65}},{"type":"attacker","position":{"xPercent":35,"yPercent":40}},{"type":"attacker","position":{"xPercent":60,"yPercent":40}},{"type":"defender","position":{"xPercent":47,"yPercent":55}},{"type":"ball","position":{"xPercent":35,"yPercent":35}}]}]}
===END===

THEMES: Superhero, Space, Pirates, Ninja, Zombies, Video Games

PROVIDE 3 layouts with:
- Different positions (25-70% range)
- ALL equipment (${equipmentCount.cones} cones, ${equipmentCount.attackers} attackers, ${equipmentCount.defenders} defenders, ${equipmentCount.balls} balls)
- Game mechanics (points, lives, powers)
- Fun language & celebrations
- Clear win conditions`;

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
            'Content-Type': 'application/json; charset=utf-8',
          },
          signal: controller.signal,
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: sanitizeString(promptText)
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
          console.log(`Successfully used model: ${model}`);
          break;
        } else if (response) {
          console.warn(`Model ${model} returned status ${response.status}, trying next model...`);
          lastError = new Error(`HTTP ${response.status}: ${response.statusText}`);
          response = null; // Clear response for next attempt
        }
      } catch (error) {
        console.error(`Failed to call API with model ${model}: ${error.message}`);
        lastError = error;
        response = null; // Clear response for next attempt

        // If it's a timeout, log it clearly and try fallback
        if (error.name === 'AbortError') {
          console.log(`Model ${model} timed out after 25 seconds`);
          if (!isLastModel) {
            console.log(`Trying fallback model: ${modelFallbackChain[i + 1]}...`);
          }
        }

        if (isLastModel) {
          // This was the last model in the chain, throw the stored error
          console.error(`All models in the fallback chain failed`);
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
      const fullResponse = sanitizeString(data.candidates[0].content.parts[0].text);
      
      // Parse the response to extract review, suggestions and JSON
      let review = '';
      let suggestions = fullResponse;
      let layoutJson = null;

      // Check for new format with review section
      if (fullResponse.includes('===REVIEW===')) {
        try {
          const reviewMatch = fullResponse.match(/===REVIEW===\s*([\s\S]*?)===SUGGESTIONS===/);
          if (reviewMatch) {
            review = sanitizeString(reviewMatch[1].trim());
          }
        } catch (e) {
          console.log('Could not extract review section:', e);
        }
      }

      if (fullResponse.includes('===SUGGESTIONS===') && fullResponse.includes('===LAYOUT_OPTIONS===')) {
        try {
          const suggestionsMatch = fullResponse.match(/===SUGGESTIONS===\s*([\s\S]*?)===LAYOUT_OPTIONS===/);
          const layoutsMatch = fullResponse.match(/===LAYOUT_OPTIONS===\s*([\s\S]*?)===END===/);

          if (suggestionsMatch) {
            suggestions = sanitizeString(suggestionsMatch[1].trim());
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
            let layoutsStr = sanitizeString(layoutsMatch[1].trim());
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
                // Sanitize all text fields in the layout
                layout.name = sanitizeString(layout.name || '');
                layout.description = sanitizeString(layout.description || '');
                layout.instructions = sanitizeString(layout.instructions || '');
                layout.rules = sanitizeString(layout.rules || '');
                layout.teachingPoints = sanitizeString(layout.teachingPoints || '');
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
                  // First pass: ensure coordinates are within bounds
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

                  // Second pass: detect and fix overlapping elements
                  const positions = new Map();
                  layout.elements.forEach((element, index) => {
                    if (element.position) {
                      const key = `${element.position.xPercent},${element.position.yPercent}`;

                      // Check if position is already taken
                      if (positions.has(key)) {
                        console.warn(`OVERLAP DETECTED: ${element.type} at position ${key} overlaps with ${positions.get(key)}`);

                        // Fix overlap by offsetting the element
                        let offsetX = 0;
                        let offsetY = 0;
                        let attempts = 0;
                        let newKey = key;

                        // Try different offsets until we find a free position
                        while (positions.has(newKey) && attempts < 10) {
                          attempts++;
                          // Offset based on element type for better positioning
                          if (element.type === 'defender') {
                            offsetY = attempts * 5; // Move defenders down
                          } else if (element.type === 'attacker') {
                            offsetX = attempts * 5; // Move attackers to the side
                          } else if (element.type === 'ball') {
                            offsetX = 5;
                            offsetY = -5; // Move balls slightly up and right
                          } else {
                            // For other elements, try diagonal offset
                            offsetX = attempts * 3;
                            offsetY = attempts * 3;
                          }

                          const newX = Math.max(25, Math.min(70, element.position.xPercent + offsetX));
                          const newY = Math.max(25, Math.min(70, element.position.yPercent + offsetY));
                          newKey = `${newX},${newY}`;

                          if (!positions.has(newKey)) {
                            element.position.xPercent = newX;
                            element.position.yPercent = newY;
                            console.log(`  -> Fixed overlap by moving ${element.type} to (${newX}, ${newY})`);
                          }
                        }
                      }

                      // Record this position as taken
                      positions.set(`${element.position.xPercent},${element.position.yPercent}`, element.type);
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
      const response_data = {
        review: sanitizeString(review),  // Include the review section
        suggestions: sanitizeString(suggestions),
        layoutJson: layoutJson
      };

      if (modelToUse !== geminiModel) {
        response_data.modelUsed = modelToUse;
        response_data.modelFallback = true;
        console.log(`Fallback occurred: Originally requested ${geminiModel}, but successfully used ${modelToUse}`);
      }

      // Ensure valid JSON before sending
      try {
        const jsonString = JSON.stringify(response_data);
        // Validate it can be parsed back
        JSON.parse(jsonString);
        
        return new Response(jsonString, {
          status: 200,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type',
            'Content-Type': 'application/json; charset=utf-8'
          }
        });
      } catch (jsonError) {
        console.error('JSON serialization error:', jsonError);
        return new Response(JSON.stringify({
          error: 'Failed to serialize response data',
          details: jsonError.message
        }), {
          status: 500,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Content-Type': 'application/json; charset=utf-8'
          }
        });
      }
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
        'Content-Type': 'application/json; charset=utf-8'
      }
    });
  }
};

export const config = {
  type: "experimental-background",
};