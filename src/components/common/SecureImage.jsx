import React, { useEffect, useRef, useState } from 'react';
import api from '../../services/api';

const SecureImage = ({ src, alt, className }) => {
  const [resolvedSrc, setResolvedSrc] = useState('');
  const objectUrlRef = useRef('');

  useEffect(() => {
    let isActive = true;

    const setDirect = () => {
      if (isActive) {
        setResolvedSrc(src || '');
      }
    };

    const fetchImage = async () => {
      try {
        const response = await api.get(src, { responseType: 'blob' });
        if (!isActive) return;
        const objectUrl = URL.createObjectURL(response.data);
        objectUrlRef.current = objectUrl;
        setResolvedSrc(objectUrl);
      } catch (error) {
        if (isActive) {
          setResolvedSrc('');
        }
      }
    };

    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = '';
    }

    if (!src) {
      setResolvedSrc('');
    } else if (src.startsWith('blob:') || src.startsWith('data:')) {
      setDirect();
    } else if (src.includes('/api/')) {
      fetchImage();
    } else {
      setDirect();
    }

    return () => {
      isActive = false;
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = '';
      }
    };
  }, [src]);

  if (!resolvedSrc) return null;

  return <img src={resolvedSrc} alt={alt} className={className} />;
};

export default SecureImage;
