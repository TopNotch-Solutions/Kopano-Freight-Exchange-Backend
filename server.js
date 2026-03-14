const express = require("express");
const bodyParser = require("body-parser");
const sequelize = require("./src/config/database");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const http = require("http");
const { Op } = require("sequelize");
require("dotenv").config();
const { Server } = require("socket.io");

const MessageModel = require("./src/common/models/message");
const CarrierModel = require("./src/common/models/carrier");
const ShipperModel = require("./src/common/models/shipper");
const LoadModel = require("./src/shipper/models/load");
const LoadAssignmentModel = require("./src/carrier/models/loadAssignment");

const CHANNEL_OPEN_DAYS_AFTER_DELIVERY = 7;

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: ["http://localhost:3000"],
    methods: ["GET", "POST", "DELETE", "PUT", "PATCH"],
  },
});
app.set("io", io);

/** @type {Map<string, Set<string>>} roomName -> set of socketIds */
const onlineUsers = new Map();

function getRoomName(role, userId) {
  return `${role}_${userId}`;
}

async function getSenderProfile(senderId, senderRole) {
  if (senderRole === "carrier") {
    const c = await CarrierModel.findByPk(senderId, { attributes: ["profileImage", "fullName"] });
    return c ? { senderProfileImage: c.profileImage, senderFullName: c.fullName } : { senderProfileImage: null, senderFullName: null };
  }
  const s = await ShipperModel.findByPk(senderId, { attributes: ["companyLogo", "businessName"] });
  return s ? { senderProfileImage: s.companyLogo, senderFullName: s.businessName } : { senderProfileImage: null, senderFullName: null };
}

/** Returns true if the conversation channel is still open (not delivered, or delivered within CHANNEL_OPEN_DAYS_AFTER_DELIVERY). */
async function isChannelOpen(conversationId) {
  const load = await LoadModel.findByPk(Number(conversationId), { attributes: ["id", "status", "deliveredAt"] });
  if (!load) return true;
  if (load.status !== "delivered") return true;
  if (!load.deliveredAt) return false;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - CHANNEL_OPEN_DAYS_AFTER_DELIVERY);
  return new Date(load.deliveredAt) >= cutoff;
}

/** Get list of { conversationId, otherRoomName } for conversations this user participates in (for presence broadcasts). */
async function getConversationPeers(userId, role) {
  const result = [];
  if (role === "carrier") {
    const assignments = await LoadAssignmentModel.findAll({
      where: { carrierId: userId },
      attributes: ["loadId"],
    });
    for (const a of assignments) {
      const load = await LoadModel.findByPk(a.loadId, { attributes: ["shipperId"] });
      if (load) result.push({ conversationId: a.loadId, otherRoomName: getRoomName("shipper", load.shipperId) });
    }
  } else {
    const loads = await LoadModel.findAll({
      where: { shipperId: userId },
      attributes: ["id"],
    });
    for (const load of loads) {
      const a = await LoadAssignmentModel.findOne({ where: { loadId: load.id }, attributes: ["carrierId"] });
      if (a) result.push({ conversationId: load.id, otherRoomName: getRoomName("carrier", a.carrierId) });
    }
  }
  return result;
}

app.use(express.json({ limit: "100mb" }));
app.use(express.urlencoded({ limit: "100mb", extended: true }));
app.use(cookieParser());
app.use(express.static("uploads"));
app.use(
  cors({
    origin: ["http://localhost:3000"],
    methods: ["GET", "POST", "DELETE", "PUT", "PATCH"],
    credentials: true,
    exposedHeaders: ["Authorization", "x-access-token", "data-access-token"],
  })
);

const notificationRoute = require("./src/common/routes/notificationRoute");
const authRoute = require("./src/common/routes/authRoute");
const loadRoute = require("./src/shipper/routes/loadRoute");
const loadAssignmentRoute = require("./src/carrier/routes/loadRoute");

