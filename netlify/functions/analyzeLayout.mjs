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
    let studentSkillLevel = 'intermediate';
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
      if (line.includes('Student Skill Level:')) {
        studentSkillLevel = line.replace('- Student Skill Level:', '').trim();
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
      studentSkillLevel,
      rules,
      activityInfo: activityInfo.trim()
    });

    // SIMPLIFIED COORDINATE SYSTEM - Always use 0-100% for the white court area
    // This avoids confusion between container percentages and court percentages

    // Generate full layout description for analysis
    const layoutDescription = `${activityInfo}${lessonObjective ? `Lesson Objective: ${lessonObjective}\n` : ''}${skillsFocus ? `Skills Focus: ${skillsFocus}\n` : ''}Student Skill Level: ${studentSkillLevel}\n${rules ? `Rules: ${rules}\n` : ''}
Equipment Count: ${equipmentCount.cones} cones, ${equipmentCount.balls} balls, ${equipmentCount.attackers} attackers, ${equipmentCount.defenders} defenders

Full Layout Data:
${layoutData}`;

    // STRICT FORMAT PROMPT WITH COMPREHENSIVE REVIEW
    let prompt = `PE ACTIVITY ANALYSIS REQUEST

CURRENT LAYOUT DATA:
${layoutDescription}

LESSON DETAILS:
${activityInfo}${lessonObjective ? `Lesson Objective: ${lessonObjective}\n` : ''}${skillsFocus ? `Skills Focus: ${skillsFocus}\n` : ''}Student Skill Level: ${studentSkillLevel}\n${rules ? `Rules: ${rules}\n` : ''}
Equipment Count: ${equipmentCount.cones} cones, ${equipmentCount.balls} balls, ${equipmentCount.attackers} attackers, ${equipmentCount.defenders} defenders

YOUR TASK: Provide a comprehensive review of the submitted layout, then suggest improvements and alternatives.

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

DIFFERENTIATED INSTRUCTION USING CRAFT FRAMEWORK (NON-LINEAR PEDAGOGY):
Generate instructions, rules, and teaching points using the CRAFT framework principles for non-linear pedagogy.

CRAFT FRAMEWORK PRINCIPLES TO APPLY:

**C - CONSTRAINTS** (Manipulate task, environment, or individual constraints):
- Task Constraints: Rules, goals, equipment modifications
- Environmental Constraints: Space, boundaries, zones
- Individual Constraints: Skill level, physical capabilities

**R - REPRESENTATIVE LEARNING** (Game-like scenarios):
- Create situations that mirror actual game/sport contexts
- Include decision-making opportunities
- Embed perception-action coupling

**A - ADAPTATION** (Encourage learner self-organization):
- Allow multiple solutions to movement problems
- Avoid prescriptive "one right way" instructions
- Foster exploration of movement possibilities

**F - FUNCTIONAL VARIABILITY** (Embrace movement diversity):
- Encourage different movement patterns
- Avoid over-coaching specific techniques
- Value creative problem-solving

**T - TASK SIMPLIFICATION** (Progressive complexity):
- Start with simplified versions
- Gradually add complexity through constraints
- Layer challenges based on emergence

SKILL LEVEL APPLICATIONS:

For BEGINNER level:
- Constraints: Larger spaces, softer balls, modified rules (e.g., "Stay in your zone")
- Representative: Simple game scenarios (e.g., "Keep ball away from defender")
- Adaptation: "Find your own way to move past the cones"
- Variability: "Try different ways to control the ball"
- Simplification: Reduce options, increase success opportunities

For INTERMEDIATE level:
- Constraints: Standard spaces, time limits (e.g., "Complete in 30 seconds")
- Representative: Realistic game situations with moderate pressure
- Adaptation: "Discover which dribbling style works best for you"
- Variability: "Experiment with different speeds and directions"
- Simplification: Balanced challenge with achievable goals

For ADVANCED level:
- Constraints: Reduced space, multiple defenders, complex rules
- Representative: High-pressure game-like scenarios
- Adaptation: "Solve the defensive puzzle using your strengths"
- Variability: "Create unpredictable movement patterns"
- Simplification: Complex problems requiring creative solutions

For MIXED abilities:
- Provide constraint-based options: "Choose your challenge zone (green=easier, yellow=medium, red=harder)"
- Self-scaling tasks: "Defenders: Adjust your pressure based on attacker's skill"
- Open-ended goals: "Score points your way - dribbling=1pt, passing=2pts, trick=3pts"

LAYOUT 1: "Constraint-Based Discovery" - Uses environmental and task constraints to guide learning
- Apply CRAFT principles: Manipulate space, rules, or equipment to create learning opportunities
- Example constraints: Zone restrictions, time limits, equipment modifications
- Focus on exploration rather than prescription

LAYOUT 2: "Game-Based Learning" - Representative scenarios that mirror real game situations
- Apply CRAFT principles: Create game-like contexts with decision-making
- Include perception-action coupling opportunities
- Allow multiple solutions to movement challenges

LAYOUT 3: "Adaptive Challenge" - Self-organizing tasks that adapt to learner needs
- Apply CRAFT principles: Functional variability and emergent learning
- Provide options for different skill levels within same setup
- Encourage creative problem-solving and movement exploration

IMPORTANT CRAFT-BASED INSTRUCTION REQUIREMENTS:
1. Your element positions MUST create meaningful constraints and learning opportunities
2. Instructions should be EXPLORATORY not PRESCRIPTIVE:
   - AVOID: "Use crossover dribble at cone 2"
   - USE: "Explore different ways to change direction at each cone"
3. For each player type, provide PROBLEM-SOLVING tasks:
   - Attackers: "Find ways to maintain possession while moving through the space"
   - Defenders: "Discover how to influence the attacker's movement without contact"
   - Both: "Negotiate the space - attackers seek openings, defenders close gaps"
4. Include CONSTRAINTS that shape behavior without dictating it:
   - Space constraints: "Stay within your zone"
   - Time constraints: "Complete before music stops"
   - Rule constraints: "3 touches maximum per zone"
5. Encourage VARIABILITY and ADAPTATION:
   - "Try at least 3 different solutions"
   - "Adjust your approach based on defender positioning"
   - "Find what works best for your style"

Return response in EXACTLY this format:
===REVIEW===
Provide a detailed paragraph reviewing the submitted layout covering:
- Strengths: What works well in the current setup
- Areas for Improvement: Specific issues that need addressing
- Safety Considerations: Any safety concerns noted
- Engagement Analysis: How well students will stay engaged
- Space Utilization: Assessment of court usage
===SUGGESTIONS===
Write 2-3 specific, actionable improvement suggestions for the current layout
===LAYOUT_OPTIONS===
{"layouts":[{"name":"Constraint-Based Discovery","description":"Environmental constraints guide exploration and learning","instructions":"CRAFT-BASED for ${studentSkillLevel}: Explore movement solutions within these constraints. Attackers: Find pathways through the cone gates while maintaining control. Defenders: Influence attacker movement using positioning. Challenge: Discover at least 3 different ways to navigate the space.","rules":"Constraints: Stay in designated zones (marked by cones), maximum 3 seconds in any zone, switch roles every 2 minutes. Scoring: Award points for creative solutions, not just completion.","teachingPoints":"Notice how different body positions affect your control. Explore how speed changes your options. Discover which movements feel most natural to you. Reflect on what worked and why.","elements":[{"type":"cone","position":{"xPercent":25,"yPercent":30}},{"type":"cone","position":{"xPercent":25,"yPercent":65}},{"type":"cone","position":{"xPercent":50,"yPercent":30}},{"type":"cone","position":{"xPercent":50,"yPercent":65}},{"type":"cone","position":{"xPercent":70,"yPercent":30}},{"type":"cone","position":{"xPercent":70,"yPercent":65}},{"type":"attacker","position":{"xPercent":30,"yPercent":45}},{"type":"attacker","position":{"xPercent":60,"yPercent":50}},{"type":"defender","position":{"xPercent":45,"yPercent":60}},{"type":"ball","position":{"xPercent":30,"yPercent":40}}]},{"name":"Game-Based Learning","description":"Representative game scenario with decision-making","instructions":"CRAFT-BASED for ${studentSkillLevel}: Engage in game-like problem solving. Attackers: Read defender positions and find scoring opportunities. Defenders: Anticipate attacker movements and close spaces. Both: Make real-time decisions based on opponent actions.","rules":"Game constraints: Score by reaching opposite cone with ball control, defenders cannot grab - only position to influence, switch after each score. Adaptation: Modify pressure based on success rate.","teachingPoints":"Observe before acting. Recognize patterns in opponent movement. Experiment with timing and spacing. Learn from both successes and mistakes.","elements":[{"type":"cone","position":{"xPercent":25,"yPercent":30}},{"type":"cone","position":{"xPercent":25,"yPercent":65}},{"type":"cone","position":{"xPercent":50,"yPercent":30}},{"type":"cone","position":{"xPercent":50,"yPercent":65}},{"type":"cone","position":{"xPercent":70,"yPercent":30}},{"type":"cone","position":{"xPercent":70,"yPercent":65}},{"type":"attacker","position":{"xPercent":25,"yPercent":45}},{"type":"attacker","position":{"xPercent":50,"yPercent":50}},{"type":"defender","position":{"xPercent":70,"yPercent":45}},{"type":"ball","position":{"xPercent":25,"yPercent":40}}]},{"name":"Adaptive Challenge","description":"Self-organizing task with variable difficulty","instructions":"CRAFT-BASED for ${studentSkillLevel}: Self-regulate your challenge level. All players: Choose your starting position and difficulty zone. Create your own movement challenges using the equipment. Partner up to design problems for each other to solve.","rules":"Variability focus: Must demonstrate 3+ different movement solutions, can modify space by moving cones, self-assess and adjust difficulty. Meta-learning: Explain your movement choices to partner.","teachingPoints":"What makes a movement efficient vs creative? How does changing constraints affect your solutions? When is it better to go fast vs controlled? What did you learn from watching others?","elements":[{"type":"cone","position":{"xPercent":30,"yPercent":30}},{"type":"cone","position":{"xPercent":65,"yPercent":30}},{"type":"cone","position":{"xPercent":30,"yPercent":65}},{"type":"cone","position":{"xPercent":65,"yPercent":65}},{"type":"attacker","position":{"xPercent":35,"yPercent":40}},{"type":"attacker","position":{"xPercent":60,"yPercent":40}},{"type":"defender","position":{"xPercent":47,"yPercent":55}},{"type":"ball","position":{"xPercent":35,"yPercent":35}}]}]}
===END===

IMPORTANT: You MUST provide exactly 3 layouts using CRAFT framework. Each layout must:
1. Have different element positions (don't just copy the same positions)
2. Apply CRAFT principles (Constraints, Representative, Adaptation, Functional variability, Task simplification)
3. Keep ALL elements within 25-70% range for both X and Y coordinates
4. Include ALL ${equipmentCount.cones} cones, ${equipmentCount.attackers} attackers, ${equipmentCount.defenders} defenders, ${equipmentCount.balls} balls
5. Use EXPLORATORY language, not prescriptive commands
6. Include constraints that shape behavior without dictating exact movements
7. Encourage multiple solutions and creative problem-solving
8. Create game-like scenarios with decision-making opportunities`;

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
      
      // Parse the response to extract review, suggestions and JSON
      let review = '';
      let suggestions = fullResponse;
      let layoutJson = null;

      // Check for new format with review section
      if (fullResponse.includes('===REVIEW===')) {
        try {
          const reviewMatch = fullResponse.match(/===REVIEW===\s*([\s\S]*?)===SUGGESTIONS===/);
          if (reviewMatch) {
            review = reviewMatch[1].trim();
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
        review,  // Include the review section
        suggestions,
        layoutJson
      };
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