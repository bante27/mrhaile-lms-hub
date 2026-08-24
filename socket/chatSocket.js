const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');

// Store online users: userId -> Set of socket IDs
const onlineUsers = new Map();

// Simple in-memory rate limiter for socket message sending: userId -> timestamp of last message
const messageRateLimitMap = new Map();
const RATE_LIMIT_WINDOW_MS = 1000; // 1 message per second max

const setupSocket = (io) => {
  // Middleware for socket authentication via JWT
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers?.authorization?.split(' ')[1];
      if (!token) {
        return next(new Error('Authentication error: Token not provided'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallbacksecret');
      const user = await User.findById(decoded.id).select('-password');
      
      if (!user) {
        return next(new Error('Authentication error: User not found'));
      }

      if (user.isBlocked) {
        return next(new Error('Authentication error: User is blocked'));
      }

      socket.user = user;
      next();
    } catch (error) {
      console.error('Socket authentication error:', error.message);
      next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.user._id.toString();
    const userRole = socket.user.role;
    const isAdmin = userRole === 'admin' || userRole === 'superadmin';

    console.log(`User connected: ${socket.user.firstName} (${userId}) [Role: ${userRole}] - Socket ID: ${socket.id}`);

    // Track online status
    if (!onlineUsers.has(userId)) {
      onlineUsers.set(userId, new Set());
    }
    onlineUsers.get(userId).add(socket.id);

    // Broadcast user online
    io.emit('user_online', { userId, role: userRole });

    // If admin, join admin global room
    if (isAdmin) {
      socket.join('admin_room');
    }

    // Join personal room
    socket.join(`user:${userId}`);

    // 1. Join Conversation
    socket.on('join_conversation', async ({ conversationId }) => {
      try {
        if (!conversationId) return;

        const conversation = await Conversation.findById(conversationId);
        if (!conversation) {
          return socket.emit('error', { message: 'Conversation not found' });
        }

        // Security check: users can only join their own conversation room
        if (!isAdmin && conversation.userId.toString() !== userId) {
          return socket.emit('error', { message: 'Unauthorized to access this conversation' });
        }

        const roomName = `conversation:${conversationId}`;
        socket.join(roomName);
        console.log(`User ${userId} joined room ${roomName}`);

        // Mark unread messages in this conversation as read if opened
        if (isAdmin) {
          await Message.updateMany(
            { conversationId, isRead: false, senderRole: 'student' },
            { $set: { isRead: true } }
          );
          conversation.unreadCount = 0;
          await conversation.save();
          io.to('admin_room').emit('conversation_updated', conversation);
        } else {
          await Message.updateMany(
            { conversationId, isRead: false, senderRole: { $in: ['admin', 'superadmin', 'instructor'] } },
            { $set: { isRead: true } }
          );
        }
      } catch (error) {
        console.error('join_conversation error:', error);
        socket.emit('error', { message: 'Failed to join conversation' });
      }
    });

    // 2. Leave Conversation
    socket.on('leave_conversation', ({ conversationId }) => {
      if (!conversationId) return;
      const roomName = `conversation:${conversationId}`;
      socket.leave(roomName);
      console.log(`User ${userId} left room ${roomName}`);
    });

    // 3. Send Message
    socket.on('send_message', async (data) => {
      try {
        const { conversationId, text } = data;
        if (!conversationId || !text || !text.trim()) {
          return socket.emit('error', { message: 'ConversationId and text are required' });
        }

        // Rate limiting check
        const lastMessageTime = messageRateLimitMap.get(userId) || 0;
        const now = Date.now();
        if (now - lastMessageTime < RATE_LIMIT_WINDOW_MS) {
          return socket.emit('error', { message: 'Rate limit exceeded. Please wait a moment.' });
        }
        messageRateLimitMap.set(userId, now);

        const conversation = await Conversation.findById(conversationId);
        if (!conversation) {
          return socket.emit('error', { message: 'Conversation not found' });
        }

        // Security check
        if (!isAdmin && conversation.userId.toString() !== userId) {
          return socket.emit('error', { message: 'Unauthorized to send message here' });
        }

        const messageText = text.trim().substring(0, 5000); // Sanitize / truncate length

        const message = await Message.create({
          conversationId,
          senderId: userId,
          senderRole: userRole,
          text: messageText,
          isRead: false
        });

        conversation.lastMessage = messageText;
        conversation.lastMessageAt = new Date();
        if (isAdmin) {
          conversation.adminId = socket.user._id;
          conversation.unreadCount = (conversation.unreadCount || 0); // admin message doesn't increase user unread count if user is looking, or increase user unread if not. Let's increment unreadCount for user
        } else {
          conversation.unreadCount = (conversation.unreadCount || 0) + 1;
        }
        await conversation.save();

        const populatedMessage = await Message.findById(message._id)
          .populate('senderId', 'firstName lastName profileImage role');

        const roomName = `conversation:${conversationId}`;
        
        // Emit to everyone in the conversation room
        io.to(roomName).emit('new_message', populatedMessage);

        // Notify admin dashboard
        io.to('admin_room').emit('conversation_updated', conversation);
        io.to(`user:${conversation.userId.toString()}`).emit('conversation_updated', conversation);

      } catch (error) {
        console.error('send_message error:', error);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // 4. Typing indicators (Real-time only, never saved to MongoDB)
    socket.on('typing_start', ({ conversationId }) => {
      if (!conversationId) return;
      socket.to(`conversation:${conversationId}`).emit('typing_start', {
        userId,
        userName: `${socket.user.firstName} ${socket.user.lastName}`,
        role: userRole
      });
    });

    socket.on('typing_stop', ({ conversationId }) => {
      if (!conversationId) return;
      socket.to(`conversation:${conversationId}`).emit('typing_stop', {
        userId,
        role: userRole
      });
    });

    // 5. Message Read Event
    socket.on('message_read', async ({ messageId, conversationId }) => {
      try {
        if (!messageId || !conversationId) return;
        const message = await Message.findById(messageId);
        if (message) {
          message.isRead = true;
          await message.save();
          io.to(`conversation:${conversationId}`).emit('message_read', { messageId, conversationId });
        }
      } catch (error) {
        console.error('message_read error:', error);
      }
    });

    // 6. Message Deletion (Soft delete for everyone)
    socket.on('delete_message', async ({ messageId, conversationId, deleteType }) => {
      try {
        if (!messageId || !conversationId) return;
        const message = await Message.findById(messageId);
        if (!message) return socket.emit('error', { message: 'Message not found' });

        if (message.senderId.toString() !== userId && !isAdmin) {
          return socket.emit('error', { message: 'Unauthorized to delete this message' });
        }

        message.deletedAt = new Date();
        message.deletedBy = socket.user._id;
        message.text = 'This message was deleted';
        await message.save();

        io.to(`conversation:${conversationId}`).emit('message_deleted', {
          messageId,
          conversationId,
          text: 'This message was deleted'
        });
      } catch (error) {
        console.error('delete_message error:', error);
      }
    });

    // 7. Disconnect
    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.user.firstName} (${userId})`);
      if (onlineUsers.has(userId)) {
        onlineUsers.get(userId).delete(socket.id);
        if (onlineUsers.get(userId).size === 0) {
          onlineUsers.delete(userId);
          io.emit('user_offline', { userId, role: userRole });
        }
      }
    });
  });

  return {
    getOnlineUsers: () => onlineUsers
  };
};

module.exports = setupSocket;
