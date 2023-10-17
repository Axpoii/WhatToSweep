import express from "express";
import { Server } from "socket.io";
import { createServer } from "http";
import GameRoom from "./setting/room.js";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/hello", (req, res) => {
  return res.json({ text: "hello world" });
});

/**
 * websocket
 */
const httpServer = createServer(app);
const io = new Server(httpServer, {
  transports: ["websocket"],
  path: "/socket/",
});

const Rooms = [];

io.on("connection", (socket) => {
  console.log(`join user ${socket.id}`);
  socket.on("hello", (data) => {
    console.log(socket.rooms);
  });

  // 创建房间
  socket.on("createRoom", (data, callback) => {
    const room = new GameRoom({
      mode: data.mode,
      roomId: data.roomId,
      config: {
        width: data.width,
        height: data.height,
        mineCount: data.mineCount,
        host: data.host,
        player: data.player,
      },
    });
    Rooms.push(room);
    io.emit("roomChange", { room: Rooms.map((item) => item.id) });
    callback("success");
  });

  // 加入房间
  socket.on("joinRoom", (data, callback) => {
    /**
     * TOOD:
     * 1. 需要判断当前房间是否存在，不存在则告知错误
     */
    console.log("join room", data);
    const { roomId } = data;
    const roomIndex = Rooms.findIndex((room) => {
      return room.id === roomId;
    });
    if (roomIndex >= 0) {
      socket.join(roomId);
      const userConfig = Rooms[roomIndex].joinRoom({ id: socket.id });
      callback({
        status: "ok",
        data: userConfig,
      });
    } else {
      callback({
        status: "error",
        data: "当前房间不存在或已解散",
      });
    }
  });

  // 随机练习
  socket.on("participate", ({ role }) => {
    const roomId = Array.from(socket.rooms)[1];
    const room = Rooms.find((item) => item.id === roomId);
    if (!room) return;
    room.initParticipateGame(role);
    io.to(roomId).emit("mapChange", { role, data: room.gameConfig[role] });
  });

  // 标记
  socket.on("sign", ({ role, mine }) => {
    const roomId = Array.from(socket.rooms)[1];
    const room = Rooms.find((item) => item.id === roomId);
    if (!room) return;
    room.signMine({ role, mine });
    // 判断是否结束
    io.to(roomId).emit("mapChange", { role, data: room.gameConfig[role] });
    const isFinish = room.checkIfFinish({ role });
    if (isFinish) io.to(roomId).emit("finish", { role });
  });

  // 去除标记
  socket.on("removeSign", ({ role, mine }) => {
    const roomId = Array.from(socket.rooms)[1];
    const room = Rooms.find((item) => item.id === roomId);
    if (!room) return;
    room.removeMineSign({ role, mine });
    io.to(roomId).emit("mapChange", { role, data: room.gameConfig[role] });
  });

  // 单个扫
  socket.on("sweep", ({ role, mine }) => {
    const roomId = Array.from(socket.rooms)[1];
    const room = Rooms.find((item) => item.id === roomId);
    if (!room) return;
    const { isOver } = room.sweepMine({ role, mine });
    if (isOver) {
      // room.showAll({ role });
      io.to(roomId).emit("mapChange", { role, data: room.gameConfig[role] });
      io.to(roomId).emit("gameOver", { role, mine });
    } else {
      io.to(roomId).emit("mapChange", { role, data: room.gameConfig[role] });
      // 判断是否结束
      const isFinish = room.checkIfFinish({ role });
      if (isFinish) io.to(roomId).emit("finish", { role });
    }
  });

  // 周边扫
  socket.on("sweepAround", ({ role, mine }) => {
    const roomId = Array.from(socket.rooms)[1];
    const room = Rooms.find((item) => item.id === roomId);
    if (!room) return;
    const { type, data, around = null } = room.sweepAroundMine({ role, mine });
    if (type === "boom") {
      // room.showAll({ role });
      io.to(roomId).emit("mapChange", { role, data: room.gameConfig[role] });
      io.to(roomId).emit("gameOver", { role, triggerMines: data, around });
      return;
    }
    if (type === "flash") return io.to(roomId).emit("flash", { role, data });
    if (type === "sweep") {
      io.to(roomId).emit("mapChange", { role, data: room.gameConfig[role] });
      // 判断是否结束
      const isFinish = room.checkIfFinish({ role });
      if (isFinish) io.to(roomId).emit("finish", { role });
    }
  });

  // 离开房间
  socket.on("leaveRoom", () => {
    const roomId = Array.from(socket.rooms)[1];
    const room = Rooms.find((item) => item.id === roomId);
    if (room) {
      socket.leave(roomId);
      const { isHost } = room.leaveUser(socket.id);
      if (isHost) {
        const roomIndex = Rooms.findIndex((item) => item.id === roomId);
        Rooms.splice(roomIndex, 1);
        io.to(roomId).emit("roomDestroy");
        io.socketsLeave(roomId);
        io.emit("roomChange", { room: Rooms.map((item) => item.id) });
      } else {
        io.to(roomId).emit("userLeave", "一位玩家离开了房间");
      }
    }
  });

  socket.on("prepare", ({ role }) => {
    const roomId = Array.from(socket.rooms)[1];
    const room = Rooms.find((item) => item.id === roomId);
    if (room) {
      const { isAllPrepare } = room.prepareGame({ role });
      if (isAllPrepare) {
        room.startGame();
        io.to(roomId).emit("startGame", { data: room.gameConfig });
      } else {
        io.to(roomId).emit("prepareGame", {
          role,
          data: room.gameConfig[role],
        });
      }
    }
  });

  socket.on("getRoom", (data, callback) => {
    const rooms = Rooms.map((item) => item.id);
    callback({ room: rooms });
  });

  // 断开
  socket.on("disconnecting", (res) => {
    if (socket.rooms.size) {
      const roomId = Array.from(socket.rooms)[1];
      const room = Rooms.find((item) => item.id === roomId);
      if (room && room.players[0] === socket.id) {
        const roomIndex = Rooms.findIndex((item) => item.id === roomId);
        Rooms.splice(roomIndex, 1);
        io.to(roomId).emit("roomDestroy");
        io.socketsLeave(roomId);
        io.emit("roomChange", { room: Rooms.map((item) => item.id) });
      }
    }
  });

  socket.on("disconnect", () => {
    socket.disconnect(true);
  });
});

/**
 * TODO:
 * 1. 关于房间解散逻辑
 *    - io.in("room1").socketsLeave(["room1"])
 *    - 将在房间 room1 中的用户全部移除room1 当房间为空时，会自动清除
 * 2. 在房间解散前，先广播当前房间的用户 socket.to("room1").emit("destroyRoom") '房间已解散' 再执行socketsLeave逻辑
 */

httpServer.listen(3001, () => {
  console.log("Node.js 服务已启动");
});
