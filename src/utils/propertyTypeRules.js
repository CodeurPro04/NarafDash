/**
 * Règles de visibilité des champs de caractéristiques
 * selon le type de bien immobilier.
 * Utilisé dans tous les formulaires d'ajout/édition de propriété.
 */

const ALL_CHAR_KEYS = [
  "surface_area", "land_area", "bedrooms", "bathrooms",
  "parking_spaces", "floor_number", "total_floors", "year_built",
];

const TYPE_RULES = {
  terrain: {
    hint: "Terrain vide — superficie et localisation uniquement.",
    showFeatures: false,
    fields: [
      { key: "surface_area", label: "Superficie (m²)", required: true },
    ],
  },
  appartement: {
    hint: null,
    showFeatures: true,
    fields: [
      { key: "surface_area",   label: "Surface habitable (m²)", required: true  },
      { key: "bedrooms",       label: "Chambres",                required: true  },
      { key: "bathrooms",      label: "Salles de bain",          required: false },
      { key: "parking_spaces", label: "Parking",                 required: false },
      { key: "floor_number",   label: "Étage",                   required: false },
      { key: "total_floors",   label: "Nb d'étages total",       required: false },
      { key: "year_built",     label: "Année de construction",   required: false },
    ],
  },
  studio: {
    hint: "Studio — une pièce principale, pas de chambre séparée.",
    showFeatures: true,
    fields: [
      { key: "surface_area",   label: "Surface (m²)",          required: true  },
      { key: "bathrooms",      label: "Salle de bain",         required: false },
      { key: "parking_spaces", label: "Parking",               required: false },
      { key: "floor_number",   label: "Étage",                 required: false },
      { key: "total_floors",   label: "Étages total",          required: false },
      { key: "year_built",     label: "Année de construction", required: false },
    ],
  },
  villa: {
    hint: null,
    showFeatures: true,
    fields: [
      { key: "surface_area",   label: "Surface habitable (m²)",  required: true  },
      { key: "land_area",      label: "Surface du terrain (m²)", required: false },
      { key: "bedrooms",       label: "Chambres",                required: true  },
      { key: "bathrooms",      label: "Salles de bain",          required: false },
      { key: "parking_spaces", label: "Parking / Garage",        required: false },
      { key: "year_built",     label: "Année de construction",   required: false },
    ],
  },
  duplex: {
    hint: null,
    showFeatures: true,
    fields: [
      { key: "surface_area",   label: "Surface totale (m²)",    required: true  },
      { key: "bedrooms",       label: "Chambres",               required: true  },
      { key: "bathrooms",      label: "Salles de bain",         required: false },
      { key: "parking_spaces", label: "Parking",                required: false },
      { key: "floor_number",   label: "Étage de départ",        required: false },
      { key: "total_floors",   label: "Nombre de niveaux",      required: false },
      { key: "year_built",     label: "Année de construction",  required: false },
    ],
  },
  bureau: {
    hint: "Local professionnel — sans chambres ni terrain.",
    showFeatures: true,
    fields: [
      { key: "surface_area",   label: "Surface (m²)",          required: true  },
      { key: "parking_spaces", label: "Places de parking",     required: false },
      { key: "floor_number",   label: "Étage",                 required: false },
      { key: "total_floors",   label: "Étages total",          required: false },
      { key: "year_built",     label: "Année de construction", required: false },
    ],
  },
  commerce: {
    hint: "Local commercial, boutique ou espace de vente.",
    showFeatures: true,
    fields: [
      { key: "surface_area",   label: "Surface (m²)",          required: true  },
      { key: "parking_spaces", label: "Parking",               required: false },
      { key: "floor_number",   label: "Étage",                 required: false },
      { key: "total_floors",   label: "Étages total",          required: false },
      { key: "year_built",     label: "Année de construction", required: false },
    ],
  },
  entrepot: {
    hint: "Entrepôt ou hangar — sans chambres ni salles de bain.",
    showFeatures: false,
    fields: [
      { key: "surface_area",   label: "Surface au sol (m²)",          required: true  },
      { key: "land_area",      label: "Surface de la parcelle (m²)",  required: false },
      { key: "parking_spaces", label: "Parkings / Quais",             required: false },
      { key: "year_built",     label: "Année de construction",        required: false },
    ],
  },
};

const DEFAULT_RULES = {
  hint: null,
  showFeatures: true,
  fields: [
    { key: "surface_area",   label: "Surface (m²)",        required: false },
    { key: "land_area",      label: "Terrain (m²)",        required: false },
    { key: "bedrooms",       label: "Chambres",            required: false },
    { key: "bathrooms",      label: "Salles de bain",      required: false },
    { key: "parking_spaces", label: "Parking",             required: false },
    { key: "floor_number",   label: "Étage",               required: false },
    { key: "total_floors",   label: "Étages total",        required: false },
    { key: "year_built",     label: "Année construction",  required: false },
  ],
};

/** Normalise un nom/slug pour la comparaison (retire accents, espaces, casse) */
export const normalizeSlug = (str) =>
  (str || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, "");

/**
 * Retourne les règles actives pour un type sélectionné.
 * @param {Array}  types          - liste des types [{id, name, slug}]
 * @param {string} selectedTypeId - id du type sélectionné dans le formulaire
 */
export const getTypeRules = (types, selectedTypeId) => {
  if (!selectedTypeId || !types?.length) return DEFAULT_RULES;
  const selected = types.find((t) => String(t.id) === String(selectedTypeId));
  if (!selected) return DEFAULT_RULES;
  const slug = normalizeSlug(selected.slug || selected.name);
  return TYPE_RULES[slug] || DEFAULT_RULES;
};

/**
 * Retourne les clés masquées pour un jeu de règles donné.
 */
export const getHiddenKeys = (rules) => {
  const visible = new Set((rules || DEFAULT_RULES).fields.map((f) => f.key));
  return ALL_CHAR_KEYS.filter((k) => !visible.has(k));
};

/**
 * Remet à "" les champs masqués dans formData lors d'un changement de type.
 */
export const resetHiddenFields = (rules, formData) => {
  const reset = {};
  getHiddenKeys(rules).forEach((k) => { reset[k] = ""; });
  return { ...formData, ...reset };
};

export { ALL_CHAR_KEYS, TYPE_RULES, DEFAULT_RULES };
