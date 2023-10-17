<template>
  <div class="game-page">
    <div class="game-wrapper">
      <n-card size="small" class="operate-actions">
        <div style="display: flex; justify-content: space-between; align-items: center">
          <n-space>
            <n-button
              size="small"
              secondary
              :disabled="
                !userData.isHost ||
                userData.role === 'visitor' ||
                gameConfig.host.status === 'playing'
              "
              @click="prepareGame('host')"
            >
              准备
            </n-button>
            <n-button
              size="small"
              secondary
              :disabled="
                !userData.isHost ||
                userData.role === 'visitor' ||
                gameConfig.host.status === 'prepare' ||
                gameConfig.host.status === 'playing'
              "
              @click="randomParticipate('host')"
            >
              随机练习
            </n-button>
          </n-space>
          <div style="display: flex; align-items: center; gap: 16px">
            <div style="display: flex; align-items: center; gap: 4px">
              <Icon size="18" color="lightsalmon">
                <Bomb />
              </Icon>
              <span>{{ gameConfig.host.mineCount }}</span>
            </div>
            <div style="display: flex; align-items: center; gap: 4px">
              <Icon size="18" color="cornflowerblue">
                <Flag20Filled />
              </Icon>
              <span>{{ gameConfig.host.signCount }}</span>
            </div>
          </div>
        </div>
      </n-card>
      <div class="map-content">
        <div class="tip-box" v-if="gameConfig.host.status === 'prepare'">prepare</div>
        <Map
          v-if="['participate', 'playing', 'finish', 'gameover'].includes(gameConfig.host.status)"
          :map-data="gameConfig.host.mapData"
          role="host"
          :sweep-able="
            userData.isHost && ['participate', 'playing'].includes(gameConfig.host.status)
          "
          :game-status="gameConfig.host.status"
        ></Map>
        <div class="tip-box" v-if="gameConfig.host.status === 'finish'">
          <n-alert type="success" closable style="width: 160px"> Good </n-alert>
        </div>
      </div>
    </div>
    <div class="game-wrapper">
      <n-card size="small" class="operate-actions">
        <div style="display: flex; justify-content: space-between; align-items: center">
          <n-space>
            <n-button
              size="small"
              secondary
              :disabled="
                userData.isHost ||
                userData.role === 'visitor' ||
                gameConfig.player.status === 'playing'
              "
              @click="prepareGame('player')"
              >准备</n-button
            >
            <n-button
              size="small"
              secondary
              :disabled="
                userData.isHost ||
                userData.role === 'visitor' ||
                gameConfig.player.status === 'prepare' ||
                gameConfig.player.status === 'playing'
              "
              @click="randomParticipate('player')"
              >随机练习</n-button
            >
          </n-space>
          <div style="display: flex; align-items: center; gap: 16px">
            <div style="display: flex; align-items: center; gap: 4px">
              <Icon size="18" color="lightsalmon">
                <Bomb />
              </Icon>
              <span>{{ gameConfig.player.mineCount }}</span>
            </div>
            <div style="display: flex; align-items: center; gap: 4px">
              <Icon size="18" color="cornflowerblue">
                <Flag20Filled />
              </Icon>
              <span>{{ gameConfig.player.signCount }}</span>
            </div>
          </div>
        </div>
      </n-card>
      <div class="map-content">
        <div class="tip-box" v-if="gameConfig.player.status === 'prepare'">prepare</div>
        <Map
          v-if="['participate', 'playing', 'finish', 'gameover'].includes(gameConfig.player.status)"
          :map-data="gameConfig.player.mapData"
          role="player"
          :sweep-able="
            !userData.isHost &&
            userData.role !== 'visitor' &&
            ['participate', 'playing'].includes(gameConfig.player.status)
          "
          :game-status="gameConfig.player.status"
        ></Map>
        <div class="tip-box" v-if="gameConfig.player.status === 'finish'">
          <n-alert type="success" closable style="width: 160px"> Good </n-alert>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
/**
 * TODO:
 * 1. 进入调用initRoom 带上房间id
 * 2. nodejs 向player[] || tourist[] push信息 包含房间id，用户唯一id
 * 3. nodejs 读取配置，生成地图
 * 4. 不管何种条件下触发的失败，标红相对应的炸弹
 */
import { useSocketStore } from '@/stores/socket.js'
import { storeToRefs } from 'pinia'
import { Icon } from '@vicons/utils'
import { Flag20Filled } from '@vicons/fluent'
import { Bomb } from '@vicons/fa'
import Map from './components/map.vue'
import { useMessage } from 'naive-ui'
const route = useRoute()
const message = useMessage()
const dialog = useDialog()
const { socket } = storeToRefs(useSocketStore())
const roomId = ref()
const userData = reactive({
  role: 'visitor',
  isHost: false
})

