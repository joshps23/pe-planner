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
    const { layoutData } = JSON.parse(event.body);
    
    console.log('=== LAYOUT DEBUG DATA ===');
    console.log('Raw layoutData received:', JSON.stringify(layoutData, null, 2));
    
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        success: true,
        message: 'Layout data logged to console',
        receivedData: typeof layoutData === 'string' ? layoutData.substring(0, 500) + '...' : layoutData
      })
    };

  } catch (error) {
    console.error('Error in debug function:', error);
    
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        error: 'Debug failed',
        details: error.message
      })
    };
  }
};