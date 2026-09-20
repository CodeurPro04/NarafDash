import { useEffect, useMemo, useRef, useState } from 'react';
import { Search, Send, X, Loader2 } from 'lucide-react';
import { resolveMediaUrl } from '../../utils/media';

const getInitials = (name) =>
  (name || '?')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('') || '?';

// Ordre et libelle des sections : tous les comptes sont deja affiches des
// l'ouverture (sans avoir a taper), regroupes par role pour s'y retrouver.
const ROLE_GROUP_ORDER = ['admin', 'gestionnaire', 'agent', 'entreprise', 'proprietaire', 'investisseur', 'visiteur'];
const ROLE_GROUP_LABELS = {
  admin: 'Administrateurs',
  administrateur: 'Administrateurs',
  gestionnaire: 'Gestionnaires',
  agent: 'Agents',
  entreprise: 'Partenaires',
  proprietaire: 'Proprietaires',
  investisseur: 'Investisseurs',
  visiteur: 'Visiteurs',
};

const groupByRole = (list) => {
  const groups = new Map();
  list.forEach((person) => {
    const slug = person.role?.slug || 'autre';
    if (!groups.has(slug)) groups.set(slug, []);
    groups.get(slug).push(person);
  });

  const orderedSlugs = [
    ...ROLE_GROUP_ORDER.filter((slug) => groups.has(slug)),
    ...[...groups.keys()].filter((slug) => !ROLE_GROUP_ORDER.includes(slug)),
  ];

  return orderedSlugs.map((slug) => ({
    slug,
    label: ROLE_GROUP_LABELS[slug] || 'Autres',
    people: groups.get(slug),
  }));
};

/**
 * Modale generique "Nouvelle conversation" pour le backoffice : tous les
 * comptes sont charges et affiches directement (regroupes par role), pas
 * besoin de taper quoi que ce soit pour les voir ; un champ de recherche reste
 * disponible pour filtrer si la liste est longue. Reutilisee par les vues
 * agent/gestionnaire pour eviter de dupliquer la logique de recherche + envoi.
 */
const NewConversationModal = ({ onClose, onSearch, onSend, getRoleLabel }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(true);
  const [selected, setSelected] = useState(null);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);

  // Le composant parent (agent/gestionnaire) se rafraichit tout seul en tache
  // de fond (liste des messages, fil ouvert), ce qui recree sa fonction
  // onSearch a chaque re-render. En la lisant via une ref plutot qu'en
  // dependance d'effet, ce rafraichissement du parent ne relance plus la
  // recherche ici : la liste ne "saute" plus et on peut scroller/choisir
  // tranquillement. Seule une vraie saisie dans le champ relance la requete.
  const onSearchRef = useRef(onSearch);
  useEffect(() => {
    onSearchRef.current = onSearch;
  }, [onSearch]);

  useEffect(() => {
    if (selected) return undefined;
    const timeout = setTimeout(async () => {
      setSearching(true);
      try {
        const list = await onSearchRef.current(query.trim());
        setResults(Array.isArray(list) ? list : []);
      } catch (error) {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, query.trim() ? 300 : 0);
    return () => clearTimeout(timeout);
  }, [query, selected]);

  const groups = useMemo(() => groupByRole(results), [results]);

  const handleSend = async () => {
    const text = draft.trim();
    if (!selected || !text || sending) return;
    setSending(true);
    try {
      await onSend({ recipient: selected, message: text });
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="surface-card w-full max-w-md overflow-hidden">
        <div className="flex items-center justify-between border-b border-[rgba(15,42,46,0.08)] px-5 py-4">
          <h4 className="text-lg font-semibold text-[rgb(var(--ink))]">Nouvelle conversation</h4>
          <button type="button" onClick={onClose} className="text-[rgba(15,42,46,0.4)] hover:text-[rgb(var(--ink))]">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
          {!selected ? (
            <div>
              <label className="text-sm font-medium text-[rgb(var(--ink))]">Destinataire</label>
              <div className="relative mt-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[rgba(15,42,46,0.45)]" />
                <input
                  type="text"
                  autoFocus
                  placeholder="Filtrer par nom (facultatif)..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[rgb(var(--line))] bg-white/70 text-sm focus:outline-none focus:ring-2 focus:ring-[rgba(199,109,74,0.3)]"
                />
              </div>
              <div className="mt-3 space-y-3 max-h-72 overflow-y-auto">
                {searching ? (
                  <p className="text-xs text-[rgba(15,42,46,0.5)] px-1">Chargement des comptes...</p>
                ) : results.length === 0 ? (
                  <p className="text-xs text-[rgba(15,42,46,0.45)] px-1">Aucun utilisateur trouve.</p>
                ) : (
                  groups.map((group) => (
                    <div key={group.slug}>
                      <p className="px-1 mb-1 text-[10px] font-semibold uppercase tracking-wide text-[rgba(15,42,46,0.4)]">
                        {group.label} ({group.people.length})
                      </p>
                      <div className="space-y-1">
                        {group.people.map((person) => (
                          <button
                            key={person.id}
                            type="button"
                            onClick={() => setSelected(person)}
                            className="w-full flex items-center gap-3 px-2 py-2.5 rounded-xl hover:bg-[rgba(15,42,46,0.04)] text-left transition"
                          >
                            {person.avatar ? (
                              <img
                                src={resolveMediaUrl(person.avatar)}
                                alt={person.full_name}
                                className="h-9 w-9 shrink-0 rounded-lg object-cover"
                              />
                            ) : (
                              <div className="h-9 w-9 shrink-0 rounded-lg bg-[rgb(var(--ink))] text-white flex items-center justify-center text-xs font-semibold">
                                {getInitials(person.full_name)}
                              </div>
                            )}
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium text-[rgb(var(--ink))] truncate">{person.full_name}</p>
                              <p className="text-xs text-[rgba(15,42,46,0.5)] truncate">{getRoleLabel(person)}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3">
                {selected.avatar ? (
                  <img
                    src={resolveMediaUrl(selected.avatar)}
                    alt={selected.full_name}
                    className="h-11 w-11 rounded-xl object-cover"
                  />
                ) : (
                  <div className="h-11 w-11 rounded-xl bg-[rgb(var(--ink))] text-white flex items-center justify-center text-sm font-semibold">
                    {getInitials(selected.full_name)}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-[rgb(var(--ink))] truncate">{selected.full_name}</p>
                  <p className="text-xs text-[rgba(15,42,46,0.5)] truncate">{getRoleLabel(selected)}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelected(null)}
                  className="text-xs text-[rgb(var(--clay))] hover:underline shrink-0"
                >
                  Changer
                </button>
              </div>
              <div>
                <label className="text-sm font-medium text-[rgb(var(--ink))]">Votre message</label>
                <textarea
                  rows={4}
                  autoFocus
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ecrivez votre message... (Entree pour envoyer, Maj+Entree pour un saut de ligne)"
                  className="mt-2 w-full rounded-2xl border border-[rgb(var(--line))] bg-white/70 px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[rgba(199,109,74,0.3)]"
                />
              </div>
            </>
          )}
        </div>

        {selected && (
          <div className="flex justify-end gap-2 border-t border-[rgba(15,42,46,0.08)] px-5 py-4">
            <button type="button" onClick={onClose} className="btn-ghost text-sm">
              Annuler
            </button>
            <button
              type="button"
              onClick={handleSend}
              disabled={!draft.trim() || sending}
              className="btn-primary text-sm disabled:opacity-50"
            >
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Envoyer
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default NewConversationModal;
