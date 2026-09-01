const mongoose = require('mongoose');
const Conversation = require('../../models/Conversation');
const Message = require('../../models/Message');
const BaseService = require('../../services/BaseService');
const AppError = require('../../utils/appError');

class ChatBusinessService {
    constructor() {
        this.conversationService = new BaseService(Conversation);
        this.messageService = new BaseService(Message);
    }

    async fetchConversations(user, queryParam) {
        const { role, _id: userId } = user;
        const isAdmin = role === 'admin' || role === 'superadmin';

        if (isAdmin) {
            const { search, status } = queryParam;
            let query = {};

            if (status) {
                query.status = status;
            }

            const { data: rawConversations, source } = await this.conversationService.getAll(query, 300, `admin-convs-${JSON.stringify(query)}`);
            let conversations = await Conversation.populate(rawConversations, {
                path: 'userId',
                select: 'firstName lastName email profileImage phone isBlocked'
            });

            conversations.sort((a, b) => new Date(b.lastMessageAt) - new Date(a.lastMessageAt));

            if (search) {
                const searchRegex = new RegExp(search, 'i');
                conversations = conversations.filter(conv => {
                    if (!conv.userId) return false;
                    const fullName = `${conv.userId.firstName} ${conv.userId.lastName}`.toLowerCase();
                    const email = conv.userId.email.toLowerCase();
                    const phone = (conv.userId.phone || '').toLowerCase();
                    return searchRegex.test(fullName) || searchRegex.test(email) || searchRegex.test(phone) || searchRegex.test(conv.lastMessage);
                });
            }

            return {
                success: true,
                source,
                count: conversations.length,
                conversations
            };
        } else {
            const { data: convs } = await this.conversationService.getAll({ userId }, 300, `user-conv-${userId}`);
            let conversation = convs && convs.length > 0 ? convs[0] : null;

            if (!conversation) {
                conversation = await this.conversationService.create({
                    userId,
                    lastMessage: 'Conversation started',
                    lastMessageAt: new Date(),
                    unreadCount: 0,
                    status: 'active'
                });
            }

            const populated = await Conversation.findById(conversation._id)
                .populate('userId', 'firstName lastName email profileImage phone');

            return {
                success: true,
                source: 'database',
                conversation: populated
            };
        }
    }

    async fetchMessages(conversationIdParam, user) {
        let conversationId = conversationIdParam;
        const { role, _id: userId } = user;
        const isAdmin = role === 'admin' || role === 'superadmin';

        let conversation;
        if (conversationId === 'me' || !mongoose.isValidObjectId(conversationId)) {
            const { data: convs } = await this.conversationService.getAll({ userId: isAdmin ? userId : userId }, 300, `user-conv-${userId}`);
            conversation = convs && convs.length > 0 ? convs[0] : null;
            if (!conversation) {
                conversation = await this.conversationService.create({
                    userId: isAdmin ? userId : userId,
                    lastMessage: 'Conversation started',
                    lastMessageAt: new Date(),
                    unreadCount: 0,
                    status: 'active'
                });
            }
        } else {
            const { data: conv } = await this.conversationService.getById(conversationId, 300);
            conversation = conv;
        }

        if (!conversation) {
            throw new AppError('Conversation not found', 404);
        }

        if (!isAdmin && conversation.userId.toString() !== userId.toString()) {
            throw new AppError('Not authorized to access this conversation', 403);
        }

        const { data: messages, source } = await this.messageService.getAll({ conversationId: conversation._id }, 300, `messages-${conversation._id}`);
        const populatedMessages = await Message.populate(messages, {
            path: 'senderId',
            select: 'firstName lastName profileImage role'
        });

        populatedMessages.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

        const formattedMessages = populatedMessages.map(msg => {
            const msgObj = msg.toObject ? msg.toObject() : msg;
            if (msgObj.deletedAt) {
                msgObj.text = 'This message was deleted';
            }
            return msgObj;
        });

        return {
            success: true,
            source,
            conversationId: conversation._id,
            count: formattedMessages.length,
            messages: formattedMessages
        };
    }

