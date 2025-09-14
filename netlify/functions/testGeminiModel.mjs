export default async (request, context) => {
  // Allow GET and POST methods
  if (request.method !== 'GET' && request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Content-Type': 'application/json'
      }
    });
  }

  if (request.method === 'OPTIONS') {
    return new Response('', {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
      }
    });
  }

  const geminiApiKey = process.env.GOOGLE_GEMINI_API_KEY;

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

  // Models to test
  const modelsToTest = [
    'gemini-2.5-flash',
    'gemini-2.0-flash',
    'gemini-1.5-flash',
    'gemini-1.5-pro'
  ];

  const results = [];

  for (const model of modelsToTest) {
    const startTime = Date.now();

    try {
      console.log(`Testing model: ${model}`);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiApiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          signal: controller.signal,
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: 'Say "Hello, I am working!" in exactly 5 words.'
              }]
            }],
            generationConfig: {
              temperature: 0,
              maxOutputTokens: 50,
              candidateCount: 1
            }
          })
        }
      );

      clearTimeout(timeoutId);
      const responseTime = Date.now() - startTime;

      if (response.ok) {
        const data = await response.json();
        const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response text';

        results.push({
          model,
          status: 'success',
          statusCode: response.status,
          responseTime: `${responseTime}ms`,
          response: responseText.trim()
        });
      } else {
        let errorMessage = `HTTP ${response.status}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.error?.message || errorMessage;
        } catch {
          // Use default error message
        }

        results.push({
          model,
          status: 'failed',
          statusCode: response.status,
          responseTime: `${responseTime}ms`,
          error: errorMessage
        });
      }
    } catch (error) {
      const responseTime = Date.now() - startTime;
      results.push({
        model,
        status: 'error',
        responseTime: `${responseTime}ms`,
        error: error.name === 'AbortError' ? 'Timeout after 30 seconds' : error.message
      });
    }
  }

  // Check environment configuration
  const config = {
    GEMINI_MODEL: process.env.GEMINI_MODEL || 'not set',
    timestamp: new Date().toISOString(),
    environment: process.env.CONTEXT || 'production'
  };

  return new Response(JSON.stringify({
    config,
    results,
    summary: {
      working: results.filter(r => r.status === 'success').map(r => r.model),
      failed: results.filter(r => r.status !== 'success').map(r => r.model)
    }
  }, null, 2), {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Content-Type': 'application/json'
    }
  });
};

export const config = {
  type: "experimental-background",
};