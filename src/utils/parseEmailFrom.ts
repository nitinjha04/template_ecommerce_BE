/** Parse `Name <email@example.com>` or plain `email@example.com`. */
export const parseEmailFrom = (
  from: string
): { name: string; email: string } => {
  const trimmed = from.trim();
  const match = trimmed.match(/^(.+?)\s*<([^>]+)>$/);
  if (match) {
    return { name: match[1].trim(), email: match[2].trim() };
  }
  return { name: '', email: trimmed };
};