    async sendNewMessage(conversationIdParam, textBody, user) {
        let conversationId = conversationIdParam;
        const text = textBody;
        const { role, _id: userId } = user;
        const isAdmin = role === 'admin' || role === 'superadmin';

        let conversation;
        if (conversationId === 'me' || !mongoose.isValidObjectId(conversationId)) {
            const { data: convs } = await this.conversationService.getAll({ userId }, 300, `user-conv-${userId}`);
            conversation = convs && convs.length > 0 ? convs[0] : null;
            if (!conversation) {
                conversation = await this.conversationService.create({
                    userId,
                    lastMessage: text.trim(),
                    lastMessageAt: new Date(),
                    unreadCount: 1,
                    status: 'active'
                });
            }
        } else {
            const { data: conv } = await this.conversationService.getById(conversationId, 300);
            conversation = conv;
        }

        if (!conversation) {
            conversation = await this.conversationService.create({
                userId: isAdmin ? userId : userId,
                lastMessage: text.trim(),
                lastMessageAt: new Date(),
                unreadCount: 1,
                status: 'active'
            });
        }

        if (!isAdmin && conversation.userId.toString() !== userId.toString()) {
            throw new AppError('Not authorized', 403);
        }

        const message = await this.messageService.create({
            conversationId: conversation._id,
            senderId: userId,
            senderRole: role,
            text: text.trim(),
            isRead: false
        });

        const updateData = {
            lastMessage: text.trim(),
            lastMessageAt: new Date()
        };
        if (isAdmin) {
            updateData.adminId = userId;
        } else {
            updateData.unreadCount = (conversation.unreadCount || 0) + 1;
        }

        await this.conversationService.update(conversation._id, updateData);

        const populatedMessage = await Message.findById(message._id)
            .populate('senderId', 'firstName lastName profileImage role');

        return {
            success: true,
            conversationId: conversation._id,
            message: populatedMessage
        };
    }

    async markMessageAsRead(messageId, user) {
        const { role, _id: userId } = user;
        const isAdmin = role === 'admin' || role === 'superadmin';

        const { data: message } = await this.messageService.getById(messageId, 300);
        if (!message) {
            throw new AppError('Message not found', 404);
        }

        const { data: conversation } = await this.conversationService.getById(message.conversationId, 300);
        if (!conversation) {
            throw new AppError('Conversation not found', 404);
        }

        if (!isAdmin && conversation.userId.toString() !== userId.toString()) {
            throw new AppError('Not authorized', 403);
        }

        await this.messageService.update(messageId, { isRead: true });

        if (conversation.unreadCount > 0) {
            const newUnread = Math.max(0, conversation.unreadCount - 1);
            await this.conversationService.update(conversation._id, { unreadCount: newUnread });
        }

        return {
            success: true,
            message: 'Message marked as read'
        };
    }

    async markConversationAsRead(conversationId, user) {
        const { role, _id: userId } = user;
        const isAdmin = role === 'admin' || role === 'superadmin';

        const { data: conversation } = await this.conversationService.getById(conversationId, 300);
        if (!conversation) {
            throw new AppError('Conversation not found', 404);
        }

        if (!isAdmin && conversation.userId.toString() !== userId.toString()) {
            throw new AppError('Not authorized', 403);
        }

        await this.messageService.updateMany({ conversationId: conversation._id, isRead: false }, { isRead: true });
        await this.conversationService.update(conversation._id, { unreadCount: 0 });

        return {
            success: true,
            message: 'Conversation marked as read'
        };
    }

    async deleteSpecificMessage(messageId, user) {
        const { role, _id: userId } = user;
        const isAdmin = role === 'admin' || role === 'superadmin';

        const { data: message } = await this.messageService.getById(messageId, 300);
        if (!message) {
            throw new AppError('Message not found', 404);
        }

        if (!isAdmin && message.senderId.toString() !== userId.toString()) {
            throw new AppError('Not authorized to delete this message', 403);
        }

        await this.messageService.update(messageId, { deletedAt: new Date(), text: 'This message was deleted' });

        return {
            success: true,
            message: 'Message deleted successfully'
        };
    }

    async updateConvStatus(conversationId, status, user) {
        const { role } = user;
        const isAdmin = role === 'admin' || role === 'superadmin';

        if (!isAdmin) {
            throw new AppError('Not authorized', 403);
        }

        const { data: conversation } = await this.conversationService.getById(conversationId, 300);
        if (!conversation) {
            throw new AppError('Conversation not found', 404);
        }

        const updated = await this.conversationService.update(conversationId, { status });

        return {
            success: true,
            message: 'Conversation status updated successfully',
            conversation: updated
        };
    }
}

module.exports = new ChatBusinessService();
