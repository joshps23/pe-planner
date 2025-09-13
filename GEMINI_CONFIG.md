# Gemini Model Configuration

## Current Setup
The PE Activity Consultant now uses **Gemini 2.5 Flash** by default, which is Google's latest hybrid reasoning model with advanced capabilities.

## Available Models
- `gemini-2.5-flash` (Default) - Latest model with 1M token context, hybrid reasoning
- `gemini-2.0-flash` - Fast, efficient model with native tool use
- `gemini-1.5-pro` - Previous stable model (fallback option)

## How to Change Models

### For Netlify Deployment
1. Go to your Netlify Dashboard
2. Navigate to Site Settings → Environment Variables
3. Add a new variable:
   - Key: `GEMINI_MODEL`
   - Value: `gemini-2.0-flash` (or your preferred model)
4. Redeploy your site

### For Local Development
Create a `.env` file in your project root:
```env
GEMINI_MODEL=gemini-2.0-flash
```

## Troubleshooting 504 Errors

If you encounter 504 Gateway Timeout errors with Gemini 2.5 Flash:

1. **Try Gemini 2.0 Flash**: Set `GEMINI_MODEL=gemini-2.0-flash`
2. **Use the stable model**: Set `GEMINI_MODEL=gemini-1.5-pro`
3. **Check your prompt size**: Larger layouts may take longer to process

## Model Capabilities

### Gemini 2.5 Flash
- **Context Window**: 1 million tokens
- **Features**: Hybrid reasoning, thinking budgets
- **Best for**: Complex analysis, detailed suggestions
- **Note**: May have longer response times

### Gemini 2.0 Flash  
- **Context Window**: Large
- **Features**: Native tool use, fast responses
- **Best for**: Quick analysis, standard layouts

### Gemini 1.5 Pro
- **Context Window**: Standard
- **Features**: Stable, well-tested
- **Best for**: Reliability, consistent performance

## Configuration Details

The model configuration affects:
- Response time
- Quality of suggestions
- Number of layout variations generated
- Token limits (maxOutputTokens: 8192 for newer models)

## Error Messages

If you see:
- **"504 Gateway Timeout"**: Model took too long, try a faster model
- **"Model error"**: Check model name is correct
- **"API quota exceeded"**: You've hit rate limits, wait and retry

## Default Settings

Current generation config optimized for Gemini 2.5 Flash:
```javascript
{
  temperature: 0.7,      // Balanced creativity
  topK: 40,             // Focused vocabulary
  topP: 0.95,           // Standard nucleus sampling
  maxOutputTokens: 8192, // Extended for detailed layouts
  candidateCount: 1
}
```