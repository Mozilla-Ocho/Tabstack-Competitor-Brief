import Tabstack from '@tabstack/sdk'

/**
 * Returns a configured Tabstack client. The API key is read from the
 * TABSTACK_API_KEY environment variable and never reaches the browser:
 * every call in this app runs in server code.
 */
export function getClient(): Tabstack {
  if (!process.env.TABSTACK_API_KEY) {
    throw new Error(
      'TABSTACK_API_KEY is not set. Copy .env.example to .env.local and add your key, ' +
        'or run this template via `stripe projects build` to have it provisioned automatically.',
    )
  }
  return new Tabstack({ apiKey: process.env.TABSTACK_API_KEY })
}
