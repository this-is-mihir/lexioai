import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BarChart3,
  Download,
  Trash2,
  Search,
  AlertCircle,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
  LogIn,
  UserPlus,
  Users,
  Bot,
  MessageSquare,
  CreditCard,
  Settings,
  Megaphone,
  Shield,
  ClipboardList,
  Calendar,
} from 'lucide-react';
import adminApi from '../../api/axios';
import toast from 'react-hot-toast';
import { createPortal } from 'react-dom';

// TABS CONFIGURATION
const TABS = [
  { id: 'overview', label: 'Overview', icon: BarChart3 },
  { id: 'register', label: 'Register', icon: UserPlus },
  { id: 'login', label: 'Login', icon: LogIn },
  { id: 'user_activity', label: 'User Activity', icon: Users },
  { id: 'bot_management', label: 'Bot Management', icon: Bot },
  { id: 'conversations', label: 'Conversations', icon: MessageSquare },
  { id: 'payments', label: 'Payments', icon: CreditCard },
  { id: 'admin_actions', label: 'Admin Actions', icon: Settings },
  { id: 'announcements', label: 'Announcements', icon: Megaphone },
  { id: 'security', label: 'Security', icon: Shield },
];

// STATUS BADGE
const StatusBadge = ({ status }) => {
  if (status === 'success') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded">
        <Check className="w-3 h-3" /> Success
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/20 rounded">
      <X className="w-3 h-3" /> Failed
    </span>
  );
};

// ACTION BADGE
const ActionBadge = ({ action }) => {
  const colors = {
    CREATE: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    UPDATE: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    DELETE: 'bg-red-500/10 text-red-400 border-red-500/20',
    LOGIN: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    FAILED_LOGIN: 'bg-red-500/10 text-red-400 border-red-500/20',
    REGISTER: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  };
  
  const colorClass = colors[action] || 'bg-gray-500/10 text-gray-400 border-gray-500/20';
  
  return (
    <span className={`inline-block px-2 py-1 text-xs font-medium border rounded ${colorClass}`}>
      {action}
    </span>
  );
};

// DATE PICKER COMPONENT — Production ready
const DatePicker = ({ value, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value || '');
  const [viewDate, setViewDate] = useState(value ? new Date(value) : new Date());
  
  const getDaysInMonth = (date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const getFirstDayOfMonth = (date) => new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  
  // Handle manual input
  const handleInputChange = (e) => {
    const val = e.target.value;
    setInputValue(val);
    if (/^\d{4}-\d{2}-\d{2}$/.test(val)) {
      onChange(val);
      setViewDate(new Date(val));
    }
  };
  
  // Build calendar days
  const days = [];
  const firstDay = getFirstDayOfMonth(viewDate);
  const daysInMonth = getDaysInMonth(viewDate);
  
  for (let i = 0; i < firstDay; i++) {
    days.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i);
  }
  
  const handleSelectDate = (day) => {
    const selected = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
    const dateStr = selected.toISOString().split('T')[0];
    setInputValue(dateStr);
    onChange(dateStr);
    setIsOpen(false);
  };
  
  const handleYearChange = (e) => {
    const newYear = parseInt(e.target.value);
    setViewDate(new Date(newYear, viewDate.getMonth()));
  };
  
  const handleMonthChange = (e) => {
    const newMonth = parseInt(e.target.value);
    setViewDate(new Date(viewDate.getFullYear(), newMonth));
  };
  
  const monthName = viewDate.toLocaleDateString('en-US', { month: 'long' });
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const isSelectingDate = value ? new Date(value) : null;
  
  const years = Array.from({ length: 50 }, (_, i) => year - 25 + i);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  
  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="YYYY-MM-DD"
          value={inputValue}
          onChange={handleInputChange}
          className="flex-1 px-3 py-2 text-sm bg-[var(--bg-card)] border border-[var(--border)] rounded focus:outline-none focus:ring-2 focus:ring-primary-500/50"
        />
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="px-3 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded text-sm font-medium transition-all"
        >
          <Calendar className="w-4 h-4" />
        </button>
      </div>
      
      {isOpen && (
        <div className="border border-[var(--border)] rounded-lg p-4 bg-[var(--bg-card)] space-y-3">
          {/* Month & Year Selectors */}
          <div className="flex gap-2">
            <select
              value={month}
              onChange={handleMonthChange}
              className="flex-1 px-2 py-1 text-sm bg-[var(--bg)] border border-[var(--border)] rounded focus:outline-none focus:ring-2 focus:ring-primary-500/50"
            >
              {months.map((m, idx) => (
                <option key={idx} value={idx}>
                  {m}
                </option>
              ))}
            </select>
            <select
              value={year}
              onChange={handleYearChange}
              className="w-20 px-2 py-1 text-sm bg-[var(--bg)] border border-[var(--border)] rounded focus:outline-none focus:ring-2 focus:ring-primary-500/50"
            >
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
          
          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1">
            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day) => (
              <div key={day} className="text-xs font-semibold text-[var(--text-muted)] text-center py-2">
                {day}
              </div>
            ))}
            
            {days.map((day, idx) => (
              <button
                key={idx}
                onClick={() => day && handleSelectDate(day)}
                disabled={!day}
                className={`text-xs py-2 rounded font-medium transition-all ${
                  day === null
                    ? ''
                    : isSelectingDate && isSelectingDate.getDate() === day &&
                      isSelectingDate.getMonth() === month &&
                      isSelectingDate.getFullYear() === year
                    ? 'bg-primary-600 text-white'
                    : 'hover:bg-primary-500/20 text-[var(--text)]'
                }`}
              >
                {day}
              </button>
            ))}
          </div>
          
          <button
            onClick={() => setIsOpen(false)}
            className="w-full px-3 py-2 text-sm bg-[var(--bg)] border border-[var(--border)] rounded hover:bg-[var(--border)] transition-all"
          >
            Close
          </button>
        </div>
      )}
    </div>
  );
};

