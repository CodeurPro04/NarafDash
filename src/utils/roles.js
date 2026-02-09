export const ROLES = {
  ADMIN: 'admin',
  MANAGER: 'gestionnaire',
  AGENT: 'agent',
  OWNER: 'proprietaire',
  VISITOR: 'visiteur',
  INVESTOR: 'investisseur',
  COMPANY: 'entreprise'
};

export const PERMISSIONS = {
  [ROLES.ADMIN]: ['read', 'write', 'delete', 'manage_users', 'assign_properties'],
  [ROLES.MANAGER]: ['read', 'write', 'assign_properties'],
  [ROLES.AGENT]: ['read', 'write', 'validate_properties', 'manage_messages'],
  [ROLES.OWNER]: ['read', 'write', 'manage_own_properties'],
  [ROLES.VISITOR]: ['read', 'send_messages', 'create_requests'],
  [ROLES.INVESTOR]: ['read', 'invest', 'view_proposals'],
  [ROLES.COMPANY]: ['read', 'apply_partnership', 'manage_applications']
};