import { useState, useEffect, useRef } from 'react'
import { adminAPI, reviewAPI, analysisAPI, DetailedAnalysis, API_SERVER_URL } from '../../lib/api'
import { LayoutDashboard, FileText, AlertCircle, UserCheck, LogOut, CheckCircle, XCircle, Bell, Filter } from 'lucide-react'
import Card from '../ui/Card'
import GlassCard from '../ui/GlassCard'
import GlowButton from '../ui/GlowButton'
import NeonBadge from '../ui/NeonBadge'
import NeonChart from '../ui/NeonChart'
import Modal from '../ui/Modal'
import { createPortal } from 'react-dom'
import SideNotification from '../ui/SideNotification'


// New: Define Appeal interface for type safety
interface Appeal {
  appeal_id: number;
  username: string;
  upload_id: number;
  status: string;
  reason: string;
  platform: string;
  amount?: string;
  detailed_analysis?: DetailedAnalysis;  // Explicitly use DetailedAnalysis here
}

interface SupervisorDashboardProps {
  onLogout: () => void
}


export default function SupervisorDashboard({ onLogout }: SupervisorDashboardProps) {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'uploads' | 'appeals' | 'requests'>('dashboard')
  const [stats, setStats] = useState<any>(null)
  const [uploads, setUploads] = useState<any[]>([])
  const [uploadsQuery, setUploadsQuery] = useState('')
  const [uploadsUserFilter, setUploadsUserFilter] = useState<string>('all')
  const [archiveYears, setArchiveYears] = useState<any[]>([])
  const [openArchiveModal, setOpenArchiveModal] = useState(false)
  const [approvedArchiveAccess, setApprovedArchiveAccess] = useState<any[]>([])
  const [openApprovedArchivesModal, setOpenApprovedArchivesModal] = useState(false)
  const [selectedApprovedYear, setSelectedApprovedYear] = useState<number | null>(null)
  const [approvedArchiveUploads, setApprovedArchiveUploads] = useState<any[]>([])
  const [appeals, setAppeals] = useState<any[]>([])
  const [appealHistory, setAppealHistory] = useState<any[]>([])
  const [undoReasons, setUndoReasons] = useState<Record<number, string>>({})
  const [openUndo, setOpenUndo] = useState<Record<number, boolean>>({})
  const [appealHistQuery, setAppealHistQuery] = useState('')
  const [appealHistStatus, setAppealHistStatus] = useState<'all'|'approved'|'rejected'|'pending'>('all')
  const [myRequests, setMyRequests] = useState<any[]>([])
  const [loadingStats, setLoadingStats] = useState(true)
  const [statsError, setStatsError] = useState<string | null>(null)
  const [reviewingAppeal, setReviewingAppeal] = useState<number | null>(null)
  const [reviewComments, setReviewComments] = useState<{ [appealId: number]: string }>({})
  const username = localStorage.getItem('username') || 'Supervisor'
  const [showNotificationsPanel, setShowNotificationsPanel] = useState<boolean>(false)
  const [updatesCount, setUpdatesCount] = useState<number>(0)
  const [newUpdates, setNewUpdates] = useState<any[]>([])
  const [oldUpdates, setOldUpdates] = useState<any[]>([])
  const [dropdownPos, setDropdownPos] = useState<{ top: number; right: number } | null>(null)
  const [sideOpen, setSideOpen] = useState(false)
  const [sideTitle, setSideTitle] = useState('')
  const [sideSender, setSideSender] = useState('')
  const [sideTime, setSideTime] = useState('')
  const [sideMessage, setSideMessage] = useState('')
  const [sideVariant, setSideVariant] = useState<'success'|'error'|'warning'|'info'>('info')
  const [showUserDropdown, setShowUserDropdown] = useState(false)
  const userDropdownRef = useRef<HTMLDivElement | null>(null)
  const notify = (opts: { title: string; message: string; variant: 'success'|'error'|'warning'|'info'; requireConfirm?: boolean; onAction?: () => void }) => {
    setSideTitle(opts.title)
    setSideSender('System')
    setSideTime(new Date().toLocaleString())
    setSideMessage(opts.message)
    setSideVariant(opts.variant)
    ;(notify as any)._actionLabel = opts.requireConfirm ? 'OK' : undefined
    ;(notify as any)._onAction = opts.onAction
    setSideOpen(true)
  }
  const [openUserAppeals, setOpenUserAppeals] = useState<{ key: string; list: any[] } | null>(null)
  const [openUserHistory, setOpenUserHistory] = useState<{ key: string; list: any[] } | null>(null)
  const notifContainerRef = useRef<HTMLDivElement | null>(null)
  const notifButtonRef = useRef<HTMLButtonElement | null>(null)
  const notifDropdownRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    loadStats()
    loadUploads()
    loadAppeals()
    loadAppealHistory()
    loadMyRequests()
    try { console.info('Supervisor view: uploads limited to last 1 year via backend query') } catch {}
  }, [])

  useEffect(() => {
    if (!showNotificationsPanel) return
    const onDocClick = (e: MouseEvent) => {
      const target = e.target as Node
      const container = notifContainerRef.current
      const dropdown = notifDropdownRef.current
      const outsideContainer = !container || !container.contains(target)
      const outsideDropdown = !dropdown || !dropdown.contains(target)
      if (outsideContainer && outsideDropdown) {
        setShowNotificationsPanel(false)
      }
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowNotificationsPanel(false)
    }
    document.addEventListener('mousedown', onDocClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDocClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [showNotificationsPanel])

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      const target = e.target as Node
      const container = userDropdownRef.current
      if (container && !container.contains(target)) setShowUserDropdown(false)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => { document.removeEventListener('mousedown', onDocClick) }
  }, [])

  useEffect(() => {
    if (showNotificationsPanel && notifButtonRef.current) {
      const rect = notifButtonRef.current.getBoundingClientRect()
      const right = Math.max(8, window.innerWidth - rect.right)
      const top = rect.bottom + 8
      setDropdownPos({ top, right })
    }
  }, [showNotificationsPanel])

  useEffect(() => {
    const seenAppealsStr = localStorage.getItem('sup_notif_seen_appeals') || '{}'
    const seenReqStr = localStorage.getItem('sup_notif_seen_requests') || '{}'
    let seenAppeals: Record<string, string> = {}
    let seenReq: Record<string, string> = {}
    try { seenAppeals = JSON.parse(seenAppealsStr) } catch {}
    try { seenReq = JSON.parse(seenReqStr) } catch {}
    const appealItems = Array.isArray(appeals) ? appeals.map((a: any) => ({
      id: `ap_${a.appeal_id}`,
      status: 'returned',
      title: 'Appeal Returned',
      message: String(a.reason || ''),
      sender: 'User',
      timestamp: new Date(a.created_at).toLocaleString(),
      seenKey: String(a.appeal_id),
      seenVal: String(a.created_at || '')
    })) : []
    const reqItems = Array.isArray(myRequests) ? myRequests.filter((r: any) => r.status !== 'pending').map((r: any) => ({
      id: `rq_${r.request_id}`,
      status: r.status,
      title: r.status === 'approved' ? 'Request Approved' : 'Request Rejected',
      message: String(r.reason || ''),
      sender: 'Head Admin',
      timestamp: new Date(r.resolved_at || r.created_at).toLocaleString(),
      seenKey: String(r.request_id),
      seenVal: String(r.status)
    })) : []
    const all = [...appealItems, ...reqItems]
    const newList = all.filter((it) => {
      if (it.id.startsWith('ap_')) return String(seenAppeals[it.seenKey] || '') !== it.seenVal
      return String(seenReq[it.seenKey] || '') !== it.seenVal
    })
    const oldList = all.filter((it) => !newList.some((n) => n.id === it.id))
    const sortByTimeDesc = (a: any, b: any) => {
      const ta = Date.parse(a.timestamp)
      const tb = Date.parse(b.timestamp)
      return tb - ta
    }
    const sortedNew = newList.sort(sortByTimeDesc)
    setUpdatesCount(sortedNew.length)
    setNewUpdates(sortedNew.slice(0, 5))
    setOldUpdates(oldList.sort(sortByTimeDesc).slice(0, 5))
    if (sortedNew.length > 0) {
      const n = sortedNew[0]
      setSideTitle(n.title)
      setSideSender(n.sender)
      setSideTime(n.timestamp)
      setSideMessage(n.message)
      setSideOpen(true)
    }
  }, [appeals, myRequests])

  const markAllAsRead = () => {
    try {
      const seenAppeals: Record<string, string> = {}
      for (const a of (appeals || [])) {
        seenAppeals[String(a.appeal_id)] = String(a.created_at || '')
      }
      localStorage.setItem('sup_notif_seen_appeals', JSON.stringify(seenAppeals))
      const seenReq: Record<string, string> = {}
      for (const r of (myRequests || [])) {
        if (r.status !== 'pending') seenReq[String(r.request_id)] = String(r.status)
      }
      localStorage.setItem('sup_notif_seen_requests', JSON.stringify(seenReq))
    } catch {}
    setUpdatesCount(0)
  }

  const handleNotificationsClick = () => {
    setShowNotificationsPanel((prev) => {
      const next = !prev
      if (next) markAllAsRead()
      return next
    })
  }

  const loadStats = async () => {
    setLoadingStats(true)
    setStatsError(null)
    try {
      const response = await adminAPI.getDashboardStats()
      setStats(response.data)
    } catch (error: any) {
      console.error('Failed to load stats:', error)
      setStatsError(error?.response?.data?.detail || 'Unable to load overview')
    } finally {
      setLoadingStats(false)
    }
  }

  const loadUploads = async () => {
    try {
      const response = await adminAPI.getAllUploads()
      setUploads(response.data)
    } catch (error) {
      console.error('Failed to load uploads:', error)
    }
  }
  

    const loadAppeals = async () => {
    try {
        const response = await reviewAPI.getPendingAppeals()
        const baseAppeals = response.data as Appeal[]
        const withDetails = await Promise.all(
          baseAppeals.map(async (a) => {
            try {
              const detailsResp = await analysisAPI.getDetailedAnalysis(a.upload_id)
              return { ...a, detailed_analysis: detailsResp.data }
            } catch {
              return a
            }
          })
        )
        setAppeals(withDetails)
    } catch (error) {
        console.error('Failed to load appeals:', error)
    }
    }

  const loadMyRequests = async () => {
    try {
      const response = await reviewAPI.getMyAdminRequests()
      setMyRequests(response.data)
    } catch (error) {
      console.error('Failed to load requests:', error)
    }
  }

  const loadAppealHistory = async () => {
    try {
        const response = await reviewAPI.getAppealHistory()
        setAppealHistory(response.data)
    } catch (error) {
        console.error('Failed to load appeal history:', error)
    }
    }

  const handleReviewAppeal = async (appealId: number, approved: boolean) => {
    const comment = (reviewComments[appealId] || '').trim()
    if (!comment) {
      notify({ title: 'Missing Comment', message: 'Please provide a comment', variant: 'warning' })
      return
    }

    try {
      await reviewAPI.reviewAppeal({
        appeal_id: appealId,
        approved,
        comment
      })
      notify({ title: 'Review Saved', message: 'Appeal reviewed successfully', variant: 'success' })
      setReviewingAppeal(null)
      setReviewComments((prev) => {
        const next = { ...prev }
        delete next[appealId]
        return next
      })
      loadAppeals()
      loadStats()
    } catch (error) {
      notify({ title: 'Review Failed', message: 'Failed to review appeal', variant: 'error' })
    }
  }

  const loadArchiveYears = async () => {
    try {
      const resp = await adminAPI.getArchiveYears()
      setArchiveYears(resp.data)
    } catch (err) {
      console.error('Failed to load archive years:', err)
    }
  }

  const loadApprovedArchiveAccess = async () => {
    try {
      const resp = await adminAPI.getSupervisorArchiveAccess()
      setApprovedArchiveAccess(resp.data || [])
    } catch (err) {
      console.error('Failed to load approved archive access:', err)
    }
  }

  const loadApprovedArchiveUploads = async (year: number) => {
    try {
      const resp = await adminAPI.getArchiveByYear(year)
      setApprovedArchiveUploads(resp.data || [])
    } catch (err) {
      console.error('Failed to load archive uploads:', err)
    }
  }

  const chartData = stats ? [
    { name: 'Valid', value: stats.valid_count, color: '#22c55e' },
    { name: 'Tampered', value: stats.tampered_count, color: '#ef4444' },
    { name: 'Generated', value: stats.generated_count, color: '#f59e0b' },
    { name: 'Pending', value: stats.pending_review_count, color: '#6366f1' },
  ] : []

  const appealHistoryGroups = Object.entries(
    appealHistory.reduce((acc: Record<string, any[]>, a: any) => {
      const key = String(a.user_id || a.username || 'unknown')
      acc[key] = acc[key] || []
      acc[key].push(a)
      return acc
    }, {})
  )
  const pendingAppealsGroups = Object.entries(
    (appeals || []).reduce((acc: Record<string, any[]>, a: any) => {
      const key = String(a.user_id || a.username || 'unknown')
      acc[key] = acc[key] || []
      acc[key].push(a)
      return acc
    }, {})
  )
  const filteredAppealHistoryGroups = appealHistoryGroups.filter(([, list]) => {
    const name = (list[0]?.username || 'Unknown User').toLowerCase()
    const qOk = !appealHistQuery || name.includes(appealHistQuery.toLowerCase())
    const sOk = appealHistStatus === 'all' || list.some((a: any) => a.status === appealHistStatus)
    return qOk && sOk
  })

  return (
    <div className="min-h-screen bg-[#F6F6F6]">
      {/* Header */}
      <header>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-[#1E3E62] text-white flex items-center justify-center shadow-xl ring-2 ring-[#1E3E62]/30">
              <UserCheck className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Supervisor Dashboard</h1>
              <p className="text-sm text-muted-foreground">Welcome, {username}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative" ref={notifContainerRef}>
              <button
                onClick={handleNotificationsClick}
                className="relative w-10 h-10 rounded-full bg-gradient-to-br from-black via-[#1A1A1F] to-[#A259FF] hover:opacity-90 transition-opacity flex items-center justify-center shadow-lg"
                aria-label="Notifications"
                ref={notifButtonRef}
              >
                <Bell className="w-5 h-5 text-white" />
                {updatesCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[20px] px-1 py-0.5 rounded-full bg-destructive text-destructive-foreground text-xs font-bold text-center">
                    {updatesCount}
                  </span>
                )}
              </button>
              {showNotificationsPanel && dropdownPos && typeof document !== 'undefined' && createPortal(
                (
                  <div ref={notifDropdownRef} className="fixed z-[9999]" style={{ top: dropdownPos.top, right: dropdownPos.right }}>
                    <div id="notification-container" className="w-[520px] max-h-[540px] bg-white rounded-xl shadow-2xl border border-[#1E3E62]/20 ring-1 ring-[#1E3E62]/10 overflow-y-auto">
                      <div className="px-4 py-3 bg-[#F8FAFD] border-b border-[#1E3E62]/10 flex items-center justify-between">
                        <p className="text-sm font-semibold text-[#1E3E62]">{(newUpdates.length + oldUpdates.length) === 0 ? 'Notifications' : 'Updates'}</p>
                        <div className="flex items-center gap-2"></div>
                      </div>
                      <ul className="p-3 space-y-2">
                        {(() => {
                          const all: any[] = [...newUpdates, ...oldUpdates]
                          const now = new Date()
                          const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
                          const startYesterday = new Date(startToday)
                          startYesterday.setDate(startYesterday.getDate() - 1)
                          const toDate = (it: any) => new Date(it.timestamp)
                          const today = all.filter((it) => toDate(it) >= startToday)
                          const yesterday = all.filter((it) => toDate(it) >= startYesterday && toDate(it) < startToday)
                          const older = all.filter((it) => toDate(it) < startYesterday)
                          const renderItem = (it: any) => {
                            const statusCls = it.status === 'approved' ? 'text-green-700' : it.status === 'rejected' ? 'text-red-700' : 'text-gray-700'
                            const isNew = newUpdates.some((n:any) => n.id === it.id)
                            const onOpen = () => {
                              setShowNotificationsPanel(false)
                              if (String(it.id).startsWith('ap_')) {
                                setActiveTab('appeals')
                                setReviewingAppeal(Number(String(it.id).replace('ap_','')))
                              } else {
                                setActiveTab('requests')
                              }
                            }
                            return (
                              <li key={it.id} className={`p-4 rounded hover:bg-[#F9FBFF] cursor-pointer flex items-start gap-4 ${isNew ? 'border-l-4 border-[#1E3E62] bg-[#F8FAFD]' : ''}`} onClick={onOpen}>
                                <div className="text-xs text-muted-foreground min-w-[130px]">
                                  {it.timestamp}
                                </div>
                                <div className="flex-1">
                                  <p className={`text-sm font-semibold ${statusCls}`}>{it.title}</p>
                                  <p className="text-xs text-muted-foreground">{it.sender}</p>
                                  <p className="text-sm text-gray-700 line-clamp-2">{it.message}</p>
                                </div>
                              </li>
                            )
                          }
                          return (
                            <>
                              {today.length > 0 && (
                                <li className="px-1">
                                  <p className="text-xs font-semibold text-gray-700 mb-1">Today</p>
                                  <ul className="space-y-2">
                                    {today.map((it) => renderItem(it))}
                                  </ul>
                                </li>
                              )}
                              {yesterday.length > 0 && (
                                <li className="px-1">
                                  <p className="text-xs font-semibold text-gray-700 mb-1">Yesterday</p>
                                  <ul className="space-y-2">
                                    {yesterday.map((it) => renderItem(it))}
                                  </ul>
                                </li>
                              )}
                              {older.length > 0 && (() => {
                                const byDate: Record<string, any[]> = {}
                                for (const it of older) {
                                  const dt = toDate(it)
                                  const key = dt.toLocaleDateString()
                                  byDate[key] = byDate[key] || []
                                  byDate[key].push(it)
                                }
                                return (
                                  <>
                                    {Object.entries(byDate).sort((a,b) => new Date(b[0]).getTime() - new Date(a[0]).getTime()).map(([dateStr, list]) => (
                                      <li key={dateStr} className="px-1">
                                        <p className="text-xs font-semibold text-gray-700 mb-1">{dateStr}</p>
                                        <ul className="space-y-2">
                                          {list.map((it) => renderItem(it))}
                                        </ul>
                                      </li>
                                    ))}
                                  </>
                                )
                              })()}
                              {(today.length + yesterday.length + older.length) === 0 && (
                                <li className="text-sm text-gray-600">No notifications</li>
                              )}
                            </>
                          )
                        })()}
                      </ul>
                    </div>
                  </div>
                ),
                document.body
              )}
            </div>
            <GlowButton
              onClick={onLogout}
              className="flex items-center gap-2 px-4 py-2 rounded-md border border-[#6E67FF]/40 bg-gradient-to-br from-black via-[#1A1A1F] to-[#6E67FF] text-white shadow-sm hover:shadow-md transition-all duration-200"
            >
              <LogOut className="w-4 h-4" />
              <span>Logout</span>
            </GlowButton>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        <div className="flex items-center gap-6">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`relative group px-4 py-2 font-medium transition-colors ${
              activeTab === 'dashboard' ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <div className="flex items-center gap-2">
              <LayoutDashboard className="w-5 h-5 transition-transform duration-300 ease-in-out group-hover:-translate-y-0.5 group-hover:opacity-90" />
              <span>Overview</span>
            </div>
            <div className={`absolute left-0 right-0 -bottom-1 h-0.5 ${
              activeTab === 'dashboard' ? 'bg-[#3B82F6]' : 'bg-[#3B82F6] w-0 group-hover:w-full transition-all duration-300 ease-in-out'
            }`}></div>
          </button>
          <button
            onClick={() => setActiveTab('uploads')}
            className={`relative group px-4 py-2 font-medium transition-colors ${
              activeTab === 'uploads' ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 transition-transform duration-300 ease-in-out group-hover:-translate-y-0.5 group-hover:opacity-90" />
              <span>All Uploads</span>
            </div>
            <div className={`absolute left-0 right-0 -bottom-1 h-0.5 ${
              activeTab === 'uploads' ? 'bg-[#3B82F6]' : 'bg-[#3B82F6] w-0 group-hover:w-full transition-all duration-300 ease-in-out'
            }`}></div>
          </button>
          <button
            onClick={() => setActiveTab('appeals')}
            className={`relative group px-4 py-2 font-medium transition-colors ${
              activeTab === 'appeals' ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 transition-transform duration-300 ease-in-out group-hover:-translate-y-0.5 group-hover:opacity-90" />
              <span>Appeals</span>
              {appeals.length > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-destructive text-white text-xs rounded-full flex items-center justify-center">
                  {appeals.length}
                </span>
              )}
            </div>
            <div className={`absolute left-0 right-0 -bottom-1 h-0.5 ${
              activeTab === 'appeals' ? 'bg-[#3B82F6]' : 'bg-[#3B82F6] w-0 group-hover:w-full transition-all duration-300 ease-in-out'
            }`}></div>
          </button>
          <button
            onClick={() => setActiveTab('requests')}
            className={`relative group px-4 py-2 font-medium transition-colors ${
              activeTab === 'requests' ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 transition-transform duration-300 ease-in-out group-hover:-translate-y-0.5 group-hover:opacity-90" />
              <span>Requests</span>
            </div>
            <div className={`absolute left-0 right-0 -bottom-1 h-0.5 ${
              activeTab === 'requests' ? 'bg-[#3B82F6]' : 'bg-[#3B82F6] w-0 group-hover:w-full transition-all duration-300 ease-in-out'
            }`}></div>
          </button>
        </div>
      </div>
      <SideNotification
        open={sideOpen}
        title={sideTitle}
        sender={sideSender}
        timestamp={sideTime}
        message={sideMessage}
        variant={sideVariant}
        actionLabel={(notify as any)._actionLabel}
        onAction={(notify as any)._onAction}
        onClose={() => setSideOpen(false)}
      />

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 lg:px-10 py-10">
        {activeTab === 'dashboard' && (
          loadingStats ? (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="rounded-2xl bg-panel backdrop-blur-md border border-white/10 p-6 h-28 animate-pulse" />
                <div className="rounded-2xl bg-panel backdrop-blur-md border border-white/10 p-6 h-28 animate-pulse" />
                <div className="rounded-2xl bg-panel backdrop-blur-md border border-white/10 p-6 h-28 animate-pulse" />
                <div className="rounded-2xl bg-panel backdrop-blur-md border border-white/10 p-6 h-28 animate-pulse" />
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="rounded-2xl bg-panel backdrop-blur-md border border-white/10 p-6 h-80 animate-pulse" />
                <div className="rounded-2xl bg-panel backdrop-blur-md border border-white/10 p-6 h-80 animate-pulse" />
              </div>
            </div>
          ) : stats ? (
          <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Uploads</p>
                    <p className="text-3xl font-bold text-foreground mt-2">{stats.total_uploads}</p>
                  </div>
                  <FileText className="w-12 h-12 text-accent opacity-40" />
                </div>
              </Card>

              <Card>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Valid</p>
                    <p className="text-3xl font-bold text-green-600 mt-2">{stats.valid_count}</p>
                  </div>
                  <CheckCircle className="w-12 h-12 text-success opacity-40" />
                </div>
              </Card>

              <Card>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Fraudulent</p>
                    <p className="text-3xl font-bold text-red-600 mt-2">
                      {stats.tampered_count + stats.generated_count}
                    </p>
                  </div>
                  <XCircle className="w-12 h-12 text-destructive opacity-40" />
                </div>
              </Card>

              <Card>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Fraud Rate</p>
                    <p className="text-3xl font-bold text-foreground mt-2">
                      {(stats.fraud_rate * 100).toFixed(1)}%
                    </p>
                  </div>
                  <AlertCircle className="w-12 h-12 text-warning opacity-40" />
                </div>
              </Card>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card title="Status Distribution">
                <NeonChart type="pie" series={(chartData || []).map((d:any) => d.value)} options={{ labels: (chartData || []).map((d:any) => d.name), colors: ['#C1785A','#305669','#8ABEB9','#B7E5CD'] }} height={300} />
              </Card>

              <Card title="Status Breakdown">
                <NeonChart type="bar" series={[{ name: 'Count', data: (chartData || []).map((d:any) => d.value) }]} options={{ xaxis: { categories: (chartData || []).map((d:any) => d.name) }, colors: ['#3C467B'] }} height={300} />
              </Card>
            </div>
          </div>
          ) : (
            <GlassCard>
              <p className="text-sm text-destructive">{statsError || 'Overview not available'}</p>
            </GlassCard>
          )
        )}

        {activeTab === 'uploads' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-foreground">All Uploads (Last 1 Year)</h2>
              <div className="flex items-center gap-2">
                <GlowButton onClick={() => { setOpenArchiveModal(true); loadArchiveYears() }} className="px-4 py-2 !bg-white !text-black border border-black hover:!bg-[#E5E7EB] hover:!text-black transition-colors">Request Access</GlowButton>
                <GlowButton onClick={() => { setOpenApprovedArchivesModal(true); loadApprovedArchiveAccess() }} className="px-4 py-2 !bg-white !text-black border border-black hover:!bg-[#E5E7EB] hover:!text-black transition-colors">View Approved Archives</GlowButton>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
              <input
                value={uploadsQuery}
                onChange={(e) => setUploadsQuery(e.target.value)}
                placeholder="Search user or reference"
                className="w-full sm:w-1/2 p-3 border border-[#D9D9E3] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#6E67FF]"
              />
              <div className="relative" ref={userDropdownRef}>
                <button
                  onClick={() => setShowUserDropdown((p) => !p)}
                  className="flex items-center gap-2 px-3 py-2 rounded-md border border-black bg-white hover:bg-[#E5E7EB] text-sm"
                >
                  <Filter className="w-4 h-4" />
                  <span>{uploadsUserFilter === 'all' ? 'All Users' : uploadsUserFilter}</span>
                </button>
                {showUserDropdown && (
                  <div className="absolute right-0 z-50 mt-2 w-52 bg-white border border-[#D9D9E3] rounded-md shadow-lg">
                    <ul className="py-1 max-h-64 overflow-auto">
                      {(() => {
                        const users = Array.from(new Set((uploads || []).map((u:any) => String(u.username || 'Unknown'))))
                        const items = ['all', ...users]
                        return items.map((u) => (
                          <li key={u}>
                            <button
                              onClick={() => { setUploadsUserFilter(u); setShowUserDropdown(false) }}
                              className="w-full text-left px-3 py-2 hover:bg-[#F3F4F6] text-sm"
                            >
                              {u === 'all' ? 'All Users' : u}
                            </button>
                          </li>
                        ))
                      })()}
                    </ul>
                  </div>
                )}
              </div>
            </div>
            {uploads.length === 0 ? (
              <GlassCard className="p-12 text-center">
                <FileText className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No uploads found</p>
              </GlassCard>
            ) : (
              <div className="rounded-2xl bg-panel backdrop-blur-md border border-white/10 shadow overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-[#151519]">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                          User
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                          Image
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                          Platform
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                          Amount
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                          Confidence
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                          Date
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1E1E26]">
                      {(uploads || [])
                        .filter((u:any) => uploadsUserFilter === 'all' || String(u.username||'') === uploadsUserFilter)
                        .filter((u:any) => !uploadsQuery || String(u.username||'').toLowerCase().includes(uploadsQuery.toLowerCase()) || String(u.reference_number||'').toLowerCase().includes(uploadsQuery.toLowerCase()))
                        .map((upload) => (
                        <tr key={upload.upload_id}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-foreground">{upload.username}</div>
                            <div className="text-sm text-muted-foreground">{upload.user_email}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            {upload.image_url ? (
                              <a
                                href={`${API_SERVER_URL}${upload.image_url}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary hover:underline"
                              >
                                View Image
                              </a>
                            ) : (
                              <span className="text-muted-foreground">N/A</span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-sm text-foreground capitalize">{upload.platform}</span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-sm text-foreground">{upload.amount || 'N/A'}</span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <NeonBadge intent={
                              upload.status === 'valid' ? 'success' :
                              upload.status === 'tampered' ? 'destructive' :
                              upload.status === 'generated' ? 'warning' : 'info'
                            }>
                              {upload.status.replace('_', ' ')}
                            </NeonBadge>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-sm text-foreground">
                              {(upload.confidence_score * 100).toFixed(1)}%
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                            {new Date(upload.created_at).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

      {activeTab === 'appeals' && (
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-foreground mb-6">Under Review Appeals</h2>
          {openUserAppeals ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setOpenUserAppeals(null)}
                    className="text-xs px-4 py-2 rounded-md border border-[#6E67FF]/40 bg-gradient-to-br from-black via-[#1A1A1F] to-[#6E67FF] text-white shadow-sm hover:shadow-md transition-all duration-200 transform hover:scale-[1.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6E67FF]"
                  >
                    Back
                  </button>
                  <p className="text-base font-semibold text-foreground">Appeals of {String(openUserAppeals.list[0]?.username || 'User')}</p>
                </div>
                <span className="px-2 py-0.5 rounded-full text-xs bg-[#F3F4F6] text-muted-foreground">{openUserAppeals.list.length} appeals</span>
              </div>
              <div className="space-y-3">
                {openUserAppeals.list.map((a:any) => (
                  <div key={a.appeal_id} className="bg-white border border-[#222831] rounded-xl p-5 shadow-lg ring-1 ring-[#6E67FF]/10 hover:ring-[#6E67FF]/25 transition-shadow hover:shadow-2xl">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-semibold text-foreground">Upload ID: {a.upload_id}</p>
                        <div className="mt-2 p-3 bg-[#F8F9FB] border border-[#E5E7EB] rounded-md">
                          <p className="text-xs font-medium text-foreground">Reason</p>
                          <p className="text-sm text-foreground whitespace-pre-wrap break-words">{a.reason}</p>
                        </div>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${a.status === 'approved' ? 'bg-green-100 text-green-800' : a.status === 'rejected' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}`}>{a.status}</span>
                    </div>
                    {a.admin_response && a.status !== 'pending' && (
                      <div className="mt-2">
                        <p className="text-xs font-medium text-foreground mb-1">Resolution Message:</p>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap break-words">{a.admin_response}</p>
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-4 text-xs pt-3 mt-2 border-t border-[#F0F2F5]">
                      <div>
                        <p className="text-muted-foreground">Platform</p>
                        <p className="font-medium text-foreground capitalize">{a.platform}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Amount</p>
                        <p className="font-medium text-foreground">{a.amount || 'N/A'}</p>
                      </div>
                    </div>
                    {a.image_url && (
                      <div className="mt-2">
                        <a href={`${API_SERVER_URL}${a.image_url}`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline text-xs">View Image</a>
                      </div>
                    )}
                    <div className="flex items-center gap-4 text-xs text-muted-foreground mt-2">
                      <span>Created: {new Date(a.created_at).toLocaleString()}</span>
                      {a.resolved_at && <span>Resolved: {new Date(a.resolved_at).toLocaleString()}</span>}
                    </div>
                    <div className="mt-3">
                      <button
                        onClick={() => { setOpenUserAppeals(null); setReviewingAppeal(a.appeal_id) }}
                        className="text-xs px-4 py-2 rounded-md border border-black/20 bg-white text-foreground transition-all duration-200 hover:bg-[#37353E] hover:text-white hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6E67FF]"
                      >
                        Review Appeal
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            appeals.length === 0 ? (
              <div className="bg-white rounded-lg shadow p-12 text-center">
                <AlertCircle className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No pending appeals</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {pendingAppealsGroups.map(([key, list]) => {
                  const name = String(list[0]?.username || 'Unknown User')
                  const pendingCount = list.filter((a:any) => a.status === 'pending').length
                  return (
                    <div key={key} className="rounded-xl border border-[#E5E7EB] border-l-4 border-l-[#132440] bg-white p-6 shadow-lg ring-1 ring-[#6E67FF]/15 hover:ring-[#6E67FF]/30 transition-shadow hover:shadow-2xl">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <p className="text-base font-semibold text-foreground">{name}</p>
                          <span className="px-2 py-0.5 rounded-full text-xs bg-[#F3F4F6] text-muted-foreground">{list.length} appeals</span>
                          {pendingCount > 0 ? (
                            <span className="ml-2 px-2 py-0.5 rounded-full text-xs bg-yellow-100 text-yellow-800">pending: {pendingCount}</span>
                          ) : (
                            <span className="ml-2 inline-block w-2 h-2 rounded-full bg-[#E5E7EB]" aria-hidden="true"></span>
                          )}
                        </div>
                      <button
                        onClick={() => setOpenUserAppeals({ key, list })}
                        className="text-xs px-4 py-2 rounded-md border border-black/20 bg-white text-foreground transition-all duration-200 hover:bg-[#37353E] hover:text-white hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6E67FF]"
                      >
                        View Appeals
                      </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )
          )}
        </div>
      )}

        {activeTab === 'requests' && (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-foreground">Requests to Undo Resolution</h2>
            
            {myRequests.length === 0 ? (
              <div className="bg-white rounded-xl shadow-sm p-12 text-center">
                <AlertCircle className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No requests yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {myRequests.map((r) => {
                    const a = appealHistory.find((x:any)=>x.appeal_id===r.appeal_id)
                    return (
                      <div key={r.request_id} className="bg-white rounded-xl border border-[#E5E7EB] border-l-4 border-l-[#715A5A] p-5 shadow-lg ring-1 ring-[#6E67FF]/10 hover:ring-[#6E67FF]/20 transition-shadow hover:shadow-2xl">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-semibold text-foreground">Appeal ID: {r.appeal_id}</p>
                            <p className="text-xs text-muted-foreground">Action: {String(r.action).replace('_',' ')}</p>
                            <p className="text-xs text-muted-foreground">Reason: {r.reason}</p>
                          </div>
                          <div className="text-right">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${r.status === 'approved' ? 'bg-green-100 text-green-800' : r.status === 'rejected' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}`}>{r.status}</span>
                            <div className="text-xs text-muted-foreground mt-1">{r.resolved_at ? `Resolved: ${new Date(r.resolved_at).toLocaleString()}` : `Created: ${new Date(r.created_at).toLocaleString()}`}</div>
                          </div>
                        </div>
                        {a && (
                          <div className="grid grid-cols-2 gap-4 text-xs pt-3 mt-2 border-t border-[#F0F2F5]">
                            <div>
                              <p className="text-muted-foreground">Platform</p>
                              <p className="font-medium text-foreground capitalize">{a.platform}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Amount</p>
                              <p className="font-medium text-foreground">{a.amount || 'N/A'}</p>
                            </div>
                          </div>
                        )}
                        {a?.image_url && (
                          <div className="mt-2">
                            <a href={`${API_SERVER_URL}${a.image_url}`} target="_blank" rel="noopener noreferrer" className="text-[#6E67FF] hover:underline text-xs">View Image</a>
                          </div>
                        )}
                        <div className="mt-4">
                          {r.status === 'approved' ? (
                            <button
                              onClick={() => { setActiveTab('appeals'); setReviewingAppeal(r.appeal_id) }}
                              className="text-xs px-4 py-2 rounded-md border border-black/20 bg-white text-foreground transition-all duration-200 hover:bg-[#37353E] hover:text-white hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6E67FF]"
                            >
                              Review Appeal
                            </button>
                          ) : r.status === 'rejected' ? (
                            <span className="text-xs text-muted-foreground">Cannot review: request rejected</span>
                          ) : null}
                        </div>
                      </div>
                    )
                  })}
              </div>
            )}
          </div>
        )}

        {activeTab === 'appeals' && (
          <div className="space-y-4 mt-8">
            <h2 className="text-2xl font-bold text-foreground mb-6">Appeal History</h2>
            <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between mb-4">
              <input
                value={appealHistQuery}
                onChange={(e) => setAppealHistQuery(e.target.value)}
                placeholder="Search user"
                className="w-full sm:w-1/2 p-3 border border-[#D9D9E3] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#6E67FF]"
              />
              <select
                value={appealHistStatus}
                onChange={(e) => setAppealHistStatus(e.target.value as any)}
                className="w-full sm:w-40 p-3 border border-[#D9D9E3] rounded-lg text-sm bg-white"
              >
                <option value="all">All</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="pending">Pending</option>
              </select>
            </div>
            {openUserHistory ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setOpenUserHistory(null)}
                    className="text-xs px-4 py-2 rounded-md border border-[#6E67FF]/40 bg-gradient-to-br from-black via-[#1A1A1F] to-[#6E67FF] text-white shadow-sm hover:shadow-md transition-all duration-200 transform hover:scale-[1.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6E67FF]"
                  >
                    Back
                  </button>
                  <p className="text-base font-semibold text-foreground">Appeal History of {String(openUserHistory.list[0]?.username || 'User')}</p>
                </div>
                <span className="px-2 py-0.5 rounded-full text-xs bg-[#F3F4F6] text-muted-foreground">{openUserHistory.list.length} appeals</span>
              </div>
                <div className="space-y-3">
                  {openUserHistory.list.map((a:any) => (
                    <div key={a.appeal_id} className="bg-white border border-[#222831] rounded-xl p-5 shadow-lg ring-1 ring-[#6E67FF]/10 hover:ring-[#6E67FF]/25 transition-shadow hover:shadow-2xl">
                      <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="text-sm font-semibold text-foreground">Upload ID: {a.upload_id}</p>
                        <div className="mt-2 p-3 bg-[#F8F9FB] border border-[#E5E7EB] rounded-md">
                          <p className="text-xs font-medium text-foreground">Reason</p>
                          <p className="text-sm text-foreground whitespace-pre-wrap break-words">{a.reason}</p>
                        </div>
                      </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${a.status === 'approved' ? 'bg-green-100 text-green-800' : a.status === 'rejected' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}`}>{a.status}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-xs pt-3 mt-2 border-t border-[#F0F2F5]">
                        <div>
                          <p className="text-muted-foreground">Platform</p>
                          <p className="font-medium text-foreground capitalize">{a.platform}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Amount</p>
                          <p className="font-medium text-foreground">{a.amount || 'N/A'}</p>
                        </div>
                      </div>
                      {a.image_url && (
                        <div className="mt-2">
                          <a href={`${API_SERVER_URL}${a.image_url}`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline text-xs">View Image</a>
                        </div>
                      )}
                      <div className="flex items-center gap-4 text-xs text-muted-foreground mt-2">
                        <span>Created: {new Date(a.created_at).toLocaleString()}</span>
                        {a.resolved_at && <span>Resolved: {new Date(a.resolved_at).toLocaleString()}</span>}
                      </div>
                      {a.status !== 'pending' && (
                        <div className="mt-3">
                          <button
                            onClick={() => setOpenUndo((prev) => ({ ...prev, [a.appeal_id]: true }))}
                            className="text-xs px-4 py-2 rounded-md border border-black/20 bg-white text-foreground transition-all duration-200 hover:bg-gradient-to-br hover:from-black hover:via-[#1A1A1F] hover:to-[#6E67FF] hover:text-white hover:shadow-md hover:border-[#6E67FF]/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6E67FF]"
                          >
                            Request Undo Resolution
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              appealHistory.length === 0 ? (
                <div className="bg-white rounded-xl shadow-sm p-12 text-center">
                  <AlertCircle className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No appeal history</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {filteredAppealHistoryGroups.map(([key, list]) => {
                    const name = list[0].username || 'Unknown User'
                    const pendingCount = list.filter((a:any)=>a.status==='pending').length
                    return (
                      <div key={key} className="rounded-xl border border-[#E5E7EB] border-l-4 border-l-[#132440] bg-white p-6 shadow-sm ring-1 ring-[#6E67FF]/15 hover:ring-[#6E67FF]/30 transition-shadow hover:shadow-md">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <p className="text-base font-semibold text-foreground">{name}</p>
                            <span className="px-2 py-0.5 rounded-full text-xs bg-[#F3F4F6] text-muted-foreground">{list.length} appeals</span>
                            {pendingCount > 0 ? (
                              <span className="ml-2 px-2 py-0.5 rounded-full text-xs bg-yellow-100 text-yellow-800">pending: {pendingCount}</span>
                            ) : (
                              <span className="ml-2 inline-block w-2 h-2 rounded-full bg-[#E5E7EB]" aria-hidden="true"></span>
                            )}
                          </div>
                        <button
                          onClick={() => setOpenUserHistory({ key, list })}
                          className="text-xs px-4 py-2 rounded-md border border-black/20 bg-white text-foreground transition-all duration-200 hover:bg-[#37353E] hover:text-white hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6E67FF]"
                        >
                          View Appeals
                        </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )
            )}
          </div>
        )}
      </div>
      {/* Inline user views are rendered within sections; modals removed for user lists */}
          {reviewingAppeal !== null && (() => {
            const appeal = appeals.find((a:any) => a.appeal_id === reviewingAppeal)
            if (!appeal) { console.error('Missing appeal for review modal'); return null }
            const da = appeal.detailed_analysis
            return (
          <Modal
            open={Boolean(reviewingAppeal)}
            title="Review Appeal"
            onClose={() => { setReviewingAppeal(null) }}
          >
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-muted-foreground">Username</p>
                  <p className="text-sm font-medium text-foreground">{appeal.username}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Upload ID</p>
                  <p className="text-sm font-medium text-foreground">{appeal.upload_id}</p>
                </div>
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground mb-1">Extracted Content (OCR)</p>
                <div className="bg-white rounded-lg shadow p-3">
                  {appeal.image_url ? (
                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground">Preview</p>
                      <div className="border border-[#E5E7EB] rounded-lg overflow-hidden">
                        <img src={`${API_SERVER_URL}${appeal.image_url}`} alt="Upload preview" className="w-full h-auto object-contain max-h-64" />
                      </div>
                    </div>
                  ) : null}
                  {Array.isArray(appeal.extracted_context_text) && appeal.extracted_context_text.length > 0 ? (
                    <ul className="space-y-1 text-foreground font-mono text-[13px] leading-6 mt-3">
                      {appeal.extracted_context_text.map((ln:string, idx:number)=>(
                        <li key={idx} className="whitespace-pre-wrap break-words">{ln}</li>
                      ))}
                    </ul>
                  ) : (!appeal.image_url ? <p className="text-xs text-muted-foreground">OCR text unavailable</p> : null)}
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-muted-foreground">Letter OCR Score</p>
                  <p className="text-sm font-medium text-foreground">{
                    da?.ocr_confidences ? `${(((Object.values(da.ocr_confidences) as number[]).reduce((a:number,b:number)=>a+b,0))/((Object.values(da.ocr_confidences) as number[]).length||1)).toFixed(1)}%`
                    : typeof appeal.ocr_confidence === 'number' ? `${(appeal.ocr_confidence*100).toFixed(1)}%`
                    : (()=>{console.error('Letter OCR score unavailable'); return 'N/A'})()
                  }</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Word OCR Score</p>
                  <p className="text-sm font-medium text-foreground">{
                    da?.field_validations ? (()=>{const v=da.field_validations; const keys=Object.keys(v); const avg=keys.length? keys.reduce((acc,k)=>acc+((v[k]?.confidence)||0),0)/keys.length:0; return `${(avg*100).toFixed(1)}%`})()
                    : appeal.field_validations ? (()=>{const v=appeal.field_validations; const keys=Object.keys(v||{}); const avg=keys.length? keys.reduce((acc,k)=>acc+((v[k]?.confidence)||0),0)/keys.length:0; return `${(avg*100).toFixed(1)}%`})()
                    : (()=>{console.error('Word OCR score unavailable'); return 'N/A'})()
                  }</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Figure OCR Score</p>
                  <p className="text-sm font-medium text-foreground">{
                    da?.field_anomalies ? (()=>{const vals=(Object.values(da.field_anomalies as any) as number[]); const score=vals.length? 100 - ((vals.reduce((a:number,b:number)=>a+(Number(b)||0),0)/vals.length)*100): 0; return `${score.toFixed(1)}%`})()
                    : typeof appeal.field_anomaly_score === 'number' ? `${(100 - (appeal.field_anomaly_score*100)).toFixed(1)}%`
                    : (()=>{console.error('Figure OCR score unavailable'); return 'N/A'})()
                  }</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">CNN Score</p>
                  <p className="text-sm font-medium text-foreground">{
                    typeof da?.cnn_probability === 'number' ? `${(da.cnn_probability*100).toFixed(1)}%`
                    : typeof appeal.cnn_fraud_probability === 'number' ? `${(appeal.cnn_fraud_probability*100).toFixed(1)}%`
                    : (()=>{console.error('CNN score unavailable'); return 'N/A'})()
                  }</p>
                </div>
              </div>
              <div>
                <textarea
                  value={reviewComments[appeal.appeal_id] || ''}
                  onChange={(e) => setReviewComments((prev) => ({ ...prev, [appeal.appeal_id]: e.target.value }))}
                  placeholder="Add your review comment..."
                  className="w-full p-3 border border-input rounded-lg mb-3 focus:outline-none focus:ring-2 focus:ring-primary"
                  rows={3}
                />
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <button
                onClick={() => handleReviewAppeal(appeal.appeal_id, true)}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
              >
                <CheckCircle className="w-4 h-4" />
                <span>Approve</span>
              </button>
              <button
                onClick={() => handleReviewAppeal(appeal.appeal_id, false)}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
              >
                <XCircle className="w-4 h-4" />
                <span>Reject</span>
              </button>
              <button
                onClick={() => { setReviewingAppeal(null); setReviewComments((prev)=>{ const next={...prev}; delete next[appeal.appeal_id]; return next }) }}
                className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-colors"
              >
                Cancel
              </button>
            </div>
          </Modal>
        )
      })()}

      {Object.keys(openUndo).find((id)=>openUndo[Number(id)]) ? (() => {
        const id = Number(Object.keys(openUndo).find((k)=>openUndo[Number(k)]))
        const a = filteredAppealHistoryGroups.flatMap(([_, list])=>list).find((x:any)=>x.appeal_id===id)
        if (!a) { console.error('Missing appeal for undo modal'); return null }
        return (
          <Modal
            open={true}
            title="Request Undo Resolution"
            onClose={() => setOpenUndo((prev)=>({ ...prev, [id]: false }))}
          >
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-muted-foreground">Upload ID</p>
                  <p className="text-sm font-medium text-foreground">{a.upload_id}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Status</p>
                  <p className="text-sm font-medium text-foreground">{a.status}</p>
                </div>
              </div>
              {a.image_url ? (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">Preview</p>
                  <div className="border border-[#E5E7EB] rounded-lg overflow-hidden">
                    <img src={`${API_SERVER_URL}${a.image_url}`} alt="Upload preview" className="w-full h-auto object-contain max-h-64" />
                  </div>
                </div>
              ) : (
                (()=>{console.error('Image URL unavailable for undo request'); return null})()
              )}
              <div>
                <p className="text-xs font-medium text-foreground mb-2">Reason (required)</p>
                <textarea
                  value={undoReasons[a.appeal_id] || ''}
                  onChange={(e) => setUndoReasons((prev) => ({ ...prev, [a.appeal_id]: e.target.value }))}
                  placeholder="Explain why this needs to be undone"
                  className="w-full p-3 border border-[#D9D9E3] rounded-lg mb-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#6E67FF]"
                  rows={3}
                />
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2">
              <button
                onClick={async () => {
                  const reason = (undoReasons[a.appeal_id] || '').trim()
                  if (!reason) { notify({ title: 'Missing Reason', message: 'Please provide a reason', variant: 'warning' }); return }
                  const action = a.status === 'approved' ? 'undo_approval' : 'undo_rejection'
                  try {
                    await reviewAPI.createAdminRequest({ appeal_id: a.appeal_id, action, reason })
                    notify({ title: 'Request Sent', message: 'Request sent to Head Admin', variant: 'success' })
                    setUndoReasons((prev) => ({ ...prev, [a.appeal_id]: '' }))
                    setOpenUndo((prev) => ({ ...prev, [a.appeal_id]: false }))
                  } catch (err: any) {
                    const msg = err?.response?.data?.detail || err?.response?.data?.message || 'Failed to send request'
                    notify({ title: 'Send Failed', message: msg, variant: 'error' })
                  }
                }}
                className="px-3 py-2 bg-[#6E67FF] text-white rounded-md hover:brightness-95 text-xs"
              >
                Send Request
              </button>
              <button
                onClick={() => setOpenUndo((prev) => ({ ...prev, [a.appeal_id]: false }))}
                className="px-3 py-2 bg-white border border-[#E5E7EB] rounded-md text-xs hover:bg-[#F3F4F6]"
              >
                Cancel
              </button>
            </div>
          </Modal>
        )
      })() : null}
      {openArchiveModal && (
        <Modal open={true} title="Request Archive Access" onClose={() => setOpenArchiveModal(false)}>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Select a year to request read-only access.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {archiveYears.length === 0 ? (
                <div className="col-span-3 text-sm text-muted-foreground">No archives available</div>
              ) : (
                archiveYears.map((y:any) => (
                  <div key={y.year} className="rounded-xl border border-[#E5E7EB] bg-white p-4 shadow hover:shadow-md transition-shadow">
                    <p className="text-sm font-semibold text-foreground">{y.label_start} – {y.label_end}</p>
                    <p className="text-xs text-muted-foreground">{y.count} uploads</p>
                    <div className="mt-3">
                      <button
                        onClick={async () => {
                          try { await reviewAPI.requestArchiveAccess(y.year); notify({ title: 'Request Sent', message: `Requested access to ${y.year}`, variant: 'success' }); setOpenArchiveModal(false) } catch { notify({ title: 'Failed', message: 'Could not send request', variant: 'error' }) }
                        }}
                        className="px-3 py-2 bg-[#6E67FF] text-white rounded-md hover:brightness-95 text-xs"
                      >
                        Request Access
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </Modal>
      )}
      {openApprovedArchivesModal && (
        <Modal open={true} title="Approved Archive Access" onClose={() => { setOpenApprovedArchivesModal(false); setSelectedApprovedYear(null) }}>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Click a folder to view read-only uploads.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {(approvedArchiveAccess || []).length === 0 ? (
                <div className="col-span-3 text-sm text-muted-foreground">No approved archives</div>
              ) : (
                approvedArchiveAccess.map((it:any) => (
                  <button key={it.year} onClick={() => { setSelectedApprovedYear(it.year); loadApprovedArchiveUploads(it.year) }} className="bg-white rounded-xl shadow hover:shadow-md border border-[#E5E7EB] p-5 text-left transition-shadow">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-7 bg-[#F3F4F6] border border-[#E5E7EB] rounded-t-md" aria-hidden="true"></div>
                      <div>
                        <p className="text-sm font-semibold text-foreground">{it.year}</p>
                        <p className="text-xs text-muted-foreground">Granted: {new Date(it.granted_at).toLocaleDateString()}</p>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
            {selectedApprovedYear && (
              <div className="rounded-2xl bg-panel backdrop-blur-md border border-white/10 shadow overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-[#151519]">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">User</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Image</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Platform</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Amount</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Confidence</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1E1E26]">
                      {(approvedArchiveUploads || []).map((upload:any) => (
                        <tr key={upload.upload_id}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-foreground">{upload.username}</div>
                            <div className="text-sm text-muted-foreground">{upload.user_email}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            {upload.image_url ? (
                              <a href={`${API_SERVER_URL}${upload.image_url}`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">View Image</a>
                            ) : (
                              <span className="text-muted-foreground">N/A</span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap"><span className="text-sm text-foreground capitalize">{upload.platform}</span></td>
                          <td className="px-6 py-4 whitespace-nowrap"><span className="text-sm text-foreground">{upload.amount || 'N/A'}</span></td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <NeonBadge intent={
                              upload.status === 'valid' ? 'success' :
                              upload.status === 'tampered' ? 'destructive' :
                              upload.status === 'generated' ? 'warning' : 'info'
                            }>
                              {upload.status.replace('_', ' ')}
                            </NeonBadge>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap"><span className="text-sm text-foreground">{(upload.confidence_score * 100).toFixed(1)}%</span></td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">{new Date(upload.created_at).toLocaleDateString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  )
}
