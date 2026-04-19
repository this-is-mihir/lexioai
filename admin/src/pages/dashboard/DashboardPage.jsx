import { useState, useEffect } from 'react'
import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  Users, Bot, MessageSquare, TrendingUp,
  ArrowUpRight, ArrowDownRight, Crown,
  Activity, Clock, AlertTriangle, RefreshCw
} from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer
} from 'recharts'
import adminApi from '../../api/axios'

// Stat Card
const StatCard = ({ title, value, change, icon: Icon, color, delay = 0 }) => {
  const isPositive = change >= 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.3 }}
      className="card hover:border-primary-500/30 transition-all duration-300 group"
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
            {title}
          </p>
          <p className="text-3xl font-bold text-[var(--text)] mt-1">
            {typeof value === 'number' ? value.toLocaleString() : value}
          </p>
          {change !== undefined && (
            <div className={`flex items-center gap-1 mt-1 text-xs font-medium ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
              {isPositive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
              {Math.abs(change)}% this month
            </div>
          )} 
        </div>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color} group-hover:scale-110 transition-transform duration-200`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </motion.div>
  )
}

// Plan Badge
const PlanBadge = ({ plan, count }) => {
  const colors = {
    free: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
    starter: 'bg-primary-500/10 text-primary-400 border-primary-500/20',
    pro: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
    business: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  }

  return (
    <div className={`flex items-center justify-between px-3 py-2 rounded-lg border ${colors[plan]}`}>
      <span className="text-xs font-medium capitalize">{plan}</span>
      <span className="text-sm font-bold">{count}</span>
    </div>
  )
}

// Custom Tooltip for chart
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-3 shadow-xl">
        <p className="text-xs text-[var(--text-muted)] mb-1">{label}</p>
        {payload.map((entry, i) => (
          <p key={i} className="text-sm font-medium" style={{ color: entry.color }}>
            {entry.name}: {entry.value}
          </p>
        ))}
      </div>
    )
  }
  return null
}