const gameConfig = reactive({
  // status: default | prepare | playing | gameover | participate | finish
  host: {
    status: 'default',
    mapData: [],
    mineCount: 0,
    signCount: 0
  },
  player: {
    status: 'default',
    mapData: [],
    mineCount: 0,
    signCount: 0
  }
})

const joinRoom = () => {
  if (roomId.value) {
    socket.value.timeout(2000).emit('joinRoom', { roomId: roomId.value }, (err, res) => {
      if (err) {
      } else {
        const { status, data } = res
        console.log(status, data)
        if (status === 'ok') {
          const { role, isHost } = data
          userData.role = role
          userData.isHost = isHost
        } else {
          //
        }
      }
    })
  }
}

const randomParticipate = (role) => {
  gameConfig[role].mapData = []
  socket.value.emit('participate', { role })
}

const flashGrid = (grids) => {
  grids.forEach((item) => {
    item.isFlash = true
  })

  setTimeout(() => {
    grids.forEach((item) => {
      item.isFlash = false
    })
  }, 300)
}

const prepareGame = (role) => {
  socket.value.emit('prepare', { role })
}

const waitToStartGame = (time = 2000) => {
  const d = dialog.info({
    closable: false,
    closeOnEsc: false,
    maskClosable: false,
    showIcon: false,
    content: '等待地图生成~',
    style: { width: '180px', textAlign: 'center' }
  })
  setTimeout(() => {
    d.destroy()
  }, time)
}

onMounted(() => {
  const { id } = route.params
  roomId.value = id
  joinRoom()

  socket.value.on('mapChange', ({ role, data }) => {
    console.log('mapChange', role, data)
    gameConfig[role].status = data.status
    gameConfig[role].mapData = data.mapData
    gameConfig[role].mineCount = data.mineCount
    gameConfig[role].signCount = data.signCount
  })

  socket.value.on('gameOver', ({ role, triggerMines = null, mine = null, around = null }) => {
    gameConfig[role].status = 'gameover'
    setTimeout(() => {
      if (mine) {
        const { x, y } = mine
        gameConfig[role].mapData[y][x].sweepIncorrect = true
        gameConfig[role].mapData[y][x].isShow = true
      }
      if (triggerMines) {
        triggerMines.forEach((mine) => {
          const { x, y } = mine
          const targetMine = gameConfig[role].mapData[y][x]
          if (!targetMine.isMine) targetMine.signIncorrect = true
        })
      }
      if (around) {
        around.forEach((mine) => {
          const { x, y } = mine
          gameConfig[role].mapData[y][x].isShow = true
        })
      }
    }, 10)
  })

  socket.value.on('flash', ({ data, role }) => {
    console.log('flash', data)
    const gridData = data.map((item) => {
      return gameConfig[role].mapData[item.y][item.x]
    })
    flashGrid(gridData)
  })

  socket.value.on('roomDestroy', () => {
    message.warning(`房主离开，房间已销毁~`)
  })

  socket.value.on('userLeave', (data) => {
    message.warning(data)
  })

  socket.value.on('prepareGame', ({ role, data }) => {
    gameConfig[role] = data
  })

  socket.value.on('startGame', ({ data }) => {
    waitToStartGame()
    const { host, player } = data
    gameConfig.host = host
    gameConfig.player = player
  })

  socket.value.on('finish', ({ role }) => {
    gameConfig[role].status = 'finish'
  })
})
onUnmounted(() => {
  socket.value.emit('leaveRoom')
  socket.value.off('mapChange')
  socket.value.off('gameOver')
  socket.value.off('flash')
  socket.value.off('roomDestroy')
  socket.value.off('userLeave')
  socket.value.off('prepareGame')
  socket.value.off('startGame')
  socket.value.off('finish')
})
</script>

<style scoped lang="scss">
.game-page {
  height: 100vh;
  display: flex;
  .game-wrapper {
    flex: 1;
    gap: 12px;
    padding: 12px;
    display: flex;
    flex-direction: column;

    .map-content {
      position: relative;
      flex: 1;
      background-color: rgb(24, 24, 28);
      border: 1px solid rgba(255, 255, 255, 0.09);
      border-radius: 3px;

      .tip-box {
        position: absolute;
        left: 50%;
        top: 50%;
        transform: translate(-50%, -50%);
      }
    }
  }
}
</style>
