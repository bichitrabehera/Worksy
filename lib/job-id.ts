// Job ids can contain slashes (Himalayas uses full URLs as ids), so routes use
// a URL-safe base64 token instead of the raw id.

export function encodeJobId(id: string) {
  const bytes = new TextEncoder().encode(id);
  let binary = "";

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export function decodeJobId(token: string) {
  const base64 = token.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(
    base64.length + ((4 - (base64.length % 4)) % 4),
    "=",
  );
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (character) =>
    character.charCodeAt(0),
  );

  return new TextDecoder().decode(bytes);
}
