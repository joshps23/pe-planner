exports.handler = async (event, context) => {
  // CORS headers for all responses
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: ''
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const geminiApiKey = process.env.GOOGLE_GEMINI_API_KEY;
    
    console.log('API Key check:');
    console.log('- Present:', !!geminiApiKey);
    console.log('- Length:', geminiApiKey ? geminiApiKey.length : 0);
    console.log('- Starts with:', geminiApiKey ? geminiApiKey.substring(0, 10) + '...' : 'N/A');
    
    if (!geminiApiKey) {
      return {
        statusCode: 500,
        headers: corsHeaders,
        body: JSON.stringify({ 
          error: 'API key not configured',
          details: 'GOOGLE_GEMINI_API_KEY environment variable is missing'
        })
      };
    }

    // Simple test request with very short prompt and timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    console.log('Testing API key with simple request...');
    
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${geminiApiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: "Say hello"
          }]
        }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 50,
          candidateCount: 1
        }
      })
    });

    clearTimeout(timeoutId);

    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorData = await response.text();
      console.log('Error response:', errorData);
      
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      try {
        const errorJson = JSON.parse(errorData);
        errorMessage = errorJson.error?.message || errorMessage;
      } catch (e) {
        errorMessage = errorData;
      }

      return {
        statusCode: response.status,
        headers: corsHeaders,
        body: JSON.stringify({
          error: 'API key test failed',
          details: errorMessage,
          status: response.status
        })
      };
    }

    const data = await response.json();
    console.log('Success! Response data:', JSON.stringify(data, null, 2));

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        success: true,
        message: 'API key is working correctly!',
        response: data.candidates?.[0]?.content?.parts?.[0]?.text || 'No text response',
        apiKeyLength: geminiApiKey.length,
        apiKeyPrefix: geminiApiKey.substring(0, 10) + '...'
      })
    };

  } catch (error) {
    console.error('Error testing API key:', error);
    
    let errorMessage = 'Unknown error';
    if (error.name === 'AbortError') {
      errorMessage = 'Request timed out';
    } else if (error.message) {
      errorMessage = error.message;
    }

    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        error: 'API key test failed',
        details: errorMessage,
        errorName: error.name
      })
    };
  }
};