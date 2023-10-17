<template>
  <div class="home-page">
    <n-card title="配置" size="small">
      <n-form
        ref="settingForm"
        :model="settingData"
        :rules="settingRules"
        label-placement="top"
        size="medium"
        label-width="auto"
      >
        <n-form-item label="模式" path="mode">
          <n-radio-group v-model:value="settingData.mode" name="modeGroup">
            <n-space>
              <n-radio value="random"> 随机 </n-radio>
              <n-radio value="preset"> 预设 </n-radio>
            </n-space>
          </n-radio-group>
        </n-form-item>

        <template v-if="settingData.mode === 'random'">
          <n-form-item label="地图大小(宽*高)" path="size">
            <n-space>
              <n-input-number :min="3" v-model:value="settingData.width" />
              <n-input-number :min="3" v-model:value="settingData.height" />
            </n-space>
          </n-form-item>
          <n-form-item label="雷数" path="size">
            <n-space :align="'center'">
              <n-input-number :min="1" :max="maxMineCount" v-model:value="settingData.mineCount" />
              <span>最大可设置 {{ maxMineCount }}</span>
            </n-space>
          </n-form-item>
        </template>

        <template v-else>
          <!-- 
            1. 可配置玩家1，玩家2地图
            2. 下拉选择地图
            3. 支持预览地图
            4. 选择完地图展示响应的配置信息
           -->
          <n-form-item label="房主" path="host">
            <n-space :align="'center'">
              <n-select
                v-model:value="settingData.host"
                :options="mapOptions"
                style="width: 220px"
              />
              <n-button tertiary type="info" :disabled="!settingData.host" size="small">
                预览
              </n-button>
              <span>宽: 3</span>
              <span>高: 3</span>
              <span>雷数: 3</span>
            </n-space>
          </n-form-item>
          <n-form-item label="玩家" path="player">
            <n-space :align="'center'">
              <n-select
                v-model:value="settingData.player"
                :options="mapOptions"
                style="width: 220px"
              />
              <n-button tertiary type="info" :disabled="!settingData.player" size="small">
                预览
              </n-button>
              <!-- <span>宽: 3</span>
              <span>高: 3</span>
              <span>雷数: 3</span> -->
            </n-space>
          </n-form-item>
          <n-button size="small" tertiary @click="customMap">自定义地图</n-button>
        </template>
      </n-form>

      <template #action>
        <n-space justify="flex-end">
          <n-button @click="handleCreateNewGame" :loading="loading" type="info" tertiary>
            新建游戏
          </n-button>
        </n-space>
      </template>
    </n-card>

    <n-popover
      placement="bottom"
      trigger="click"
      scrollable
      @update:show="handleUpdateShow"
      style="max-height: 400px; overflow: auto"
    >
      <template #trigger>
        <div class="rooms">
          <n-badge :value="rooms.length">
            <Icon size="18" color="#fff">
              <Door16Filled />
            </Icon>
          </n-badge>
        </div>
      </template>
      <div>
        <n-space vertical>
          <n-input placeholder="输入房间号" v-model:value="filterText" type="text" />
          <n-list hoverable clickable>
            <n-list-item v-for="item in filterRooms" :key="item" @click="moveToRoom(item)">{{
              item
            }}</n-list-item>
          </n-list>
        </n-space>
      </div>
    </n-popover>
  </div>
</template>

<script setup>
/**
 * TODO:
 * 1. 默认配置页，点击新建生成房间码，拼接url，跳转对应页面
 * 2. 房主离开页面，自动销毁
 * 3. 其他输入房间码进入对应房间
 * 4. 提供预设地图
 * 5. 进入房间先自由模式，双方都准备便开始
 * 6. 优先进的绑定当前主机，后续进的只能观看，在nodejs表现为 存储一个player[] 和 tourist[], player大于2时，后续进来往tourist push，广播都广播 player 和 tourist里的用户
 */
import { generateUUID } from '@/utils'
import { useSocketStore } from '@/stores/socket'
import { storeToRefs } from 'pinia'
import { Door16Filled } from '@vicons/fluent'
import { Icon } from '@vicons/utils'
import { computed } from 'vue'
import { useMessage } from 'naive-ui'

const message = useMessage()
const { socket } = storeToRefs(useSocketStore())

const router = useRouter()

const loading = ref(false)

const rooms = ref([])

const filterText = ref('')
const filterRooms = computed(() => {
  if (!filterText.value) return rooms.value
  return rooms.value.filter((item) => item.includes(filterText.value))
})

const settingData = reactive({
  roomId: '',
  mode: 'random',
  width: 9,
  height: 9,
  mineCount: 21,
  host: null,
  player: null
})

const settingRules = reactive({})

const maxMineCount = computed(() => {
  return settingData.width * settingData.height
})

/**
 * 预设地图
 */
const mapOptions = ref(
  JSON.parse(localStorage.getItem('menus') || '[]').map((item) => ({
    value: item.value + '',
    label: item.name
  }))
)

const handleCreateNewGame = () => {
  /**
   * TODO:
   * 1. nodejs 根据房间id，填写的配置信息，实例化房间配置信息
   * 2. 默认练习模式，双方准备则刷新地图。
   * 3. 可配置地图
   */
  const uuid = generateUUID()
  settingData.roomId = uuid
  const params = {
    ...settingData
  }

  if (params.mode === 'preset') {
    if (!params.host || !params.player) {
      return message.warning('请选择预选地图')
    }
    params.host = JSON.parse(localStorage.getItem(params.host))
    params.player = JSON.parse(localStorage.getItem(params.player))
  }

  loading.value = true
  socket.value.timeout(2000).emit('createRoom', params, (err, res) => {
    if (err) {
      console.log('err', err)
    } else {
      console.log('success', res)
      router.push({
        name: 'game',
        params: { id: params.roomId }
      })
    }
    loading.value = false
  })
}

const moveToRoom = (room) => {
  router.push({
    name: 'game',
    params: { id: room }
  })
}

const customMap = () => {
  router.push({
    path: '/editor'
  })
}

onMounted(() => {
  socket.value.timeout(2000).emit('getRoom', {}, (err, res) => {
    const { room } = res
    rooms.value = room
  })
  socket.value.on('roomChange', ({ room }) => {
    rooms.value = room
  })
})

onUnmounted(() => {
  socket.value.off('roomChange')
})
</script>

<style lang="scss" scoped>
.home-page {
  position: relative;
  height: 100vh;
  overflow: hidden;
  padding: 40px;

  .n-card {
    margin: 0 auto;
    max-width: 620px;
  }

  .rooms {
    position: fixed;
    display: flex;
    align-items: center;
    justify-content: center;
    left: 20px;
    top: 20px;
    width: 48px;
    height: 48px;
    border-radius: 50%;
    background-color: rgb(24, 24, 28);
    border: 1px solid rgba(255, 255, 255, 0.09);
    cursor: pointer;
  }
}
</style>
