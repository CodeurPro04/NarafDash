export const formatFcfa = (value, fallback = 'N/A') => {
  if (value === null || value === undefined || value === '') return fallback;

  const amount = Number(value);
  if (Number.isNaN(amount)) return fallback;

  return `${amount.toLocaleString('fr-FR')} FCFA`;
};

export const formatFcfaRange = (min, max, fallback = 'N/A') => {
  const hasMin = min !== null && min !== undefined && min !== '';
  const hasMax = max !== null && max !== undefined && max !== '';

  if (hasMin && hasMax) {
    return `${formatFcfa(min, fallback)} - ${formatFcfa(max, fallback)}`;
  }

  if (hasMin) return `A partir de ${formatFcfa(min, fallback)}`;
  if (hasMax) return `Jusqu'a ${formatFcfa(max, fallback)}`;
  return fallback;
};
