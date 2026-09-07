import { useState, useMemo, useRef, useEffect, type FormEvent, type ChangeEvent } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Search, Send, Paperclip, CheckCheck, Check, MoreVertical,
  Users, MessageSquare, X, FileText,
  Download, Reply, Copy, Trash2, Bell, BellOff,
  ChevronLeft, Info, LogOut, Plus, UserPlus, Shield
} from 'lucide-react'
import { useApp } from '../../app/AppProvider'
import { developmentUsers } from '../../services/local/developmentData'
import type { ChatConversation, ChatMessage, ChatAttachment, User, GroupCategory } from '../../types/domain'
import { ProfileView } from '../profile/ProfileView'
import './ChatView.css'

export function ChatView() {
  const {
    currentUser,
    data,
    conversations,
    chatMessages,
    activeConversationId,
    setActiveConversationId,
    sendChatMessage,
    createGroupConversation,
    startPersonalConversation,
    addParticipantToGroup,
    removeParticipantFromGroup,
    leaveGroup,
    toggleMuteConversation,
    deleteMessage,
    markConversationRead,
    notify,
    isFirebaseMode,
  } = useApp()

  const { conversationId: routeConversationId } = useParams<{ conversationId?: string }>()
  const navigate = useNavigate()

  // UI state
  const [activeMainTab, setActiveMainTab] = useState<'chats' | 'groups'>('chats')
  const [searchQuery, setSearchQuery] = useState('')
  const [activeGroupFilter, setActiveGroupFilter] = useState<'all' | 'class' | 'faculty' | 'custom'>('all')
  const [inputText, setInputText] = useState('')

  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null)
  const [attachedFile, setAttachedFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [activeMenuMessageId, setActiveMenuMessageId] = useState<string | null>(null)
  const [mobileView, setMobileView] = useState<'list' | 'chat'>('list')

  // Modals
  const [showNewChatModal, setShowNewChatModal] = useState(false)
  const [showNewGroupModal, setShowNewGroupModal] = useState(false)
  const [showGroupInfoModal, setShowGroupInfoModal] = useState(false)
  const [showAddMemberModal, setShowAddMemberModal] = useState(false)
  const [directorySearch, setDirectorySearch] = useState('')

  // New Group form state
  const [newGroupName, setNewGroupName] = useState('')
  const [newGroupDesc, setNewGroupDesc] = useState('')
  const [newGroupCategory, setNewGroupCategory] = useState<GroupCategory>('custom')
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([])

  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const messagesEndRef = useRef<HTMLDivElement | null>(null)

  // College-isolated directory of other users
  const collegeDirectory = useMemo(() => {
    if (!currentUser) return []
    const combined = [...data.users, ...developmentUsers]
    const uniqueMap = new Map<string, User>()
    combined.forEach((u) => {
      // Must be in the same college and not the current user
      if (
        u.id !== currentUser.id &&
        (u.college === currentUser.college || !u.college || !currentUser.college)
      ) {
        if (!uniqueMap.has(u.id)) {
          uniqueMap.set(u.id, u)
        }
      }
    })
    return Array.from(uniqueMap.values())
  }, [currentUser, data.users])

  // Filtered college directory for search modal
  const filteredDirectory = useMemo(() => {
    const q = directorySearch.toLowerCase().trim()
    if (!q) return collegeDirectory
    return collegeDirectory.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.identifier?.toLowerCase().includes(q) ||
        u.role.toLowerCase().includes(q),
    )
  }, [collegeDirectory, directorySearch])

  // Profile modal inspection state
  const [selectedProfileUser, setSelectedProfileUser] = useState<User | null>(null)

  const getUserProfile = (userId: string): User | null => {
    if (currentUser?.id === userId) return currentUser
    const foundInLocal = data.users.find((u) => u.id === userId)
    if (foundInLocal) return foundInLocal
    const foundInDev = developmentUsers.find((u) => u.id === userId)
    if (foundInDev) return foundInDev
    const detail = activeConversation?.participantDetails?.[userId]
    if (detail) {
      return {
        id: userId,
        name: detail.name || 'Member',
        email: detail.email || '',
        role: detail.role || 'student',
        identifier: detail.identifier || userId,
        avatar: detail.avatar || detail.name?.[0] || 'U',
        college: currentUser?.college || 'Bonsalo College',
        photoURL: detail.photoURL,
        department: detail.department,
      }
    }
    return null
  }

  // Sync URL route parameter to active conversation
  useEffect(() => {
    if (routeConversationId) {
      setActiveConversationId(routeConversationId)
      setMobileView('chat')
    }
  }, [routeConversationId, setActiveConversationId])

  // Unread counts for tab badges
  const unreadChatsCount = useMemo(() => {
    if (!currentUser) return 0
    return conversations
      .filter((c) => c.type === 'personal')
      .reduce((acc, c) => acc + ((c.unreadCount?.[currentUser.id]) || 0), 0)
  }, [conversations, currentUser])

  const unreadGroupsCount = useMemo(() => {
    if (!currentUser) return 0
    return conversations
      .filter((c) => c.type === 'group')
      .reduce((acc, c) => acc + ((c.unreadCount?.[currentUser.id]) || 0), 0)
  }, [conversations, currentUser])

  // Filtered conversations
  const filteredConversations = useMemo(() => {
    if (!currentUser) return []
    return conversations
      .filter((conv) => {
        // College-isolation check
        if (conv.collegeId && currentUser.college && conv.collegeId !== currentUser.college) {
          return false
        }

        // Participant or Admin check
        const isParticipant = conv.participants.includes(currentUser.id)
        const isAdminAccess = currentUser.role === 'admin' && conv.type === 'group'
        if (!isParticipant && !isAdminAccess) return false

        // Main Tab filter: Chats vs Groups
        if (activeMainTab === 'chats') {
          if (conv.type !== 'personal') return false
        } else {
          // Groups tab
          if (conv.type !== 'group') return false
          if (activeGroupFilter === 'class') {
            if (conv.category !== 'class' && conv.category !== 'college') return false
          } else if (activeGroupFilter === 'faculty') {
            if (conv.category !== 'faculty') return false
          } else if (activeGroupFilter === 'custom') {
            if (conv.category !== 'custom' && conv.category) return false
          }
        }

        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim()
          const nameMatch = conv.name?.toLowerCase().includes(q)
          const descMatch = conv.description?.toLowerCase().includes(q)
          const lastMsgMatch = conv.lastMessage?.toLowerCase().includes(q)
          const participantMatch = Object.values(conv.participantDetails || {}).some(
            (p) =>
              p.name.toLowerCase().includes(q) ||
              p.identifier?.toLowerCase().includes(q) ||
              p.role?.toLowerCase().includes(q),
          )
          return nameMatch || descMatch || lastMsgMatch || participantMatch
        }
        return true
      })
      .sort((a, b) => {
        const timeA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0
        const timeB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0
        return timeB - timeA
      })
  }, [conversations, currentUser, activeMainTab, activeGroupFilter, searchQuery])

  // Resolve active conversation
  const activeConversation = useMemo(() => {
    if (!activeConversationId) return filteredConversations[0] || null
    return conversations.find((c) => c.id === activeConversationId) || null
  }, [conversations, activeConversationId, filteredConversations])

  // Auto-mark active conversation read
  useEffect(() => {
    if (activeConversation && currentUser) {
      const hasUnread = (activeConversation.unreadCount?.[currentUser.id] ?? 0) > 0
      if (hasUnread) {
        void markConversationRead(activeConversation.id)
      }
    }
  }, [activeConversation, currentUser, markConversationRead])

  // Messages in active conversation
  const currentMessages = useMemo(() => {
    if (!activeConversation || !currentUser) return []
    return chatMessages
      .filter((m) => {
        if (m.conversationId !== activeConversation.id) return false
        // Filter out if deleted for current user
        if (m.deletedFor?.includes(currentUser.id)) return false
        return true
      })
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
  }, [chatMessages, activeConversation, currentUser])

  // Auto scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [currentMessages.length])

  // Close menus on outside click
  useEffect(() => {
    const handleWindowClick = () => setActiveMenuMessageId(null)
    window.addEventListener('click', handleWindowClick)
    return () => window.removeEventListener('click', handleWindowClick)
  }, [])

  // Helper to determine display title for a conversation
  const getConversationTitle = (conv: ChatConversation) => {
    if (conv.type === 'group') return conv.name || 'Campus Group'
    // For personal chats, show the other user's name
    const otherId = conv.participants.find((p) => p !== currentUser?.id)
    if (otherId && conv.participantDetails?.[otherId]) {
      return conv.participantDetails[otherId].name
    }
    return conv.name || 'Direct Message'
  }

  // Helper to get subtitle / role for a conversation
  const getConversationSubtitle = (conv: ChatConversation) => {
    if (conv.type === 'group') {
      return `${conv.participants.length} members`
    }
    const otherId = conv.participants.find((p) => p !== currentUser?.id)
    if (otherId && conv.participantDetails?.[otherId]) {
      const info = conv.participantDetails[otherId]
      return `${info.role.charAt(0).toUpperCase() + info.role.slice(1)} · ${info.identifier || 'EduPulse'}`
    }
    return 'Private Chat'
  }

  // Format timestamp helper
  const formatTime = (isoString?: string) => {
    if (!isoString) return ''
    const d = new Date(isoString)
    if (isNaN(d.getTime())) return isoString
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  // Format date header helper
  const formatDateHeader = (isoString: string) => {
    const d = new Date(isoString)
    if (isNaN(d.getTime())) return 'Recent'
    const today = new Date()
    if (d.toDateString() === today.toDateString()) return 'Today'
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    if (d.toDateString() === yesterday.toDateString()) return 'Yesterday'
    return d.toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' })
  }

  // Handle file selection
  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      if (file.size > 10 * 1024 * 1024) {
        notify('File size exceeds the 10MB limit.', 'error')
        return
      }
      setAttachedFile(file)
    }
  }

  // Handle message send
  const handleSendMessage = async (e: FormEvent) => {
    e.preventDefault()
    if (!activeConversation || (!inputText.trim() && !attachedFile)) return

    let attachment: ChatAttachment | undefined

    if (attachedFile) {
      setUploading(true)
      try {
        let downloadUrl = ''
        if (isFirebaseMode && currentUser) {
          const { uploadFile } = await import('../../services/firebase/storage')
          const collegeId = currentUser.college || 'college-1'
          const filePath = `chat/${collegeId}/${activeConversation.id}/${Date.now()}_${attachedFile.name}`
          const uploadRes = await uploadFile(filePath, attachedFile)
          downloadUrl = uploadRes.downloadURL
        } else {
          // Dev local URL
          downloadUrl = URL.createObjectURL(attachedFile)
        }

        const ext = attachedFile.name.split('.').pop()?.toLowerCase() || ''
        let fileType: ChatAttachment['fileType'] = 'file'
        if (['pdf'].includes(ext)) fileType = 'pdf'
        else if (['doc', 'docx', 'txt', 'rtf'].includes(ext)) fileType = 'doc'
        else if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) fileType = 'image'
        else if (['zip', 'rar', 'tar', 'gz'].includes(ext)) fileType = 'archive'

        attachment = {
          url: downloadUrl,
          fileName: attachedFile.name,
          fileSize: attachedFile.size,
          fileType,
        }
      } catch (err) {
        console.error('File upload failed:', err)
        notify('Failed to upload file attachment.', 'error')
        setUploading(false)
        return
      }
      setUploading(false)
    }

    const replyToParam = replyingTo
      ? {
          id: replyingTo.id,
          senderName: replyingTo.senderName,
          text: replyingTo.text,
        }
      : undefined

    await sendChatMessage({
      conversationId: activeConversation.id,
      text: inputText,
      replyTo: replyToParam,
      attachment,
    })

    setInputText('')
    setReplyingTo(null)
    setAttachedFile(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  // Handle copy text
  const handleCopyText = (text: string) => {
    void navigator.clipboard.writeText(text)
    notify('Message copied to clipboard.', 'info')
  }

  // Handle group creation
  const handleCreateGroup = async (e: FormEvent) => {
    e.preventDefault()
    if (!newGroupName.trim()) {
      notify('Please enter a group name.', 'error')
      return
    }
    if (selectedUserIds.length === 0) {
      notify('Please select at least one member for the group.', 'error')
      return
    }

    const convId = await createGroupConversation({
      name: newGroupName.trim(),
      description: newGroupDesc.trim(),
      participantIds: selectedUserIds,
      category: newGroupCategory,
    })

    setNewGroupName('')
    setNewGroupDesc('')
    setNewGroupCategory('custom')
    setSelectedUserIds([])
    setShowNewGroupModal(false)
    setMobileView('chat')
    if (convId) {
      const basePath =
        currentUser?.role === 'admin'
          ? '/admin/communication'
          : currentUser?.role === 'teacher'
            ? '/teacher/communication'
            : '/student/communication'
      navigate(`${basePath}/${convId}`)
    }
  }

  // Handle starting personal chat
  const handleStartPersonalChat = async (targetUserId: string) => {
    const convId = await startPersonalConversation(targetUserId)
    if (convId) {
      setShowNewChatModal(false)
      setShowGroupInfoModal(false)
      setSelectedProfileUser(null)
      setMobileView('chat')
      const basePath =
        currentUser?.role === 'admin'
          ? '/admin/communication'
          : currentUser?.role === 'teacher'
            ? '/teacher/communication'
            : '/student/communication'
      navigate(`${basePath}/${convId}`)
    }
  }

  // Handle add member from group info
  const handleAddMemberToGroup = async (userId: string) => {
    if (!activeConversation) return
    await addParticipantToGroup(activeConversation.id, userId)
    setShowAddMemberModal(false)
  }

  return (
    <div
      className={`chat-container ${
        mobileView === 'chat' ? 'chat-container--mobile-chat' : 'chat-container--mobile-list'
      }`}
    >
      {/* ----------------- LEFT: CONVERSATION SIDEBAR ----------------- */}
      <aside className="chat-sidebar">
        <div className="chat-sidebar-header">
          <div className="chat-sidebar-title-row">
            <h2>Messages & Groups</h2>
            <div className="chat-sidebar-actions">
              <button
                className="chat-icon-button"
                title="Start Direct Message"
                onClick={() => {
                  setDirectorySearch('')
                  setShowNewChatModal(true)
                }}
              >
                <MessageSquare size={17} />
              </button>
              <button
                className="chat-icon-button"
                title="Create Group"
                onClick={() => {
                  setDirectorySearch('')
                  setSelectedUserIds([])
                  setShowNewGroupModal(true)
                }}
              >
                <Users size={17} />
              </button>
            </div>
          </div>

          <div className="chat-search-wrap">
            <Search size={15} />
            <input
              type="text"
              className="chat-search-input"
              placeholder="Search chats or members..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Primary Segmented Tabs: [ Chats ] [ Groups ] */}
        <div className="chat-main-segmented-tabs">
          <button
            type="button"
            className={`chat-segment-tab ${activeMainTab === 'chats' ? 'chat-segment-tab--active' : ''}`}
            onClick={() => setActiveMainTab('chats')}
          >
            <MessageSquare size={15} />
            <span>Chats</span>
            {unreadChatsCount > 0 && <span className="chat-tab-count-badge">{unreadChatsCount}</span>}
          </button>
          <button
            type="button"
            className={`chat-segment-tab ${activeMainTab === 'groups' ? 'chat-segment-tab--active' : ''}`}
            onClick={() => setActiveMainTab('groups')}
          >
            <Users size={15} />
            <span>Groups</span>
            {unreadGroupsCount > 0 && <span className="chat-tab-count-badge">{unreadGroupsCount}</span>}
          </button>
        </div>

        {/* In Groups Mode: Sub-category filter pills */}
        {activeMainTab === 'groups' && (
          <div className="chat-filter-tabs">
            <button
              type="button"
              className={`chat-tab-pill ${activeGroupFilter === 'all' ? 'chat-tab-pill--active' : ''}`}
              onClick={() => setActiveGroupFilter('all')}
            >
              All
            </button>
            <button
              type="button"
              className={`chat-tab-pill ${activeGroupFilter === 'class' ? 'chat-tab-pill--active' : ''}`}
              onClick={() => setActiveGroupFilter('class')}
            >
              Class Groups
            </button>
            <button
              type="button"
              className={`chat-tab-pill ${activeGroupFilter === 'faculty' ? 'chat-tab-pill--active' : ''}`}
              onClick={() => setActiveGroupFilter('faculty')}
            >
              Faculty
            </button>
            <button
              type="button"
              className={`chat-tab-pill ${activeGroupFilter === 'custom' ? 'chat-tab-pill--active' : ''}`}
              onClick={() => setActiveGroupFilter('custom')}
            >
              Custom
            </button>
          </div>
        )}


        {/* Conversation List */}
        <ul className="chat-conversations-scroll">
          {filteredConversations.length === 0 ? (
            <li className="chat-empty-state" style={{ padding: '40px 16px' }}>
              <MessageSquare size={32} />
              <h3>No conversations found</h3>
              <p>Start a direct message with a faculty member or classmate, or create a study group.</p>
              <button
                className="button button--primary"
                onClick={() => setShowNewChatModal(true)}
                style={{ fontSize: '12px', padding: '6px 14px' }}
              >
                <Plus size={14} style={{ marginRight: '6px' }} /> New Message
              </button>
            </li>
          ) : (
            filteredConversations.map((conv) => {
              const isActive = activeConversation?.id === conv.id
              const title = getConversationTitle(conv)
              const subtitle = getConversationSubtitle(conv)
              const unread = (currentUser && conv.unreadCount?.[currentUser.id]) || 0
              const isMuted = currentUser && !!conv.isMuted?.[currentUser.id]

              // Get avatar text or other participant role
              const otherId = conv.participants.find((p) => p !== currentUser?.id)
              const otherInfo = otherId ? conv.participantDetails?.[otherId] : null
              const avatarText =
                conv.type === 'group' ? (conv.name ? conv.name[0] : 'G') : otherInfo?.avatar || 'U'

              return (
                <li
                  key={conv.id}
                  className={`chat-conv-item ${isActive ? 'chat-conv-item--active' : ''}`}
                  onClick={() => {
                    setActiveConversationId(conv.id)
                    setMobileView('chat')
                  }}
                >
                  <div className="chat-avatar-wrap">
                    <div
                      className={`chat-avatar ${
                        conv.type === 'group' ? 'chat-avatar--group' : ''
                      }`}
                    >
                      {conv.type === 'group' ? <Users size={20} /> : avatarText}
                    </div>
                    {conv.type === 'personal' && otherInfo?.role && (
                      <span
                        className={`chat-role-indicator chat-role-indicator--${otherInfo.role}`}
                      >
                        {otherInfo.role[0]}
                      </span>
                    )}
                  </div>

                  <div className="chat-conv-details">
                    <div className="chat-conv-row1">
                      <div className="chat-conv-name-wrap">
                        <span className="chat-conv-name">{title}</span>
                        {conv.type === 'personal' && otherInfo?.role ? (
                          <span className={`chat-category-badge chat-category-badge--${otherInfo.role}`}>
                            {otherInfo.role}
                          </span>
                        ) : conv.category ? (
                          <span className={`chat-category-badge chat-category-badge--${conv.category}`}>
                            {conv.category === 'class'
                              ? 'Class'
                              : conv.category === 'faculty'
                                ? 'Faculty'
                                : conv.category === 'college'
                                  ? 'Campus'
                                  : 'Group'}
                          </span>
                        ) : null}
                        {conv.type === 'group' && (
                          <span className="chat-member-count-pill" title={`${conv.participants.length} members`}>
                            <Users size={10} style={{ marginRight: 3 }} /> {conv.participants.length}
                          </span>
                        )}
                      </div>
                      <span className="chat-conv-time">
                        {conv.lastMessageAt ? formatTime(conv.lastMessageAt) : ''}
                      </span>

                    </div>

                    <div className="chat-conv-row2">
                      <p className="chat-conv-snippet">
                        {conv.lastMessage ? (
                          <>
                            {conv.lastMessageSender && conv.type === 'group' && (
                              <strong>{conv.lastMessageSender.split(' ')[0]}: </strong>
                            )}
                            {conv.lastMessage}
                          </>
                        ) : (
                          <span style={{ fontStyle: 'italic' }}>{subtitle}</span>
                        )}
                      </p>

                      <div className="chat-conv-badges">
                        {isMuted && <BellOff size={13} color="var(--text-muted)" />}
                        {unread > 0 && <span className="chat-unread-badge">{unread}</span>}
                      </div>
                    </div>
                  </div>
                </li>
              )
            })
          )}
        </ul>
      </aside>

      {/* ----------------- RIGHT: ACTIVE CHAT VIEW ----------------- */}
      <main className="chat-main">
        {activeConversation ? (
          <>
            {/* Chat Header */}
            <header className="chat-header">
              {(() => {
                const otherUserId = activeConversation.type === 'personal'
                  ? activeConversation.participants.find((p) => p !== currentUser?.id)
                  : null
                const otherUser = otherUserId ? getUserProfile(otherUserId) : null

                return (
                  <div
                    className="chat-header-info"
                    style={{ cursor: activeConversation.type === 'personal' ? 'pointer' : 'default' }}
                    title={activeConversation.type === 'personal' ? `Click to view ${otherUser?.name || 'user'}'s profile` : undefined}
                    onClick={() => {
                      if (activeConversation.type === 'personal' && otherUser) {
                        setSelectedProfileUser(otherUser)
                      }
                    }}
                  >
                    <button
                      className="chat-back-btn"
                      onClick={(e) => {
                        e.stopPropagation()
                        setMobileView('list')
                      }}
                      title="Back to conversations"
                    >
                      <ChevronLeft size={22} />
                    </button>

                    <div
                      className={`chat-avatar ${
                        activeConversation.type === 'group' ? 'chat-avatar--group' : ''
                      }`}
                      style={{ width: '38px', height: '38px', fontSize: '14px' }}
                    >
                      {activeConversation.type === 'group' ? (
                        <Users size={18} />
                      ) : otherUser?.photoURL ? (
                        <img
                          src={otherUser.photoURL}
                          alt={otherUser.name}
                          style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
                        />
                      ) : (
                        otherUser?.avatar ||
                        activeConversation.participants
                          .find((p) => p !== currentUser?.id)
                          ?.slice(0, 2)
                          .toUpperCase() || 'U'
                      )}
                    </div>

                    <div className="chat-header-text">
                      <h3>{getConversationTitle(activeConversation)}</h3>
                      <p>{getConversationSubtitle(activeConversation)}</p>
                    </div>
                  </div>
                )
              })()}

              <div className="chat-header-actions">
                <button
                  className="chat-icon-button"
                  title={
                    currentUser && activeConversation.isMuted?.[currentUser.id]
                      ? 'Unmute Notifications'
                      : 'Mute Notifications'
                  }
                  onClick={() => toggleMuteConversation(activeConversation.id)}
                >
                  {currentUser && activeConversation.isMuted?.[currentUser.id] ? (
                    <BellOff size={17} color="var(--danger)" />
                  ) : (
                    <Bell size={17} />
                  )}
                </button>

                {activeConversation.type === 'group' && (
                  <button
                    className="chat-icon-button"
                    title="Group Details & Roster"
                    onClick={() => setShowGroupInfoModal(true)}
                  >
                    <Info size={17} />
                  </button>
                )}
              </div>
            </header>

            {/* Message Stream */}
            <div className="chat-stream">
              {currentMessages.length === 0 ? (
                <div className="chat-empty-state">
                  <MessageSquare size={40} />
                  <h3>No messages yet</h3>
                  <p>Say hello to begin communication in this college channel.</p>
                </div>
              ) : (
                currentMessages.map((msg, index) => {
                  const isMine = msg.senderId === currentUser?.id
                  const showDateDivider =
                    index === 0 ||
                    new Date(msg.createdAt).toDateString() !==
                      new Date(currentMessages[index - 1].createdAt).toDateString()

                  return (
                    <div key={msg.id}>
                      {showDateDivider && (
                        <div className="chat-date-divider">
                          <span className="chat-date-pill">{formatDateHeader(msg.createdAt)}</span>
                        </div>
                      )}

                      <div
                        className={`chat-bubble-row ${
                          isMine ? 'chat-bubble-row--mine' : 'chat-bubble-row--theirs'
                        }`}
                      >
                        <div
                          className={`chat-bubble ${
                            isMine ? 'chat-bubble--mine' : 'chat-bubble--theirs'
                          }`}
                        >
                          {/* Sender name for group chats when it's not my message */}
                          {!isMine && activeConversation.type === 'group' && (
                            <div
                              className="chat-bubble-sender"
                              style={{ cursor: 'pointer' }}
                              title={`View ${msg.senderName}'s Profile`}
                              onClick={() => {
                                const u = getUserProfile(msg.senderId)
                                if (u) setSelectedProfileUser(u)
                              }}
                            >
                              <span>{msg.senderName}</span>
                              <span className="chat-role-tag">{msg.senderRole}</span>
                            </div>
                          )}

                          {/* Quoted reply box if this message was a reply */}
                          {msg.replyTo && (
                            <div className="chat-quoted-box">
                              <div className="chat-quoted-sender">{msg.replyTo.senderName}</div>
                              <p className="chat-quoted-text">{msg.replyTo.text}</p>
                            </div>
                          )}

                          {/* Message Body or Deleted Indicator */}
                          {msg.isDeletedForEveryone ? (
                            <p style={{ fontStyle: 'italic', opacity: 0.75, margin: '2px 0' }}>
                              🚫 This message was deleted
                            </p>
                          ) : (
                            <>
                              {msg.text && <p style={{ margin: 0 }}>{msg.text}</p>}

                              {/* Attachment preview box */}
                              {msg.attachment && (
                                msg.attachment.fileType === 'image' ? (
                                  <div className="chat-image-attachment-wrapper">
                                    <a
                                      href={msg.attachment.url}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="chat-image-preview-anchor"
                                      title="Click to view full image"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <img
                                        src={msg.attachment.url}
                                        alt={msg.attachment.fileName}
                                        loading="lazy"
                                        className="chat-inline-image"
                                        onError={(e) => {
                                          // Fallback to text chip if image load fails
                                          const target = e.currentTarget
                                          target.style.display = 'none'
                                        }}
                                      />
                                    </a>
                                    <div className="chat-image-footer">
                                      <span className="chat-image-name">{msg.attachment.fileName}</span>
                                      <a
                                        href={msg.attachment.url}
                                        target="_blank"
                                        rel="noreferrer"
                                        download={msg.attachment.fileName}
                                        className="chat-attachment-download"
                                        title="Download Image"
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        <Download size={14} />
                                      </a>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="chat-attachment-box">
                                    <FileText size={20} />
                                    <div className="chat-attachment-info">
                                      <p className="chat-attachment-name">
                                        {msg.attachment.fileName}
                                      </p>
                                      <p className="chat-attachment-size">
                                        {(msg.attachment.fileSize / 1024).toFixed(1)} KB
                                      </p>
                                    </div>
                                    <a
                                      href={msg.attachment.url}
                                      target="_blank"
                                      rel="noreferrer"
                                      download={msg.attachment.fileName}
                                      className="chat-attachment-download"
                                      title="Download File"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <Download size={15} />
                                    </a>
                                  </div>
                                )
                              )}
                            </>
                          )}

                          {/* Footer with time and read tick status */}
                          <div className="chat-bubble-footer">
                            <span>{formatTime(msg.createdAt)}</span>
                            {isMine && !msg.isDeletedForEveryone && (
                              <span className="chat-ticks">
                                {msg.status === 'read' ? (
                                  <CheckCheck size={14} color="#60a5fa" />
                                ) : msg.status === 'delivered' ? (
                                  <CheckCheck size={14} />
                                ) : (
                                  <Check size={14} />
                                )}
                              </span>
                            )}
                          </div>

                          {/* Kebab Action menu on hover */}
                          {!msg.isDeletedForEveryone && (
                            <button
                              className="chat-bubble-actions-trigger"
                              title="Message Options"
                              onClick={(e) => {
                                e.stopPropagation()
                                setActiveMenuMessageId(
                                  activeMenuMessageId === msg.id ? null : msg.id,
                                )
                              }}
                            >
                              <MoreVertical size={13} />
                            </button>
                          )}

                          {activeMenuMessageId === msg.id && (
                            <ul
                              className="chat-actions-menu"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <li>
                                <button
                                  onClick={() => {
                                    setReplyingTo(msg)
                                    setActiveMenuMessageId(null)
                                  }}
                                >
                                  <Reply size={13} /> Reply
                                </button>
                              </li>
                              <li>
                                <button
                                  onClick={() => {
                                    handleCopyText(msg.text)
                                    setActiveMenuMessageId(null)
                                  }}
                                >
                                  <Copy size={13} /> Copy
                                </button>
                              </li>
                              <li>
                                <button
                                  onClick={() => {
                                    void deleteMessage(msg.id, 'for_me')
                                    setActiveMenuMessageId(null)
                                  }}
                                >
                                  <Trash2 size={13} /> Delete for me
                                </button>
                              </li>
                              {isMine && (
                                <li>
                                  <button
                                    className="chat-danger-btn"
                                    onClick={() => {
                                      void deleteMessage(msg.id, 'for_everyone')
                                      setActiveMenuMessageId(null)
                                    }}
                                  >
                                    <Trash2 size={13} /> Delete for everyone
                                  </button>
                                </li>
                              )}
                            </ul>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Bottom Compose Box */}
            <div className="chat-compose-container">
              {/* Replying banner */}
              {replyingTo && (
                <div className="chat-reply-banner">
                  <div className="chat-reply-banner-content">
                    <strong>Replying to {replyingTo.senderName}</strong>
                    <p>{replyingTo.text}</p>
                  </div>
                  <button
                    className="chat-icon-button"
                    style={{ padding: '3px' }}
                    onClick={() => setReplyingTo(null)}
                  >
                    <X size={15} />
                  </button>
                </div>
              )}

              {/* Attachment preview banner */}
              {attachedFile && (
                <div className="chat-file-preview-banner">
                  <div className="chat-file-preview-details">
                    <Paperclip size={15} color="var(--primary)" />
                    <span>
                      <strong>{attachedFile.name}</strong> (
                      {(attachedFile.size / 1024).toFixed(1)} KB)
                    </span>
                  </div>
                  <button
                    className="chat-icon-button"
                    style={{ padding: '3px' }}
                    onClick={() => {
                      setAttachedFile(null)
                      if (fileInputRef.current) fileInputRef.current.value = ''
                    }}
                  >
                    <X size={15} />
                  </button>
                </div>
              )}

              {/* Hidden file input */}
              <input
                type="file"
                ref={fileInputRef}
                style={{ display: 'none' }}
                accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.webp,.zip"
                onChange={handleFileChange}
              />

              {/* Form Input */}
              <form className="chat-compose-form" onSubmit={handleSendMessage}>
                <button
                  type="button"
                  className="chat-icon-button"
                  title="Attach File (PDF, Document, Image, ZIP)"
                  onClick={() => fileInputRef.current?.click()}
                  style={{ width: '38px', height: '38px' }}
                >
                  <Paperclip size={18} />
                </button>

                <div className="chat-compose-input-wrap">
                  <input
                    className="chat-compose-input"
                    placeholder="Type a message..."
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    disabled={uploading}
                  />
                </div>

                <button
                  type="submit"
                  className="chat-send-button"
                  disabled={(!inputText.trim() && !attachedFile) || uploading}
                  title="Send Message"
                >
                  <Send size={17} />
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="chat-empty-state">
            <MessageSquare size={48} />
            <h3>Select a conversation</h3>
            <p>Choose an ongoing discussion or start a new message with colleagues or students.</p>
            <button
              className="button button--primary"
              onClick={() => setShowNewChatModal(true)}
            >
              Start New Chat
            </button>
          </div>
        )}
      </main>

      {/* ----------------- MODAL: START DIRECT MESSAGE ----------------- */}
      {showNewChatModal && (
        <div className="chat-modal-backdrop" onClick={() => setShowNewChatModal(false)}>
          <div className="chat-modal" onClick={(e) => e.stopPropagation()}>
            <div className="chat-modal-header">
              <h3>Start Direct Message</h3>
              <button
                className="chat-icon-button"
                onClick={() => setShowNewChatModal(false)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="chat-modal-body">
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0 }}>
                Directly communicate with verified faculty or classmates in{' '}
                <strong>{currentUser?.college || 'your campus'}</strong>.
              </p>

              <div className="chat-search-wrap">
                <Search size={15} />
                <input
                  type="text"
                  className="chat-search-input"
                  placeholder="Search by name, roll no, employee ID, role..."
                  value={directorySearch}
                  onChange={(e) => setDirectorySearch(e.target.value)}
                  autoFocus
                />
              </div>

              <div className="chat-user-picker-list">
                {filteredDirectory.length === 0 ? (
                  <p style={{ textAlign: 'center', padding: '20px', fontSize: '13px', color: 'var(--text-muted)' }}>
                    No matching campus members found.
                  </p>
                ) : (
                  filteredDirectory.map((user) => (
                    <div
                      key={user.id}
                      className="chat-user-picker-item"
                      onClick={() => void handleStartPersonalChat(user.id)}
                    >
                      <div className="chat-user-picker-left">
                        <div className="chat-avatar" style={{ width: '38px', height: '38px', fontSize: '13px' }}>
                          {user.avatar || user.name[0]}
                        </div>
                        <div>
                          <p className="chat-user-picker-name">{user.name}</p>
                          <p className="chat-user-picker-sub">
                            {user.role.toUpperCase()} · {user.identifier || user.email}
                          </p>
                        </div>
                      </div>

                      <button
                        className="button button--secondary"
                        style={{ fontSize: '12px', padding: '5px 12px' }}
                      >
                        Message
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="chat-modal-footer">
              <button
                className="button button--ghost"
                onClick={() => setShowNewChatModal(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ----------------- MODAL: CREATE GROUP ----------------- */}
      {showNewGroupModal && (
        <div className="chat-modal-backdrop" onClick={() => setShowNewGroupModal(false)}>
          <div className="chat-modal" onClick={(e) => e.stopPropagation()}>
            <div className="chat-modal-header">
              <h3>Create Campus Group</h3>
              <button
                className="chat-icon-button"
                onClick={() => setShowNewGroupModal(false)}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateGroup}>
              <div className="chat-modal-body">
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                    Group Name *
                  </label>
                  <input
                    className="chat-search-input"
                    placeholder="e.g. BSc IT · Sem 4 · Algorithms"
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                    Description / Purpose (Optional)
                  </label>
                  <input
                    className="chat-search-input"
                    placeholder="e.g. Project discussions, exam preparation and notes sharing"
                    value={newGroupDesc}
                    onChange={(e) => setNewGroupDesc(e.target.value)}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
                    Group Category
                  </label>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      className={`chat-tab-pill ${newGroupCategory === 'custom' ? 'chat-tab-pill--active' : ''}`}
                      onClick={() => setNewGroupCategory('custom')}
                    >
                      Study / Custom
                    </button>
                    {(currentUser?.role === 'teacher' || currentUser?.role === 'admin') && (
                      <button
                        type="button"
                        className={`chat-tab-pill ${newGroupCategory === 'class' ? 'chat-tab-pill--active' : ''}`}
                        onClick={() => setNewGroupCategory('class')}
                      >
                        Class Channel
                      </button>
                    )}
                    {(currentUser?.role === 'teacher' || currentUser?.role === 'admin') && (
                      <button
                        type="button"
                        className={`chat-tab-pill ${newGroupCategory === 'faculty' ? 'chat-tab-pill--active' : ''}`}
                        onClick={() => setNewGroupCategory('faculty')}
                      >
                        Faculty Board
                      </button>
                    )}
                  </div>
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <label style={{ fontSize: '12px', fontWeight: 600 }}>
                      Select Participants ({selectedUserIds.length} selected)
                    </label>
                  </div>

                  <div className="chat-search-wrap" style={{ marginBottom: '8px' }}>
                    <Search size={14} />
                    <input
                      type="text"
                      className="chat-search-input"
                      placeholder="Filter directory..."
                      value={directorySearch}
                      onChange={(e) => setDirectorySearch(e.target.value)}
                    />
                  </div>

                  <div className="chat-user-picker-list">
                    {filteredDirectory.map((user) => {
                      const isSelected = selectedUserIds.includes(user.id)
                      return (
                        <div
                          key={user.id}
                          className={`chat-user-picker-item ${
                            isSelected ? 'chat-user-picker-item--selected' : ''
                          }`}
                          onClick={() => {
                            setSelectedUserIds((prev) =>
                              isSelected
                                ? prev.filter((id) => id !== user.id)
                                : [...prev, user.id],
                            )
                          }}
                        >
                          <div className="chat-user-picker-left">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              readOnly
                              style={{ cursor: 'pointer' }}
                            />
                            <div className="chat-avatar" style={{ width: '32px', height: '32px', fontSize: '12px' }}>
                              {user.avatar || user.name[0]}
                            </div>
                            <div>
                              <p className="chat-user-picker-name">{user.name}</p>
                              <p className="chat-user-picker-sub">
                                {user.role.toUpperCase()} · {user.identifier || user.email}
                              </p>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>

              <div className="chat-modal-footer">
                <button
                  type="button"
                  className="button button--ghost"
                  onClick={() => setShowNewGroupModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="button button--primary"
                  disabled={!newGroupName.trim() || selectedUserIds.length === 0}
                >
                  Create Group
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ----------------- MODAL: GROUP INFO DRAWER ----------------- */}
      {showGroupInfoModal && activeConversation && activeConversation.type === 'group' && (
        <div className="chat-modal-backdrop" onClick={() => setShowGroupInfoModal(false)}>
          <div className="chat-modal" onClick={(e) => e.stopPropagation()}>
            <div className="chat-modal-header">
              <h3>Group Information</h3>
              <button
                className="chat-icon-button"
                onClick={() => setShowGroupInfoModal(false)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="chat-modal-body">
              <div style={{ textAlign: 'center', padding: '10px 0' }}>
                <div
                  className="chat-avatar chat-avatar--group"
                  style={{ width: '64px', height: '64px', fontSize: '24px', margin: '0 auto 12px' }}
                >
                  <Users size={30} />
                </div>
                <h3 style={{ margin: '0 0 4px', fontSize: '18px' }}>{activeConversation.name}</h3>
                <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)' }}>
                  {activeConversation.description || 'No description provided'}
                </p>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h4 style={{ margin: 0, fontSize: '14px' }}>
                  Members ({activeConversation.participants.length})
                </h4>
                {currentUser && activeConversation.adminIds?.includes(currentUser.id) && (
                  <button
                    className="button button--secondary"
                    style={{ fontSize: '11px', padding: '4px 10px' }}
                    onClick={() => setShowAddMemberModal(true)}
                  >
                    <UserPlus size={13} style={{ marginRight: '4px' }} /> Add Member
                  </button>
                )}
              </div>

              <div className="chat-user-picker-list" style={{ maxHeight: '240px' }}>
                {activeConversation.participants.map((pid) => {
                  const pDetail = activeConversation.participantDetails?.[pid]
                  const isAdmin = activeConversation.adminIds?.includes(pid)
                  const isCurrent = currentUser?.id === pid
                  const canRemove =
                    currentUser &&
                    activeConversation.adminIds?.includes(currentUser.id) &&
                    !isCurrent

                  return (
                    <div key={pid} className="chat-user-picker-item">
                      <div
                        className="chat-user-picker-left"
                        style={{ cursor: 'pointer', flex: 1 }}
                        title={`Click to view ${pDetail?.name || 'Member'}'s profile`}
                        onClick={() => {
                          const u = getUserProfile(pid)
                          if (u) setSelectedProfileUser(u)
                        }}
                      >
                        <div className="chat-avatar" style={{ width: '34px', height: '34px', fontSize: '12px' }}>
                          {pDetail?.photoURL ? (
                            <img
                              src={pDetail.photoURL}
                              alt={pDetail?.name}
                              style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
                            />
                          ) : (
                            pDetail?.avatar || pDetail?.name?.[0] || 'U'
                          )}
                        </div>
                        <div>
                          <p className="chat-user-picker-name">
                            {pDetail?.name || 'Member'}{' '}
                            {isCurrent && <span style={{ color: 'var(--primary)', fontSize: '11px' }}>(You)</span>}
                          </p>
                          <p className="chat-user-picker-sub">
                            {pDetail?.role?.toUpperCase()} {pDetail?.identifier ? `· ${pDetail.identifier}` : ''}
                          </p>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {isAdmin && (
                          <span
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '3px',
                              fontSize: '10px',
                              fontWeight: 700,
                              color: '#059669',
                              background: 'rgba(5, 150, 105, 0.1)',
                              padding: '2px 6px',
                              borderRadius: '4px',
                            }}
                          >
                            <Shield size={10} /> Admin
                          </span>
                        )}

                        {!isCurrent && (
                          <button
                            className="chat-icon-button"
                            title="Direct Message"
                            onClick={() => void handleStartPersonalChat(pid)}
                          >
                            <MessageSquare size={14} />
                          </button>
                        )}

                        {canRemove && (
                          <button
                            className="chat-icon-button"
                            title="Remove Member"
                            onClick={() => void removeParticipantFromGroup(activeConversation.id, pid)}
                            style={{ color: 'var(--danger)' }}
                          >
                            <X size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Shared Documents Section */}
              <div>
                <h4 style={{ margin: '8px 0 6px', fontSize: '14px' }}>Shared Documents & Files</h4>
                {currentMessages.filter((m) => m.attachment).length === 0 ? (
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>
                    No files shared in this group yet.
                  </p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {currentMessages
                      .filter((m) => m.attachment)
                      .map((m) => (
                        <div
                          key={m.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '6px 10px',
                            background: 'var(--surface-muted)',
                            borderRadius: '6px',
                            fontSize: '12px',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                            <FileText size={16} color="var(--primary)" />
                            <span
                              style={{
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                              }}
                            >
                              {m.attachment?.fileName}
                            </span>
                          </div>
                          <a
                            href={m.attachment?.url}
                            target="_blank"
                            rel="noreferrer"
                            download={m.attachment?.fileName}
                            style={{ color: 'var(--primary)', display: 'flex' }}
                          >
                            <Download size={14} />
                          </a>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </div>

            <div className="chat-modal-footer">
              <button
                className="button button--secondary"
                style={{ color: 'var(--danger)', borderColor: 'var(--danger)' }}
                onClick={() => {
                  if (window.confirm('Are you sure you want to leave this group?')) {
                    void leaveGroup(activeConversation.id)
                    setShowGroupInfoModal(false)
                  }
                }}
              >
                <LogOut size={14} style={{ marginRight: '6px' }} /> Leave Group
              </button>
              <button
                className="button button--primary"
                onClick={() => setShowGroupInfoModal(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ----------------- MODAL: ADD MEMBER TO GROUP ----------------- */}
      {showAddMemberModal && activeConversation && (
        <div className="chat-modal-backdrop" onClick={() => setShowAddMemberModal(false)}>
          <div className="chat-modal" onClick={(e) => e.stopPropagation()}>
            <div className="chat-modal-header">
              <h3>Add Members to Group</h3>
              <button
                className="chat-icon-button"
                onClick={() => setShowAddMemberModal(false)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="chat-modal-body">
              <div className="chat-search-wrap">
                <Search size={15} />
                <input
                  type="text"
                  className="chat-search-input"
                  placeholder="Search campus members..."
                  value={directorySearch}
                  onChange={(e) => setDirectorySearch(e.target.value)}
                  autoFocus
                />
              </div>

              <div className="chat-user-picker-list">
                {filteredDirectory
                  .filter((u) => !activeConversation.participants.includes(u.id))
                  .map((user) => (
                    <div
                      key={user.id}
                      className="chat-user-picker-item"
                      onClick={() => void handleAddMemberToGroup(user.id)}
                    >
                      <div className="chat-user-picker-left">
                        <div className="chat-avatar" style={{ width: '34px', height: '34px', fontSize: '12px' }}>
                          {user.avatar || user.name[0]}
                        </div>
                        <div>
                          <p className="chat-user-picker-name">{user.name}</p>
                          <p className="chat-user-picker-sub">
                            {user.role.toUpperCase()} · {user.identifier || user.email}
                          </p>
                        </div>
                      </div>

                      <button
                        className="button button--primary"
                        style={{ fontSize: '11px', padding: '4px 10px' }}
                      >
                        Add
                      </button>
                    </div>
                  ))}
              </div>
            </div>

            <div className="chat-modal-footer">
              <button
                className="button button--ghost"
                onClick={() => setShowAddMemberModal(false)}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View-only Member Profile Modal */}
      {selectedProfileUser && (
        <ProfileView
          targetUser={selectedProfileUser}
          viewOnly
          onClose={() => setSelectedProfileUser(null)}
        />
      )}
    </div>
  )
}
