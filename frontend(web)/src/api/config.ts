// Empty in unit tests, so those keep using the in-memory stores.
// The dev server sets this to the Vite proxy prefix.
export const API_BASE = import.meta.env.VITE_API_BASE ?? ''

export const liveApi = API_BASE.length > 0
