// Security keys and passkeys, through the browser's own prompt. The backend hands over the options as JSON
// and takes the result back as JSON, so this needs the JSON helpers every current browser has.

type CredentialJson = { publicKey?: unknown }

const publicKey = (options: unknown) => (options as CredentialJson).publicKey ?? options

export function supportsSecurityKeys() {
  return (
    typeof PublicKeyCredential !== 'undefined' &&
    typeof PublicKeyCredential.parseCreationOptionsFromJSON === 'function' &&
    typeof PublicKeyCredential.parseRequestOptionsFromJSON === 'function'
  )
}

// Asks for a new key to be registered. Rejects when the person cancels or the key is already registered.
export async function createSecurityKey(options: unknown): Promise<unknown> {
  const credential = await navigator.credentials.create({
    publicKey: PublicKeyCredential.parseCreationOptionsFromJSON(publicKey(options) as PublicKeyCredentialCreationOptionsJSON),
  })
  if (!(credential instanceof PublicKeyCredential)) throw new Error('No security key answered.')
  return credential.toJSON()
}

// Asks for a registered key to be used. `signal` lets the screen stop waiting.
export async function askSecurityKey(options: unknown, signal?: AbortSignal): Promise<AuthenticationResponseJSON> {
  const credential = await navigator.credentials.get({
    publicKey: PublicKeyCredential.parseRequestOptionsFromJSON(publicKey(options) as PublicKeyCredentialRequestOptionsJSON),
    signal,
  })
  if (!(credential instanceof PublicKeyCredential)) throw new Error('No security key answered.')
  return credential.toJSON() as AuthenticationResponseJSON
}
