# Production Configuration for PE Activity Consultant

## Fixing 504 Timeout Errors

If you're experiencing 504 Gateway Timeout errors in production, follow these steps:

### 1. Set Environment Variables in Netlify

Go to your Netlify Dashboard → Site Settings → Environment Variables and add:

```
GEMINI_MODEL=gemini-1.5-pro
```

This uses a faster model that responds within timeout limits.

### 2. Alternative Model Options

If you still experience timeouts, try these models (from fastest to slowest):

- `gemini-1.5-flash` - Fastest, good for simple layouts
- `gemini-1.5-pro` - Balanced speed and quality (recommended)
- `gemini-2.0-flash` - Newer but slower
- `gemini-2.5-flash` - Latest but may timeout

### 3. Deploy Configuration

The updated `netlify.toml` includes:
- Maximum timeout of 26 seconds for free tier
- Optimized generation config for faster responses

### 4. For Paid Netlify Plans

If you have a paid Netlify plan, you can use background functions:

1. Update the function to use background function format
2. Extend timeout up to 15 minutes
3. Use higher quality models like `gemini-2.5-flash`

### 5. Testing in Production

After deployment:
1. Clear your browser cache
2. Try a simple layout first
3. Monitor the browser console for errors
4. Check Netlify Functions logs for details

### Troubleshooting

If timeouts persist:
- Reduce the complexity of your layouts
- Use fewer elements in the initial layout
- Try during off-peak hours
- Consider upgrading to a paid Netlify plan for longer timeouts

## Local Development

For local testing, use:
```
GEMINI_MODEL=gemini-2.0-flash
```

This provides a good balance for development work.