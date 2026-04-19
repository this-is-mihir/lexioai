import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from "framer-motion";
import {
  Users, Plus, Search, Trash2, X, Loader2, Check,
  Shield, Ban, Key, Lock, Eye, Copy, Download, Upload,
  Clock, AlertTriangle, Mail, Phone, Calendar, LogOut,
  Edit2, MoreVertical, ChevronDown, ChevronUp, CircleCheck, CircleX,
} from "lucide-react";
import adminApi from "../../api/axios";
import toast from "react-hot-toast";
import useAuthStore from "../../store/authStore";

// ────────────────────────────────────────────────────────────────
// MAIN PAGE
// ────────────────────────────────────────────────────────────────

export default function AdminsPage() {
  const [tab, setTab] = useState("admins"); // "admins" | "roles"
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState(null);
  const queryClient = useQueryClient();
  
  const { admin } = useAuthStore();
  const canEdit = admin?.permissions?.admins?.edit === true;
  const canDelete = admin?.permissions?.admins?.delete === true;

  // Fetch admins
  const { data: adminsData, isLoading: adminsLoading } = useQuery({
    queryKey: ["admin-admins"],
    queryFn: async () => {
      const res = await adminApi.get("/admins");
      return res.data.data?.admins || [];
    },
  });

  // Fetch roles
  const { data: rolesData, isLoading: rolesLoading } = useQuery({
    queryKey: ["admin-roles"],
    queryFn: async () => {
      const res = await adminApi.get("/roles");
      return res.data.data?.roles || [];
    },
  });

  // Filter admins
  const filteredAdmins = (adminsData || []).filter((admin) => {
    const matchSearch =
      admin.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      admin.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus =
      statusFilter === "all" ||
      (statusFilter === "active" && admin.isActive && !admin.isBanned) ||
      (statusFilter === "banned" && admin.isBanned);
    return matchSearch && matchStatus;
  });

  // Stats
  const stats = {
    total: adminsData?.length || 0,
    active: adminsData?.filter((a) => a.isActive && !a.isBanned).length || 0,
    banned: adminsData?.filter((a) => a.isBanned).length || 0,
  };

  // Check if user is superadmin
  if (admin?.role !== 'superadmin') {
    return (
      <div className="flex flex-col h-screen bg-[var(--bg-page)]">
        <div className="px-6 py-4 border-b border-[var(--border)] bg-[var(--bg-card)]">
          <h1 className="text-2xl font-bold text-[var(--text)] flex items-center gap-2">
            <Shield className="w-6 h-6 text-primary-500" />
            Admin Management
          </h1>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4 opacity-75" />
            <p className="text-lg font-medium text-[var(--text)] mb-2">Access Denied</p>
            <p className="text-sm text-[var(--text-muted)]">
              Superadmin hasn't allowed you to access this page.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-[var(--bg-page)]">
      {/* Header */}
      <div className="px-6 py-4 border-b border-[var(--border)] bg-[var(--bg-card)]">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-[var(--text)] flex items-center gap-2">
              <Shield className="w-6 h-6 text-primary-500" />
              Admin Management
            </h1>
            <p className="text-xs text-[var(--text-muted)] mt-1">
              Manage admins, roles, and permissions
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Create Admin
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-[var(--border)]">
          {[
            { id: "admins", label: "Admins", icon: Users },
            { id: "roles", label: "Roles", icon: Shield },
          ].map((t) => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`px-4 py-2 flex items-center gap-2 border-b-2 transition-colors ${
                  active
                    ? "border-primary-500 text-primary-400"
                    : "border-transparent text-[var(--text-muted)] hover:text-[var(--text)]"
                }`}
              >
                <Icon className="w-4 h-4" /> {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {tab === "admins" && (
          <AdminsTab
            admins={filteredAdmins}
            loading={adminsLoading}
            stats={stats}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
            onEdit={(admin) => {
              setSelectedAdmin(admin);
              setShowEditModal(true);
            }}
          />
        )}
        {tab === "roles" && (
          <RolesTab roles={rolesData} loading={rolesLoading} onCreate={() => setShowRoleModal(true)} />
        )}
      </div>

      {/* Modals */}
      <AnimatePresence>
        {showCreateModal && (
          <CreateAdminModal
            roles={rolesData || []}
            onClose={() => setShowCreateModal(false)}
            onSuccess={() => {
              queryClient.invalidateQueries(["admin-admins"]);
              setShowCreateModal(false);
            }}
          />
        )}
        {showEditModal && selectedAdmin && (
          <AdminDetailModal
            admin={selectedAdmin}
            roles={rolesData || []}
            onClose={() => setShowEditModal(false)}
            canEdit={canEdit}
            canDelete={canDelete}
          />
        )}
        {showRoleModal && (
          <RoleModal
            onClose={() => setShowRoleModal(false)}
            onSuccess={() => {
              queryClient.invalidateQueries(["admin-roles"]);
              setShowRoleModal(false);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────
// TABS
// ────────────────────────────────────────────────────────────────

function AdminsTab({
  admins,
  loading,
  stats,
  searchTerm,
  setSearchTerm,
  statusFilter,
  setStatusFilter,
  onEdit,
}) {
  return (
    <div className="p-6 space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: "Total Admins", value: stats.total, color: "primary" },
          { label: "Active", value: stats.active, color: "emerald" },
          { label: "Banned", value: stats.banned, color: "red" },
        ].map((stat) => (
          <div
            key={stat.label}
            className={`bg-${stat.color}-500/10 border border-${stat.color}-400/20 rounded-xl p-4`}
          >
            <p className={`text-xs text-${stat.color}-400 font-semibold uppercase tracking-wider`}>
              {stat.label}
            </p>
            <p className={`text-3xl font-bold text-${stat.color}-400 mt-2`}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input pl-10 text-sm w-full"
          />
        </div>
        <div className="w-full md:w-40">
          <CustomSelector
            options={[
              { value: "all", label: "All Status" },
              { value: "active", label: "Active Only" },
              { value: "banned", label: "Banned Only" }
            ]}
            value={statusFilter}
            onChange={setStatusFilter}
            placeholder="All Status"
          />
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-primary-500" />
        </div>
      ) : (
        <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[var(--bg-hover)] border-b border-[var(--border)]">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-[var(--text-muted)] uppercase">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-[var(--text-muted)] uppercase">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-[var(--text-muted)] uppercase">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-[var(--text-muted)] uppercase">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-[var(--text-muted)] uppercase">
                    Last Login
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-[var(--text-muted)] uppercase">
                    IP Address
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-[var(--text-muted)] uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {admins.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-8 text-center">
                      <p className="text-[var(--text-muted)]">No admins found</p>
                    </td>
                  </tr>
                ) : (
                  admins.map((admin) => (
                    <AdminRow
                      key={admin._id}
                      admin={admin}
                      onEdit={() => onEdit(admin)}
                    />
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function AdminRow({ admin, onEdit }) {
  return (
    <tr className="border-b border-[var(--border)] hover:bg-[var(--bg-hover)] transition-colors">
      <td className="px-6 py-3">
        <div>
          <p className="font-medium text-[var(--text)]">{admin.name}</p>
          {admin.isOnline && (
            <span className="inline-flex items-center gap-1 text-xs text-emerald-400 mt-1">
              <span className="w-2 h-2 bg-emerald-400 rounded-full"></span>
              Online
            </span>
          )}
        </div>
      </td>
      <td className="px-6 py-3 text-[var(--text-muted)]">{admin.email}</td>
      <td className="px-6 py-3">
        <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-primary-500/10 text-primary-400 border border-primary-400/20">
          {admin.role}
        </span>
      </td>
      <td className="px-6 py-3">
        {admin.isBanned ? (
          <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-red-500/10 text-red-400 border border-red-400/20 flex w-fit">
            <Ban className="w-3 h-3 mr-1" /> Banned
          </span>
        ) : (
          <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-400/20">
            Active
          </span>
        )}
      </td>
      <td className="px-6 py-3 text-xs text-[var(--text-muted)]">
        {admin.lastLoginAt ? new Date(admin.lastLoginAt).toLocaleString("en-IN") : "-"}
      </td>
      <td className="px-6 py-3 text-xs text-[var(--text-muted)] font-mono">{admin.lastLoginIP || "-"}</td>
      <td className="px-6 py-3">
        <div className="flex justify-end">
          <button
            onClick={() => onEdit()}
            className="px-3 py-1.5 rounded-lg bg-primary-500/10 text-primary-400 hover:bg-primary-500/20 border border-primary-500/30 text-xs font-medium transition-colors flex items-center gap-2"
          >
            <Edit2 className="w-3.5 h-3.5" />
            View
          </button>
        </div>
      </td>
    </tr>
  );
}

// ────────────────────────────────────────────────────────────────
// ADMIN DETAIL MODAL
// ────────────────────────────────────────────────────────────────

function AdminDetailModal({ admin, roles, onClose, canEdit, canDelete }) {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState("details");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [banReason, setBanReason] = useState("");
  const [localAdmin, setLocalAdmin] = useState(admin);
  const [editForm, setEditForm] = useState({
    name: admin.name,
    email: admin.email,
  });

  const banMut = useMutation({
    mutationFn: () => adminApi.post(`/admins/${admin._id}/ban`, { reason: banReason || "Manual ban by superadmin" }),
    onSuccess: () => {
      toast.success("Admin banned successfully");
      setLocalAdmin(prev => ({ ...prev, isBanned: true }));
      queryClient.invalidateQueries(["admin-admins"]);
      setBanReason("");
    },
    onError: (err) => toast.error(err.response?.data?.message || "Failed to ban admin"),
  });

  const unbanMut = useMutation({
    mutationFn: () => adminApi.post(`/admins/${admin._id}/unban`),
    onSuccess: () => {
      toast.success("Admin unbanned successfully");
      setLocalAdmin(prev => ({ ...prev, isBanned: false }));
      queryClient.invalidateQueries(["admin-admins"]);
    },
    onError: (err) => toast.error(err.response?.data?.message || "Failed to unban admin"),
  });

  const deleteMut = useMutation({
    mutationFn: () => adminApi.delete(`/admins/${admin._id}`),
    onSuccess: () => {
      toast.success("Admin deleted successfully");
      queryClient.invalidateQueries(["admin-admins"]);
      onClose();
    },
    onError: (err) => toast.error(err.response?.data?.message || "Failed to delete admin"),
  });

  const resetMut = useMutation({
    mutationFn: () => adminApi.post(`/admins/${admin._id}/force-reset`, {}),
    onSuccess: (data) => {
      toast.success("Password reset notification sent to admin");
      queryClient.invalidateQueries(["admin-admins"]);
    },
    onError: (err) => toast.error(err.response?.data?.message || "Failed to send reset notification"),
  });

  const editMut = useMutation({
    mutationFn: (data) => adminApi.put(`/admins/${admin._id}`, data),
    onSuccess: () => {
      toast.success("Admin updated successfully");
      queryClient.invalidateQueries(["admin-admins"]);
      setShowEditForm(false);
    },
    onError: (err) => toast.error(err.response?.data?.message || "Failed to update admin"),
  });

  useEffect(() => {
    setLocalAdmin(admin);
    setEditForm({
      name: admin.name,
      email: admin.email,
    });
  }, [admin]);

  // Refresh admin data after edit to show updated permissions immediately
  const handleEditSuccess = async () => {
    // ✅ Don't need to GET single admin - invalidateQueries will refetch the full list
    // ✅ usePermissionSync hook is already syncing fresh data every 90s
    setShowEditForm(false);
    toast.success("Admin updated successfully!");
  };

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-3 sm:p-4">
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
        transition={{ type: "spring", damping: 28, stiffness: 300 }}
        className="relative w-full max-w-2xl bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl shadow-2xl flex flex-col"
        style={{ maxHeight: "calc(100vh - 2rem)" }}
      >
        {/* Header */}
        <div className="shrink-0 px-4 sm:px-6 pt-5 pb-0">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4 min-w-0">
              <div className="w-12 h-12 rounded-full bg-primary-500/10 border-2 border-primary-500/20 flex items-center justify-center shrink-0 font-bold text-primary-400">
                {admin.name?.charAt(0)?.toUpperCase() || "?"}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="font-semibold text-[var(--text)]">{admin.name}</h2>
                  <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-primary-500/10 text-primary-400 border border-primary-400/20">
                    {admin.role}
                  </span>
                  {localAdmin.isBanned && (
                    <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-red-500/10 text-red-400 border border-red-400/20 flex items-center gap-1">
                      <Ban className="w-3 h-3" /> Banned
                    </span>
                  )}
                </div>
                <p className="text-sm text-[var(--text-muted)] truncate mt-1">{admin.email}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="shrink-0 ml-4 p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--bg-hover)] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-[var(--border)]">
            {["details", "actions"].map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-4 py-2.5 text-sm font-medium capitalize transition-colors border-b-2 -mb-px ${
                  tab === t
                    ? "border-primary-500 text-primary-400"
                    : "border-transparent text-[var(--text-muted)] hover:text-[var(--text)]"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-5 min-h-0">
          {/* DETAILS TAB */}
          {tab === "details" && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { label: "Admin ID", value: admin._id?.slice(-12), mono: true },
                  { label: "Email", value: admin.email, wrap: true },
                  { label: "Role", value: admin.role },
                  { label: "Status", value: localAdmin.isBanned ? "Banned" : "Active", icon: localAdmin.isBanned ? "ban" : "check" },
                  { label: "Created", value: new Date(admin.createdAt).toLocaleDateString("en-IN") },
                  { label: "Last Login", value: admin.lastLoginAt ? new Date(admin.lastLoginAt).toLocaleString("en-IN") : "Never" },
                  { label: "Last IP", value: admin.lastLoginIP || "—", mono: true },
                  { label: "Online", value: admin.isOnline ? "Yes" : "No", icon: admin.isOnline ? "online" : "offline" },
                ].map(({ label, value, mono, icon, wrap }) => (
                  <div key={label} className="bg-[var(--bg-hover)] rounded-lg p-3">
                    <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-1">
                      {label}
                    </p>
                    <div className={`text-sm font-medium text-[var(--text)] ${mono ? "font-mono text-xs" : "flex items-center gap-1.5"} ${wrap ? "break-all" : ""}`}>
                      {icon === "ban" && <Ban className="w-4 h-4 text-red-400" />}
                      {icon === "check" && <Check className="w-4 h-4 text-emerald-400" />}
                      {icon === "online" && <span className="w-2 h-2 bg-emerald-400 rounded-full"></span>}
                      {icon === "offline" && <span className="w-2 h-2 bg-gray-500 rounded-full"></span>}
                      {value}
                    </div>
                  </div>
                ))}
              </div>

              {admin.permissions && (
                <div className="bg-[var(--bg-hover)] rounded-lg p-4 mt-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Shield className="w-4 h-4 text-primary-400" />
                    <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                      Permissions
                    </p>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {Object.entries(admin.permissions || {}).map(([module, actions]) => (
                      <div key={module} className="text-xs">
                        <p className="font-medium text-primary-400 capitalize">{module}</p>
                        <div className="text-[var(--text-muted)] text-xs mt-1 space-y-0.5">
                          {Object.entries(actions).map(([action, allowed]) => (
                            <div key={action} className="flex items-center gap-1">
                              {allowed ? (
                                <CircleCheck className="w-3.5 h-3.5 text-emerald-400" />
                              ) : (
                                <CircleX className="w-3.5 h-3.5 text-red-400" />
                              )}
                              <span className="capitalize">{action}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ACTIONS TAB */}
          {tab === "actions" && (
            <div className="space-y-4">
              {/* Edit Section */}
              <div className="bg-primary-500/5 border border-primary-500/20 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Edit2 className="w-4 h-4 text-primary-400" />
                  <h3 className="text-sm font-semibold text-[var(--text)]">Edit Admin</h3>
                </div>
                <p className="text-xs text-[var(--text-muted)] mb-3">
                  Edit admin details
                </p>
                <button 
                  onClick={() => setShowEditForm(true)}
                  className="w-full btn-primary text-sm py-2 flex items-center justify-center gap-2"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  Edit Admin Details & Permissions
                </button>
              </div>

              {/* Security Section */}
              <div className="bg-orange-500/5 border border-orange-500/20 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Key className="w-4 h-4 text-orange-400" />
                  <h3 className="text-sm font-semibold text-[var(--text)]">Security</h3>
                </div>
                <button
                  onClick={() => resetMut.mutate()}
                  disabled={resetMut.isPending}
                  className="w-full btn-secondary text-sm py-2 disabled:opacity-50"
                >
                  {resetMut.isPending ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" /> Resetting...
                    </span>
                  ) : (
                    "Force Password Reset"
                  )}
                </button>
              </div>

              {/* Ban/Unban Section */}
              <div className={`rounded-lg p-4 ${localAdmin.isBanned ? "bg-emerald-500/5 border border-emerald-500/20" : "bg-red-500/5 border border-red-500/20"}`}>
                <div className="flex items-center gap-2 mb-3">
                  <Ban className="w-4 h-4" style={{ color: localAdmin.isBanned ? "#4ade80" : "#f87171" }} />
                  <h3 className="text-sm font-semibold text-[var(--text)]">
                    {localAdmin.isBanned ? "Unban Admin" : "Ban Admin"}
                  </h3>
                </div>
                <p className="text-xs text-[var(--text-muted)] mb-3">
                  {localAdmin.isBanned
                    ? "Remove ban and restore access"
                    : "Prevent this admin from accessing the platform"}
                </p>
                {localAdmin.isBanned ? (
                  <button
                    onClick={() => unbanMut.mutate()}
                    disabled={unbanMut.isPending}
                    className="w-full bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg py-2 text-sm font-medium transition-colors disabled:opacity-50"
                  >
                    {unbanMut.isPending ? (
                      <span className="flex items-center justify-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" /> Unbanning...
                      </span>
                    ) : (
                      <span className="flex items-center justify-center gap-2">
                        <Check className="w-4 h-4" /> Unban Admin
                      </span>
                    )}
                  </button>
                ) : (
                  <div className="space-y-2">
                    <input
                      type="text"
                      placeholder="Enter ban reason..."
                      value={banReason}
                      onChange={(e) => setBanReason(e.target.value)}
                      className="w-full input text-sm"
                    />
                    <button
                      onClick={() => {
                        if (!banReason.trim()) {
                          toast.error("Please enter a ban reason");
                          return;
                        }
                        banMut.mutate();
                      }}
                      disabled={banMut.isPending}
                      className="w-full bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 rounded-lg py-2 text-sm font-medium transition-colors disabled:opacity-50"
                    >
                      {banMut.isPending ? (
                        <span className="flex items-center justify-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin" /> Banning...
                        </span>
                      ) : (
                        <span className="flex items-center justify-center gap-2">
                          <Ban className="w-4 h-4" /> Ban Admin
                        </span>
                      )}
                    </button>
                  </div>
                )}
              </div>

              {/* Delete Section */}
              <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Trash2 className="w-4 h-4 text-red-500" />
                  <h3 className="text-sm font-semibold text-red-400">Danger Zone</h3>
                </div>
                <p className="text-xs text-[var(--text-muted)] mb-3">
                  Permanently delete this admin account. This action cannot be undone.
                </p>
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  disabled={deleteMut.isPending}
                  className="w-full bg-red-500 hover:bg-red-600 text-white rounded-lg py-2 text-sm font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete Admin
                </button>
              </div>
            </div>
          )}
        </div>
      </motion.div>

      {/* Edit Form Modal */}
      <AnimatePresence>
        {showEditForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[201] flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60"
              onClick={() => setShowEditForm(false)}
            />
            <motion.div
              initial={{ scale: 0.95, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 10 }}
              className="relative bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-6 max-w-sm w-full"
            >
              <h3 className="text-lg font-semibold text-[var(--text)] mb-4">Edit Admin</h3>
              <div className="space-y-3 mb-6">
                <div>
                  <label className="text-xs font-semibold text-[var(--text-muted)] uppercase block mb-2">
                    Name
                  </label>
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="input w-full text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-[var(--text-muted)] uppercase block mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    className="input w-full text-sm"
                  />
                </div>
              </div>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setShowEditForm(false)}
                  className="px-4 py-2 rounded-lg border border-[var(--border)] text-[var(--text)] hover:bg-[var(--bg-hover)] transition-colors text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (!editForm.name.trim()) {
                      toast.error("Name is required");
                      return;
                    }
                    if (!editForm.email.trim()) {
                      toast.error("Email is required");
                      return;
                    }
                    editMut.mutate(editForm);
                  }}
                  disabled={editMut.isPending}
                  className="px-4 py-2 rounded-lg bg-primary-500 hover:bg-primary-600 text-white transition-colors text-sm font-medium flex items-center gap-2 disabled:opacity-50"
                >
                  {editMut.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      Save
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[201] flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60"
              onClick={() => setShowDeleteConfirm(false)}
            />
            <motion.div
              initial={{ scale: 0.95, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 10 }}
              className="relative bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-6 max-w-sm"
            >
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  <AlertTriangle className="w-6 h-6 text-red-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold text-[var(--text)]">Delete Admin Account?</h3>
                  <p className="mt-2 text-sm text-[var(--text-muted)]">
                    Are you sure you want to delete <span className="font-medium text-[var(--text)]">{admin.name}</span>? This action cannot be undone.
                  </p>
                </div>
              </div>
              <div className="mt-6 flex gap-3 justify-end">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-4 py-2 rounded-lg border border-[var(--border)] text-[var(--text)] hover:bg-[var(--bg-hover)] transition-colors text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    deleteMut.mutate();
                    setShowDeleteConfirm(false);
                  }}
                  disabled={deleteMut.isPending}
                  className="px-4 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white transition-colors text-sm font-medium flex items-center gap-2 disabled:opacity-50"
                >
                  {deleteMut.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      Delete
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit Admin Modal */}
      <AnimatePresence>
        {showEditForm && (
          <EditAdminModal
            admin={admin}
            roles={roles || []}
            onClose={() => setShowEditForm(false)}
            onSuccess={handleEditSuccess}
          />
        )}
      </AnimatePresence>
    </div>,
    document.body
  );
}

// Confirmation Modal Component
function ConfirmationModal({ title, message, onConfirm, onCancel, isLoading, confirmText = "Delete", cancelText = "Cancel" }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/60"
      onClick={onCancel}
    >
      <motion.div
        initial={{ scale: 0.95, y: 10 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 10 }}
        className="relative bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-6 max-w-sm w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0">
            <AlertTriangle className="w-6 h-6 text-red-500" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-[var(--text)]">{title}</h3>
            <p className="mt-2 text-sm text-[var(--text-muted)]">
              {message}
            </p>
          </div>
        </div>
        <div className="mt-6 flex gap-3 justify-end">
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="px-4 py-2 rounded-lg border border-[var(--border)] text-[var(--text)] hover:bg-[var(--bg-hover)] transition-colors text-sm font-medium"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className="px-4 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white transition-colors text-sm font-medium flex items-center gap-2 disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4" />
                {confirmText}
              </>
            )}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function RolesTab({ roles, loading, onCreate }) {
  const queryClient = useQueryClient();
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-[var(--text)]">Custom Roles</h2>
        <button onClick={onCreate} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Create Role
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-primary-500" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {roles && roles.length > 0 ? (
            roles.map((role) => (
              <div
                key={role._id}
                className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-4 space-y-3 flex flex-col"
              >
                <div className="flex items-start justify-between flex-1">
                  <div>
                    <h3 className="font-semibold text-[var(--text)]">{role.name}</h3>
                    <p className="text-xs text-[var(--text-muted)] mt-1">{role.description}</p>
                  </div>
                  <Shield className="w-4 h-4 text-primary-500 shrink-0" />
                </div>
                <div className="pt-2 border-t border-[var(--border)]">
                  <p className="text-xs text-[var(--text-muted)] font-semibold uppercase">
                    {role.adminsCount || 0} admins
                  </p>
                </div>
                <button
                  onClick={() => setDeleteConfirm(role)}
                  className="w-full px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 rounded text-xs font-medium transition-colors flex items-center justify-center gap-1"
                >
                  <Trash2 className="w-3 h-3" /> Delete
                </button>
              </div>
            ))
          ) : (
            <p className="text-[var(--text-muted)] col-span-3 text-center py-10">
              No custom roles created yet
            </p>
          )}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteConfirm && (
          <ConfirmationModal
            title="Delete Role?"
            message={`Are you sure you want to delete "${deleteConfirm.name}"? This action cannot be undone.`}
            isLoading={isDeleting}
            confirmText="Delete Role"
            onCancel={() => setDeleteConfirm(null)}
            onConfirm={async () => {
              setIsDeleting(true);
              try {
                await adminApi.delete(`/roles/${deleteConfirm._id}`);
                toast.success("Role deleted successfully");
                queryClient.invalidateQueries(["admin-roles"]);
                setDeleteConfirm(null);
              } catch (err) {
                toast.error(err.response?.data?.message || "Failed to delete role");
              } finally {
                setIsDeleting(false);
              }
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────
// MODALS
// ────────────────────────────────────────────────────────────────

function CreateAdminModal({ roles, onClose, onSuccess }) {
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    roleId: "",
  });
  const [showPermissions, setShowPermissions] = useState(false);
  const [customPermissions, setCustomPermissions] = useState({
    users: { view: false, edit: false, ban: false, delete: false, impersonate: false, exportCsv: false },
    bots: { view: false, edit: false, delete: false },
    conversations: { view: false, delete: false, export: false },
    blog: { view: false, create: false, edit: false, delete: false },
    plans: { view: false, edit: false, create: false, delete: false },
    coupons: { view: false, create: false, edit: false, delete: false },
    announcements: { view: false, create: false, delete: false },
    tickets: { view: false, reply: false, assign: false, close: false },
    audit: { view: false, delete: false },
    settings: { view: false, edit: false },
    stats: { view: false },
    admins: { view: false, create: false, edit: false, delete: false, ban: false, forcePasswordReset: false }
  });
  const queryClient = useQueryClient();

  const createMut = useMutation({
    mutationFn: () => adminApi.post("/admins", form),
    onSuccess: () => {
      toast.success("Admin created successfully!");
      queryClient.invalidateQueries(["admin-admins"]);
      onSuccess();
    },
    onError: (err) => toast.error(err.response?.data?.message || "Failed to create admin"),
  });

  const togglePermission = (module, action) => {
    setCustomPermissions(prev => ({
      ...prev,
      [module]: {
        ...prev[module],
        [action]: !prev[module][action]
      }
    }));
  };

  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-[999] p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0.95 }}
        className="bg-[var(--bg-card)] rounded-lg shadow-xl max-w-2xl w-full border border-[var(--border)] max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)]">
          <h2 className="text-lg font-bold text-[var(--text)]">Create Admin</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-[var(--bg-hover)] rounded transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Basic Info */}
          <div>
            <label className="text-xs font-semibold text-[var(--text-muted)] uppercase block mb-2">
              Admin Name *
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="input"
              placeholder="Full name"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-[var(--text-muted)] uppercase block mb-2">
              Email *
            </label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="input"
              placeholder="admin@example.com"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-[var(--text-muted)] uppercase block mb-2">
              Password *
            </label>
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="input"
              placeholder="Secure password"
            />
          </div>

          {/* Role Selection */}
          <CustomRoleSelector
            roles={roles}
            value={form.roleId}
            onChange={(roleId) => {
              setForm({ ...form, roleId });
              setShowPermissions(false);
            }}
            label="Assign Role *"
          />

          {/* Permissions Toggle */}
          <button
            type="button"
            onClick={() => setShowPermissions(!showPermissions)}
            className="w-full flex items-center justify-between px-4 py-3 rounded-lg bg-[var(--bg-hover)] hover:bg-[var(--border)] transition-colors text-sm font-semibold text-[var(--text)]"
          >
            <span>Custom Permissions (Optional)</span>
            {showPermissions ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {/* Permissions Grid with Toggle Switches */}
          {showPermissions && (
            <div className="bg-[var(--bg-hover)] rounded-lg p-4 space-y-3">
              <p className="text-xs text-[var(--text-muted)]">
                Enable specific permissions for this admin
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-80 overflow-y-auto pr-2">
                {[
                  { key: "users", label: "Users", actions: ["view", "edit", "ban", "delete"] },
                  { key: "bots", label: "Bots", actions: ["view", "edit", "delete"] },
                  { key: "conversations", label: "Conversations", actions: ["view", "delete"] },
                  { key: "plans", label: "Plans", actions: ["view", "edit", "create"] },
                  { key: "coupons", label: "Coupons", actions: ["view", "create", "edit"] },
                  { key: "announcements", label: "Announcements", actions: ["view", "create"] },
                  { key: "blog", label: "Blog", actions: ["view", "create", "edit"] },
                  { key: "tickets", label: "Support Tickets", actions: ["view", "reply"] },
                  { key: "audit", label: "Audit Logs", actions: ["view"] },
                  { key: "settings", label: "Settings", actions: ["view", "edit"] },
                  { key: "stats", label: "Statistics", actions: ["view"] },
                  { key: "admins", label: "Admin Mgmt", actions: ["view", "create", "edit"] },
                ].map(module => (
                  <div key={module.key} className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-3 space-y-2">
                    <h4 className="text-xs font-bold text-[var(--text)] uppercase">{module.label}</h4>
                    {module.actions.map(action => (
                      <div key={action} className="flex items-center justify-between gap-2">
                        <span className="text-xs text-[var(--text-muted)] capitalize">
                          {action === "exportCsv" ? "Export" : action === "manualActivate" ? "Manual Act." : action === "forcePasswordReset" ? "Force Reset" : action}
                        </span>
                        {/* Toggle Switch */}
                        <button
                          onClick={() => togglePermission(module.key, action)}
                          className={`w-10 h-5 rounded-full transition-all ${
                            customPermissions[module.key][action]
                              ? "bg-primary-500"
                              : "bg-[var(--border)]"
                          }`}
                        >
                          <motion.div
                            layout
                            className={`w-4 h-4 rounded-full bg-white transition-transform ${
                              customPermissions[module.key][action] ? "translate-x-5" : "translate-x-0.5"
                            }`}
                          />
                        </button>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-2 px-6 py-4 border-t border-[var(--border)] bg-[var(--bg-hover)]">
          <button onClick={onClose} className="btn-secondary flex-1">
            Cancel
          </button>
          <button
            onClick={() => createMut.mutate()}
            disabled={!form.name || !form.email || !form.password || !form.roleId || createMut.isPending}
            className="btn-primary flex-1"
          >
            {createMut.isPending ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Create Admin"}
          </button>
        </div>
      </motion.div>
    </motion.div>,
    document.body
  );
}

// Custom Mobile-Friendly Selector Component
function CustomSelector({ options, value, onChange, label, placeholder = "Select..." }) {
  const [isOpen, setIsOpen] = useState(false);
  const selectedOption = options?.find(o => o.value === value);

  return (
    <div>
      {label && (
        <label className="text-xs font-semibold text-[var(--text-muted)] uppercase block mb-2">
          {label}
        </label>
      )}
      <div className="relative">
        {/* Button to trigger dropdown */}
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="w-full input flex items-center justify-between text-left"
        >
          <span className="truncate">{selectedOption?.label || placeholder}</span>
          <ChevronDown className={`w-4 h-4 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {/* Dropdown menu */}
        {isOpen && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-[var(--bg-card)] border border-[var(--border)] rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto">
            {!options || options.length === 0 ? (
              <div className="px-4 py-3 text-xs text-[var(--text-muted)]">
                No options available
              </div>
            ) : (
              <>
                {options.map(option => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      onChange(option.value);
                      setIsOpen(false);
                    }}
                    className={`w-full text-left px-4 py-2 text-sm hover:bg-[var(--bg-hover)] transition-colors ${
                      value === option.value
                        ? "bg-primary-500/20 text-primary-500 font-semibold"
                        : "text-[var(--text)]"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Custom Mobile-Friendly Role Selector Component
function CustomRoleSelector({ roles, value, onChange, label }) {
  const [isOpen, setIsOpen] = useState(false);
  const selectedRole = roles?.find(r => r._id === value);

  return (
    <div>
      <label className="text-xs font-semibold text-[var(--text-muted)] uppercase block mb-2">
        {label}
      </label>
      <div className="relative">
        {/* Button to trigger dropdown */}
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="w-full input flex items-center justify-between text-left"
        >
          <span className="truncate">{selectedRole?.name || "Select a Role..."}</span>
          <ChevronDown className={`w-4 h-4 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {/* Dropdown menu */}
        {isOpen && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-[var(--bg-card)] border border-[var(--border)] rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto">
            {!roles || roles.length === 0 ? (
              <div className="px-4 py-3 text-xs text-[var(--text-muted)]">
                No roles available
              </div>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => {
                    onChange("");
                    setIsOpen(false);
                  }}
                  className={`w-full text-left px-4 py-2 text-sm hover:bg-[var(--bg-hover)] transition-colors ${
                    !value ? "bg-primary-500/20 text-primary-500" : "text-[var(--text)]"
                  }`}
                >
                  Select a Role...
                </button>
                {roles.map(role => (
                  <button
                    key={role._id}
                    type="button"
                    onClick={() => {
                      onChange(role._id);
                      setIsOpen(false);
                    }}
                    className={`w-full text-left px-4 py-2 text-sm hover:bg-[var(--bg-hover)] transition-colors ${
                      value === role._id
                        ? "bg-primary-500/20 text-primary-500 font-semibold"
                        : "text-[var(--text)]"
                    }`}
                  >
                    {role.name}
                  </button>
                ))}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function EditAdminModal({ admin, roles, onClose, onSuccess }) {
  const [tab, setTab] = useState("basic"); // basic | permissions
  const [form, setForm] = useState({
    name: admin.name,
    email: admin.email,
    roleId: admin.role?._id || admin.role,
  });
  
  const [passwordForm, setPasswordForm] = useState({
    newPassword: "",
    confirmPassword: "",
  });

  const [showPasswords, setShowPasswords] = useState({
    new: false,
    confirm: false,
  });

  // Clear password fields when modal opens or admin changes
  useEffect(() => {
    setPasswordForm({ newPassword: "", confirmPassword: "" });
    setShowPasswords({ new: false, confirm: false });
  }, [admin._id]);
  
  // Initialize permissions with defaults, merging any existing admin permissions
  const defaultPermissions = {
    users: { view: false, edit: false, ban: false, delete: false, impersonate: false, exportCsv: false },
    bots: { view: false, edit: false, delete: false },
    conversations: { view: false, delete: false, export: false },
    plans: { view: false, edit: false, create: false, delete: false },
    coupons: { view: false, create: false, edit: false, delete: false },
    announcements: { view: false, create: false, delete: false },
    blog: { view: false, create: false, edit: false, delete: false },
    tickets: { view: false, reply: false, assign: false, close: false },
    audit: { view: false, delete: false },
    settings: { view: false, edit: false },
    stats: { view: false },
    admins: { view: false, create: false, edit: false, delete: false, ban: false, forcePasswordReset: false }
  };
  
  // Merge admin's existing permissions with defaults to ensure all keys exist
  const mergedPermissions = admin.permissions ? {
    ...defaultPermissions,
    ...Object.entries(admin.permissions).reduce((acc, [key, value]) => {
      acc[key] = { ...defaultPermissions[key], ...value };
      return acc;
    }, {})
  } : defaultPermissions;
  
  const [customPermissions, setCustomPermissions] = useState(mergedPermissions);
  
  // Track which modules are toggled ON
  const [moduleToggles, setModuleToggles] = useState(() => {
    const toggles = {};
    Object.entries(mergedPermissions).forEach(([module, actions]) => {
      toggles[module] = Object.values(actions).some(val => val === true);
    });
    return toggles;
  });
  
  const queryClient = useQueryClient();

  const modules = [
    { key: "users", label: "Users", actions: ["view", "edit", "ban", "delete", "impersonate", "exportCsv"] },
    { key: "bots", label: "Bots", actions: ["view", "edit", "delete"] },
    { key: "conversations", label: "Conversations", actions: ["view", "delete", "export"] },
    { key: "plans", label: "Plans", actions: ["view", "edit", "create", "delete"] },
    { key: "coupons", label: "Coupons", actions: ["view", "create", "edit", "delete"] },
    { key: "announcements", label: "Announcements", actions: ["view", "create", "delete"] },
    { key: "blog", label: "Blog", actions: ["view", "create", "edit", "delete"] },
    { key: "tickets", label: "Tickets", actions: ["view", "reply", "assign", "close"] },
    { key: "audit", label: "Audit Logs", actions: ["view", "delete"] },
    { key: "settings", label: "Settings", actions: ["view", "edit"] },
    { key: "stats", label: "Stats", actions: ["view"] },
    { key: "admins", label: "Admin Management", actions: ["view", "create", "edit", "delete", "ban", "forcePasswordReset"] }
  ];

  const updateMut = useMutation({
    mutationFn: () => adminApi.put(`/admins/${admin._id}`, {
      name: form.name,
      email: form.email,
      roleId: form.roleId,
    }),
    onSuccess: () => {
      toast.success("Admin updated successfully!");
      queryClient.invalidateQueries(["admin-admins"]);
      onSuccess();
    },
    onError: (err) => toast.error(err.response?.data?.message || "Failed to update admin"),
  });

  const updatePermissionsMut = useMutation({
    mutationFn: () => adminApi.put(`/admins/${admin._id}/permissions`, {
      permissions: customPermissions,
    }),
    onSuccess: () => {
      toast.success("Permissions updated successfully!");
      queryClient.invalidateQueries(["admin-admins"]);
      onSuccess();
    },
    onError: (err) => toast.error(err.response?.data?.message || "Failed to update permissions"),
  });

  const changePasswordMut = useMutation({
    mutationFn: () => adminApi.post(`/admins/${admin._id}/change-password`, {
      newPassword: passwordForm.newPassword,
    }),
    onSuccess: () => {
      toast.success("Password changed! Email sent to admin.");
      setPasswordForm({ newPassword: "", confirmPassword: "" });
      queryClient.invalidateQueries(["admin-admins"]);
      onSuccess();
    },
    onError: (err) => toast.error(err.response?.data?.message || "Failed to change password"),
  });

  const toggleModule = (module) => {
    setModuleToggles(prev => ({ ...prev, [module]: !prev[module] }));
    
    // When turning OFF a module, disable all its actions
    if (moduleToggles[module]) {
      setCustomPermissions(prev => ({
        ...prev,
        [module]: Object.keys(prev[module]).reduce((acc, action) => {
          acc[action] = false;
          return acc;
        }, {})
      }));
    }
  };

  const togglePermission = (module, action) => {
    setCustomPermissions(prev => ({
      ...prev,
      [module]: {
        ...prev[module],
        [action]: !prev[module][action]
      }
    }));
  };

  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-[999]"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0.95 }}
        className="bg-[var(--bg-card)] rounded-lg shadow-xl max-w-2xl w-full mx-4 border border-[var(--border)] max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)] sticky top-0 bg-[var(--bg-card)]">
          <h2 className="text-lg font-bold text-[var(--text)]">Edit Admin</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-[var(--bg-hover)] rounded transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[var(--border)]">
          <button
            onClick={() => setTab("basic")}
            className={`flex-1 px-6 py-3 font-medium transition-colors ${
              tab === "basic"
                ? "text-primary-500 border-b-2 border-primary-500"
                : "text-[var(--text-muted)] hover:text-[var(--text)]"
            }`}
          >
            Basic Info
          </button>
          <button
            onClick={() => setTab("permissions")}
            className={`flex-1 px-6 py-3 font-medium transition-colors ${
              tab === "permissions"
                ? "text-primary-500 border-b-2 border-primary-500"
                : "text-[var(--text-muted)] hover:text-[var(--text)]"
            }`}
          >
            Permissions
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[calc(90vh-200px)] overflow-y-auto">
          {tab === "basic" && (
            <div className="space-y-4">
              {/* Admin Details */}
              <div className="border-t border-[var(--border)] pt-4">
                <h4 className="text-sm font-semibold text-[var(--text)] mb-4">Admin Details</h4>
                
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-semibold text-[var(--text-muted)] uppercase block mb-2">
                      Name
                    </label>
                    <input
                      type="text"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      className="input"
                      placeholder="Admin name"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-[var(--text-muted)] uppercase block mb-2">
                      Email
                    </label>
                    <input
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      className="input break-words"
                      placeholder="admin@example.com"
                    />
                  </div>

                  <CustomRoleSelector
                    roles={roles}
                    value={form.roleId}
                    onChange={(roleId) => setForm({ ...form, roleId })}
                    label="Role"
                  />
                </div>
              </div>

              {/* Change Password Section */}
              <div className="bg-orange-500/5 border border-orange-500/20 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-[var(--text)] mb-3 flex items-center gap-2">
                  <Key className="w-4 h-4 text-orange-400" /> Set New Password
                </h4>
                
                <p className="text-xs text-[var(--text-muted)] mb-3">
                  Set a new password for this admin. They will receive the new credentials via email.
                </p>

                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-semibold text-[var(--text-muted)] uppercase block mb-2">
                      New Password
                    </label>
                    <div className="relative">
                      <input
                        type={showPasswords.new ? "text" : "password"}
                        value={passwordForm.newPassword}
                        onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                        autoComplete="off"
                        className="input pr-10"
                        placeholder="Enter new password (min 8 characters)"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPasswords(prev => ({ ...prev, new: !prev.new }))}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
                      >
                        {showPasswords.new ? <Eye className="w-4 h-4" /> : <Eye className="w-4 h-4" style={{ opacity: 0.5 }} />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-[var(--text-muted)] uppercase block mb-2">
                      Confirm Password
                    </label>
                    <div className="relative">
                      <input
                        type={showPasswords.confirm ? "text" : "password"}
                        value={passwordForm.confirmPassword}
                        onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                        autoComplete="off"
                        className="input pr-10"
                        placeholder="Confirm new password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPasswords(prev => ({ ...prev, confirm: !prev.confirm }))}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
                      >
                        {showPasswords.confirm ? <Eye className="w-4 h-4" /> : <Eye className="w-4 h-4" style={{ opacity: 0.5 }} />}
                      </button>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      if (!passwordForm.newPassword.trim()) {
                        toast.error("Password is required");
                        return;
                      }
                      if (passwordForm.newPassword.length < 8) {
                        toast.error("Password must be at least 8 characters");
                        return;
                      }
                      if (passwordForm.newPassword !== passwordForm.confirmPassword) {
                        toast.error("Passwords do not match");
                        return;
                      }
                      changePasswordMut.mutate();
                    }}
                    disabled={changePasswordMut.isPending || !passwordForm.newPassword || !passwordForm.confirmPassword}
                    className="w-full bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 border border-orange-500/30 rounded-lg py-2 text-sm font-medium transition-colors disabled:opacity-50"
                  >
                    {changePasswordMut.isPending ? (
                      <span className="flex items-center justify-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" /> Setting Password...
                      </span>
                    ) : (
                      "Set Password & Send Email"
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {tab === "permissions" && (
            <div className="space-y-6">
              <p className="text-sm text-[var(--text-muted)]">
                Toggle module pages ON/OFF. When ON, you can configure specific permissions.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {modules.map((module) => (
                  <div
                    key={module.key}
                    className={`p-4 rounded-lg border transition-all ${
                      moduleToggles[module.key]
                        ? "bg-primary-500/10 border-primary-500/30"
                        : "bg-[var(--bg-hover)] border-[var(--border)]"
                    }`}
                  >
                    {/* Module Toggle Header */}
                    <div className="flex items-center justify-between mb-4">
                      <span className="font-semibold text-sm text-[var(--text)]">
                        {module.label}
                      </span>
                      {/* Toggle Switch */}
                      <button
                        onClick={() => toggleModule(module.key)}
                        className={`relative w-10 h-6 rounded-full transition-all ${
                          moduleToggles[module.key]
                            ? "bg-primary-500"
                            : "bg-[var(--border)]"
                        }`}
                      >
                        <motion.div
                          layout
                          className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full"
                          animate={{ x: moduleToggles[module.key] ? 16 : 0 }}
                          transition={{ type: "spring", damping: 20 }}
                        />
                      </button>
                    </div>

                    {/* Sub-permissions - Only show if module is ON */}
                    {moduleToggles[module.key] && (
                      <div className="space-y-2 pt-2 border-t border-primary-500/20">
                        {module.actions.map((action) => (
                          <label
                            key={action}
                            className="flex items-center gap-3 cursor-pointer group py-1"
                          >
                            {/* Sub-permission Toggle */}
                            <button
                              onClick={() => togglePermission(module.key, action)}
                              className={`relative w-8 h-5 rounded-full transition-all shrink-0 ${
                                customPermissions[module.key][action]
                                  ? "bg-green-500"
                                  : "bg-gray-400"
                              }`}
                            >
                              <motion.div
                                layout
                                className="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full"
                                animate={{ x: customPermissions[module.key][action] ? 12 : 0 }}
                                transition={{ type: "spring", damping: 20 }}
                              />
                            </button>
                            <span className="text-xs text-[var(--text-muted)] capitalize flex-1">
                              {action.replace(/([A-Z])/g, " $1").toLowerCase()}
                            </span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-center gap-3 px-6 py-4 border-t border-[var(--border)] bg-[var(--bg-hover)] sticky bottom-0">
          <button onClick={onClose} className="btn-secondary px-8">
            Cancel
          </button>
          <button
            onClick={() => {
              if (tab === "basic") {
                updateMut.mutate();
              } else {
                updatePermissionsMut.mutate();
              }
            }}
            disabled={
              (tab === "basic" && updateMut.isPending) ||
              (tab === "permissions" && updatePermissionsMut.isPending) ||
              (tab === "basic" && (!form.name || !form.roleId))
            }
            className="btn-primary px-8"
          >
            {(tab === "basic" ? updateMut.isPending : updatePermissionsMut.isPending) ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              "Update"
            )}
          </button>
        </div>
      </motion.div>
    </motion.div>,
    document.body
  );
}

function RoleModal({ onClose, onSuccess }) {
  const [form, setForm] = useState({
    name: "",
    description: "",
    permissions: {
      users: { view: false, edit: false, ban: false, delete: false, impersonate: false, exportCsv: false },
      bots: { view: false, edit: false, delete: false },
      conversations: { view: false, delete: false, export: false },
      blog: { view: false, create: false, edit: false, delete: false },
      plans: { view: false, edit: false, create: false, delete: false },
      coupons: { view: false, create: false, edit: false, delete: false },
      announcements: { view: false, create: false, delete: false },
      tickets: { view: false, reply: false, assign: false, close: false },
      audit: { view: false, delete: false },
      settings: { view: false, edit: false },
      stats: { view: false },
      admins: { view: false, create: false, edit: false, delete: false, ban: false, forcePasswordReset: false }
    }
  });
  const createRoleMut = useMutation({
    mutationFn: async () => {
      const res = await adminApi.post("/roles", {
        name: form.name,
        description: form.description,
        permissions: form.permissions
      });
      return res.data;
    },
    onSuccess: () => {
      toast.success("Role created successfully!");
      onSuccess();
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || "Failed to create role");
    }
  });

  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-[999]"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0.95 }}
        className="bg-[var(--bg-card)] rounded-lg shadow-xl max-w-md w-full border border-[var(--border)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)]">
          <h2 className="text-lg font-bold text-[var(--text)]">Create Role</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-[var(--bg-hover)] rounded transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="text-xs font-semibold text-[var(--text-muted)] uppercase block mb-2">
              Role Name *
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="input"
              placeholder="e.g., Content Manager"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-[var(--text-muted)] uppercase block mb-2">
              Description
            </label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="input"
              rows="3"
              placeholder="What is this role for?"
            />
          </div>
          
          <p className="text-xs text-[var(--text-muted)]">
            ℹ️ Permissions will be configured when assigning this role to admins
          </p>
        </div>

        <div className="flex gap-2 px-6 py-4 border-t border-[var(--border)] bg-[var(--bg-hover)]">
          <button onClick={onClose} className="btn-secondary flex-1">
            Cancel
          </button>
          <button
            onClick={() => createRoleMut.mutate()}
            disabled={createRoleMut.isPending || !form.name.trim()}
            className="btn-primary flex-1"
          >
            {createRoleMut.isPending ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Create"}
          </button>
        </div>
      </motion.div>
    </motion.div>,
    document.body
  );
}

function ActivityLogsModal({ adminId, onClose }) {
  const { data: logs, isLoading } = useQuery({
    queryKey: ["admin-activity-logs", adminId],
    queryFn: async () => {
      const res = await adminApi.get(`/admins/activity/${adminId}?limit=50`);
      return res.data.data?.logs || [];
    },
  });

  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-[999]"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0.95 }}
        className="bg-[var(--bg-card)] rounded-lg shadow-xl max-w-2xl w-full mx-4 border border-[var(--border)] max-h-[80vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)]">
          <h2 className="text-lg font-bold text-[var(--text)]">Activity Logs</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-[var(--bg-hover)] rounded transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-6 h-6 animate-spin text-primary-500" />
            </div>
          ) : (
            <div className="divide-y divide-[var(--border)]">
              {logs && logs.length > 0 ? (
                logs.map((log) => (
                  <div key={log._id} className="p-4 hover:bg-[var(--bg-hover)] transition-colors">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold text-[var(--text)]">{log.action}</p>
                        <p className="text-xs text-[var(--text-muted)] mt-1">{log.details}</p>
                      </div>
                      <p className="text-xs text-[var(--text-muted)]">
                        {new Date(log.createdAt).toLocaleString("en-IN")}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="p-6 text-center text-[var(--text-muted)]">No activity logs found</p>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>,
    document.body
  );
}