io.on("connection", (socket) => {
  console.log("Socket connected:", socket.id);

  socket.on("user-online", async (payload) => {
    const { userId, role } = payload || {};
    if (!userId || !role || !["carrier", "shipper"].includes(role)) {
      return;
    }
    const roomName = getRoomName(role, userId);
    console.log("User online:", userId, role, roomName);
    socket.join(roomName);
    if (!onlineUsers.has(roomName)) onlineUsers.set(roomName, new Set());
    onlineUsers.get(roomName).add(socket.id);
    socket.data.roomName = roomName;
    socket.data.userId = userId;
    socket.data.role = role;
    try {
      const peers = await getConversationPeers(userId, role);
      for (const { conversationId, otherRoomName } of peers) {
        io.to(otherRoomName).emit("conversation-user-online", { conversationId, userId, role });
      }
    } catch (err) {
      console.error("user-online notify peers error:", err);
    }
  });

  socket.on("send-message", async (payload) => {
    const { senderId, senderRole, receiverId, receiverRole, message, conversationId } = payload || {};
    if (!senderId || !senderRole || !receiverId || !receiverRole || message == null || !conversationId) {
      return;
    }
    console.log("Here is the senderId", senderId);
    console.log("Here is the senderRole", senderRole);
    console.log("Here is the receiverId", receiverId);
    console.log("Here is the receiverRole", receiverRole);
    console.log("Here is the message", message);
    console.log("Here is the conversationId", conversationId);
    try {
      const open = await isChannelOpen(conversationId);
      if (!open) {
        socket.emit("channel-closed", { conversationId: Number(conversationId) });
        return;
      }
      const row = await MessageModel.create({
        senderId,
        senderRole,
        receiverId,
        receiverRole,
        message: String(message),
        isRead: false,
        conversationId: Number(conversationId),
      });
      const senderProfile = await getSenderProfile(row.senderId, row.senderRole);
      const data = {
        id: row.id,
        conversationId: row.conversationId,
        senderId: row.senderId,
        senderRole: row.senderRole,
        receiverId: row.receiverId,
        receiverRole: row.receiverRole,
        message: row.message,
        createdAt: row.createdAt,
        ...senderProfile,
      };
      const receiverRoom = getRoomName(receiverRole, receiverId);
      const senderRoom = getRoomName(senderRole, senderId);
      io.to(receiverRoom).emit("receive-message", data);
      io.to(senderRoom).emit("receive-message", data);
      io.to(receiverRoom).emit("chat-list-update");
      io.to(senderRoom).emit("chat-list-update");
    } catch (err) {
      console.error("send-message error:", err);
    }
  });

  const EDIT_WINDOW_MS = 10 * 60 * 1000; // 10 minutes

  socket.on("edit-message", async (payload) => {
    const { messageId, senderId, senderRole, newMessage } = payload || {};
    if (!messageId || !senderId || !senderRole || newMessage == null) {
      socket.emit("edit-message-error", { code: "INVALID_PAYLOAD" });
      return;
    }
    try {
      const row = await MessageModel.findByPk(messageId);
      if (!row) {
        socket.emit("edit-message-error", { code: "MESSAGE_NOT_FOUND" });
        return;
      }
      if (row.senderId !== senderId || row.senderRole !== senderRole) {
        socket.emit("edit-message-error", { code: "NOT_SENDER" });
        return;
      }
      const ageMs = Date.now() - new Date(row.createdAt).getTime();
      if (ageMs > EDIT_WINDOW_MS) {
        socket.emit("edit-message-error", { code: "EDIT_WINDOW_EXPIRED" });
        return;
      }
      await row.update({ message: String(newMessage) });
      const senderProfile = await getSenderProfile(row.senderId, row.senderRole);
      const data = {
        id: row.id,
        conversationId: row.conversationId,
        senderId: row.senderId,
        senderRole: row.senderRole,
        receiverId: row.receiverId,
        receiverRole: row.receiverRole,
        message: row.message,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        ...senderProfile,
      };
      const receiverRoom = getRoomName(row.receiverRole, row.receiverId);
      const senderRoom = getRoomName(row.senderRole, row.senderId);
      io.to(receiverRoom).emit("message-edited", data);
      io.to(senderRoom).emit("message-edited", data);
      io.to(receiverRoom).emit("chat-list-update");
      io.to(senderRoom).emit("chat-list-update");
    } catch (err) {
      console.error("edit-message error:", err);
      socket.emit("edit-message-error", { code: "SERVER_ERROR" });
    }
  });

  socket.on("get-messages", async (payload) => {
    const { userId, role, conversationId } = payload || {};
    if (!userId || !role || !conversationId) {
      return;
    }
    console.log("Here is the conversationId", conversationId);
    console.log("Here is the userId", userId);
    console.log("Here is the role", role);
    try {
      const open = await isChannelOpen(conversationId);
      if (!open) {
        socket.emit("channel-closed", { conversationId: Number(conversationId) });
      }
      const messages = await MessageModel.findAll({
        where: { conversationId: Number(conversationId) },
        order: [["createdAt", "ASC"]],
        limit: 100,
        attributes: ["id", "conversationId", "senderId", "senderRole", "receiverId", "receiverRole", "message", "createdAt"],
      });
      const carrierSenderIds = [...new Set(messages.filter((m) => m.senderRole === "carrier").map((m) => m.senderId))];
      const shipperSenderIds = [...new Set(messages.filter((m) => m.senderRole === "shipper").map((m) => m.senderId))];
      const carriers = carrierSenderIds.length
        ? await CarrierModel.findAll({
            where: { id: carrierSenderIds },
            attributes: ["id", "profileImage", "fullName"],
          })
        : [];
      const shippers = shipperSenderIds.length
        ? await ShipperModel.findAll({
            where: { id: shipperSenderIds },
            attributes: ["id", "companyLogo", "businessName"],
          })
        : [];
      const carrierMap = new Map(carriers.map((c) => [c.id, { profileImage: c.profileImage, fullName: c.fullName }]));
      const shipperMap = new Map(
        shippers.map((s) => [s.id, { profileImage: s.companyLogo, fullName: s.businessName }])
      );
      const history = messages.map((m) => {
        const senderInfo =
          m.senderRole === "carrier"
            ? carrierMap.get(m.senderId)
            : shipperMap.get(m.senderId);
        return {
          id: m.id,
          conversationId: m.conversationId,
          senderId: m.senderId,
          senderRole: m.senderRole,
          receiverId: m.receiverId,
          receiverRole: m.receiverRole,
          message: m.message,
          createdAt: m.createdAt,
          senderProfileImage: senderInfo?.profileImage ?? null,
          senderFullName: senderInfo?.fullName ?? null,
        };
      });
      console.log("Here is the history", history);
      socket.emit("conversation-history", history);
    } catch (err) {
      console.error("get-messages error:", err);
    }
  });

  socket.on("get-chats", async (payload) => {
    const { userId, role } = payload || {};
    if (!userId || !role) {
      return;
    }
    try {
      const messages = await MessageModel.findAll({
        where: {
          [Op.or]: [{ senderId: userId }, { receiverId: userId }],
          conversationId: { [Op.ne]: null },
        },
        order: [["createdAt", "ASC"]],
        limit: 500,
      });
      const conversationMap = new Map();
      for (const m of messages) {
        const cid = m.conversationId;
        if (!conversationMap.has(cid)) {
          conversationMap.set(cid, {
            conversationId: cid,
            otherUserId: role === "carrier" ? m.receiverId : m.senderId,
            otherRole: role === "carrier" ? "shipper" : "carrier",
            lastMessage: m.message,
            lastMessageTime: m.createdAt,
          });
        } else {
          const entry = conversationMap.get(cid);
          entry.lastMessage = m.message;
          entry.lastMessageTime = m.createdAt;
        }
      }
      const unreadCounts = await MessageModel.findAll({
        where: { receiverId: userId, isRead: false, conversationId: { [Op.ne]: null } },
        attributes: ["conversationId", [sequelize.fn("COUNT", sequelize.col("id")), "count"]],
        group: ["conversationId"],
        raw: true,
      });
      const unreadMap = new Map(unreadCounts.map((u) => [u.conversationId, Number(u.count)]));

      const cids = [...conversationMap.keys()];
      const loads = cids.length ? await LoadModel.findAll({
        where: { id: cids },
        attributes: ["id", "status", "deliveredAt"],
      }) : [];
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - CHANNEL_OPEN_DAYS_AFTER_DELIVERY);
      const openConversationIds = new Set(
        loads
          .filter((l) => l.status !== "delivered" || (l.deliveredAt && new Date(l.deliveredAt) >= cutoff))
          .map((l) => l.id)
      );
      for (const cid of cids) {
        if (!openConversationIds.has(cid)) conversationMap.delete(cid);
      }

      const chatList = [];
      for (const [, conv] of conversationMap) {
        const otherUserId = conv.otherUserId;
        let otherUserName = null;
        let otherUserImage = null;
        if (role === "carrier") {
          const shipper = await ShipperModel.findByPk(otherUserId, {
            attributes: ["businessName", "companyLogo"],
          });
          if (shipper) {
            otherUserName = shipper.businessName;
            otherUserImage = shipper.companyLogo;
          }
        } else {
          const carrier = await CarrierModel.findByPk(otherUserId, {
            attributes: ["fullName", "profileImage"],
          });
          if (carrier) {
            otherUserName = carrier.fullName;
            otherUserImage = carrier.profileImage;
          }
        }
        const unreadCount = unreadMap.get(conv.conversationId) || 0;
        chatList.push({
          conversationId: conv.conversationId,
          otherUserId: conv.otherUserId,
          otherRole: conv.otherRole,
          otherUserName,
          otherUserImage,
          lastMessage: conv.lastMessage,
          lastMessageTime: conv.lastMessageTime,
          unreadCount,
        });
      }
      chatList.sort((a, b) => new Date(b.lastMessageTime) - new Date(a.lastMessageTime));
      socket.emit("chat-list", chatList);
    } catch (err) {
      console.error("get-chats error:", err);
    }
  });

  socket.on("mark-read", async (payload) => {
    const { userId, role, conversationId } = payload || {};
    if (!userId || !conversationId) {
      return;
    }
    try {
      await MessageModel.update(
        { isRead: true },
        {
          where: {
            receiverId: userId,
            conversationId: Number(conversationId),
          },
        }
      );
      const receiverRoom = getRoomName(role, userId);
      io.to(receiverRoom).emit("chat-list-update");
    } catch (err) {
      console.error("mark-read error:", err);
    }
  });

  socket.on("get-conversation-online-users", async (payload) => {
    const { conversationId } = payload || {};
    if (!conversationId) {
      return;
    }
    try {
      const load = await LoadModel.findByPk(Number(conversationId), { attributes: ["id", "shipperId"] });
      const assignment = await LoadAssignmentModel.findOne({
        where: { loadId: Number(conversationId) },
        attributes: ["carrierId"],
      });
      const onlineList = [];
      if (load && assignment) {
        const carrierRoom = getRoomName("carrier", assignment.carrierId);
        const shipperRoom = getRoomName("shipper", load.shipperId);
        if (onlineUsers.has(carrierRoom)) {
          onlineList.push({ userId: assignment.carrierId, role: "carrier" });
        }
        if (onlineUsers.has(shipperRoom)) {
          onlineList.push({ userId: load.shipperId, role: "shipper" });
        }
      }
      socket.emit("conversation-online-users", { conversationId: Number(conversationId), onlineUsers: onlineList });
    } catch (err) {
      console.error("get-conversation-online-users error:", err);
    }
  });

  socket.on("get-unread-total", async (payload) => {
    const { userId } = payload || {};
    if (!userId) {
      return;
    }
    try {
      const total = await MessageModel.count({
        where: { receiverId: userId, isRead: false },
      });
      socket.emit("unread-total", { total });
    } catch (err) {
      console.error("get-unread-total error:", err);
    }
  });

  socket.on("typing", (payload) => {
    const { senderId, receiverId } = payload || {};
    if (!senderId || !receiverId) return;
    socket.to(`carrier_${receiverId}`).to(`shipper_${receiverId}`).emit("typing", { senderId, receiverId });
  });

  socket.on("stop-typing", (payload) => {
    const { senderId, receiverId } = payload || {};
    if (!senderId || !receiverId) return;
    socket.to(`carrier_${receiverId}`).to(`shipper_${receiverId}`).emit("stop-typing", { senderId, receiverId });
  });

  socket.on("disconnect", async () => {
    const roomName = socket.data.roomName;
    const userId = socket.data.userId;
    const role = socket.data.role;
    if (roomName) {
      socket.leave(roomName);
      if (onlineUsers.has(roomName)) {
        const set = onlineUsers.get(roomName);
        set.delete(socket.id);
        if (set.size === 0) onlineUsers.delete(roomName);
      }
    }
    if (userId && role) {
      try {
        const peers = await getConversationPeers(userId, role);
        for (const { conversationId, otherRoomName } of peers) {
          io.to(otherRoomName).emit("conversation-user-offline", { conversationId, userId, role });
        }
      } catch (err) {
        console.error("disconnect notify peers error:", err);
      }
    }
    console.log("Socket disconnected:", socket.id, userId ? `(userId: ${userId}, role: ${role})` : "");
  });
});

app.use("/api/notifications", notificationRoute);
app.use("/api/auth", authRoute);
app.use("/api/load-assignments", loadAssignmentRoute);

app.use("/api/loads", loadRoute);

sequelize
  .sync()
  .then(() => {
    console.log("Database connected");
    const PORT = process.env.PORT;
    server.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error("Error synchronizing database:", error);
  });