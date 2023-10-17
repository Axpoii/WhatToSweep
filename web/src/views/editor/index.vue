<template>
  <div class="editor-page">
    <n-layout has-sider>
      <n-layout-sider
        bordered
        collapse-mode="width"
        :collapsed-width="48"
        :width="240"
        :collapsed="false"
        @collapse="collapsed = true"
        @expand="collapsed = false"
      >
        <div class="map-nav">
          <div class="nav-header">
            <n-button @click="goHome" quaternary block>
              <template #icon>
                <IosArrowLtr24Filled />
              </template>
            </n-button>
          </div>
          <div class="map-list" style="flex: 1">
            <n-menu
              :collapsed="false"
              :options="menuOptions"
              v-model:value="menuValue"
              @update-value="onMenuChange"
              :render-extra="handleRenderExtra"
              :render-label="handleRenderLabel"
            />
          </div>
          <div class="nav-footer" style="height: 48px">
            <n-button block @click="showCreateModal = true">新建地图</n-button>
          </div>
        </div>
      </n-layout-sider>
      <n-layout style="display: flex; flex-direction: column">
        <div class="header-action">
          <n-space :align="'center'">
            <n-input-number
              v-model:value="mapConfig.width"
              size="small"
              :min="1"
              @update:value="handleMapWidthChange"
              style="width: 140px"
            >
              <template #prefix> 宽： </template>
            </n-input-number>
            <n-input-number
              v-model:value="mapConfig.height"
              size="small"
              :min="1"
              @update:value="handleMapHeightChange"
              style="width: 140px"
            >
              <template #prefix> 高： </template>
            </n-input-number>
            <span>雷：{{ mineCount }}</span>
            <n-popconfirm :show-icon="false" @positive-click="handleSetRandomMine">
              <template #trigger>
                <n-button size="small">随机填充</n-button>
              </template>
              <n-input-number
                v-model:value="randomMineCount"
                size="small"
                :min="0"
                :max="mapConfig.width * mapConfig.height - mineCount"
                style="width: 140px"
              >
                <template #prefix> 雷： </template>
              </n-input-number>
            </n-popconfirm>
            <n-popconfirm :show-icon="false" @positive-click="clearAllMine">
              <template #trigger>
                <n-button size="small">清空</n-button>
              </template>
              确认清空吗?
            </n-popconfirm>
          </n-space>
          <n-space>
            <n-button size="small" @click="saveMap">保存本地</n-button>
          </n-space>
        </div>
        <div class="editor-content">
          <MapWrapper ref="mapWrapperRef">
            <div
              class="map-wrapper"
              :style="{ width: `${initWidth}px`, height: `${initHeight}px` }"
            >
              <template v-for="(item, y) in mapConfig.mapData">
                <div
                  class="map-item"
                  :class="{
                    focus: focusPosition.x === item2.x && focusPosition.y === item2.y,
                    animate: item2.meta.animate,
                    animate__animated: true,
                    animate__infinite: true,
                    animate__slow: true
                  }"
                  :style="{
                    animationDelay: `${computedAnimateDelay(item2)}s`,
                    animationName: `${item2.meta.animate}`
                  }"
                  v-for="(item2, x) in item"
                  :key="`${x}-${y}`"
                  :name="`${x}-${y}`"
                  @mousedown.stop="(e) => setGrid(e, item2)"
                  @contextmenu.prevent
                >
                  <!-- 尽量减少节点的渲染 -->
                  <span v-if="!item2.isMine" :style="{ color: mineCountColor(item2.count || 0) }">
                    {{ item2.count || '' }}
                  </span>
                  <Icon v-if="item2.isMine" size="16" :color="item2.meta.color || 'inherit'">
                    <Bomb />
                  </Icon>
                </div>
              </template>
            </div>
          </MapWrapper>
        </div>
      </n-layout>
    </n-layout>

    <div
      class="mine-editor-modal"
      ref="mineEditor"
      :style="{ left: `${x}px`, top: `${y}px` }"
      v-show="mineEditorVisible"
    >
      <n-card style="width: 100%; height: 100%" closable @close="handleCloseEditor">
        <template v-if="mapConfig.mapData.length && focusPosition.x >= 0">
          <n-form-item label="是否雷" label-align="right" label-placement="left">
            <n-switch
              size="small"
              v-model:value="mapConfig.mapData[focusPosition.y][focusPosition.x].isMine"
            />
          </n-form-item>
          <n-form-item label="颜色" label-align="right" label-placement="left">
            <n-color-picker
              v-model:value="mapConfig.mapData[focusPosition.y][focusPosition.x].meta.color"
            />
          </n-form-item>
          <n-form-item label="动画" label-align="right" label-placement="left">
            <n-select
              clearable
              v-model:value="mapConfig.mapData[focusPosition.y][focusPosition.x].meta.animate"
              :options="animateList"
            />
          </n-form-item>
        </template>
      </n-card>
    </div>

    <n-modal
      v-model:show="showCreateModal"
      :mask-closable="false"
      style="position: fixed; width: 400px; top: 100px; left: 50%; transform: translateX(-50%)"
      title="新建地图"
      preset="card"
    >
      <n-form-item label="地图名">
        <n-input placeholder="请输入地图名" v-model:value="mapName"></n-input>
      </n-form-item>

      <n-space justify="end">
        <n-button @click="cancelCreate">取消</n-button>
        <n-button @click="confirmCreate" type="primary">确定</n-button>
      </n-space>
    </n-modal>
  </div>
