import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Bell, X, Check, CheckCheck, ChevronRight, Loader, Send, ChevronDown } from 'lucide-react'
import adminApi from '../../api/axios'
import useAuthStore from '../../store/authStore'
import toast from 'react-hot-toast'

// ================================================================
// CUSTOM DROPDOWN COMPONENT FOR ROLES
// ================================================================
const RoleDropdown = ({ roles, selectedRole, onRoleChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3 py-2 bg-[var(--bg-hover)] border border-[var(--border)] rounded-lg text-sm text-[var(--text)] hover:border-primary-500/50 transition-colors"
      >
        <span>{selectedRole ? roles.find(r => r._id === selectedRole)?.name : 'All Roles'}</span>
        <ChevronDown className={`w-4 h-4 text-[var(--text-muted)] transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="absolute top-full mt-1 left-0 right-0 bg-[var(--bg-card)] border border-[var(--border)] rounded-lg shadow-lg z-50 max-h-48 overflow-y-auto"
          >
            <button
              type="button"
              onClick={() => {
                onRoleChange(null);
                setIsOpen(false);
              }}
              className={`w-full text-left px-3 py-2 text-sm transition-colors hover:bg-[var(--bg-hover)] ${
                !selectedRole ? 'bg-primary-500/10 text-primary-400' : 'text-[var(--text)]'
              }`}
            >
              All Roles
            </button>
            {roles.map(role => (
              <button
                type="button"
                key={role._id}
                onClick={() => {
                  onRoleChange(role._id);
                  setIsOpen(false);
                }}
                className={`w-full text-left px-3 py-2 text-sm transition-colors hover:bg-[var(--bg-hover)] flex items-center justify-between ${
                  selectedRole === role._id ? 'bg-primary-500/10 text-primary-400' : 'text-[var(--text)]'
                }`}
              >
                {role.name}
                {selectedRole === role._id && <Check className="w-4 h-4" />}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ================================================================
// CUSTOM MULTI-SELECT DROPDOWN COMPONENT FOR ADMINS
// ================================================================
const AdminMultiSelect = ({ admins, selectedAdmins, onSelectionChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const handleToggleAdmin = (adminId) => {
    const newSelection = selectedAdmins.includes(adminId)
      ? selectedAdmins.filter(id => id !== adminId)
      : [...selectedAdmins, adminId];
    onSelectionChange(newSelection);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3 py-2 bg-[var(--bg-hover)] border border-[var(--border)] rounded-lg text-sm text-[var(--text)] hover:border-primary-500/50 transition-colors"
      >
        <span>
          {selectedAdmins.length === 0
            ? 'Select Recipients'
            : `${selectedAdmins.length} selected`}
        </span>
        <ChevronDown className={`w-4 h-4 text-[var(--text-muted)] transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Selected tags */}
      {selectedAdmins.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {selectedAdmins.map(adminId => {
            const admin = admins.find(a => a._id === adminId);
            return admin ? (
              <div
                key={adminId}
                className="inline-flex items-center gap-1 px-2 py-1 bg-primary-500/10 border border-primary-500/20 rounded text-xs text-primary-400"
              >
                {admin.name}
                <button
                  type="button"
                  onClick={() => handleToggleAdmin(adminId)}
                  className="hover:text-primary-300 transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ) : null;
          })}
        </div>
      )}

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="absolute top-full mt-1 left-0 right-0 bg-[var(--bg-card)] border border-[var(--border)] rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto"
          >
            {admins.length === 0 ? (
              <div className="px-3 py-4 text-sm text-[var(--text-muted)] text-center">
                No admins available
              </div>
            ) : (
              admins.map(admin => (
                <button
                  type="button"
                  key={admin._id}
                  onClick={() => handleToggleAdmin(admin._id)}
                  className={`w-full text-left px-3 py-2.5 text-sm transition-colors hover:bg-[var(--bg-hover)] flex items-center gap-2 ${
                    selectedAdmins.includes(admin._id)
                      ? 'bg-primary-500/10 text-primary-400'
                      : 'text-[var(--text)]'
                  }`}
                >
                  <div className={`w-4 h-4 rounded border transition-all ${
                    selectedAdmins.includes(admin._id)
                      ? 'bg-primary-500 border-primary-500'
                      : 'border-[var(--border)]'
                  }`}>
                    {selectedAdmins.includes(admin._id) && (
                      <Check className="w-3 h-3 text-white" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium">{admin.name}</div>
                    <div className="text-[11px] text-[var(--text-muted)]">{admin.role}</div>
                  </div>
                </button>
              ))
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ================================================================
// CUSTOM DROPDOWN COMPONENT FOR TYPE
// ================================================================
const TypeDropdown = ({ value, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const typeOptions = [
    { value: 'general_notification', label: 'General' },
    { value: 'admin_invited', label: 'Admin Invite' },
    { value: 'system_alert', label: 'System Alert' },
  ];

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const selectedOption = typeOptions.find(opt => opt.value === value);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3 py-2 bg-[var(--bg-hover)] border border-[var(--border)] rounded-lg text-sm text-[var(--text)] hover:border-primary-500/50 transition-colors"
      >
        <span>{selectedOption?.label || 'Select Type'}</span>
        <ChevronDown className={`w-4 h-4 text-[var(--text-muted)] transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="absolute top-full mt-1 left-0 right-0 bg-[var(--bg-card)] border border-[var(--border)] rounded-lg shadow-lg z-50"
          >
            {typeOptions.map(option => (
              <button
                type="button"
                key={option.value}
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                className={`w-full text-left px-3 py-2 text-sm transition-colors hover:bg-[var(--bg-hover)] flex items-center justify-between ${
                  value === option.value ? 'bg-primary-500/10 text-primary-400' : 'text-[var(--text)]'
                }`}
              >
                {option.label}
                {value === option.value && <Check className="w-4 h-4" />}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ================================================================
// CUSTOM DROPDOWN COMPONENT FOR PRIORITY
// ================================================================
const PriorityDropdown = ({ value, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const priorityOptions = [
    { value: 'low', label: 'Low' },
    { value: 'medium', label: 'Medium' },
    { value: 'high', label: 'High' },
    { value: 'critical', label: 'Critical' },
  ];

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const selectedOption = priorityOptions.find(opt => opt.value === value);
  const priorityColors = {
    low: 'text-green-400',
    medium: 'text-yellow-400',
    high: 'text-orange-400',
    critical: 'text-red-400',
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3 py-2 bg-[var(--bg-hover)] border border-[var(--border)] rounded-lg text-sm text-[var(--text)] hover:border-primary-500/50 transition-colors"
      >
        <span className={priorityColors[value] || ''}>{selectedOption?.label || 'Select Priority'}</span>
        <ChevronDown className={`w-4 h-4 text-[var(--text-muted)] transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="absolute top-full mt-1 left-0 right-0 bg-[var(--bg-card)] border border-[var(--border)] rounded-lg shadow-lg z-50"
          >
            {priorityOptions.map(option => (
              <button
                type="button"
                key={option.value}
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                className={`w-full text-left px-3 py-2 text-sm transition-colors hover:bg-[var(--bg-hover)] flex items-center justify-between ${
                  value === option.value ? 'bg-primary-500/10 text-primary-400' : 'text-[var(--text)]'
                }`}
              >
                <span className={priorityColors[option.value]}>{option.label}</span>
                {value === option.value && <Check className="w-4 h-4" />}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ================================================================
// NOTIFICATION TYPE COLORS & ICONS
// ================================================================
const getNotificationColor = (type) => {
  const colors = {
    // Admin Actions
    admin_invited: { bg: 'bg-blue-500/10', border: 'border-blue-500/20', text: 'text-blue-500', dot: 'bg-blue-500' },
    role_assigned: { bg: 'bg-purple-500/10', border: 'border-purple-500/20', text: 'text-purple-500', dot: 'bg-purple-500' },
    permissions_updated: { bg: 'bg-amber-500/10', border: 'border-amber-500/20', text: 'text-amber-500', dot: 'bg-amber-500' },
    account_status_changed: { bg: 'bg-indigo-500/10', border: 'border-indigo-500/20', text: 'text-indigo-500', dot: 'bg-indigo-500' },
    
    // Security Alerts
    security_alert: { bg: 'bg-red-500/10', border: 'border-red-500/20', text: 'text-red-500', dot: 'bg-red-500' },
    failed_login_attempts: { bg: 'bg-red-500/10', border: 'border-red-500/20', text: 'text-red-500', dot: 'bg-red-500' },
    '2fa_disabled': { bg: 'bg-orange-500/10', border: 'border-orange-500/20', text: 'text-orange-500', dot: 'bg-orange-500' },
    
    // System
    system_maintenance: { bg: 'bg-gray-500/10', border: 'border-gray-500/20', text: 'text-gray-500', dot: 'bg-gray-500' },
    new_feature: { bg: 'bg-green-500/10', border: 'border-green-500/20', text: 'text-green-500', dot: 'bg-green-500' },
    platform_update: { bg: 'bg-cyan-500/10', border: 'border-cyan-500/20', text: 'text-cyan-500', dot: 'bg-cyan-500' },
  };
  return colors[type] || colors.admin_invited;
};

// ================================================================
// TIME AGO FORMATTER
// ================================================================
const formatTimeAgo = (date) => {
  const now = new Date();
  const diff = now - new Date(date);
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

// ================================================================
// NOTIFICATION ITEM COMPONENT
// ================================================================
const NotificationItem = ({ notification, onRead, onMarkUnread, onDelete, isLoading, isSuperAdmin }) => {
  const color = getNotificationColor(notification.type);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleMarkRead = async () => {
    try {
      await onRead(notification._id);
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  };

  const handleDelete = async (e) => {
    e.stopPropagation();
    setIsDeleting(true);
    try {
      await onDelete(notification._id);
    } catch (error) {
      console.error('Failed to delete:', error);
      setIsDeleting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={`flex gap-3 p-3 rounded-lg border transition-colors cursor-pointer group
        ${notification.isRead 
          ? 'bg-[var(--bg)] border-[var(--border)]' 
          : `${color.bg} ${color.border} hover:shadow-md`
        }`}
      onClick={handleMarkRead}
      role="button"
      tabIndex={0}
    >
      {/* Dot Indicator */}
      <div className="flex-shrink-0 mt-1">
        {!notification.isRead ? (
          <div className={`w-2 h-2 rounded-full ${color.dot} animate-pulse`} />
        ) : (
          <div className="w-2 h-2 rounded-full bg-[var(--border)]" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <h4 className={`text-sm font-semibold leading-tight truncate
          ${notification.isRead ? 'text-[var(--text-muted)]' : 'text-[var(--text)]'}`}>
          {notification.title}
        </h4>
        <p className={`text-xs mt-1 leading-snug line-clamp-2
          ${notification.isRead ? 'text-[var(--text-muted)]' : 'text-[var(--text)]'}`}>
          {notification.message}
        </p>
        <p className="text-[10px] text-[var(--text-muted)] mt-1">
          {formatTimeAgo(notification.createdAt)}
        </p>
      </div>

      {/* Actions */}
      <div className="flex-shrink-0 flex items-start gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {!notification.isRead && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleMarkRead();
            }}
            className="p-1 rounded hover:bg-[var(--bg-hover)] text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
            title="Mark as read"
          >
            <Check className="w-3.5 h-3.5" />
          </button>
        )}
        {/* Delete button - available for all roles */}
        <button
          onClick={handleDelete}
          disabled={isDeleting}
          className="p-1 rounded hover:bg-red-500/10 text-[var(--text-muted)] hover:text-red-500 transition-colors disabled:opacity-50"
          title="Delete"
        >
          {isDeleting ? (
            <Loader className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <X className="w-3.5 h-3.5" />
          )}
        </button>
      </div>
    </motion.div>
  );
};

// ================================================================
// MAIN POPOVER COMPONENT
// ================================================================
export default function NotificationsPopover() {
  const navigate = useNavigate()
  const { admin } = useAuthStore();
  const isSuperAdmin = admin?.role === 'superadmin';
  
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('all'); // all | unread | system | security | send (superadmin only)
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [isMarkingAllRead, setIsMarkingAllRead] = useState(false);
  
  // Send form state
  const [sendForm, setSendForm] = useState({
    selectedAdmins: [],
    title: '',
    message: '',
    type: 'general_notification',
    priority: 'medium',
    sendEmail: false,
  });
  const [allAdmins, setAllAdmins] = useState([]);
  const [allRoles, setAllRoles] = useState([]);
  const [selectedRole, setSelectedRole] = useState(null);
  const [sendLoading, setSendLoading] = useState(false);
  
  const popoverRef = useRef(null);
  const triggerRef = useRef(null);

  // Fetch unread count (runs on mount and when popover opens)
  const fetchUnreadCount = useCallback(async () => {
    try {
      const response = await adminApi.get('/notifications/unread-count');
      setUnreadCount(response.data.data.unreadCount || 0);
    } catch (error) {
      console.error('Failed to fetch unread count:', error);
    }
  }, []);

  // Fetch notifications based on active tab
  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      let url = '/notifications?page=1&limit=10';
      
      if (activeTab === 'unread') {
        url += '&isRead=false';
      } else if (activeTab === 'system') {
        url += '&category=system';
      } else if (activeTab === 'security') {
        url += '&category=security';
      }

      const response = await adminApi.get(url);
      setNotifications(response.data.data.notifications || []);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
      toast.error('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  // Open popover - fetch notifications
  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
      fetchUnreadCount();
    }
  }, [isOpen, activeTab, fetchNotifications, fetchUnreadCount]);

  // Mark notification as read
  const handleMarkAsRead = async (notificationId) => {
    try {
      await adminApi.post(`/notifications/${notificationId}/read`);
      
      // Update local state
      setNotifications(prev =>
        prev.map(n =>
          n._id === notificationId ? { ...n, isRead: true, readAt: new Date() } : n
        )
      );
      
      // Update unread count
      fetchUnreadCount();
    } catch (error) {
      console.error('Failed to mark as read:', error);
      toast.error('Failed to mark as read');
      throw error;
    }
  };

  // Mark all as read
  const handleMarkAllAsRead = async () => {
    setIsMarkingAllRead(true);
    try {
      await adminApi.post('/notifications/read-all');
      
      // Update local state
      setNotifications(prev =>
        prev.map(n => ({ ...n, isRead: true, readAt: new Date() }))
      );
      
      setUnreadCount(0);
      toast.success('All notifications marked as read');
    } catch (error) {
      console.error('Failed to mark all as read:', error);
      toast.error('Failed to mark all as read');
    } finally {
      setIsMarkingAllRead(false);
    }
  };

  // Delete notification
  const handleDeleteNotification = async (notificationId) => {
    try {
      await adminApi.delete(`/notifications/${notificationId}`);
      
      // Update local state
      setNotifications(prev => prev.filter(n => n._id !== notificationId));
      
      // Update unread count if deleted notification was unread
      fetchUnreadCount();
      toast.success('Notification deleted');
    } catch (error) {
      console.error('Failed to delete notification:', error);
      toast.error('Failed to delete notification');
      throw error;
    }
  };

  // Close popover when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        popoverRef.current &&
        triggerRef.current &&
        !popoverRef.current.contains(event.target) &&
        !triggerRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Fetch all admins and roles for sending notifications (SuperAdmin only)
  useEffect(() => {
    if (isSuperAdmin && activeTab === 'send' && allAdmins.length === 0) {
      const fetchAdminsAndRoles = async () => {
        try {
          // Fetch admins
          const adminsResponse = await adminApi.get('/admins?limit=100');
          setAllAdmins(adminsResponse.data.data.admins || []);
          
          // Fetch roles
          const rolesResponse = await adminApi.get('/roles');
          setAllRoles(rolesResponse.data.data.roles || []);
        } catch (error) {
          console.error('Failed to fetch admins or roles:', error);
        }
      };
      fetchAdminsAndRoles();
    }
  }, [activeTab, isSuperAdmin, allAdmins.length]);

  // Handle send notification
  const handleSendNotification = async (e) => {
    e.preventDefault();
    
    if (sendForm.selectedAdmins.length === 0) {
      toast.error('Please select at least one admin');
      return;
    }

    if (!sendForm.title.trim()) {
      toast.error('Please enter a title');
      return;
    }

    if (!sendForm.message.trim()) {
      toast.error('Please enter a message');
      return;
    }

    setSendLoading(true);
    try {
      await adminApi.post('/notifications/send', {
        recipientAdminIds: sendForm.selectedAdmins,
        title: sendForm.title.trim(),
        message: sendForm.message.trim(),
        type: sendForm.type,
        priority: sendForm.priority,
        sendEmail: sendForm.sendEmail,
      });

      toast.success(`Notification sent to ${sendForm.selectedAdmins.length} admin(s)`);
      
      // Reset form
      setSendForm({
        selectedAdmins: [],
        title: '',
        message: '',
        type: 'general_notification',
        priority: 'medium',
        sendEmail: false,
      });

      // Return to all tab
      setActiveTab('all');
    } catch (error) {
      console.error('Failed to send notification:', error);
      toast.error(error.response?.data?.message || 'Failed to send notification');
    } finally {
      setSendLoading(false);
    }
  };

  // Filter notifications based on active tab
  const filteredNotifications = notifications.filter(n => {
    if (activeTab === 'unread') return !n.isRead;
    if (activeTab === 'system') return n.category === 'system';
    if (activeTab === 'security') return n.category === 'security';
    return true;
  });

  return (
    <div className="relative">
      {/* Bell Button with Badge */}
      <button
        ref={triggerRef}
        onClick={() => setIsOpen(!isOpen)}
        className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[var(--bg-hover)] text-[var(--text-muted)] hover:text-[var(--text)] transition-all relative group"
        title="Notifications"
      >
        <Bell className="w-4 h-4" />
        
        {/* Badge */}
        {unreadCount > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute top-1 right-1 w-1.5 h-1.5 bg-primary-500 rounded-full"
          />
        )}
      </button>

      {/* Popover */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            ref={popoverRef}
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            className="absolute right-0 top-full mt-2 w-96 bg-[var(--bg-card)] border border-[var(--border)] rounded-xl shadow-2xl z-50 flex flex-col max-h-[600px]"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
              <h3 className="font-semibold text-[var(--text)]">
                Notifications
                {unreadCount > 0 && (
                  <span className="ml-2 text-xs font-bold bg-primary-500/20 text-primary-400 px-2 py-0.5 rounded-full">
                    {unreadCount}
                  </span>
                )}
              </h3>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 rounded hover:bg-[var(--bg-hover)] text-[var(--text-muted)] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 px-4 py-3 border-b border-[var(--border)] overflow-x-auto">
              {[
                { id: 'all', label: 'All' },
                { id: 'unread', label: 'Unread' },
                { id: 'system', label: 'System' },
                { id: 'security', label: 'Security' },
                ...(isSuperAdmin ? [{ id: 'send', label: 'Send' }] : []),
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-3 py-1 rounded-md text-sm font-medium transition-colors whitespace-nowrap
                    ${activeTab === tab.id
                      ? 'bg-primary-500/20 text-primary-400'
                      : 'text-[var(--text-muted)] hover:bg-[var(--bg-hover)]'
                    }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Actions */}
            {unreadCount > 0 && activeTab === 'all' && (
              <div className="px-4 py-2 border-b border-[var(--border)] flex gap-2">
                <button
                  onClick={handleMarkAllAsRead}
                  disabled={isMarkingAllRead}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--bg-hover)] hover:bg-blue-500/10 text-[var(--text-muted)] hover:text-blue-400 transition-colors disabled:opacity-50 text-sm"
                >
                  {isMarkingAllRead ? (
                    <Loader className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <CheckCheck className="w-3.5 h-3.5" />
                  )}
                  Mark all read
                </button>
              </div>
            )}

            {/* Notifications List or Send Form */}
            <div className="flex-1 overflow-y-auto">
              {activeTab === 'send' && isSuperAdmin ? (
                // Send Notification Form
                <form onSubmit={handleSendNotification} className="p-4 space-y-4">
                  {/* Role Filter */}
                  <div>
                    <label className="block text-xs font-semibold text-[var(--text)] mb-2">
                      Filter by Role (Optional)
                    </label>
                    <RoleDropdown
                      roles={allRoles}
                      selectedRole={selectedRole}
                      onRoleChange={(roleId) => {
                        setSelectedRole(roleId);
                        // Reset selected admins when role changes
                        setSendForm({ ...sendForm, selectedAdmins: [] });
                      }}
                    />
                  </div>

                  {/* Select Admins */}
                  <div>
                    <label className="block text-xs font-semibold text-[var(--text)] mb-2">
                      Select Recipients
                    </label>
                    <AdminMultiSelect
                      admins={selectedRole 
                        ? allAdmins.filter(admin => admin.customRole === selectedRole)
                        : allAdmins
                      }
                      selectedAdmins={sendForm.selectedAdmins}
                      onSelectionChange={(adminIds) => {
                        setSendForm({ ...sendForm, selectedAdmins: adminIds });
                      }}
                    />
                    {sendForm.selectedAdmins.length > 0 && (
                      <p className="text-xs text-primary-400 mt-1">{sendForm.selectedAdmins.length} selected</p>
                    )}
                  </div>

                  {/* Title */}
                  <div>
                    <label className="block text-xs font-semibold text-[var(--text)] mb-1">
                      Title
                    </label>
                    <input
                      type="text"
                      placeholder="Notification title..."
                      value={sendForm.title}
                      onChange={(e) => setSendForm({ ...sendForm, title: e.target.value })}
                      className="input w-full text-sm"
                      maxLength={100}
                    />
                  </div>

                  {/* Message */}
                  <div>
                    <label className="block text-xs font-semibold text-[var(--text)] mb-1">
                      Message
                    </label>
                    <textarea
                      placeholder="Notification message..."
                      value={sendForm.message}
                      onChange={(e) => setSendForm({ ...sendForm, message: e.target.value })}
                      className="input w-full text-sm h-16 resize-none"
                      maxLength={500}
                    />
                  </div>

                  {/* Type & Priority */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-semibold text-[var(--text)] mb-1">
                        Type
                      </label>
                      <TypeDropdown
                        value={sendForm.type}
                        onChange={(value) => setSendForm({ ...sendForm, type: value })}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[var(--text)] mb-1">
                        Priority
                      </label>
                      <PriorityDropdown
                        value={sendForm.priority}
                        onChange={(value) => setSendForm({ ...sendForm, priority: value })}
                      />
                    </div>
                  </div>

                  {/* Send Button */}
                  <button
                    type="submit"
                    disabled={sendLoading || sendForm.selectedAdmins.length === 0}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-primary-500 hover:bg-primary-600 disabled:bg-primary-500/50 text-white text-sm font-semibold rounded-lg transition-colors"
                  >
                    {sendLoading ? (
                      <>
                        <Loader className="w-4 h-4 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        Send Notification
                      </>
                    )}
                  </button>
                </form>
              ) : loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader className="w-5 h-5 animate-spin text-[var(--text-muted)]" />
                </div>
              ) : filteredNotifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 px-4">
                  <Bell className="w-8 h-8 text-[var(--text-muted)] mb-2 opacity-50" />
                  <p className="text-sm text-[var(--text-muted)]">
                    {activeTab === 'all' ? 'No notifications yet' : `No ${activeTab} notifications`}
                  </p>
                </div>
              ) : (
                <div className="space-y-2 p-3">
                  <AnimatePresence>
                    {filteredNotifications.map(notification => (
                      <NotificationItem
                        key={notification._id}
                        notification={notification}
                        onRead={handleMarkAsRead}
                        onDelete={handleDeleteNotification}
                        isLoading={loading}
                        isSuperAdmin={isSuperAdmin}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </div>

            {/* Footer */}
            {notifications.length > 0 && (
              <div className="px-4 py-3 border-t border-[var(--border)]">
                <button
                  onClick={() => {
                    setIsOpen(false);
                    navigate('/notifications');
                  }}
                  className="w-full flex items-center justify-center gap-2 text-sm font-medium text-primary-400 hover:text-primary-300 transition-colors"
                >
                  View all notifications
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
