export function getFirstValue(obj, fields) {
  if (!obj) return null
  const arr = Array.isArray(fields) ? fields : [fields]
  for (const f of arr) {
    if (obj[f] !== undefined && obj[f] !== null && obj[f] !== '') return String(obj[f]).trim()
  }
  const first = Object.values(obj).find(v => v !== undefined && v !== null && v !== '')
  return first != null ? String(first) : null
}

export function cleanDisplayName(value) {
  if (value === null || value === undefined) return null
  const name = String(value).split(/\\n|\r?\n/)[0].trim()
  return name || null
}