</template>

<script setup>
/**
 * TODO:
 * 1. 延迟：
 * - To Bottom: 随Y坐标递增 y++
 * - To Top: 随Y坐标递减 y--
 * - To Right: 随X坐标递增 x++
 * - To Left: 随X坐标递减 x--
 * - To Bottom Right: (yMax - y) * x
 * - To Bottom Left: (xMax - x) * (yMax - y)
 * - To Top Right: x * y
 * - To Top Left: (xMax - x) * y
 * - To Around: 中间向四周发散 Math.abs((x - maxX / 2)) * Math.abs((y - maxY / 2))
 */
import MapWrapper from '@/components/map-wrapper.vue'
import { Icon } from '@vicons/utils'
import { Bomb } from '@vicons/fa'
import { useDraggable } from '@vueuse/core'
import MenuOperate from './components/menuOperate.vue'
import { IosArrowLtr24Filled } from '@vicons/fluent'
import { useMessage } from 'naive-ui'
import { nextTick } from 'vue'

const router = useRouter()
const message = useMessage()
const mapWrapperRef = ref()

/**
 * 导航
 */
const collapsed = ref(true)

const showCreateModal = ref(false)

// 创建地图名称
const mapName = ref('')

const menus = JSON.parse(localStorage.getItem('menus') || '[]').map((item) => ({
  key: item.value + '',
  label: item.name
}))

const menuValue = ref(menus[0]?.key)

const menuOptions = ref(menus)

const handleUpdateMenu = () => {
  menuValue.value = ''
  initMap()
}

const handleRenderExtra = (option) => {
  return h(MenuOperate, {
    option,
    onUpdate: handleUpdateMenu
  })
}

const handleRenderLabel = (option) => {
  return h(
    'span',
    {
      class: 'menu-label'
    },
    option.label
  )
}

const onMenuChange = (key) => {
  menuValue.value = key
  initMap()
}

const confirmCreate = () => {
  const menus = JSON.parse(localStorage.getItem('menus') || '[]')
  const dateNow = Date.now()
  menus.unshift({
    name: mapName.value,
    value: dateNow
  })
  localStorage.setItem('menus', JSON.stringify(menus))
  const mapData = generateMap({ width: 3, height: 3 })
  localStorage.setItem(
    `${dateNow}`,
    JSON.stringify({
      mapData: mapData,
      width: 3,
      height: 3
    })
  )
  menuValue.value = dateNow
  menuOptions.value = menus.map((item) => ({ key: item.value, label: item.name }))
  mapConfig.width = 3
  mapConfig.height = 3
  mapConfig.mapData = mapData
  showCreateModal.value = false
}

const cancelCreate = () => {}

const mineEditor = ref()
const focusPosition = ref({ x: -1, y: -1 })
const mineEditorVisible = ref(false)
const { x, y } = useDraggable(mineEditor, {
  initialValue: {
    x: 240,
    y: 48
  }
})

