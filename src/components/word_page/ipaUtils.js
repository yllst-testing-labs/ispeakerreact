// IPA normalization and fuzzy matching utilities

// Map of IPA variants to canonical forms
const IPA_NORMALIZATION_MAP = {
    ɑː: "ɑ",
    ɡ: "g",
    r: "ɹ",
    ɾ: "ɹ",
    ɻ: "ɹ",
    ɽ: "ɹ",
    ɺ: "ɹ",
    əʊ: "oʊ",
    ou: "oʊ",
    ei: "eɪ",
    ai: "aɪ",
    au: "aʊ",
    oi: "ɔɪ",
    ʧ: "t͡ʃ",
    ʤ: "d͡ʒ",
    ɚ: "ə",
    ʃ: "ʃ",
    ʒ: "ʒ",
    ŋ: "ŋ",
    er: "ɚ",
    ər: "ɚ",
    ɜr: "ɚ",
    // Add more as needed
};

// Fuzzy phoneme groups (each array contains close phonemes)
const FUZZY_PHONEME_GROUPS = [
    ["ɑ", "ɑː"],
    ["ə", "ɚ"],
    ["oʊ", "ou", "əʊ"],
    ["eɪ", "ei"],
    ["aɪ", "ai"],
    ["aʊ", "au"],
    ["ɔɪ", "oi"],
    ["t͡ʃ", "ʧ"],
    ["d͡ʒ", "ʤ"],
    ["g", "ɡ"],
    ["ɹ", "r", "ɾ", "ɻ", "ɽ", "ɺ"],
    ["ŋ", "ŋ"],
    ["ɛ", "e"],
    // Add more as needed
];

// Normalize a single IPA token
export function normalizeIPAToken(token) {
    return IPA_NORMALIZATION_MAP[token] || token;
}

// Normalize a full IPA string (tokenized by space)
export function normalizeIPAString(str) {
    if (!str) return "";
    return str
        .toLowerCase()
        .replace(/\s+/g, " ")
        .trim()
        .split(" ")
        .map(normalizeIPAToken)
        .join(" ");
}

// Check if two IPA tokens are fuzzy matches (close enough)
export function arePhonemesClose(a, b) {
    // Ignore the long mark ː in comparison
    if (a === "ː" || b === "ː") return true;
    a = normalizeIPAToken(a.replace(/ː/gu, ""));
    b = normalizeIPAToken(b.replace(/ː/gu, ""));
    if (a === b) return true;
    for (const group of FUZZY_PHONEME_GROUPS) {
        if (group.includes(a) && group.includes(b)) return true;
    }
    return false;
}
