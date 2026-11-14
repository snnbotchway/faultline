const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// The addresses typed or pasted into the invite field: separated by spaces, commas, semicolons or new lines,
// each kept once. `invalid` are the pieces that are not an address.
export function parseEmails(text: string): { emails: string[]; invalid: string[] } {
  const pieces = [...new Set(text.split(/[\s,;]+/).map((piece) => piece.replace(/^<|>$/g, '')).filter(Boolean))]
  return { emails: pieces.filter((piece) => EMAIL.test(piece)), invalid: pieces.filter((piece) => !EMAIL.test(piece)) }
}