const randomMineCount = ref(0)

const mapConfig = reactive({
  width: 4,
  height: 3,
  mapData: []
})

const animateMode = ref('toBottom')
const animateTypes = [
  'bounce',
  'flash',
  'pulse',
  'rubberBand',
  'shakeX',
  'shakeY',
  'headShake',
  'swing',
  'tada',
  'wobble',
  'jello',
  'heartBeat'
]
const animateList = animateTypes.map((item) => ({ label: item, value: item }))

const mineCount = ref(0)

watch(
  () => mapConfig.mapData,
  () => {
    mineCount.value = mapConfig.mapData.flat().reduce((count, mine) => {
      return count + (mine.isMine ? 1 : 0)
    }, 0)
    computedMineAroundCount()
  },
  {
    deep: true
  }
)

const initWidth = computed(() => {
  return mapConfig.width * 32 + 8 + (mapConfig.width - 1) * 2
})

const initHeight = computed(() => {
  return mapConfig.height * 32 + 8 + (mapConfig.height - 1) * 2
})

const MIME_COUNT_TYPE = {
  0: '#fff',
  1: '#a0c1d6',
  2: '#8fd36a',
  3: '#4acccf',
  4: '#3eb0b6',
  5: '#72569b',
  6: '#f4607b',
  7: '#ea425b',
  8: '#4e2770'
}

const mineCountColor = (count) => {
  return MIME_COUNT_TYPE[count]
}

const initMap = () => {
  if (menuValue.value) {
    const { width, height, mapData } = JSON.parse(localStorage.getItem(menuValue.value))
    mapConfig.width = width
    mapConfig.height = height
    mapConfig.mapData = mapData
  } else {
    const menus = JSON.parse(localStorage.getItem('menus') || '[]').map((item) => ({
      key: item.value + '',
      label: item.name
    }))
    if (menus && menus.length) {
      menuValue.value = menus[0].key
      menuOptions.value = menus
      const { width, height, mapData } = JSON.parse(localStorage.getItem(menuValue.value))
      mapConfig.width = width
      mapConfig.height = height
      mapConfig.mapData = mapData
    } else {
      menuOptions.value = []
      mapConfig.width = 0
      mapConfig.height = 0
      mapConfig.mapData = []
    }
  }
  console.log('mapConfig.mapData', mapConfig.mapData)
  setTimeout(() => {
    nextTick(() => {
      mapWrapperRef.value && mapWrapperRef.value.renderSvg()
    })
  }, 10)
}

// 暂存
const saveMap = () => {
  try {
    localStorage.setItem(menuValue.value, JSON.stringify(mapConfig))
    message.success('保存成功')
  } catch (error) {
    message.error('保存失败')
  }
}

const generateMap = ({ width, height }) => {
  let arr = new Array(height).fill(1).map((item1, y) =>
    new Array(width).fill(1).map((item2, x) => ({
      isMine: false,
      count: 0,
      x,
      y,
      meta: {
        color: '',
        animate: null
      }
    }))
  )
  return arr
}

const handleMapWidthChange = (width) => {
  const mapWidth = mapConfig.mapData[0].length
  const diffNum = Math.abs(mapWidth - width)

  for (let i = 0; i < diffNum; i++) {
    // 比原先大则减少每行最后一个 否则则加
    if (mapWidth > width) {
      mapConfig.mapData.forEach((item) => {
        item.pop()
      })
    } else {
      mapConfig.mapData.forEach((item, y) => {
        item.push({
          isMine: false,
          count: 0,
          x: mapWidth + i,
          y,
          meta: {
            color: '',
            animate: null
          }
        })
      })
    }
  }
}

const handleMapHeightChange = (height) => {
  const mapHeight = mapConfig.mapData.length
  const diffNum = Math.abs(mapHeight - height)
  for (let i = 0; i < diffNum; i++) {
    // 比原先大则减少最后一行 否则则加
    if (mapHeight > height) {
      mapConfig.mapData.pop()
    } else {
      mapConfig.mapData.push(
        new Array(mapConfig.width).fill(1).map((item, x) => ({
          isMine: false,
          count: 0,
          x,
          y: mapHeight + i,
          meta: {
            color: '',
            animate: null
          }
        }))
      )
    }
  }
}

