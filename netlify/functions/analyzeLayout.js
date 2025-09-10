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

${layoutData}

Based on the activity details, court/field layout, and current phase, please provide:
1. Assessment of the current setup (strengths and potential issues)
2. How well the layout supports the stated activity objectives and rules
3. Specific suggestions to improve the activity effectiveness
4. Safety considerations and risk management
5. Alternative variations or progressions for this activity
6. Tips for student engagement and maximizing learning outcomes`;

    // Add specific guidance based on activity details
    if (layoutData.includes('Activity Name:') || layoutData.includes('Rules & Instructions:')) {
      prompt += `\n\nPay special attention to how the setup supports the specific activity rules and objectives described. Consider whether the equipment placement, student positioning, and space usage optimize the learning experience for the stated goals. If no specific sport is mentioned, analyze the layout based on the equipment and activity description provided.`;
    } else {
      prompt += `\n\nSince no specific activity details are provided, analyze the setup based on the visible equipment and student positioning. Make suggestions that would work for the types of activities that could be conducted with the current equipment layout.`;
    }
    
    prompt += `\n\nKeep your response practical, actionable, and suitable for a PE teacher. Focus on pedagogy, safety, and student engagement. Adapt your advice to the specific sport/activity indicated by the equipment and activity description.`;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=${geminiApiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
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

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    
    if (data.candidates && data.candidates[0] && data.candidates[0].content) {
      const suggestions = data.candidates[0].content.parts[0].text;
      
      return {
        statusCode: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ suggestions })
      };
    } else {
      throw new Error('No suggestions received from AI');
    }
    
  } catch (error) {
    console.error('Error calling Gemini API:', error);
    let errorMessage = 'Failed to analyze layout. ';
    
    if (error.message.includes('API_KEY_INVALID')) {
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