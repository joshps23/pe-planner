// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { corsHeaders } from '../_shared/cors.ts'

console.log("Analyze Layout Function Started")

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { layoutData: rawLayoutData } = await req.json()

    if (!rawLayoutData) {
      return new Response(
        JSON.stringify({ error: 'Layout data is required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Sanitize function to remove problematic Unicode characters
    function sanitizeString(str: string): string {
      if (!str) return '';
      return str
        .replace(/[\u0000-\u0008\u000B-\u000C\u000E-\u001F\u007F-\u009F]/g, '') // Control characters
        .replace(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])/g, '') // Orphaned high surrogates
        .replace(/(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g, '') // Orphaned low surrogates
        .replace(/[\uFFFE\uFFFF]/g, '') // Invalid characters
        .normalize('NFC'); // Normalize Unicode
    }

    const layoutData = sanitizeString(rawLayoutData)
    const geminiApiKey = Deno.env.get('GOOGLE_GEMINI_API_KEY')

    if (!geminiApiKey) {
      return new Response(
        JSON.stringify({ error: 'API key not configured' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Extract key info from layout data
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

    // Simplified prompt without large example JSON
    const prompt = `PE ACTIVITY ANALYSIS - CREATE FUN GAMES!

LESSON: ${lessonObjective || 'general PE'} | Skill Level: ${studentSkillLevel}
Equipment: ${equipmentCount.cones} cones, ${equipmentCount.balls} balls, ${equipmentCount.attackers} attackers, ${equipmentCount.defenders} defenders

TASK: Review the layout, then suggest 3 EXCITING GAME variations with DIFFERENT positioning strategies.

MAKE IT FUN - Include:
- Points/scoring (10pts per goal, bonuses, combos)
- Power-ups that use LESSON-SPECIFIC SKILLS (not random exercises)
- Game themes (Lava maze, Treasure hunt, Battle arena)
- Win conditions (Last team standing, Most points, Beat the boss)
- Celebrations (Victory zone, Team chants)

IMPORTANT: Power-ups MUST be earned through skills related to the lesson objective!
For example, if lesson is about passing: "Complete chest pass through target = double points"
NOT generic exercises like "do jumping jacks" or "run faster"

POWER-UP ACTIVATION RULES (MUST be realistic & skill-based):
- DOUBLE POINTS: Execute skill with proper technique (e.g., bounce pass between legs, behind-back dribble)
- SAFETY ZONE: Complete 5 consecutive passes without dropping = team gets 10-second safe zone where they can't be tagged
- BONUS ATTEMPT: Perfect form demonstration (verified by teacher) = extra turn/attempt
- FREEZE DEFENDERS: Successfully complete challenge move (e.g., dribble figure-8) = defenders must count to 3 before moving
- SKILL CHAIN BONUS: Link 3 different skills smoothly = next score worth triple points
- FREE PASS: Make difficult shot/pass (through cones, long distance) = one free undefended attempt

COORDINATE SYSTEM:
- Use percentage values between 25% and 70% for all positions
- This ensures elements stay fully within the playing area
- Each layout MUST have DIFFERENT positions (no duplicates across layouts)

FORMAT: Return a JSON object with exactly this structure:
{
  "review": "Brief review of current layout strengths and areas to improve",
  "suggestions": "2-3 specific ways to add fun elements",
  "layouts": [
    {
      "name": "Layout Name",
      "description": "Brief exciting description",
      "instructions": "Clear game instructions with skill-specific power-ups",
      "rules": "Specific game rules including how to activate power-ups",
      "teachingPoints": "Key coaching tips as a single string",
      "elements": [
        {"type": "cone/ball/attacker/defender", "position": {"xPercent": 25-70, "yPercent": 25-70}}
      ]
    }
  ]
}

CRITICAL:
- Provide exactly 3 layouts with DIFFERENT positioning strategies
- Layout 1: Wide spread formation
- Layout 2: Compact central formation
- Layout 3: Progressive/linear arrangement
- Each layout must use ALL ${equipmentCount.cones} cones, ${equipmentCount.balls} balls, ${equipmentCount.attackers} attackers, ${equipmentCount.defenders} defenders
- NO overlapping positions - each element must have unique coordinates

Current Layout:
${layoutData}`

    // Call Gemini API with 55-second timeout (leaving 5 seconds buffer)
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 55000)

    try {
      // Use faster model for better response time
      const geminiModel = 'gemini-1.5-flash'
      const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${geminiApiKey}`

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: sanitizeString(prompt)
            }]
          }],
          generationConfig: {
            temperature: 0.3,
            topK: 10,
            topP: 0.8,
            maxOutputTokens: 10000, // Reduced for faster response
            candidateCount: 1
          }
        })
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`API error: ${response.status} - ${errorText}`)
      }

      const data = await response.json()

      if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
        const responseText = sanitizeString(data.candidates[0].content.parts[0].text)

        // Try to parse as JSON, handling potential formatting issues
        let parsedResponse
        try {
          // Remove markdown code blocks if present
          const cleanedText = responseText
            .replace(/^```json\s*/i, '')
            .replace(/```\s*$/, '')
            .trim()

          parsedResponse = JSON.parse(cleanedText)
        } catch (parseError) {
          console.error('Failed to parse AI response as JSON:', parseError)
          // Return the raw text if JSON parsing fails
          parsedResponse = {
            review: "Analysis completed",
            suggestions: responseText,
            layouts: []
          }
        }

        // Validate and fix coordinates if needed
        if (parsedResponse.layouts && Array.isArray(parsedResponse.layouts)) {
          parsedResponse.layouts.forEach((layout: any) => {
            if (layout.elements && Array.isArray(layout.elements)) {
              // Ensure no overlapping positions
              const usedPositions = new Set<string>()

              layout.elements.forEach((element: any) => {
                if (element.position) {
                  // Clamp coordinates to safe range
                  element.position.xPercent = Math.max(25, Math.min(70, element.position.xPercent || 50))
                  element.position.yPercent = Math.max(25, Math.min(70, element.position.yPercent || 50))

                  // Check for duplicates and adjust if needed
                  const posKey = `${element.position.xPercent},${element.position.yPercent}`
                  if (usedPositions.has(posKey)) {
                    // Offset duplicate positions
                    element.position.xPercent = Math.min(70, element.position.xPercent + 5)
                    element.position.yPercent = Math.min(70, element.position.yPercent + 5)
                  }
                  usedPositions.add(`${element.position.xPercent},${element.position.yPercent}`)
                }
              })
            }

            // Ensure teachingPoints is a string
            if (Array.isArray(layout.teachingPoints)) {
              layout.teachingPoints = layout.teachingPoints.join(' ')
            }
          })
        }

        return new Response(
          JSON.stringify(parsedResponse),
          {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      } else {
        throw new Error('Unexpected response format from AI')
      }
    } catch (error: any) {
      clearTimeout(timeoutId)

      if (error.name === 'AbortError') {
        return new Response(
          JSON.stringify({
            error: 'Request timed out. The analysis is taking longer than expected. Please try again.',
            suggestion: 'Try simplifying your layout or reducing the number of elements.'
          }),
          {
            status: 504,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }

      console.error('Error calling Gemini API:', error)
      return new Response(
        JSON.stringify({
          error: error.message || 'Failed to analyze layout',
          details: error.toString()
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }
  } catch (error: any) {
    console.error('Error in Edge Function:', error)
    return new Response(
      JSON.stringify({
        error: error.message || 'Internal server error',
        details: error.toString()
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/analyze-layout' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'

*/
