exports.handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: ''
    };
  }

  try {
    const { layoutData } = JSON.parse(event.body);
    
    if (!layoutData) {
      return {
        statusCode: 400,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type'
        },
        body: JSON.stringify({ error: 'Layout data is required' })
      };
    }

    const geminiApiKey = process.env.GOOGLE_GEMINI_API_KEY
    
    if (!geminiApiKey) {
      return {
        statusCode: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type'
        },
        body: JSON.stringify({ error: 'API key not configured' })
      };
    }

    let prompt = `You are an expert Physical Education teacher with experience across multiple sports and activities. Please analyze this lesson layout and provide constructive feedback and suggestions.

IMPORTANT: The layout data contains pixel coordinates from a digital interface. When analyzing distances and positioning, interpret these in terms of real-world court/field measurements in METERS, not pixels. Assume a standard-sized court/field for the activity type.

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

IMPORTANT RESPONSE FORMAT:
Please provide your response in this exact format:

===SUGGESTIONS===
[Your detailed text analysis and suggestions here]

===LAYOUT_OPTIONS===
{
  "layouts": [
    {
      "name": "Beginner-Friendly Layout",
      "description": "Simplified setup focusing on safety and basic skill development",
      "instructions": "Clear, step-by-step instructions for how students should use this layout",
      "rules": "Simple rules that are easy for beginners to understand and follow",
      "teachingPoints": "Key coaching points and safety considerations for this setup",
      "elements": [
        {
          "type": "cone|ball|hoop|net|racket|shuttle|marker|bench|attacker|defender",
          "name": "Student Name (only for attacker/defender)",
          "position": {
            "xPercent": 25,
            "yPercent": 30
          }
        }
      ],
      "annotations": [
        {
          "text": "Coaching point or instruction",
          "position": {
            "xPercent": 50,
            "yPercent": 20
          }
        }
      ]
    },
    {
      "name": "Skill-Focused Layout", 
      "description": "Advanced setup targeting specific skill development",
      "instructions": "Detailed instructions for skill-building activities and progressions",
      "rules": "Structured rules that challenge students and promote skill mastery",
      "teachingPoints": "Technical coaching points and skill development cues",
      "elements": [
        {
          "type": "cone|ball|hoop|net|racket|shuttle|marker|bench|attacker|defender",
          "name": "Student Name (only for attacker/defender)",
          "position": {
            "xPercent": 40,
            "yPercent": 25
          }
        }
      ],
      "annotations": [
        {
          "text": "Coaching point or instruction",
          "position": {
            "xPercent": 60,
            "yPercent": 15
          }
        }
      ]
    },
    {
      "name": "High-Engagement Layout",
      "description": "Dynamic setup maximizing student participation and fun",
      "instructions": "Energetic activity instructions that keep all students actively involved",
      "rules": "Fun, competitive rules that motivate students and maintain engagement",
      "teachingPoints": "Engagement strategies and participation management tips",
      "elements": [
        {
          "type": "cone|ball|hoop|net|racket|shuttle|marker|bench|attacker|defender",
          "name": "Student Name (only for attacker/defender)",
          "position": {
            "xPercent": 35,
            "yPercent": 45
          }
        }
      ],
      "annotations": [
        {
          "text": "Coaching point or instruction",
          "position": {
            "xPercent": 70,
            "yPercent": 25
          }
        }
      ]
    }
  ]
}
===END===

Please provide 3 different layout variations with complete activity details:
1. "Beginner-Friendly Layout" - Focus on safety, clear spacing, and basic skill development
2. "Skill-Focused Layout" - Target specific skill development with appropriate challenge level  
3. "High-Engagement Layout" - Maximize student participation, variety, and fun factor

For each layout, you MUST provide:
- **instructions**: Step-by-step activity instructions (2-3 sentences explaining how students use the setup)
- **rules**: Clear rules for the activity (2-3 specific rules that students must follow)
- **teachingPoints**: Key coaching points and safety considerations (2-3 important teaching cues)
- **elements**: Improved positioning of existing elements and/or additional equipment
- **annotations**: Coaching notes placed strategically on the court

Each layout should be a complete, ready-to-use activity that a PE teacher can implement immediately.

CRITICAL COORDINATE REQUIREMENTS:
- xPercent and yPercent MUST be numbers between 20 and 80 (inclusive) for optimal positioning
- 0% = left/top edge of court, 100% = right/bottom edge of court
- STRICT positioning guidelines to ensure elements stay fully visible:
  - ALL elements: use 20-80 range for maximum safety and visibility
  - Center positioning works best: 40-60 range for balanced layouts
  - Edge positioning: minimum 25% from edges (25-75 range)
  - NEVER use coordinates below 20% or above 80%
- Examples of IDEAL coordinates: 25, 35, 45, 55, 65, 75
- Examples of GOOD coordinates: 30, 40, 50, 60, 70
- Examples of FORBIDDEN coordinates: 5, 10, 15, 85, 90, 95, 100, 0, -10, 105

POSITIONING EXAMPLES FOR REFERENCE:
- Center court element: xPercent: 50, yPercent: 50
- Left side element: xPercent: 30, yPercent: 50  
- Right side element: xPercent: 70, yPercent: 50
- Front center: xPercent: 50, yPercent: 30
- Back center: xPercent: 50, yPercent: 70
- Safe corner positioning: xPercent: 25, yPercent: 25 (front-left)

Make realistic improvements based on the activity type and objectives for each variation.`;

    // Add timeout to prevent function from timing out
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000); // 120 second (2 minute) timeout

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${geminiApiKey}`, {
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
          temperature: 0.8,
          topK: 64,
          topP: 0.95,
          maxOutputTokens: 4096,
          candidateCount: 1
        }
      })
    });

    // Clear timeout if request succeeds
    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`);
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
            const layoutsStr = layoutsMatch[1].trim();
            layoutJson = JSON.parse(layoutsStr);
          }
        } catch (parseError) {
          console.log('Error parsing structured response:', parseError);
          // If parsing fails, just use the full response as suggestions
        }
      }
      
      return {
        statusCode: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ suggestions, layoutJson })
      };
    } else {
      throw new Error('No suggestions received from AI');
    }
    
  } catch (error) {
    console.error('Error calling Gemini API:', error);
    let errorMessage = 'Failed to analyze layout. ';
    
    if (error.name === 'AbortError') {
      errorMessage += 'Request timed out. The AI service is taking too long to respond. Please try again.';
    } else if (error.message.includes('API_KEY_INVALID')) {
      errorMessage += 'Please check your API key.';
    } else if (error.message.includes('quota')) {
      errorMessage += 'API quota exceeded.';
    } else if (error.message.includes('blocked')) {
      errorMessage += 'Content was blocked by safety filters.';
    } else {
      errorMessage += `Error: ${error.message}`;
    }
    
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ error: errorMessage })
    };
  }
};