// 获取节点对应九宫格坐标
const getAroundGridIndex = (x, y, xMax, yMax) => {
  return [
    [y - 1, x - 1],
    [y, x - 1],
    [y + 1, x - 1],
    [y - 1, x],
    [y + 1, x],
    [y - 1, x + 1],
    [y, x + 1],
    [y + 1, x + 1]
  ].filter((item) => {
    return item[0] >= 0 && item[0] < yMax && item[1] >= 0 && item[1] < xMax
  })
}

const computedMineAroundCount = () => {
  const { width, height } = mapConfig
  mapConfig.mapData.forEach((item, y) => {
    item.forEach((item2, x) => {
      const computedIndex = getAroundGridIndex(x, y, width, height)
      let count = 0
      computedIndex.forEach((grid) => {
        mapConfig.mapData[grid[0]][grid[1]].isMine && count++
      })
      item2.count = count
    })
  })
}

const setGrid = (e, item2) => {
  // 左键
  if (e.button === 0) {
    item2.isMine = !item2.isMine
  }
  // 右键
  if (e.button === 2) {
    console.log(e)
    console.log('item2.x item2.y', item2.x, item2.y)
    focusPosition.value.x = item2.x
    focusPosition.value.y = item2.y
    mineEditorVisible.value = true
  }
}

const handleSetRandomMine = () => {
  for (let i = 0; i < randomMineCount.value; i++) {
    while (true) {
      const x = parseInt(Math.random() * mapConfig.width)
      const y = parseInt(Math.random() * mapConfig.height)
      if (!mapConfig.mapData[y][x].isMine) {
        mapConfig.mapData[y][x].isMine = true
        break
      }
    }
  }
}

const clearAllMine = () => {
  mapConfig.mapData.flat().forEach((item) => (item.isMine = false))
}

const handleCloseEditor = () => {
  mineEditorVisible.value = false
  focusPosition.value.x = -1
  focusPosition.value.y = -1
}

const computedAnimateDelay = (mine) => {
  switch (animateMode.value) {
    case 'toBottom':
      return mine.y / 100
    default:
      return 0
  }
}

const goHome = () => {
  router.push({
    path: '/'
  })
}

onMounted(() => {
  initMap()
})
</script>

<style lang="scss" scoped>
.editor-page {
  height: 100vh;
  display: flex;
  flex-direction: column;

  .map-nav {
    height: 100%;
    display: flex;
    flex-direction: column;
    .nav-header {
      height: 48px;
      padding: 0 16px;
      display: flex;
      align-items: center;
    }
    .map-list {
      flex: 1;
      overflow: auto;
    }
    .nav-footer {
      height: 48px;
      padding: 0 16px;
      display: flex;
      align-items: center;
    }
  }

  .header-action {
    height: 48px;
    background-color: var(--secondary-bg);
    border-bottom: 1px solid rgba(255, 255, 255, 0.09);
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0 16px;
  }
  .editor-content {
    position: relative;
    height: calc(100vh - 48px);
    overflow: hidden;
  }
  .map-wrapper {
    display: flex;
    flex-wrap: wrap;
    gap: 2px;
    padding: 4px;
    background-color: var(--main-bg);
    border-radius: 3px;
    .map-item {
      width: 32px;
      height: 32px;
      background-color: var(--secondary-bg);
      border: 1px solid rgba(255, 255, 255, 0.09);
      border-radius: 2px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s ease;

      &.animate {
        // animation-duration: 1s;
        // animation-timing-function: ease-in-out;
        animation-iteration-count: infinite;
      }

      &.focus {
        border-color: lightsalmon;
      }
    }
  }

  .mine-editor-modal {
    position: fixed;
    width: 300px;
    z-index: 999;
  }

  :deep(.n-menu-item-content-header) {
    line-height: 1;
    display: flex;
    align-items: center;
    justify-content: space-between;
    .n-menu-item-content-header__extra {
      float: right;
    }
    .menu-label {
      flex: 1;
      overflow: hidden;
      text-overflow: ellipsis;
    }
  }
}
</style>
