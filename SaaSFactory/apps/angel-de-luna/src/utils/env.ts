export function validateEnv() {
    const requiredEnvVars = [
      'NEXT_PUBLIC_SUPABASE_URL',
      'NEXT_PUBLIC_SUPABASE_ANON_KEY'
    ]
  
    const missingVars = requiredEnvVars.filter(envVar => !process.env[envVar])
  
    if (missingVars.length > 0) {
      console.error('Missing environment variables:', missingVars)
      console.error('Current env vars:', process.env)
      throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`)
    }
  }