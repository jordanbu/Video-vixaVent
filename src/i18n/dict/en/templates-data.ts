// EN data dictionary: English display names for **data** (template names, etc.). tData() looks here in en state.
// Built-in data is keyed in English (specs/11), so English needs no entries: tData() returns the name as-is.
// Only add an entry when a data name must be shown differently from its key.
export default {} as Record<string, string>;
