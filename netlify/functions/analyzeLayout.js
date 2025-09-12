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

===LAYOUT_JSON===
{
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
}
===END===

The JSON should contain an improved layout with better positioning of existing elements and/or additional equipment that would enhance the activity. 

CRITICAL COORDINATE REQUIREMENTS:
- xPercent and yPercent MUST be numbers between 0 and 100 (inclusive)
- 0% = left/top edge of court, 100% = right/bottom edge of court
- To avoid elements being cut off at edges, use safe ranges:
  - For equipment (cones, balls, etc.): use 5-95 range
  - For students: use 10-90 range to ensure full visibility
- Examples of VALID coordinates: 25, 50, 75.5, 12, 88
- Examples of INVALID coordinates: -10, 105, 110, -5

Only suggest realistic improvements based on the activity type and objectives.`;

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
      
      if (fullResponse.includes('===SUGGESTIONS===') && fullResponse.includes('===LAYOUT_JSON===')) {
        try {
          const suggestionsMatch = fullResponse.match(/===SUGGESTIONS===\s*([\s\S]*?)===LAYOUT_JSON===/);
          const jsonMatch = fullResponse.match(/===LAYOUT_JSON===\s*([\s\S]*?)===END===/);
          
          if (suggestionsMatch) {
            suggestions = suggestionsMatch[1].trim();
          }
          
          if (jsonMatch) {
            const jsonStr = jsonMatch[1].trim();
            layoutJson = JSON.parse(jsonStr);
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