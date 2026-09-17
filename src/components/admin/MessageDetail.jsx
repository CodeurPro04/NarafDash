import React from 'react';
import { useParams, Navigate } from 'react-router-dom';

// Le detail d'un message est desormais integre directement dans la boite de
// reception (MessageManagement) sous forme de conversation. Ce lien direct
// (utilise par exemple depuis une notification) redirige vers la meme vue
// avec la conversation presequionnee, plutot que de dupliquer l'interface.
const MessageDetail = () => {
  const { uuid } = useParams();
  return <Navigate to={`/admin/messages?uuid=${uuid}`} replace />;
};

export default MessageDetail;
