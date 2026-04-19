const AuditLog = require('../models/AuditLog.model');
const AdminUser = require('../models/AdminUser.model');

// ═══════════════════════════════════════════════════════════════════════════
// GET ALL AUDIT LOGS — With filtering, search, pagination
// ═══════════════════════════════════════════════════════════════════════════
exports.getAllAuditLogs = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      module,
      action,
      adminId,
      search,
      startDate,
      endDate,
      status,
      tab,
    } = req.query;

    // Build filter object
    let filter = {};

    if (module) filter.module = module;
    if (action) filter.action = action;
    if (adminId) filter.adminId = adminId;
    if (status) filter.status = status;

    // Date range filter
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) {
        filter.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = end;
      }
    }

    // Search — description, adminName, targetName
    if (search) {
      filter.$or = [
        { description: { $regex: search, $options: 'i' } },
        { adminName: { $regex: search, $options: 'i' } },
        { targetName: { $regex: search, $options: 'i' } },
      ];
    }

    // Tab-specific filters
    if (tab === 'register') {
      filter.action = 'REGISTER';
    } else if (tab === 'login') {
      filter.action = { $in: ['LOGIN', 'FAILED_LOGIN'] };
    } else if (tab === 'user_activity') {
      filter.module = 'users';
    } else if (tab === 'bot_management') {
      filter.module = 'bots';
    } else if (tab === 'conversations') {
      filter.module = 'conversations';
    } else if (tab === 'payments') {
      filter.module = 'payments';
    } else if (tab === 'admin_actions') {
      filter.module = 'settings';
    } else if (tab === 'announcements') {
      filter.module = 'announcements';
    } else if (tab === 'security') {
      filter.action = { $in: ['FAILED_LOGIN', 'BAN', 'UNBAN', 'FAILED_ACTION'] };
    }

    // Count total
    const total = await AuditLog.countDocuments(filter);

    // Pagination
    const pageNum = Math.max(1, parseInt(page));
    const pageSize = Math.min(100, Math.max(1, parseInt(limit)));
    const skip = (pageNum - 1) * pageSize;

    // Fetch logs
    const logs = await AuditLog.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(pageSize)
      .lean();

    // Add formatted time
    const formattedLogs = logs.map((log) => ({
      ...log,
      formattedTime: formatTimeAgo(log.createdAt),
    }));

    res.json({
      success: true,
      data: formattedLogs,
      pagination: {
        total,
        page: pageNum,
        pages: Math.ceil(total / pageSize),
        limit: pageSize,
      },
    });
  } catch (error) {
    console.error('❌ Get audit logs error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// EXPORT CSV — All logs with current filters
// ═══════════════════════════════════════════════════════════════════════════
exports.exportAuditLogsCSV = async (req, res) => {
  try {
    const { module, action, adminId, search, startDate, endDate, status, tab } = req.query;

    // Build same filter as getAllAuditLogs
    let filter = {};

    if (module) filter.module = module;
    if (action) filter.action = action;
    if (adminId) filter.adminId = adminId;
    if (status) filter.status = status;

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = end;
      }
    }

    if (search) {
      filter.$or = [
        { description: { $regex: search, $options: 'i' } },
        { adminName: { $regex: search, $options: 'i' } },
        { targetName: { $regex: search, $options: 'i' } },
      ];
    }

    if (tab === 'register') {
      filter.action = 'REGISTER';
    } else if (tab === 'login') {
      filter.action = { $in: ['LOGIN', 'FAILED_LOGIN'] };
    } else if (tab === 'user_activity') {
      filter.module = 'users';
    } else if (tab === 'bot_management') {
      filter.module = 'bots';
    } else if (tab === 'conversations') {
      filter.module = 'conversations';
    } else if (tab === 'payments') {
      filter.module = 'payments';
    } else if (tab === 'admin_actions') {
      filter.module = 'settings';
    } else if (tab === 'announcements') {
      filter.module = 'announcements';
    } else if (tab === 'security') {
      filter.action = { $in: ['FAILED_LOGIN', 'BAN', 'UNBAN', 'FAILED_ACTION'] };
    }

    // Fetch ALL logs for this filter (no pagination limit)
    const logs = await AuditLog.find(filter).sort({ createdAt: -1 }).lean();

    // CSV header
    let csv = 'Timestamp,Admin Name,Admin Role,Module,Action,Description,Target,Status,IP Address\n';

    // CSV rows
    for (const log of logs) {
      const timestamp = new Date(log.createdAt).toLocaleString();
      const row = [
        `"${timestamp}"`,
        `"${log.adminName || 'N/A'}"`,
        `"${log.adminRole || 'N/A'}"`,
        `"${log.module || 'N/A'}"`,
        `"${log.action || 'N/A'}"`,
        `"${log.description?.replace(/"/g, '""') || 'N/A'}"`,
        `"${log.targetName || 'N/A'}"`,
        `"${log.status || 'N/A'}"`,
        `"${log.adminIP || 'N/A'}"`,
      ];
      csv += row.join(',') + '\n';
    }

    // send as download
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="audit-logs-${Date.now()}.csv"`);
    res.send(csv);
  } catch (error) {
    console.error('❌ Export CSV error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// DELETE AUDIT LOGS — SuperAdmin ONLY
// ═══════════════════════════════════════════════════════════════════════════
exports.deleteAuditLogs = async (req, res) => {
  try {
    // ✅ Check: SuperAdmin only
    if (req.admin.role !== 'superadmin') {
      return res.status(403).json({
        success: false,
        message: '❌ Only superadmin can delete audit logs',
      });
    }

    const { deleteType, customStartDate, customEndDate } = req.body;

    let filter = {};
    let deletedCount = 0;

    // Determine date range based on deleteType
    if (deleteType === '7d') {
      const date = new Date();
      date.setDate(date.getDate() - 7);
      filter.createdAt = { $lte: date };
    } else if (deleteType === '30d') {
      const date = new Date();
      date.setDate(date.getDate() - 30);
      filter.createdAt = { $lte: date };
    } else if (deleteType === '90d') {
      const date = new Date();
      date.setDate(date.getDate() - 90);
      filter.createdAt = { $lte: date };
    } else if (deleteType === 'custom') {
      if (!customStartDate || !customEndDate) {
        return res.status(400).json({
          success: false,
          message: 'Custom date range requires both startDate and endDate',
        });
      }
      filter.createdAt = {
        $gte: new Date(customStartDate),
        $lte: new Date(customEndDate),
      };
    } else if (deleteType === 'all') {
      // Delete ALL — no filter needed
      filter = {};
    } else {
      return res.status(400).json({
        success: false,
        message: 'Invalid deleteType. Use: 7d, 30d, 90d, custom, or all',
      });
    }

    // Perform deletion
    const result = await AuditLog.deleteMany(filter);
    deletedCount = result.deletedCount;

    // Log this delete action
    await AuditLog.log({
      adminId: req.admin._id,
      adminName: req.admin.name,
      adminRole: req.admin.role,
      adminIP: req.ip,
      action: 'DELETE',
      module: 'audit',
      description: `Deleted ${deletedCount} audit logs (type: ${deleteType})`,
      targetType: 'audit',
      status: 'success',
      userAgent: req.get('user-agent'),
    });

    res.json({
      success: true,
      message: `✅ Deleted ${deletedCount} audit logs`,
      deletedCount,
    });
  } catch (error) {
    console.error('❌ Delete audit logs error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// HELPER — Format time
// ═══════════════════════════════════════════════════════════════════════════
function formatTimeAgo(date) {
  const seconds = Math.floor((new Date() - new Date(date)) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 2592000) return `${Math.floor(seconds / 86400)}d ago`;
  return `${Math.floor(seconds / 2592000)}mo ago`;
}

// ═══════════════════════════════════════════════════════════════════════════
// GET AUDIT STATS — For dashboard
// ═══════════════════════════════════════════════════════════════════════════
exports.getAuditStats = async (req, res) => {
  try {
    const total = await AuditLog.countDocuments();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayCount = await AuditLog.countDocuments({ createdAt: { $gte: today } });

    const failedCount = await AuditLog.countDocuments({ status: 'failed' });

    res.json({
      success: true,
      data: {
        totalLogs: total,
        todayLogs: todayCount,
        failedActions: failedCount,
      },
    });
  } catch (error) {
    console.error('❌ Get audit stats error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
