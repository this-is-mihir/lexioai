/**
 * Page-level permissions mapping
 * Maps page routes to required module + action permissions
 */
export const PAGE_PERMISSIONS = {
  dashboard: null, // Always accessible
  analytics: 'analytics.view',
  users: 'users.view',
  bots: 'bots.view',
  conversations: 'conversations.view',
  plans: 'plans.view',
  coupons: 'coupons.view',
  announcements: 'announcements.view',
  tickets: 'tickets.view',
  blog: 'blog.view', // ✅ Now checks blog permission
  audit: 'audit.view',
  admins: 'admins.view',
  settings: 'settings.view',
  // ❌ REMOVED: 'ai-keys' - SuperAdmin only (hard-coded in DashboardLayout)
  // ❌ REMOVED: 'payments' - Feature doesn't exist
}

/**
 * Check if user has permission for a page
 * @param {Object} admin - Admin user object
 * @param {String} pageName - Page route name (e.g., 'users', 'bots')
 * @returns {Boolean} - Whether user can access the page
 */
export const canAccessPage = (admin, pageName) => {
  // Superadmin can access everything
  if (admin?.role === 'superadmin') return true

  // API-Keys: SuperAdmin only (hard-coded access check)
  if (pageName === 'ai-keys') {
    return admin?.role === 'superadmin'
  }

  // Settings: SuperAdmin only (hard-coded access check)
  if (pageName === 'settings') {
    return admin?.role === 'superadmin'
  }

  // Get required permission for page
  const requiredPermission = PAGE_PERMISSIONS[pageName]

  // If no permission required, anyone can access
  if (!requiredPermission) return true

  // Parse permission string (e.g., 'users.view' -> ['users', 'view'])
  const [module, action] = requiredPermission.split('.')

  // Check if user has the permission
  return admin?.permissions?.[module]?.[action] === true
}

/**
 * Filter navigation items based on user permissions
 * @param {Array} navItems - Original navigation items array
 * @param {Object} admin - Admin user object
 * @returns {Array} - Filtered navigation items
 */
export const filterNavByPermissions = (navItems, admin) => {
  if (admin?.role === 'superadmin') return navItems

  return navItems
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => {
        const pageName = item.path.split('/')[1] || 'dashboard'
        return canAccessPage(admin, pageName)
      }),
    }))
    .filter((section) => section.items.length > 0) // Remove empty sections
}

/**
 * Check if user can perform action on module
 * @param {Object} admin - Admin user object
 * @param {String} module - Module name (e.g., 'users', 'bots')
 * @param {String} action - Action name (e.g., 'view', 'edit', 'delete')
 * @returns {Boolean}
 */
export const hasPermission = (admin, module, action) => {
  if (admin?.role === 'superadmin') return true
  return admin?.permissions?.[module]?.[action] === true
}
