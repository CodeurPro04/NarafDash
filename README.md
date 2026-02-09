# Back Office Immobilier NARAF

Application web de back office premium pour la gestion d'une plateforme immobilière, développée en React avec Tailwind CSS et intégration API Laravel.

## ✨ Fonctionnalités Premium

### 🎨 Design Exceptionnel
- **Interface Dark Mode** avec gradients élégants
- **Animations fluides** et transitions modernes
- **Responsive Design** adapté à tous les écrans
- **Composants Glassmorphism** avec effets de flou
- **Icônes Lucide React** pour une cohérence visuelle

### 🔐 Gestion des Rôles Utilisateurs

#### Administrateur (accès total)
- **Tableau de bord** avec statistiques avancées et métriques en temps réel
- **Gestion des utilisateurs** : création, modification, activation/désactivation
- **Supervision complète** de la plateforme
- **Analyses et rapports** détaillés

#### Gestionnaire
- **Tableau de bord** avec propriétés en attente d'assignation
- **Gestion des propriétés** : visualisation et assignation aux agents
- **Rapports d'activité** et métriques de performance

#### Agent Immobilier
- **Tableau de bord** personnalisé avec tâches prioritaires
- **Validation des propriétés** avec interface intuitive
- **Gestion des messages clients** et suivi des demandes
- **CRM simplifié** pour la relation client

## 🚀 Technologies Utilisées

- **Frontend**: React 18 avec Hooks
- **Routing**: React Router DOM v6
- **Styling**: Tailwind CSS avec design system personnalisé
- **Icônes**: Lucide React
- **HTTP Client**: Axios pour l'API
- **Build Tool**: Vite
- **Backend**: Laravel (API REST)

## 📦 Installation et Configuration

### Prérequis
- Node.js 16+
- npm ou yarn
- Backend Laravel configuré

### Installation

1. **Cloner le repository**
```bash
git clone <repository-url>
cd naraf-backoffice
```

2. **Installer les dépendances**
```bash
npm install
```

3. **Configuration de l'environnement**
```bash
cp .env.example .env
```

Éditez le fichier `.env` :
```env
VITE_API_URL=http://localhost:8000/api
VITE_APP_NAME=NARAF Immobilier
VITE_APP_VERSION=2.0.0
```

4. **Démarrer le serveur de développement**
```bash
npm run dev
```

L'application sera disponible sur `http://localhost:5173`

## 🔗 Intégration API Laravel

### Configuration du Backend

Assurez-vous que votre API Laravel inclut les endpoints suivants :

#### Authentification
```php
POST   /api/login
POST   /api/logout
GET    /api/profile
POST   /api/refresh
```

#### Utilisateurs (Admin)
```php
GET    /api/users
GET    /api/users/{id}
POST   /api/users
PUT    /api/users/{id}
DELETE /api/users/{id}
PATCH  /api/users/{id}/toggle-status
```

#### Propriétés
```php
GET    /api/properties
GET    /api/properties/{id}
POST   /api/properties
PUT    /api/properties/{id}
DELETE /api/properties/{id}
PATCH  /api/properties/{id}/validate
PATCH  /api/properties/{id}/assign
```

#### Messages
```php
GET    /api/messages
GET    /api/messages/{id}
POST   /api/messages
PUT    /api/messages/{id}
DELETE /api/messages/{id}
PATCH  /api/messages/{id}/read
POST   /api/messages/{id}/reply
```

#### Statistiques
```php
GET    /api/dashboard/stats
GET    /api/admin/stats
GET    /api/manager/stats
GET    /api/agent/stats
```

### Structure des Données

#### Utilisateur
```json
{
  "id": 1,
  "name": "Jean Dupont",
  "email": "jean@example.com",
  "role": "agent|manager|admin",
  "status": "active|inactive",
  "phone": "+33 6 12 34 56 78",
  "join_date": "2024-01-15"
}
```

#### Propriété
```json
{
  "id": 1,
  "title": "Appartement 3 pièces Paris",
  "description": "Magnifique appartement...",
  "price": 350000,
  "type": "Appartement|Maison|Studio",
  "location": "Paris 15ème",
  "status": "pending|assigned|validated|rejected",
  "owner_id": 1,
  "agent_id": null
}
```

### Gestion des Erreurs API

Le service API gère automatiquement :
- **Authentification** : redirection vers login si token expiré
- **Erreurs 401/403** : gestion des permissions
- **Erreurs réseau** : retry automatique
- **Messages d'erreur** : affichage utilisateur friendly

## 🎯 Comptes de Test

| Rôle | Email | Mot de passe |
|------|-------|-------------|
| Administrateur | admin@example.com | admin |
| Gestionnaire | manager@example.com | manager |
| Agent | agent@example.com | agent |

## 📱 Fonctionnalités Responsive

- **Desktop** : Interface complète avec sidebar
- **Tablet** : Adaptation des grilles et navigation
- **Mobile** : Menu hamburger et composants empilés

## 🎨 Personnalisation du Design

### Couleurs Principales
```css
--primary: #3B82F6 (Blue-500)
--secondary: #8B5CF6 (Purple-500)
--success: #10B981 (Green-500)
--warning: #F59E0B (Orange-500)
--danger: #EF4444 (Red-500)
--dark: #0F172A (Slate-900)
```

### Thèmes
- **Dark Theme** par défaut (optimisé pour le travail prolongé)
- Support pour thème clair (extensible)

## 🔧 Scripts Disponibles

```bash
npm run dev          # Démarrage développement
npm run build        # Build production
npm run preview      # Prévisualisation build
npm run lint         # Vérification ESLint
```

## 📊 Métriques et Analytics

### Dashboard Admin
- Nombre total de propriétés
- Utilisateurs actifs
- Messages non lus
- Revenus mensuels
- Taux de conversion
- Performance des agents

### Dashboard Manager
- Propriétés en attente
- Assignations en cours
- Validation rate
- Temps de traitement moyen

### Dashboard Agent
- Tâches en attente
- Messages clients
- Propriétés validées
- Satisfaction client

## 🚀 Déploiement

### Build Production
```bash
npm run build
```

### Variables d'Environnement Production
```env
VITE_API_URL=https://api.naraf-immobilier.com/api
VITE_APP_ENV=production
```

### Serveur Web
L'application peut être servie par n'importe quel serveur web statique (Nginx, Apache, etc.)

## 🤝 Contribution

1. Fork le projet
2. Créer une branche feature (`git checkout -b feature/AmazingFeature`)
3. Commit les changements (`git commit -m 'Add some AmazingFeature'`)
4. Push vers la branche (`git push origin feature/AmazingFeature`)
5. Ouvrir une Pull Request

## 📝 Licence

Ce projet est sous licence MIT - voir le fichier [LICENSE](LICENSE) pour plus de détails.

## 👥 Équipe NARAF

- **Développement Frontend**: Équipe React
- **Design UX/UI**: Équipe Design
- **Backend API**: Équipe Laravel
- **Product Management**: Direction NARAF

---

**NARAF Immobilier** - Plateforme professionnelle de gestion immobilière © 2024