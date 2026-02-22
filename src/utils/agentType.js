export const normalizeAgentType = (value) => {
  const raw = String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  if (!raw) return "immobilier";

  if (["constructeur", "construction", "builder"].includes(raw)) {
    return "constructeur";
  }

  if (["investissement", "investisseur", "investment"].includes(raw)) {
    return "investissement";
  }

  return "immobilier";
};
