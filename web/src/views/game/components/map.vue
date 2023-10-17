<template>
  <MapWrapper ref="mapWrapperRef">
    <div
      class="map-wrapper"
      :class="{ bomb: gameStatus === 'gameover' }"
      :style="{ width: `${initWidth}px`, height: `${initHeight}px` }"
    >
      <template v-for="(item, y) in props.mapData">
        <div
          class="map-item"
          :class="{
            show: item2.isShow || gameStatus === 'finish',
            flash: item2.isFlash && !item2.isShow
          }"
          :style="{ color: generateMineColor(item2) }"
          v-for="(item2, x) in item"
          :key="`${x}-${y}`"
          @mousedown.stop="(e) => checkGrid(e, item2)"
          @contextmenu.prevent
        >
          <!-- 尽量减少节点的渲染 -->
          <span
            v-if="item2.isShow && !item2.isSign && !item2.isMine"
            :style="{ color: mineCountColor(item2.count || 0) }"
          >
            {{ item2.count || '' }}
          </span>
          <Bomb
            :class="{ sweepIncorrect: item2.sweepIncorrect, bomb: true, ...generateAnimate(item2) }"
            v-if="
              (item2.isShow && !item2.isSign && item2.isMine) ||
              (gameStatus === 'finish' && item2.isMine)
            "
            :style="animateStyle(item2)"
          />
          <Flag20Filled
            :class="{ signIncorrect: item2.signIncorrect, flag: true }"
            v-if="item2.isSign && gameStatus !== 'finish'"
          />
        </div>
      </template>
    </div>
  </MapWrapper>
</template>

<script setup>
import MapWrapper from '@/components/map-wrapper.vue'
import { useSocketStore } from '@/stores/socket.js'
import { storeToRefs } from 'pinia'
import { Flag20Filled } from '@vicons/fluent'
import { Bomb } from '@vicons/fa'

const props = defineProps(['mapData', 'role', 'sweepAble', 'gameStatus'])
const { socket } = storeToRefs(useSocketStore())
const mapWrapperRef = ref()
const initWidth = ref(0)
const initHeight = ref(0)

const initMap = () => {
  const width = props.mapData?.[0].length
  const height = props.mapData?.length
  initWidth.value = width * 32 + 8 + (width - 1) * 2
  initHeight.value = height * 32 + 8 + (height - 1) * 2
  setTimeout(() => {
    mapWrapperRef.value.renderSvg()
  }, 10)
}

const checkGrid = (e, target) => {
  if (!props.sweepAble) return
  // 左键
  if (e.button === 0) {
    // 如果已标记 则 去除标记
    if (target.isSign) return socket.value.emit('removeSign', { role: props.role, mine: target })
    // 如果已扫过 则 快捷扫周边
    if (target.isShow) return socket.value.emit('sweepAround', { role: props.role, mine: target })
    return socket.value.emit('sweep', { role: props.role, mine: target })
  }
  // 右键
  if (e.button === 2) {
    if (target.isShow || target.isSign) return
    return socket.value.emit('sign', { role: props.role, mine: target })
  }
}

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

const generateMineColor = (mine) => {
  if (props.gameStatus === 'finish') {
    return mine.meta?.color || 'inherit'
  }
  return 'inherit'
}

const generateAnimate = (mine) => {
  if (props.gameStatus === 'finish' && mine.meta?.animate) {
    return {
      animate__animated: true,
      animate__infinite: true,
      animate__slow: true
    }
  }
  return {}
}

const animateStyle = (mine) => {
  if (props.gameStatus === 'finish' && mine.meta?.animate) {
    return {
      animationName: mine.meta?.animate,
      animationDelay: `${computedAnimateDelay(mine)}s`
    }
  }
  return {}
}

const computedAnimateDelay = (mine) => {
  // switch (animateMode.value) {
  //   case 'toBottom':
  //     return mine.y / 100
  //   default:
  //     return 0
  // }
  return mine.y / 60
}

const mineCountColor = (count) => {
  return MIME_COUNT_TYPE[count]
}

onMounted(() => {
  console.log('init', props.mapData)
  initMap()
})
</script>

<style lang="scss" scoped>
.map-wrapper {
  display: flex;
  flex-wrap: wrap;
  gap: 2px;
  padding: 4px;
  background-color: var(--main-bg);
  border-radius: 3px;

  &.bomb {
    animation: shake 0.8s ease-in-out forwards;
  }
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

    &.show {
      background-color: transparent;
    }

    &.flash {
      animation: flash 0.3s linear forwards;
    }
    .bomb {
      width: 16px;
      // color: lightsalmon;
      &.sweepIncorrect {
        color: #d03050;
      }
    }
    .flag {
      width: 18px;
      color: cornflowerblue;
      &.signIncorrect {
        color: #d03050;
      }
    }
  }

  @keyframes flash {
    0% {
      background-color: var(--secondary-bg);
    }
    50% {
      background-color: rgb(70, 70, 77);
    }
    100% {
      background-color: var(--secondary-bg);
    }
  }
}
</style>
