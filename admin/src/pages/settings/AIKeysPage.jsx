import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Lock, Plus, Search, Trash2, X, Loader2, Check, RefreshCw,
  AlertTriangle, Eye, EyeOff, Copy, Activity, Zap, Shield, 
  BarChart3, Clock, CheckCircle, XCircle, AlertCircle,
  Sparkles, CreditCard, Mail, Lightbulb, ChevronDown,
} from "lucide-react";
import adminApi from "../../api/axios";
import toast from "react-hot-toast";

// ─── HELPERS ────────────────────────────────────────────────────

const formatTimeAgo = (date) => {
  if (!date) return "Never";
  const seconds = Math.floor((new Date() - new Date(date)) / 1000);
  
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 2592000) return `${Math.floor(seconds / 86400)}d ago`;
  return `${Math.floor(seconds / 2592000)}mo ago`;
};

// ─── CONSTANTS ──────────────────────────────────────────────────

const PROVIDERS = [
  { value: "gemini", label: "Google Gemini", icon: Sparkles, color: "bg-blue-100 text-blue-700" },
  { value: "groq", label: "Groq (Llama)", icon: Zap, color: "bg-orange-100 text-orange-700" },
  { value: "razorpay", label: "Razorpay", icon: CreditCard, color: "bg-cyan-100 text-cyan-700" },
  { value: "email", label: "Email (SMTP)", icon: Mail, color: "bg-purple-100 text-purple-700" },
];
// Helper function to render provider icon
const ProviderIcon = ({ IconComponent, className }) => {
  const Icon = IconComponent;
  return <Icon className={className} />;
};

// ─── PROVIDER DROPDOWN ──────────────────────────────────────────