export default function DashboardPage() {
  const [isLive, setIsLive] = React.useState(true)
  const [lastUpdated, setLastUpdated] = React.useState(new Date())
  const [refreshing, setRefreshing] = React.useState(false)

  // Fetch dashboard stats
  const { data: statsData, isLoading: statsLoading, refetch } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const res = await adminApi.get('/stats/dashboard')
      setLastUpdated(new Date())
      return res.data.data
    },
    refetchInterval: isLive ? 30000 : false,
  })

  // Fetch user growth
  const { data: growthData } = useQuery({
    queryKey: ['user-growth'],
    queryFn: async () => {
      const res = await adminApi.get('/stats/user-growth?days=30')
      return res.data.data
    },
  })

  // Fetch revenue
  const { data: revenueData } = useQuery({
    queryKey: ['revenue-stats'],
    queryFn: async () => {
      const res = await adminApi.get('/stats/revenue')
      return res.data.data
    },
  })

  if (statsLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="card h-32 bg-[var(--bg-hover)]" />
          ))}
        </div>
      </div>
    )
  }

  const stats = statsData || {}

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text)]">Dashboard</h1>
          <p className="text-sm text-[var(--text-muted)] mt-0.5">
            Welcome back! Here's what's happening.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => { setIsLive(l => !l) }}
            className={`flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg border transition-all ${isLive ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-[var(--bg-hover)] border-[var(--border)] text-[var(--text-muted)]'}`}
          >
            <span className={`w-2 h-2 rounded-full ${isLive ? 'bg-emerald-400 animate-pulse' : 'bg-gray-500'}`} />
            {isLive ? 'Live' : 'Paused'}
          </button>
          <button
            onClick={async () => {
              setRefreshing(true)
              await refetch()
              setRefreshing(false)
              const { toast } = await import('react-hot-toast')
              toast.success('Dashboard refreshed!')
            }}
            className="btn-secondary py-1 px-2 text-xs"
            disabled={refreshing}
          >
            <RefreshCw className={`w-3 h-3 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
          <span className="text-xs text-[var(--text-muted)] hidden sm:block">
            Updated {lastUpdated.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Users"
          value={stats.users?.total || 0}
          change={stats.users?.thisMonth}
          icon={Users}
          color="bg-blue-500/10 text-blue-400"
          delay={0}
        />
        <StatCard
          title="Total Bots"
          value={stats.bots?.total || 0}
          icon={Bot}
          color="bg-primary-500/10 text-primary-400"
          delay={0.05}
        />
        <StatCard
          title="Total Chats"
          value={stats.chats?.total || 0}
          icon={MessageSquare}
          color="bg-emerald-500/10 text-emerald-400"
          delay={0.1}
        />
        <StatCard
          title="Revenue (MRR)"
          value={revenueData ? `₹${revenueData.mrr?.toLocaleString()}` : '₹0'}
          icon={TrendingUp}
          color="bg-amber-500/10 text-amber-400"
          delay={0.15}
        />
      </div>

      {/* Charts + Plans Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* User Growth Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="card lg:col-span-2"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-[var(--text)]">User Growth</h2>
            <span className="text-xs text-[var(--text-muted)] bg-[var(--bg-hover)] px-2 py-1 rounded-lg">
              Last 30 days
            </span>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={growthData?.growth || []}>
              <defs>
                <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#7F77DD" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#7F77DD" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10, fill: 'var(--text-muted)' }}
                tickFormatter={(v) => v.slice(5)}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 10, fill: 'var(--text-muted)' }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="count"
                name="New Users"
                stroke="#7F77DD"
                strokeWidth={2}
                fill="url(#colorUsers)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Plan Breakdown */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="card"
        >
          <h2 className="font-semibold text-[var(--text)] mb-4">Plan Breakdown</h2>
          <div className="space-y-2">
            {Object.entries(stats.users?.planBreakdown || {}).map(([plan, count]) => (
              <PlanBadge key={plan} plan={plan} count={count} />
            ))}
          </div>

          {/* Revenue breakdown */}
          {revenueData && (
            <div className="mt-4 pt-4 border-t border-[var(--border)]">
              <p className="text-xs font-medium text-[var(--text-muted)] mb-2">Revenue</p>
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-[var(--text-muted)]">MRR</span>
                  <span className="font-semibold text-[var(--text)]">₹{revenueData.mrr?.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[var(--text-muted)]">ARR</span>
                  <span className="font-semibold text-emerald-400">₹{revenueData.arr?.toLocaleString()}</span>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </div>

      {/* Recent Users + Active Bots */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent Users */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="card"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-[var(--text)]">Recent Signups</h2>
            <a href="/users" className="text-xs text-primary-400 hover:text-primary-300 transition-colors">
              View all →
            </a>
          </div>
          <div className="space-y-3">
            {(stats.recentUsers || []).map((user, i) => (
              <div key={user._id} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-primary-500/10 border border-primary-500/20 flex items-center justify-center shrink-0">
                  {user.avatar ? (
                    <img src={user.avatar} className="w-8 h-8 rounded-full object-cover" />
                  ) : (
                    <span className="text-xs font-bold text-primary-400">
                      {user.name?.charAt(0)?.toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[var(--text)] truncate">{user.name}</p>
                  <p className="text-xs text-[var(--text-muted)] truncate">{user.email}</p>
                </div>
                <span className={`badge text-[10px] capitalize ${
                  user.plan === 'free' ? 'badge-muted' :
                  user.plan === 'starter' ? 'badge-primary' :
                  user.plan === 'pro' ? 'bg-violet-500/10 text-violet-400 border border-violet-500/20' :
                  'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                }`}>
                  {user.plan}
                </span>
              </div>
            ))}
            {(stats.recentUsers || []).length === 0 && (
              <p className="text-sm text-[var(--text-muted)] text-center py-4">No users yet</p>
            )}
          </div>
        </motion.div>

        {/* Active Bots */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="card"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-[var(--text)]">Top Active Bots</h2>
            <a href="/bots" className="text-xs text-primary-400 hover:text-primary-300 transition-colors">
              View all →
            </a>
          </div>
          <div className="space-y-3">
            {(stats.activeBots || []).map((bot) => (
              <div key={bot._id} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-primary-500/10 border border-primary-500/20 flex items-center justify-center shrink-0">
                  <Bot className="w-4 h-4 text-primary-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[var(--text)] truncate">{bot.name}</p>
                  <p className="text-xs text-[var(--text-muted)] truncate">{bot.userId?.email}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-[var(--text)]">{bot.stats?.totalChats}</p>
                  <p className="text-xs text-[var(--text-muted)]">chats</p>
                </div>
              </div>
            ))}
            {(stats.activeBots || []).length === 0 && (
              <p className="text-sm text-[var(--text-muted)] text-center py-4">No active bots</p>
            )}
          </div>
        </motion.div>
      </div>

      {/* Today's Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="grid grid-cols-2 sm:grid-cols-4 gap-4"
      >
        {[
          { label: 'New Today', value: stats.users?.today || 0, icon: Users, color: 'text-blue-400' },
          { label: 'This Week', value: stats.users?.thisWeek || 0, icon: Clock, color: 'text-primary-400' },
          { label: 'Chats Today', value: stats.chats?.thisMonth || 0, icon: MessageSquare, color: 'text-emerald-400' },
          { label: 'Leads Today', value: stats.leads?.thisMonth || 0, icon: Crown, color: 'text-amber-400' },
        ].map((item, i) => (
          <div key={i} className="card text-center py-4">
            <item.icon className={`w-5 h-5 mx-auto mb-2 ${item.color}`} />
            <p className="text-2xl font-bold text-[var(--text)]">{item.value}</p>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">{item.label}</p>
          </div>
        ))}
      </motion.div>
    </div>
  )
}