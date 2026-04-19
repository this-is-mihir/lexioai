import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bell, Trash2, X, Loader2, Check, CheckCheck,
  Search, Filter, RefreshCw, Archive, ChevronDown,
} from "lucide-react";
import adminApi from "../../api/axios";
import toast from "react-hot-toast";
import useAuthStore from "../../store/authStore";

// ================================================================
// CUSTOM DROPDOWN COMPONENT FOR TYPE
// ================================================================
const TypeDropdown = ({ value, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const typeOptions = [
    { value: "all", label: "All Types" },
    { value: "admin_invited", label: "Admin Invited" },
    { value: "role_assigned", label: "Role Assigned" },
    { value: "permissions_updated", label: "Permissions Updated" },
    { value: "account_status_changed", label: "Account Status Changed" },
    { value: "security_alert", label: "Security Alert" },
    { value: "failed_login_attempts", label: "Failed Login Attempts" },
    { value: "system_alert", label: "System Alert" },
    { value: "system_maintenance", label: "System Maintenance" },
    { value: "new_feature", label: "New Feature" },
    { value: "platform_update", label: "Platform Update" },
    { value: "general_notification", label: "General" },
  ];

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  const selectedOption = typeOptions.find((opt) => opt.value === value);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3 py-2 bg-[var(--bg)] border border-[var(--border)] rounded-lg text-sm text-[var(--text)] hover:border-primary-500/50 transition-colors"
      >
        <span>{selectedOption?.label || "Select Type"}</span>
        <ChevronDown
          className={`w-4 h-4 text-[var(--text-muted)] transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="absolute top-full mt-1 left-0 right-0 bg-[var(--bg-card)] border border-[var(--border)] rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto"
          >
            {typeOptions.map((option) => (
              <button
                type="button"
                key={option.value}
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                className={`w-full text-left px-3 py-2 text-sm transition-colors hover:bg-[var(--bg-hover)] flex items-center justify-between ${
                  value === option.value
                    ? "bg-primary-500/10 text-primary-400"
                    : "text-[var(--text)]"
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
// CUSTOM DROPDOWN COMPONENT FOR STATUS
// ================================================================
const StatusDropdown = ({ value, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const statusOptions = [
    { value: "all", label: "All Status" },
    { value: "unread", label: "Unread" },
    { value: "read", label: "Read" },
  ];

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  const selectedOption = statusOptions.find((opt) => opt.value === value);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3 py-2 bg-[var(--bg)] border border-[var(--border)] rounded-lg text-sm text-[var(--text)] hover:border-primary-500/50 transition-colors"
      >
        <span>{selectedOption?.label || "Select Status"}</span>
        <ChevronDown
          className={`w-4 h-4 text-[var(--text-muted)] transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="absolute top-full mt-1 left-0 right-0 bg-[var(--bg-card)] border border-[var(--border)] rounded-lg shadow-lg z-50"
          >
            {statusOptions.map((option) => (
              <button
                type="button"
                key={option.value}
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                className={`w-full text-left px-3 py-2 text-sm transition-colors hover:bg-[var(--bg-hover)] flex items-center justify-between ${
                  value === option.value
                    ? "bg-primary-500/10 text-primary-400"
                    : "text-[var(--text)]"
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
// MAIN PAGE
// ================================================================
export default function NotificationsPage() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [isReadFilter, setIsReadFilter] = useState("all");
  const [selectedNotifications, setSelectedNotifications] = useState([]);
  const queryClient = useQueryClient();
  const { admin } = useAuthStore();

  // Fetch notifications
  const { data: notificationsData, isLoading, refetch } = useQuery({
    queryKey: ["notifications", page, limit, typeFilter, isReadFilter],
    queryFn: async () => {
      let url = `/notifications?page=${page}&limit=${limit}`;
      
      if (typeFilter !== "all") {
        url += `&type=${typeFilter}`;
      }
      
      if (isReadFilter !== "all") {
        url += `&isRead=${isReadFilter === "read" ? true : false}`;
      }

      const res = await adminApi.get(url);
      return res.data.data || {};
    },
  });

  // Delete single notification
  const deleteNotificationMutation = useMutation({
    mutationFn: async (notificationId) => {
      await adminApi.delete(`/notifications/${notificationId}`);
    },
    onSuccess: () => {
      toast.success("Notification deleted");
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      setSelectedNotifications([]);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || "Failed to delete notification");
    },
  });

  // Batch delete notifications
  const batchDeleteMutation = useMutation({
    mutationFn: async (ids) => {
      await adminApi.delete("/notifications/batch-delete", {
        data: { ids },
      });
    },
    onSuccess: () => {
      toast.success("Notifications deleted");
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      setSelectedNotifications([]);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || "Failed to delete notifications");
    },
  });

  // Mark as read
  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId) => {
      await adminApi.post(`/notifications/${notificationId}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || "Failed to mark as read");
    },
  });

  // Mark all as read
  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      await adminApi.post("/notifications/read-all");
    },
    onSuccess: () => {
      toast.success("All notifications marked as read");
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || "Failed to mark all as read");
    },
  });

  const notifications = notificationsData?.notifications || [];
  const totalPages = notificationsData?.totalPages || 1;
  const totalNotifications = notificationsData?.total || 0;

  // Check if selected notifications have any unread
  const hasUnreadSelected = selectedNotifications.some((id) => {
    const notification = notifications.find((n) => n._id === id);
    return notification && !notification.isRead;
  });

  // Check if all selected are already read
  const allSelectedAreRead = selectedNotifications.length > 0 && selectedNotifications.every((id) => {
    const notification = notifications.find((n) => n._id === id);
    return notification && notification.isRead;
  });
  const handleSelectNotification = (notificationId) => {
    setSelectedNotifications((prev) =>
      prev.includes(notificationId)
        ? prev.filter((id) => id !== notificationId)
        : [...prev, notificationId]
    );
  };

  // Handle select all
  const handleSelectAll = () => {
    if (selectedNotifications.length === notifications.length) {
      setSelectedNotifications([]);
    } else {
      setSelectedNotifications(notifications.map((n) => n._id));
    }
  };

  const getNotificationColor = (type) => {
    const colors = {
      admin_invited: { bg: "bg-blue-500/10", text: "text-blue-400", badge: "bg-blue-500/20" },
      role_assigned: { bg: "bg-purple-500/10", text: "text-purple-400", badge: "bg-purple-500/20" },
      permissions_updated: { bg: "bg-amber-500/10", text: "text-amber-400", badge: "bg-amber-500/20" },
      account_status_changed: { bg: "bg-indigo-500/10", text: "text-indigo-400", badge: "bg-indigo-500/20" },
      security_alert: { bg: "bg-red-500/10", text: "text-red-400", badge: "bg-red-500/20" },
      failed_login_attempts: { bg: "bg-red-500/10", text: "text-red-400", badge: "bg-red-500/20" },
      system_alert: { bg: "bg-gray-500/10", text: "text-gray-400", badge: "bg-gray-500/20" },
      new_feature: { bg: "bg-green-500/10", text: "text-green-400", badge: "bg-green-500/20" },
      platform_update: { bg: "bg-cyan-500/10", text: "text-cyan-400", badge: "bg-cyan-500/20" },
      system_maintenance: { bg: "bg-gray-500/10", text: "text-gray-400", badge: "bg-gray-500/20" },
      general_notification: { bg: "bg-slate-500/10", text: "text-slate-400", badge: "bg-slate-500/20" },
    };
    return colors[type] || colors.general_notification;
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatTimeAgo = (date) => {
    const now = new Date();
    const diff = now - new Date(date);
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (seconds < 60) return "just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return formatDate(date);
  };

  return (
    <div className="flex flex-col h-screen bg-[var(--bg-page)]">
      {/* Header */}
      <div className="px-6 py-4 border-b border-[var(--border)] bg-[var(--bg-card)]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Bell className="w-6 h-6 text-primary-500" />
            <div>
              <h1 className="text-2xl font-bold text-[var(--text)]">Notifications</h1>
              <p className="text-sm text-[var(--text-muted)]">
                {totalNotifications} notification{totalNotifications !== 1 ? "s" : ""}
              </p>
            </div>
          </div>
          <button
            onClick={() => refetch()}
            disabled={isLoading}
            className="p-2 rounded-lg hover:bg-[var(--bg-hover)] text-[var(--text-muted)] transition-colors disabled:opacity-50"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="px-6 py-4 border-b border-[var(--border)] bg-[var(--bg-card)] space-y-4">
        <div className="flex items-center gap-4 flex-wrap">
          {/* Search */}
          <div className="flex-1 min-w-64">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
              <input
                type="text"
                placeholder="Search notifications..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setPage(1);
                }}
                className="w-full pl-9 pr-3 py-2 bg-[var(--bg)] border border-[var(--border)] rounded-lg text-sm text-[var(--text)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-primary-500 transition-colors"
              />
            </div>
          </div>

          {/* Type Filter */}
          <div className="w-48">
            <TypeDropdown 
              value={typeFilter}
              onChange={(value) => {
                setTypeFilter(value);
                setPage(1);
              }}
            />
          </div>

          {/* Read Status Filter */}
          <div className="w-48">
            <StatusDropdown 
              value={isReadFilter}
              onChange={(value) => {
                setIsReadFilter(value);
                setPage(1);
              }}
            />
          </div>
        </div>

        {/* Actions */}
        {notifications.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleSelectAll}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-[var(--bg-hover)] hover:bg-primary-500/10 text-[var(--text)] transition-colors"
            >
              {selectedNotifications.length === notifications.length
                ? "Deselect All"
                : "Select All"}
            </button>

            {selectedNotifications.length > 0 && (
              <>
                <span className="text-xs text-[var(--text-muted)]">
                  {selectedNotifications.length} selected
                </span>
                {allSelectedAreRead ? (
                  <span className="px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-500/10 text-gray-400">
                    Already Read
                  </span>
                ) : (
                  <button
                    onClick={() => markAllAsReadMutation.mutate()}
                    disabled={markAllAsReadMutation.isPending}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 transition-colors disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {markAllAsReadMutation.isPending ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <CheckCheck className="w-3.5 h-3.5" />
                    )}
                    Mark as Read
                  </button>
                )}
                <button
                  onClick={() => batchDeleteMutation.mutate(selectedNotifications)}
                  disabled={batchDeleteMutation.isPending}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors disabled:opacity-50 flex items-center gap-1.5"
                >
                  {batchDeleteMutation.isPending ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="w-3.5 h-3.5" />
                  )}
                  Delete
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        <div className="p-6">
          {isLoading ? (
            <div className="flex items-center justify-center h-96">
              <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-96 text-center">
              <Bell className="w-12 h-12 text-[var(--text-muted)] mb-4 opacity-50" />
              <p className="text-lg font-medium text-[var(--text-muted)]">
                No notifications found
              </p>
              <p className="text-sm text-[var(--text-muted)] mt-1">
                Your notification history is empty
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {notifications.map((notification) => {
                const color = getNotificationColor(notification.type);
                const isSelected = selectedNotifications.includes(notification._id);

                return (
                  <motion.div
                    key={notification._id}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className={`flex items-start gap-4 p-4 rounded-lg border transition-colors ${
                      isSelected
                        ? "bg-primary-500/10 border-primary-500/30"
                        : notification.isRead
                        ? "bg-[var(--bg)] border-[var(--border)] hover:border-[var(--border-hover)]"
                        : `${color.bg} border-transparent hover:shadow-md`
                    }`}
                  >
                    {/* Checkbox */}
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleSelectNotification(notification._id)}
                      className="mt-1 w-4 h-4 rounded cursor-pointer"
                    />

                    {/* Status Indicator */}
                    <div className="flex-shrink-0 mt-1">
                      {!notification.isRead ? (
                        <div className={`w-2.5 h-2.5 rounded-full ${color.text} animate-pulse`} />
                      ) : (
                        <div className="w-2.5 h-2.5 rounded-full bg-[var(--border)]" />
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4
                              className={`text-sm font-semibold ${
                                notification.isRead
                                  ? "text-[var(--text-muted)]"
                                  : "text-[var(--text)]"
                              }`}
                            >
                              {notification.title}
                            </h4>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${color.badge} ${color.text}`}>
                              {notification.type.replace(/_/g, " ")}
                            </span>
                          </div>
                          <p
                            className={`text-sm leading-relaxed mb-2 ${
                              notification.isRead
                                ? "text-[var(--text-muted)]"
                                : "text-[var(--text)]"
                            }`}
                          >
                            {notification.message}
                          </p>
                          <p className="text-xs text-[var(--text-muted)]">
                            {formatTimeAgo(notification.createdAt)}
                            {notification.isRead && (
                              <span className="ml-2">• Read</span>
                            )}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex-shrink-0 flex items-center gap-2">
                      {!notification.isRead && (
                        <button
                          onClick={() => markAsReadMutation.mutate(notification._id)}
                          disabled={markAsReadMutation.isPending}
                          className="p-1.5 rounded hover:bg-blue-500/10 text-[var(--text-muted)] hover:text-blue-400 transition-colors disabled:opacity-50"
                          title="Mark as read"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => deleteNotificationMutation.mutate(notification._id)}
                        disabled={deleteNotificationMutation.isPending}
                        className="p-1.5 rounded hover:bg-red-500/10 text-[var(--text-muted)] hover:text-red-400 transition-colors disabled:opacity-50"
                        title="Delete"
                      >
                        {deleteNotificationMutation.isPending ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="px-6 py-4 border-t border-[var(--border)] bg-[var(--bg-card)] flex items-center justify-center gap-2">
          <button
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page === 1 || isLoading}
            className="px-3 py-1.5 rounded-lg text-sm font-medium bg-[var(--bg-hover)] hover:bg-primary-500/10 text-[var(--text)] transition-colors disabled:opacity-50 cursor-pointer"
          >
            Previous
          </button>

          <div className="flex items-center gap-1">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
              <button
                key={pageNum}
                onClick={() => setPage(pageNum)}
                disabled={isLoading}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  page === pageNum
                    ? "bg-primary-500/20 text-primary-400"
                    : "bg-[var(--bg-hover)] hover:bg-primary-500/10 text-[var(--text)]"
                } disabled:opacity-50`}
              >
                {pageNum}
              </button>
            ))}
          </div>

          <button
            onClick={() => setPage(Math.min(totalPages, page + 1))}
            disabled={page === totalPages || isLoading}
            className="px-3 py-1.5 rounded-lg text-sm font-medium bg-[var(--bg-hover)] hover:bg-primary-500/10 text-[var(--text)] transition-colors disabled:opacity-50 cursor-pointer"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