// DELETE MODAL
const DeleteModal = ({ isOpen, isSuperAdmin, isDeleting, onClose, onConfirm }) => {
  const [deleteType, setDeleteType] = useState('7d');
  const [customDateRange, setCustomDateRange] = useState({
    startDate: '',
    endDate: '',
  });

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 16 }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
        className="relative w-full max-w-md bg-[var(--bg-card)] border border-[var(--border)] rounded-xl shadow-2xl max-h-[90vh] overflow-y-auto"
      >
        <div className="px-5 py-4 border-b border-[var(--border)]">
          <h2 className="text-lg font-semibold text-[var(--text)]">Delete Audit Logs</h2>
        </div>

        <div className="px-5 py-4 space-y-4">
          <div className="flex gap-3 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
            <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-amber-300">
              This action cannot be undone. Be very careful!
            </p>
          </div>

          <div className="space-y-3">
            {[
              { value: '7d', label: 'Last 7 Days', desc: 'Delete logs older than 7 days' },
              { value: '30d', label: 'Last 30 Days', desc: 'Delete logs older than 30 days' },
              { value: '90d', label: 'Last 90 Days', desc: 'Delete logs older than 90 days' },
              { value: 'custom', label: 'Custom Date Range', desc: 'Select your own date range' },
              { value: 'all', label: 'Delete ALL', desc: 'Delete every single audit log' },
            ].map((option) => (
              <label key={option.value} className="flex gap-3 p-3 border border-[var(--border)] rounded-lg cursor-pointer hover:bg-[var(--bg)]/50">
                <input
                  type="radio"
                  name="deleteType"
                  value={option.value}
                  checked={deleteType === option.value}
                  onChange={(e) => setDeleteType(e.target.value)}
                  className="mt-1"
                />
                <div className="flex-1">
                  <div className="font-medium text-sm text-[var(--text)]">{option.label}</div>
                  <div className={`text-xs ${option.value === 'all' ? 'text-red-400' : 'text-[var(--text-muted)]'}`}>
                    {option.desc}
                  </div>
                </div>
              </label>
            ))}

            {deleteType === 'custom' && (
              <div className="space-y-4">
                <div>
                  <label className="text-xs text-[var(--text-muted)] font-medium block mb-2">Start Date</label>
                  <DatePicker
                    value={customDateRange.startDate}
                    onChange={(date) =>
                      setCustomDateRange({ ...customDateRange, startDate: date })
                    }
                  />
                </div>
                <div>
                  <label className="text-xs text-[var(--text-muted)] font-medium block mb-2">End Date</label>
                  <DatePicker
                    value={customDateRange.endDate}
                    onChange={(date) =>
                      setCustomDateRange({ ...customDateRange, endDate: date })
                    }
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-3 px-5 py-4 border-t border-[var(--border)]">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 text-sm font-medium text-[var(--text)] bg-[var(--bg)] border border-[var(--border)] rounded-lg hover:bg-[var(--bg)]/80"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm({ deleteType, customStartDate: customDateRange.startDate, customEndDate: customDateRange.endDate })}
            disabled={isDeleting}
            className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50"
          >
            {isDeleting ? 'Deleting...' : 'Confirm Delete'}
          </button>
        </div>
      </motion.div>
    </div>,
    document.body
  );
};

