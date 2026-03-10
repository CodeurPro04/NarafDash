const getBaseUrl = () => {
  const apiUrl = import.meta.env.VITE_API_URL || 'https://api.africabuildinvest.com/api';
  return apiUrl.replace(/\/api\/?$/, '');
};

export const resolveMediaUrl = (path) => {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  if (path.startsWith('/api/')) {
    return `${getBaseUrl()}${path}`;
  }
  const baseUrl = import.meta.env.VITE_STORAGE_URL || getBaseUrl();
  const normalized = path.startsWith('/') ? path.slice(1) : path;
  if (normalized.startsWith('storage/')) {
    return `${baseUrl}/${normalized}`;
  }
  return `${baseUrl}/storage/${normalized}`;
};
