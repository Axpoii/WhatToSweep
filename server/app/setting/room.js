export default class Room {
  id;
  gameMode = "random";
  players = [];
  visitor = [];
  mapConfig = {
    width: null,
    height: null,
    mineCount: null,
    host: null, // 房主地图
    player: null, // 玩家地图
  };
  gameConfig = {
    host: {
      status: "default",
      mapData: [],
      mineCount: 0,
      signCount: 0,
      // 格子数
      gridCount: 0,
    },
    player: {
      status: "default",
      mapData: [],
      mineCount: 0,
      signCount: 0,
      // 格子数
      gridCount: 0,
    },
  };
  constructor({ roomId, config, mode }) {
    this.gameMode = mode;
    this.id = roomId;
    this.mapConfig = config;
  }
  joinRoom({ id }) {
    if (this.players.length >= 2) {
      this.visitor.push(id);
      return {
        role: "visitor",
        isHost: false,
      };
    }
    this.players.push(id);
    return {
      role: "player",
      isHost: this.players.length < 2,
    };
  }
  // 构造地图
  generateMap() {
    /**
     * TODO:
     * 1. 读取附加配置，赋值给每个item
     */
    const { width, height, mineCount } = this.mapConfig;
    let arr = new Array(height).fill(1).map((item1, y) =>
      new Array(width).fill(1).map((item2, x) => ({
        isShow: false,
        isMine: false,
        isSign: false,
        count: 0,
        x,
        y,
        // ...extraConfig
      }))
    );
    // 装填
    for (let i = 1; i <= mineCount; i++) {
      while (true) {
        const x = parseInt(Math.random() * width);
        const y = parseInt(Math.random() * height);
        if (!arr[y][x].isMine) {
          arr[y][x].isMine = true;
          break;
        }
      }
    }

    // 计算九宫格数量
    arr.forEach((item, y) => {
      item.forEach((item2, x) => {
        const computedIndex = this.getAroundGridIndex(x, y, width, height);
        let count = 0;
        computedIndex.forEach((grid) => {
          arr[grid[0]][grid[1]].isMine && count++;
        });
        item2.count = count;
      });
    });

    return arr;
  }
  // 获取节点对应九宫格坐标
  getAroundGridIndex(x, y, xMax, yMax) {
    return [
      [y - 1, x - 1],
      [y, x - 1],
      [y + 1, x - 1],
      [y - 1, x],
      [y + 1, x],
      [y - 1, x + 1],
      [y, x + 1],
      [y + 1, x + 1],
    ].filter((item) => {
      return item[0] >= 0 && item[0] < yMax && item[1] >= 0 && item[1] < xMax;
    });
  }
  // 获取节点上下左右相邻坐标
  getAlongGridIndex(x, y, xMax, yMax) {
    return [
      [y, x - 1],
      [y - 1, x],
      [y + 1, x],
      [y, x + 1],
    ].filter((item) => {
      return item[0] >= 0 && item[0] < yMax && item[1] >= 0 && item[1] < xMax;
    });
  }
  // 标记
  signMine({ role, mine }) {
    const { x, y } = mine;
    const targetMine = this.gameConfig[role].mapData[y][x];
    targetMine.isSign = true;
    this.gameConfig[role].signCount++;
  }
  // 去除标记
  removeMineSign({ role, mine }) {
    const { x, y } = mine;
    const targetMine = this.gameConfig[role].mapData[y][x];
    targetMine.isSign = false;
    this.gameConfig[role].signCount--;
  }
  // 单扫
  sweepMine({ role, mine }) {
    const { x, y } = mine;
    const targetMine = this.gameConfig[role].mapData[y][x];
    if (targetMine.isMine) {
      return { isOver: true };
    } else {
      targetMine.isShow = true;
      this.sweepAlong({ role, x, y });
      return { isOver: false };
    }
  }
  sweepAroundMine({ role, mine }) {
    const mapData = this.gameConfig[role].mapData;
    const { x, y } = mine;
    const [width, height] = [mapData[0].length, mapData.length];
    const aroundGrid = this.getAroundGridIndex(x, y, width, height).map(
      (item) => mapData[item[0]][item[1]]
    );
    const signCount = aroundGrid.filter((item) => item.isSign).length;
    const mineCount = aroundGrid.filter((item) => item.isMine).length;
    if (signCount < mineCount) {
      return {
        type: "flash",
        data: aroundGrid.filter((item) => !item.isSign),
      };
    }
    if (signCount > mineCount) {
      return {
        type: "boom",
        data: aroundGrid.filter((item) => item.isSign),
        around: aroundGrid,
      };
    }
    const signCorrectCount = aroundGrid.filter(
      (item) => item.isMine && item.isSign
    ).length;
    if (signCorrectCount === mineCount) {
      aroundGrid.forEach((item) => {
        if (!item.isMine) {
          item.isShow = true;
          const { x: ix, y: iy } = item;
          this.sweepAlong({ role, x: ix, y: iy });
        }
      });
      return {
        type: "sweep",
        data: this.gameConfig[role].mapData,
      };
    } else {
      return {
        type: "boom",
        data: aroundGrid.filter((item) => item.isSign),
        around: aroundGrid,
      };
    }
  }

  sweepAlong1({ role, x, y, isFirst = true }) {
    const [width, height] = [
      this.gameConfig[role].mapData[0].length,
      this.gameConfig[role].mapData.length,
    ];
    const originalMine = this.gameConfig[role].mapData[y][x];
    // 判断是否是空节点，若空则遍历九宫格，否则只遍历上下左右
    const isEmpty = originalMine.count === 0;
    const checkIndex = isEmpty
      ? this.getAroundGridIndex(x, y, width, height)
      : this.getAlongGridIndex(x, y, width, height);
    checkIndex.forEach((item) => {
      const [iy, ix] = item;
      const targetMine = this.gameConfig[role].mapData[iy][ix];
      if (
        !targetMine.isMine &&
        targetMine.count === 0 &&
        !targetMine.isShow &&
        !targetMine.isSign
      ) {
        targetMine.isShow = true;
        this.sweepAlong({ role, x: ix, y: iy, isFirst: false });
      }
      if (
        !targetMine.isMine &&
        targetMine.count > 0 &&
        !targetMine.isShow &&
        !targetMine.isSign &&
        !isFirst
      ) {
        targetMine.isShow = true;
      }
      if (
        isFirst &&
        originalMine.count === 0 &&
        !targetMine.isMine &&
        !targetMine.isShow &&
        !targetMine.isSign
      ) {
        targetMine.isShow = true;
      }
    });
  }

  sweepAlong({ role, x, y }) {
    const [width, height] = [
      this.gameConfig[role].mapData[0].length,
      this.gameConfig[role].mapData.length,
    ];
    const originalMine = this.gameConfig[role].mapData[y][x];
    const isEmpty = originalMine.count === 0;
    const firstCheckIndex = isEmpty
      ? this.getAroundGridIndex(x, y, width, height)
      : this.getAlongGridIndex(x, y, width, height);
    const mineQUeue = [];

    firstCheckIndex.forEach((item) => {
      const [iy, ix] = item;
      const targetMine = this.gameConfig[role].mapData[iy][ix];
      if (
        !targetMine.isMine &&
        targetMine.count === 0 &&
        !targetMine.isShow &&
        !targetMine.isSign
      ) {
        targetMine.isShow = true;
        mineQUeue.push([ix, iy]);
      }
      if (
        originalMine.count === 0 &&
        !targetMine.isMine &&
        !targetMine.isShow &&
        !targetMine.isSign
      ) {
        targetMine.isShow = true;
      }
    });

    while (mineQUeue.length) {
      const [ix, iy] = mineQUeue.shift();
      const oMine = this.gameConfig[role].mapData[iy][ix];
      const isEmpty = oMine.count === 0;
      const oCheckIndex = isEmpty
        ? this.getAroundGridIndex(ix, iy, width, height)
        : this.getAlongGridIndex(ix, iy, width, height);
      oCheckIndex.forEach((item) => {
        const [ny, nx] = item;
        const targetMine = this.gameConfig[role].mapData[ny][nx];
        if (
          !targetMine.isMine &&
          targetMine.count === 0 &&
          !targetMine.isShow &&
          !targetMine.isSign
        ) {
          targetMine.isShow = true;
          mineQUeue.push([nx, ny]);
        }
        if (
          !targetMine.isMine &&
          targetMine.count > 0 &&
          !targetMine.isShow &&
          !targetMine.isSign
        ) {
          targetMine.isShow = true;
        }
      });
    }
  }

  leaveUser(id) {
    const playerIndex = this.players.findIndex((item) => item === id);
    const visitorIndex = this.visitor.findIndex((item) => item === id);
    if (playerIndex >= 0) {
      // 如果是房主
      if (playerIndex === 0) return { isHost: true };
      this.players.splice(playerIndex, 1);
      this.gameConfig.player.mapData = [];
    }
    if (visitorIndex >= 0) this.visitor.splice(visitorIndex, 1);
    return { isHost: false };
  }

  showAll({ role }) {
    this.gameConfig[role].mapData.forEach((item) => {
      item.forEach((item2) => (item2.isShow = true));
    });
  }

  prepareGame({ role }) {
    this.gameConfig[role].status = "prepare";
    this.gameConfig[role].mapData = [];
    if (
      this.gameConfig.host.status === "prepare" &&
      this.gameConfig.player.status === "prepare"
    ) {
      return { isAllPrepare: true };
    }
    return { isAllPrepare: false };
  }

  generatePresetMap(role) {
    const mapData = JSON.parse(JSON.stringify(this.mapConfig[role].mapData));
    const mineCount = mapData
      .flat()
      .reduce((count, mine) => (count += mine.isMine ? 1 : 0), 0);
    const gridCount = mapData.length * mapData[0].length;
    return { mapData, mineCount, gridCount };
  }

  startGame() {
    this.gameConfig.host.status = "playing";
    this.gameConfig.player.status = "playing";
    this.gameConfig.host.signCount = 0;
    this.gameConfig.player.signCount = 0;
    if (this.gameMode === "random") {
      this.gameConfig.host.mapData = this.generateMap();
      this.gameConfig.player.mapData = this.generateMap();
      this.gameConfig.host.mineCount = this.mapConfig.mineCount;
      this.gameConfig.player.mineCount = this.mapConfig.mineCount;
      this.gameConfig.host.gridCount =
        this.mapConfig.width * this.mapConfig.height;
      this.gameConfig.player.gridCount =
        this.mapConfig.width * this.mapConfig.height;
    } else {
      const hostData = this.generatePresetMap("host");
      Object.keys(hostData).forEach((key) => {
        this.gameConfig.host[key] = hostData[key];
      });
      const playerData = this.generatePresetMap("player");
      Object.keys(playerData).forEach((key) => {
        this.gameConfig.player[key] = playerData[key];
      });
    }
  }

  checkIfFinish({ role }) {
    let count = 0;
    this.gameConfig[role].mapData.forEach((row) => {
      row.forEach((item) => {
        if (item.isShow) count++;
      });
    });
    if (
      count ===
      this.gameConfig[role].gridCount - this.gameConfig[role].mineCount
    ) {
      this.gameConfig[role].status = "finish";
      return true;
    }
    return false;
  }

  updateMap() {}
  initParticipateGame(role) {
    this.gameConfig[role].status = "participate";
    this.gameConfig[role].signCount = 0;
    if (this.gameMode === "random") {
      this.gameConfig[role].mineCount = this.mapConfig.mineCount;
      this.gameConfig[role].gridCount =
        this.mapConfig.width * this.mapConfig.height;
      this.gameConfig[role].mapData = this.generateMap();
    } else {
      const presetData = this.generatePresetMap(role);
      Object.keys(presetData).forEach((key) => {
        this.gameConfig[role][key] = presetData[key];
      });
    }
  }
}