// MAIN PAGE
export default function AuditPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('overview');
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  useEffect(() => {
    const adminData = JSON.parse(localStorage.getItem('lexioai-admin') || '{}');
    setIsSuperAdmin(adminData?.state?.admin?.role === 'superadmin');
  }, []);

  // Fetch audit logs
  const { data: auditData, isLoading } = useQuery({
    queryKey: ['auditLogs', activeTab, currentPage, searchTerm],
    queryFn: async () => {
      const params = {
        page: currentPage,
        limit: 50,
        tab: activeTab !== 'overview' ? activeTab : undefined,
        search: searchTerm || undefined,
      };
      const { data } = await adminApi.get('/audit', { params });
      return data;
    },
    keepPreviousData: true,
  });

  // Fetch stats
  const { data: statsData } = useQuery({
    queryKey: ['auditStats'],
    queryFn: async () => {
      const { data } = await adminApi.get('/audit/stats');
      return data;
    },
    refetchInterval: 5000,
  });

  // Delete mutation
  const { mutate: deleteAuditLogs, isPending: isDeleting } = useMutation({
    mutationFn: async (payload) => {
      const { data } = await adminApi.delete('/audit', { data: payload });
      return data;
    },
    onSuccess: (data) => {
      toast.success(data.message);
      setShowDeleteModal(false);
      setCurrentPage(1);
      queryClient.invalidateQueries({ queryKey: ['auditLogs'] });
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || error.message);
    },
  });

  // Export CSV
  const handleExportCSV = async () => {
    try {
      const params = {
        tab: activeTab !== 'overview' ? activeTab : undefined,
        search: searchTerm || undefined,
      };
      const response = await adminApi.get('/audit/export/csv', { params, responseType: 'blob' });
      const url = window.URL.createObjectURL(response.data);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `audit-logs-${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      toast.success('CSV exported!');
    } catch (error) {
      toast.error('Export failed');
    }
  };

  const { pagination = {}, data: logs = [] } = auditData || {};
  const { page = 1, pages = 1 } = pagination;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <ClipboardList className="w-8 h-8 text-primary-500" />
          <h1 className="text-3xl font-bold text-[var(--text)]">Audit Logs</h1>
        </div>
        <p className="text-[var(--text-muted)] mt-1">Complete activity tracking and history</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-[var(--bg-card)] border border-[var(--border)] rounded-xl"
        >
          <div className="text-sm text-[var(--text-muted)]">Total Logs</div>
          <div className="text-2xl font-bold text-[var(--text)] mt-1">
            {statsData?.data?.totalLogs?.toLocaleString() || '0'}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="p-4 bg-[var(--bg-card)] border border-[var(--border)] rounded-xl"
        >
          <div className="text-sm text-[var(--text-muted)]">Today</div>
          <div className="text-2xl font-bold text-[var(--text)] mt-1">
            {statsData?.data?.todayLogs?.toLocaleString() || '0'}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="p-4 bg-[var(--bg-card)] border border-[var(--border)] rounded-xl"
        >
          <div className="text-sm text-[var(--text-muted)]">Failed Actions</div>
          <div className={`text-2xl font-bold mt-1 ${(statsData?.data?.failedActions || 0) > 0 ? 'text-red-400' : 'text-[var(--text)]'}`}>
            {statsData?.data?.failedActions?.toLocaleString() || '0'}
          </div>
        </motion.div>
      </div>

      {/* Tabs */}
      <div className="overflow-x-auto no-scrollbar">
        <div className="flex gap-1 pb-2 bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-1 w-max min-w-full">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setCurrentPage(1);
                  setSearchTerm('');
                }}
                className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-primary-600 text-white'
                    : 'text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--bg)]/50'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Search & Export */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 flex items-center gap-3 px-3 py-2 bg-[var(--bg-card)] border border-[var(--border)] rounded-lg">
          <Search className="w-5 h-5 text-[var(--text-muted)]" />
          <input
            type="text"
            placeholder="Search in this tab..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="flex-1 bg-transparent outline-none text-[var(--text)] placeholder-[var(--text-muted)]"
          />
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-[var(--text)] bg-[var(--bg-card)] border border-[var(--border)] rounded-lg hover:bg-[var(--bg)]/80"
          >
            <Download className="w-4 h-4" />
            CSV
          </button>

          <button
            onClick={() => setShowDeleteModal(true)}
            disabled={!isSuperAdmin}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all ${
              isSuperAdmin
                ? 'text-white bg-red-600 hover:bg-red-700'
                : 'text-red-400 bg-red-500/10 border border-red-500/20 cursor-not-allowed opacity-50'
            }`}
            title={!isSuperAdmin ? 'Only superadmin can delete logs' : 'Delete audit logs'}
          >
            <Trash2 className="w-4 h-4" />
            Delete
          </button>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg overflow-x-auto">
        {isLoading ? (
          <div className="p-8 text-center text-[var(--text-muted)]">Loading audit logs...</div>
        ) : logs.length === 0 ? (
          <div className="p-8 text-center text-[var(--text-muted)]">No audit logs found</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--bg)]/50">
                <th className="px-4 py-3 text-left font-semibold text-[var(--text)]">Time</th>
                <th className="px-4 py-3 text-left font-semibold text-[var(--text)]">Admin</th>
                <th className="px-4 py-3 text-left font-semibold text-[var(--text)]">Module</th>
                <th className="px-4 py-3 text-left font-semibold text-[var(--text)]">Action</th>
                <th className="px-4 py-3 text-left font-semibold text-[var(--text)]">Description</th>
                <th className="px-4 py-3 text-left font-semibold text-[var(--text)]">Target</th>
                <th className="px-4 py-3 text-left font-semibold text-[var(--text)]">Status</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log._id} className="border-b border-[var(--border)] hover:bg-[var(--bg)]/30">
                  <td className="px-4 py-3">
                    <div className="text-xs font-medium text-[var(--text)]">{log.formattedTime}</div>
                    <div className="text-xs text-[var(--text-muted)]">{new Date(log.createdAt).toLocaleDateString()}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-xs font-medium text-[var(--text)]">{log.adminName}</div>
                    <div className="text-xs text-[var(--text-muted)]">{log.adminRole}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-block px-2 py-1 text-xs font-medium bg-primary-500/10 text-primary-400 border border-primary-500/20 rounded">
                      {log.module}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <ActionBadge action={log.action} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-xs text-[var(--text-muted)] truncate max-w-xs" title={log.description}>
                      {log.description}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-[var(--text-muted)]">{log.targetName || '—'}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={log.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            disabled={page === 1}
            onClick={() => setCurrentPage(1)}
            className="px-3 py-2 text-sm font-medium bg-[var(--bg-card)] border border-[var(--border)] rounded-lg hover:bg-[var(--bg)]/50 disabled:opacity-50"
          >
            First
          </button>
          <button
            disabled={page === 1}
            onClick={() => setCurrentPage(page - 1)}
            className="p-2 text-sm font-medium bg-[var(--bg-card)] border border-[var(--border)] rounded-lg hover:bg-[var(--bg)]/50 disabled:opacity-50"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div className="px-4 py-2 text-sm text-[var(--text-muted)]">
            Page {page} of {pages}
          </div>

          <button
            disabled={page === pages}
            onClick={() => setCurrentPage(page + 1)}
            className="p-2 text-sm font-medium bg-[var(--bg-card)] border border-[var(--border)] rounded-lg hover:bg-[var(--bg)]/50 disabled:opacity-50"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <button
            disabled={page === pages}
            onClick={() => setCurrentPage(pages)}
            className="px-3 py-2 text-sm font-medium bg-[var(--bg-card)] border border-[var(--border)] rounded-lg hover:bg-[var(--bg)]/50 disabled:opacity-50"
          >
            Last
          </button>
        </div>
      )}

      {/* Delete Modal */}
      <DeleteModal
        isOpen={showDeleteModal}
        isSuperAdmin={isSuperAdmin}
        isDeleting={isDeleting}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={(payload) => deleteAuditLogs(payload)}
      />
    </div>
  );
}
