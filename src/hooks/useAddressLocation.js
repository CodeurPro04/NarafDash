import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Codes ISO 3166-1 alpha-2 de tous les pays/territoires d'Afrique : les
// suggestions et la recherche d'adresse restent centrees sur le continent
// plutot que le monde entier.
export const AFRICA_COUNTRY_CODES = [
  'dz', 'ao', 'bj', 'bw', 'bf', 'bi', 'cv', 'cm', 'cf', 'td', 'km', 'cd', 'cg',
  'ci', 'dj', 'eg', 'gq', 'er', 'sz', 'et', 'ga', 'gm', 'gh', 'gn', 'gw', 'ke',
  'ls', 'lr', 'ly', 'mg', 'mw', 'ml', 'mr', 'mu', 'yt', 're', 'ma', 'mz', 'na',
  'ne', 'ng', 'rw', 'sh', 'st', 'sn', 'sc', 'sl', 'so', 'za', 'ss', 'sd', 'tz',
  'tg', 'tn', 'ug', 'eh', 'zm', 'zw',
].join(',');

export const DEFAULT_MAP_CENTER = { lat: 5.36, lng: -4.0083 }; // Abidjan, par defaut

// Repere de carte (pin) en SVG inline : evite le probleme classique des icones
// par defaut de Leaflet qui ne se chargent pas correctement avec les bundlers.
const MAP_PIN_ICON = L.divIcon({
  className: '',
  html: `<div style="width:30px;height:30px;transform:translate(-50%,-100%);">
    <svg viewBox="0 0 24 24" width="30" height="30" fill="rgb(199,109,74)" stroke="white" stroke-width="1">
      <path d="M12 2c-4.4 0-8 3.6-8 8 0 5.4 7 12 8 12s8-6.6 8-12c0-4.4-3.6-8-8-8zm0 11a3 3 0 1 1 0-6 3 3 0 0 1 0 6z"/>
    </svg>
  </div>`,
  iconSize: [30, 30],
  iconAnchor: [15, 30],
});

export const extractCityFromAddress = (address) => (
  address?.city || address?.town || address?.village || address?.municipality || address?.county || ''
);

/**
 * Suggestions d'adresse + carte interactive + geolocalisation, partagees par
 * tous les formulaires (propriete, construction...) qui ont un champ adresse.
 * `onResolved({ address, city, lat, lng })` est appele des qu'une position est
 * choisie (suggestion cliquee, carte cliquee/glissee, ou "Me localiser") ; le
 * composant appelant reste libre de mapper `address`/`city` sur ses propres
 * champs de formulaire.
 */
export function useAddressLocation({ onResolved } = {}) {
  const [suggestions, setSuggestions] = useState([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [markerPosition, setMarkerPosition] = useState(null);
  const [locating, setLocating] = useState(false);
  const [reverseGeocoding, setReverseGeocoding] = useState(false);
  const [geoError, setGeoError] = useState('');

  const debounceRef = useRef(null);
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerInstanceRef = useRef(null);

  const fetchSuggestions = async (query) => {
    try {
      setLoadingSuggestions(true);
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=8&countrycodes=${AFRICA_COUNTRY_CODES}&q=${encodeURIComponent(query)}`
      );
      const data = await response.json();
      setSuggestions(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Erreur suggestions de localisation:', err);
      setSuggestions([]);
    } finally {
      setLoadingSuggestions(false);
    }
  };

  const handleInputChange = (value) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (value.trim().length < 3) {
      setSuggestions([]);
      return;
    }
    debounceRef.current = setTimeout(() => fetchSuggestions(value.trim()), 400);
  };

  const reverseGeocode = async (lat, lng) => {
    try {
      setReverseGeocoding(true);
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`
      );
      const data = await response.json();
      if (data && data.display_name) {
        onResolved?.({ address: data.display_name, city: extractCityFromAddress(data.address), lat, lng });
      }
    } catch (err) {
      console.error('Erreur de geocodage inverse:', err);
    } finally {
      setReverseGeocoding(false);
    }
  };

  const selectSuggestion = (item) => {
    setSuggestions([]);
    const lat = parseFloat(item.lat);
    const lng = parseFloat(item.lon);
    setMarkerPosition({ lat, lng });
    onResolved?.({ address: item.display_name, city: extractCityFromAddress(item.address), lat, lng });
  };

  const locateMe = () => {
    if (!navigator.geolocation) {
      setGeoError('La geolocalisation n’est pas prise en charge par ce navigateur.');
      return;
    }
    setGeoError('');
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const position = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setMarkerPosition(position);
        setShowMap(true);
        reverseGeocode(position.lat, position.lng);
        setLocating(false);
      },
      () => {
        setGeoError('Impossible d’obtenir votre position (autorisation refusee ou indisponible).');
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const reset = () => {
    setSuggestions([]);
    setShowMap(false);
    setMarkerPosition(null);
    setGeoError('');
  };

  const clearSuggestions = () => setSuggestions([]);

  // Initialise la carte Leaflet uniquement quand le panneau est ouvert.
  useEffect(() => {
    if (!showMap || !mapContainerRef.current) return undefined;

    const center = markerPosition || DEFAULT_MAP_CENTER;
    const map = L.map(mapContainerRef.current, { attributionControl: false }).setView([center.lat, center.lng], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap',
    }).addTo(map);

    const marker = L.marker([center.lat, center.lng], { draggable: true, icon: MAP_PIN_ICON }).addTo(map);
    marker.on('dragend', () => {
      const pos = marker.getLatLng();
      setMarkerPosition({ lat: pos.lat, lng: pos.lng });
      reverseGeocode(pos.lat, pos.lng);
    });
    map.on('click', (event) => {
      marker.setLatLng(event.latlng);
      setMarkerPosition({ lat: event.latlng.lat, lng: event.latlng.lng });
      reverseGeocode(event.latlng.lat, event.latlng.lng);
    });

    mapInstanceRef.current = map;
    markerInstanceRef.current = marker;
    setTimeout(() => map.invalidateSize(), 150);

    return () => {
      map.remove();
      mapInstanceRef.current = null;
      markerInstanceRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showMap]);

  // Recentre la carte/le repere quand la position change depuis l'exterieur
  // (suggestion choisie, ou "Me localiser").
  useEffect(() => {
    if (mapInstanceRef.current && markerInstanceRef.current && markerPosition) {
      markerInstanceRef.current.setLatLng([markerPosition.lat, markerPosition.lng]);
      mapInstanceRef.current.setView([markerPosition.lat, markerPosition.lng], mapInstanceRef.current.getZoom());
    }
  }, [markerPosition]);

  return {
    suggestions,
    loadingSuggestions,
    showMap,
    setShowMap,
    markerPosition,
    locating,
    reverseGeocoding,
    geoError,
    mapContainerRef,
    fetchSuggestions,
    handleInputChange,
    selectSuggestion,
    clearSuggestions,
    locateMe,
    reset,
  };
}