const ProviderDropdown = ({ value, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

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

  const options = [
    { value: "all", label: "All Providers" },
    ...PROVIDERS,
  ];

  const selectedOption = options.find((opt) => opt.value === value);

  return (
    <div className="relative min-w-full sm:min-w-fit" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3 py-2 bg-[var(--bg)] border border-[var(--border)] rounded-lg text-sm text-[var(--text)] hover:border-primary-500/50 transition-colors"
      >
        <span className="font-medium">{selectedOption?.label || "All Providers"}</span>
        <ChevronDown
          className={`w-4 h-4 text-[var(--text-muted)] transition-transform ${isOpen ? "rotate-180" : ""}`}
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
            {options.map((option) => (
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

// ─── SERVICE PROVIDER DROPDOWN (FOR MODAL) ──────────────────────

const ServiceProviderDropdown = ({ value, onChange, disabled }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

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

  const selectedOption = PROVIDERS.find((opt) => opt.value === value);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className="w-full flex items-center justify-between px-3 py-2 bg-[var(--bg)] border border-[var(--border)] rounded-lg text-sm text-[var(--text)] hover:border-primary-500/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <span className="font-medium">{selectedOption?.label || "Select Provider"}</span>
        <ChevronDown
          className={`w-4 h-4 text-[var(--text-muted)] transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      <AnimatePresence>
        {isOpen && !disabled && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="absolute top-full mt-1 left-0 right-0 bg-[var(--bg-card)] border border-[var(--border)] rounded-lg shadow-lg z-50"
          >
            {PROVIDERS.map((option) => (
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

const StatusBadge = ({ status }) => {
  const config = {
    success: { icon: CheckCircle, color: "text-emerald-500", bg: "bg-emerald-50", label: "Success" },
    active: { icon: CheckCircle, color: "text-emerald-500", bg: "bg-emerald-50", label: "Active" },
    inactive: { icon: XCircle, color: "text-red-500", bg: "bg-red-50", label: "Inactive" },
    testing: { icon: Loader2, color: "text-amber-500", bg: "bg-amber-50", label: "Testing" },
    failed: { icon: AlertCircle, color: "text-red-600", bg: "bg-red-50", label: "Failed" },
    untested: { icon: AlertCircle, color: "text-gray-500", bg: "bg-gray-50", label: "Untested" },
  };
  const cfg = config[status] || config.untested;
  const Icon = cfg.icon;
  return (
    <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${cfg.bg}`}>
      <Icon className={`w-3 h-3 ${cfg.color} ${status === "testing" ? "animate-spin" : ""}`} />
      <span className={cfg.color}>{cfg.label}</span>
    </div>
  );
};

// ─── MAIN COMPONENT ─────────────────────────────────────────────

export default function AIKeysPage() {
  const [search, setSearch] = useState("");
  const [filterProvider, setFilterProvider] = useState("all");
  const [editingKey, setEditingKey] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const [testingKeyId, setTestingKeyId] = useState(null);
  const [testResult, setTestResult] = useState(null);
  const [showTestingModal, setShowTestingModal] = useState(null); // keyId or null
  const queryClient = useQueryClient();

  // Fetch all keys
  const { data, isLoading, error } = useQuery({
    queryKey: ["aiKeys"],
    queryFn: async () => {
      const res = await adminApi.get("/ai-keys");
      return res.data.data;
    },
  });

  const keys = data?.keys || [];

  // Test API key mutation
  const testMutation = useMutation({
    mutationFn: async (keyId) => {
      const res = await adminApi.post(`/ai-keys/${keyId}/test`);
      return res.data.data;
    },
    onSuccess: (data) => {
      setTestResult(data);
      setTestingKeyId(null);
      queryClient.invalidateQueries(["aiKeys"]);
      if (data.success) {
        toast.success("Key test successful!");
      } else {
        toast.error(`Test failed: ${data.error}`);
      }
    },
    onError: (error) => {
      setTestingKeyId(null);
      const msg = error.response?.data?.message || "Test failed";
      toast.error(msg);
      setTestResult({ success: false, error: msg });
    },
  });

  // Filter
  const filtered = keys.filter((k) => {
    const matchesSearch =
      k.name.toLowerCase().includes(search.toLowerCase()) ||
      k.model.toLowerCase().includes(search.toLowerCase());
    const matchesProvider = filterProvider === "all" || k.provider === filterProvider;
    return matchesSearch && matchesProvider;
  });

  // Group by provider
  const grouped = {};
  PROVIDERS.forEach((p) => {
    grouped[p.value] = filtered.filter((k) => k.provider === p.value);
  });

  return (
    <div className="flex flex-col h-full gap-4 p-5 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between shrink-0">
        <h1 className="text-2xl font-bold text-[var(--text)]">API Keys</h1>
        <button
          onClick={() => {
            setEditingKey(null);
            setShowModal(true);
          }}
          className="btn-primary gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Key
        </button>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-3 shrink-0">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-[var(--text-muted)]" />
          <input
            type="text"
            placeholder="Search keys..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input w-full pl-9 h-fit py-2 text-sm"
          />
        </div>
        <ProviderDropdown value={filterProvider} onChange={setFilterProvider} />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto space-y-6">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-6 h-6 animate-spin text-primary-500" />
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-3" />
              <p className="text-[var(--text-muted)]">Failed to load API keys</p>
            </div>
          </div>
        ) : keys.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <Shield className="w-12 h-12 text-[var(--text-muted)] mx-auto mb-3 opacity-50" />
              <p className="text-[var(--text-muted)]">No API keys yet</p>
              <button
                onClick={() => setShowModal(true)}
                className="btn-primary mt-4 gap-2"
              >
                <Plus className="w-4 h-4" />
                Add First Key
              </button>
            </div>
          </div>
        ) : (
          PROVIDERS.map((provider) => {
            const providerKeys = grouped[provider.value];
            if (providerKeys.length === 0) return null;

            return (
              <div key={provider.value} className="space-y-3">
                {/* Provider Header */}
                <div className="flex items-center gap-2">
                  <ProviderIcon IconComponent={provider.icon} className={`w-5 h-5 ${provider.color}`} />
                  <h2 className="text-sm font-semibold text-[var(--text)]">{provider.label}</h2>
                  <span className="text-xs text-[var(--text-muted)]">({providerKeys.length})</span>
                </div>

                {/* Keys List */}
                <div className="space-y-2">
                  {providerKeys.map((key) => (
                    <div key={key._id}>
                      <AIKeyCard
                        keyData={key}
                        isTesting={testingKeyId === key._id}
                        onEdit={() => {
                          setEditingKey(key);
                          setShowModal(true);
                        }}
                        onTest={() => {
                          setShowTestingModal(key._id);
                        }}
                        onDelete={() => setShowDeleteConfirm(key._id)}
                      />
                      
                      {/* Test Result Display */}
                      {testResult && testResult.keyTestedId === key._id && (
                        <div className={`mt-2 p-3 rounded-lg border ${
                          testResult.success 
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600' 
                            : 'bg-red-500/10 border-red-500/30 text-red-600'
                        }`}>
                          <div className="flex gap-2 items-start">
                            {testResult.success ? (
                              <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />
                            ) : (
                              <XCircle className="w-4 h-4 shrink-0 mt-0.5" />
                            )}
                            <div className="flex-1 text-xs">
                              <p className="font-semibold mb-1">
                                {testResult.success ? "Test Passed" : "Test Failed"}
                              </p>
                              <p>{testResult.message || testResult.error}</p>
                              {testResult.responseTime && (
                                <p className="mt-1 opacity-70">
                                  Response time: {testResult.responseTime}ms
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal */}
      <AnimatePresence>
        {showModal && (
          <AIKeyModal
            key={editingKey?._id}
            initialData={editingKey}
            onClose={() => {
              setShowModal(false);
              setEditingKey(null);
            }}
            onSave={() => {
              queryClient.invalidateQueries(["aiKeys"]);
              setShowModal(false);
              setEditingKey(null);
            }}
          />
        )}
      </AnimatePresence>

      {/* Delete Confirm */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <DeleteConfirmModal
            keyId={showDeleteConfirm}
            onClose={() => setShowDeleteConfirm(null)}
            onConfirm={() => {
              queryClient.invalidateQueries(["aiKeys"]);
              setShowDeleteConfirm(null);
            }}
          />
        )}
      </AnimatePresence>

      {/* Testing Modal */}
      <AnimatePresence>
        {showTestingModal && (
          <TestingModal
            keyId={showTestingModal}
            onClose={() => setShowTestingModal(null)}
            onTestComplete={async (updatedKey) => {
              // Update cache with the fresh data from test
              if (updatedKey) {
                queryClient.setQueryData(["aiKeys"], (oldData) => {
                  if (!oldData || !oldData.keys) return oldData;
                  
                  const updatedKeys = oldData.keys.map((k) => 
                    k._id === updatedKey._id ? updatedKey : k
                  );
                  
                  const updatedGrouped = {
                    ...oldData.grouped,
                    [updatedKey.provider]: oldData.grouped[updatedKey.provider]?.map((k) =>
                      k._id === updatedKey._id ? updatedKey : k
                    ) || [],
                  };
                  
                  return {
                    ...oldData,
                    keys: updatedKeys,
                    grouped: updatedGrouped,
                  };
                });
              }
              
              // Refetch to ensure database consistency
              await queryClient.refetchQueries({
                queryKey: ["aiKeys"],
                exact: true,
              });
              setShowTestingModal(null);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── AI KEY CARD ────────────────────────────────────────────────

function AIKeyCard({ keyData, isTesting, onEdit, onTest, onDelete }) {
  const [showKey, setShowKey] = useState(false);

  return (
    <div className="p-4 border border-[var(--border)] rounded-lg bg-[var(--bg-card)] hover:border-primary-400/50 transition-colors group">
      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-[var(--text)] truncate">{keyData.name}</h3>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">{keyData.model}</p>
        </div>
        <div className="flex gap-2 shrink-0">
          <StatusBadge status={isTesting ? "testing" : (keyData.testResult?.status || "untested")} />
          {keyData.isPrimary && keyData.isActive && (
            <div className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-primary-400/10 border border-primary-400/20 text-primary-400">
              <Zap className="w-3 h-3" />
              Primary
            </div>
          )}
          {!keyData.isActive && (
            <div className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-500/10 border border-red-500/20 text-red-400">
              <XCircle className="w-3 h-3" />
              Inactive
            </div>
          )}
        </div>
      </div>

      {/* Key Display */}
      <div className="mb-3 p-3 rounded bg-[var(--bg-hover)] flex items-center justify-between group/key">
        <code className="text-xs font-mono text-[var(--text-muted)]">
          {showKey ? keyData.maskedKey : "•••••••••••••••••"}
        </code>
        <button
          onClick={() => setShowKey(!showKey)}
          className="p-1 rounded hover:bg-[var(--bg)] transition-colors opacity-0 group-key-hover:opacity-100"
          title={showKey ? "Hide" : "Show"}
        >
          {showKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-3 text-xs">
        <StatItem 
          icon={Activity} 
          label="Requests" 
          value={keyData.stats?.requestsThisMonth ? `${keyData.stats.requestsThisMonth}/mo` : "0"} 
        />
        <StatItem 
          icon={Clock} 
          label="Last Used" 
          value={keyData.stats?.lastUsedAt ? formatTimeAgo(keyData.stats.lastUsedAt) : "Never"} 
        />
        <StatItem 
          icon={BarChart3} 
          label="Success Rate" 
          value={keyData.stats?.totalRequests > 0 ? `${Math.round((keyData.stats.successRequests / keyData.stats.totalRequests) * 100)}%` : "—"} 
        />
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={onTest}
          className="btn-secondary text-xs flex-1 flex items-center justify-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={isTesting || !keyData.isActive}
          title={!keyData.isActive ? "Cannot test an inactive key" : ""}
        >
          {isTesting ? (
            <>
              <Loader2 className="w-3 h-3 animate-spin" />
              <span>Testing...</span>
            </>
          ) : (
            <>
              <RefreshCw className="w-3 h-3" />
              <span>Test</span>
            </>
          )}
        </button>
        <button onClick={onEdit} className="btn-secondary text-xs flex items-center justify-center px-3">
          Edit
        </button>
        <button onClick={onDelete} className="btn-secondary text-xs flex items-center justify-center px-3 text-red-400">
          Delete
        </button>
      </div>

      {/* Error Message */}
      {keyData.testResult?.status === "failed" && keyData.testResult?.error && (
        <div className="mt-3 p-2 rounded bg-red-500/10 border border-red-500/20 text-xs text-red-400">
          {keyData.testResult.error.substring(0, 100)}...
        </div>
      )}
    </div>
  );
}

// ─── STAT ITEM ──────────────────────────────────────────────────

function StatItem({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-1.5">
      <Icon className="w-3.5 h-3.5 text-[var(--text-muted)]" />
      <div>
        <p className="text-[10px] text-[var(--text-muted)]">{label}</p>
        <p className="font-medium text-[var(--text)]">{value}</p>
      </div>
    </div>
  );
}

// ─── MODAL ──────────────────────────────────────────────────────

function AIKeyModal({ initialData, onClose, onSave }) {
  const [form, setForm] = useState(
    initialData ?
      // EDIT mode - don't populate apiKey (it's encrypted, can't edit it directly)
      {
        provider: initialData.provider,
        name: initialData.name,
        apiKey: "", // Empty - user can paste new key if they want to rotate
        model: initialData.model,
        isPrimary: initialData.isPrimary,
        notes: initialData.notes || "",
      }
      : // CREATE mode - empty form
      {
        provider: "gemini",
        name: "",
        apiKey: "",
        model: "gemini-2.5-flash",
        isPrimary: false,
        notes: "",
      }
  );
  const [showKey, setShowKey] = useState(false);
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: () => {
      if (initialData) {
        return adminApi.put(`/ai-keys/${initialData._id}`, form);
      } else {
        return adminApi.post("/ai-keys", form);
      }
    },
    onSuccess: (response) => {
      toast.success(initialData ? "Key updated!" : "Key added!");
      queryClient.refetchQueries({
        queryKey: ["aiKeys"],
        exact: true,
      });
      onSave();
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || "Failed to save key");
    },
  });

  return createPortal(
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-[200] bg-black/50 backdrop-blur-sm"
      />
      <motion.div
        initial={{ x: "100%", opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: "100%", opacity: 0 }}
        transition={{ type: "spring", damping: 28, stiffness: 280 }}
        className="fixed right-0 top-0 h-full z-[201] w-full max-w-xl bg-[var(--bg-card)] border-l border-[var(--border)] flex flex-col shadow-2xl"
      >
        {/* Header */}
        <div className="shrink-0 px-5 py-4 border-b border-[var(--border)] bg-[var(--bg-hover)] flex items-center justify-between">
          <h2 className="text-lg font-bold text-[var(--text)]">
            {initialData ? "Edit API Key" : "Add New API Key"}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[var(--bg)]">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
          {/* Provider */}
          <div>
            <label className="text-xs font-semibold text-[var(--text-muted)] mb-2 block">
              Service Provider *
            </label>
            <ServiceProviderDropdown
              value={form.provider}
              onChange={(value) => setForm({ ...form, provider: value })}
              disabled={!!initialData}
            />
          </div>

          {/* Name */}
          <div>
            <label className="text-xs font-semibold text-[var(--text-muted)] mb-2 block">
              Key Name *
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g., 'Primary Gemini', 'Backup Groq'"
              className="input w-full text-sm h-fit py-2"
            />
          </div>

          {/* API Key */}
          <div>
            <label className="text-xs font-semibold text-[var(--text-muted)] mb-2 block">
              API Key {!initialData && "*"} <Lock className="inline w-3 h-3 ml-1" />
            </label>
            <div className="relative">
              <input
                type={showKey ? "text" : "password"}
                value={form.apiKey}
                onChange={(e) => setForm({ ...form, apiKey: e.target.value })}
                placeholder={initialData ? "Leave blank to keep current key..." : "Paste your API key here..."}
                className="input w-full text-sm h-fit py-2 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3 top-2.5"
              >
                {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {initialData ? (
              <p className="text-[10px] text-blue-500 mt-1 flex items-center gap-1">
                <Lightbulb className="w-3 h-3" /> Only fill this if you want to rotate the key
              </p>
            ) : (
              <p className="text-[10px] text-amber-500 mt-1 flex items-center gap-1">
                <Lock className="w-3 h-3" /> Keys are encrypted before storage
              </p>
            )}
          </div>

          {/* Model */}
          <div>
            <label className="text-xs font-semibold text-[var(--text-muted)] mb-2 block">
              Model Name *
            </label>
            <input
              type="text"
              value={form.model}
              onChange={(e) => setForm({ ...form, model: e.target.value })}
              placeholder="e.g., 'gemini-2.5-flash'"
              className="input w-full text-sm h-fit py-2"
            />
          </div>

          {/* Primary */}
          <div className="flex items-center gap-3 p-3 rounded bg-[var(--bg-hover)]">
            <input
              type="checkbox"
              checked={form.isPrimary}
              onChange={(e) => setForm({ ...form, isPrimary: e.target.checked })}
              className="w-4 h-4 rounded"
            />
            <div>
              <p className="text-sm font-medium text-[var(--text)]">Set as Primary</p>
              <p className="text-xs text-[var(--text-muted)]">Used by default for API calls</p>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="text-xs font-semibold text-[var(--text-muted)] mb-2 block">
              Notes (Optional)
            </label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Add notes about this key..."
              rows={3}
              className="input w-full text-sm resize-none"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="shrink-0 px-5 py-4 border-t border-[var(--border)] bg-[var(--bg-hover)]">
          <div className="flex flex-col sm:flex-row gap-3 w-full">
            <button 
              onClick={onClose} 
              className="btn-secondary flex items-center justify-center py-2 px-6 flex-1 sm:flex-none"
            >
              Cancel
            </button>
            <button
              onClick={() => mutation.mutate()}
              disabled={mutation.isPending || !form.name || !form.model || (!initialData && !form.apiKey)}
              className="btn-primary flex items-center justify-center gap-2 py-2 px-6 flex-1 sm:flex-none"
            >
              {mutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>{initialData ? "Update" : "Add"} Key</span>
            </button>
          </div>
        </div>
      </motion.div>
    </>,
    document.body
  );
}

// ─── TESTING MODAL ──────────────────────────────────────────────

function TestingModal({ keyId, onClose, onTestComplete }) {
  const [activeTab, setActiveTab] = useState("manual"); // "manual" or "automatic"
  const [manualResult, setManualResult] = useState(null);
  const [autoConfig, setAutoConfig] = useState({
    interval: "hourly", // "5min", "15min", "hourly", "daily"
    enabled: false,
  });
  const [isLoading, setIsLoading] = useState(false);
  const queryClient = useQueryClient();

  const handleManualTest = async () => {
    setIsLoading(true);
    try {
      const res = await adminApi.post(`/ai-keys/${keyId}/test`);
      setManualResult(res.data.data);
      
      toast.success("Manual test executed!");
      // Pass the updated key to parent and wait for refetch to complete
      setTimeout(async () => {
        await onTestComplete(res.data.data.key);
      }, 1500);
    } catch (error) {
      const msg = error.response?.data?.message || "Test failed";
      toast.error(msg);
      setManualResult({ success: false, error: msg });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAutoTest = async () => {
    setIsLoading(true);
    try {
      const res = await adminApi.post(`/ai-keys/${keyId}/auto-test`, {
        enabled: !autoConfig.enabled,
        interval: autoConfig.interval,
      });
      setAutoConfig({
        ...autoConfig,
        enabled: !autoConfig.enabled,
      });
      toast.success(
        !autoConfig.enabled ? "Auto-testing enabled!" : "Auto-testing disabled!"
      );
      queryClient.invalidateQueries(["aiKeys"]);
    } catch (error) {
      const msg = error.response?.data?.message || "Failed to update settings";
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return createPortal(
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-[200] bg-black/50 backdrop-blur-sm"
      />
      <div className="fixed inset-0 z-[201] flex items-center justify-center p-4 sm:p-6 pointer-events-none">
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="pointer-events-auto w-full max-w-2xl bg-[var(--bg-card)] border border-[var(--border)] rounded-lg shadow-xl overflow-hidden"
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-[var(--border)] bg-[var(--bg-hover)] flex items-center justify-between">
            <h2 className="text-lg font-bold text-[var(--text)]">API Key Testing</h2>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-[var(--bg)]"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Tabs */}
          <div className="px-6 pt-4 border-b border-[var(--border)] flex gap-2">
            <button
              onClick={() => setActiveTab("manual")}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === "manual"
                  ? "border-primary-500 text-primary-500"
                  : "border-transparent text-[var(--text-muted)] hover:text-[var(--text)]"
              }`}
            >
              <RefreshCw className="w-4 h-4 inline mr-2" />
              Manual Test
            </button>
            <button
              onClick={() => setActiveTab("automatic")}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === "automatic"
                  ? "border-primary-500 text-primary-500"
                  : "border-transparent text-[var(--text-muted)] hover:text-[var(--text)]"
              }`}
            >
              <Zap className="w-4 h-4 inline mr-2" />
              Auto Testing
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-4">
            {activeTab === "manual" && (
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-[var(--text-muted)] mb-3">
                    Run a one-time test to verify if this API key is working correctly. 
                    The test will send a simple request to the API and check for a valid response.
                  </p>
                </div>

                {manualResult && (
                  <div
                    className={`p-4 rounded-lg border ${
                      manualResult.success
                        ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600"
                        : "bg-red-500/10 border-red-500/30 text-red-600"
                    }`}
                  >
                    <div className="flex gap-3 items-start">
                      {manualResult.success ? (
                        <CheckCircle className="w-5 h-5 shrink-0 mt-0.5" />
                      ) : (
                        <XCircle className="w-5 h-5 shrink-0 mt-0.5" />
                      )}
                      <div className="flex-1">
                        <p className="font-semibold mb-1">
                          {manualResult.success ? "✅ Test Passed" : "❌ Test Failed"}
                        </p>
                        <p className="text-xs">{manualResult.message || manualResult.error}</p>
                        {manualResult.responseTime && (
                          <p className="text-xs opacity-70 mt-1">
                            Response time: {manualResult.responseTime}ms
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                <button
                  onClick={handleManualTest}
                  disabled={isLoading}
                  className="btn-primary w-full flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Testing...</span>
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4" />
                      <span>Run Test Now</span>
                    </>
                  )}
                </button>
              </div>
            )}

            {activeTab === "automatic" && (
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-[var(--text-muted)] mb-4">
                    Enable automatic testing to periodically verify this API key's health.
                    If tests fail consecutively, the key will be automatically disabled.
                  </p>
                </div>

                {/* Interval Selection */}
                <div>
                  <label className="text-sm font-semibold text-[var(--text)] mb-2 block">
                    Test Interval
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { value: "5min", label: "Every 5 Min" },
                      { value: "15min", label: "Every 15 Min" },
                      { value: "hourly", label: "Every Hour" },
                      { value: "daily", label: "Daily" },
                    ].map((option) => (
                      <button
                        key={option.value}
                        onClick={() =>
                          setAutoConfig({ ...autoConfig, interval: option.value })
                        }
                        className={`p-2 rounded border text-sm font-medium transition-colors ${
                          autoConfig.interval === option.value
                            ? "bg-primary-500/20 border-primary-500 text-primary-500"
                            : "border-[var(--border)] text-[var(--text)] hover:border-primary-400"
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Status Info */}
                <div className="p-3 rounded bg-[var(--bg-hover)] text-sm">
                  <p className="text-[var(--text-muted)] mb-1">Current Status:</p>
                  <p className="font-semibold text-[var(--text)]">
                    {autoConfig.enabled ? (
                      <span className="text-emerald-500 flex items-center gap-2">
                        <CheckCircle className="w-4 h-4" />
                        Auto-testing Enabled ({autoConfig.interval})
                      </span>
                    ) : (
                      <span className="text-[var(--text-muted)] flex items-center gap-2">
                        <XCircle className="w-4 h-4" />
                        Auto-testing Disabled
                      </span>
                    )}
                  </p>
                </div>

                <button
                  onClick={handleAutoTest}
                  disabled={isLoading}
                  className={`w-full flex items-center justify-center gap-2 font-medium py-2 rounded border transition-colors ${
                    autoConfig.enabled
                      ? "btn-danger"
                      : "btn-primary"
                  }`}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Updating...</span>
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4" />
                      <span>
                        {autoConfig.enabled ? "Disable Auto-testing" : "Enable Auto-testing"}
                      </span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-[var(--border)] bg-[var(--bg-hover)]">
            <button onClick={onClose} className="btn-secondary w-full flex items-center justify-center">
              Close
            </button>
          </div>
        </motion.div>
      </div>
    </>,
    document.body
  );
}

// ─── DELETE CONFIRM ─────────────────────────────────────────────

function DeleteConfirmModal({ keyId, onClose, onConfirm }) {
  const mutation = useMutation({
    mutationFn: () => adminApi.delete(`/ai-keys/${keyId}`),
    onSuccess: () => {
      toast.success("Key deleted!");
      onConfirm();
    },
    onError: () => {
      toast.error("Failed to delete key");
    },
  });

  return createPortal(
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-[200] bg-black/50 backdrop-blur-sm"
      />
      <div className="fixed inset-0 z-[201] flex items-center justify-center p-4 sm:p-6 pointer-events-none">
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="pointer-events-auto w-full max-w-sm bg-[var(--bg-card)] border border-[var(--border)] rounded-lg shadow-xl"
        >
          <div className="p-4 sm:p-6 space-y-4">
            <div className="flex gap-3">
              <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6 text-red-500 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-[var(--text)] text-sm sm:text-base">Delete API Key?</h3>
                <p className="text-xs sm:text-sm text-[var(--text-muted)] mt-1">
                  This action cannot be undone. Keys using this API key may fail.
                </p>
              </div>
            </div>

            <div className="flex gap-2 sm:gap-3 pt-2">
              <button 
                onClick={onClose} 
                className="btn-secondary flex-1 flex items-center justify-center text-xs sm:text-sm py-2"
              >
                Cancel
              </button>
              <button
                onClick={() => mutation.mutate()}
                disabled={mutation.isPending}
                className="btn-danger flex-1 flex items-center justify-center gap-2 text-xs sm:text-sm py-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {mutation.isPending && <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 animate-spin" />}
                Delete
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </>,
    document.body
  );
}
