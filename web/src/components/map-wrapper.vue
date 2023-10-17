<template>
  <svg
    width="100%"
    height="100%"
    ref="svgBox"
    @mousedown="handleMouseDown"
    @mousemove="handleMouseMove"
    @mouseup="handleMouseUp"
    @mouseleave="handleMouseLeave"
    @wheel="handleWheel"
  >
    <g :transform="matrix">
      <foreignObject width="1" height="1" x="16" y="16" style="overflow: visible" ref="gSlot">
        <slot />
      </foreignObject>
    </g>
  </svg>
</template>

<script setup>
import { ref, reactive, computed, provide, nextTick } from 'vue'
import { useResizeObserver } from '@vueuse/core'

const svgBox = ref(null)

const gSlot = ref(null)

const wrapperContentRect = reactive({
  width: 0,
  height: 0
})

useResizeObserver(svgBox, (entries) => {
  const { width, height } = entries[0].contentRect
  const padding = 10
  wrapperContentRect.width = width - padding * 2
  wrapperContentRect.height = height - padding * 2
  nextTick(() => {
    renderSvg()
  })
})

const matrixData = reactive({
  a: 1,
  b: 0,
  c: 0,
  d: 1,
  e: 0,
  f: 0
})

const matrix = computed(() => {
  return `matrix(${Object.values(matrixData).join(',')})`
})

const renderSvg = () => {
  const { clientWidth, clientHeight, scrollHeight, scrollWidth } = gSlot.value
  const contentWidth = clientWidth + scrollWidth
  const contentHeight = clientHeight + scrollHeight

  /**
   * 如果内容高度没有超过容器svg宽高，就直接计算平移居中就好
   * 如果超出，按照长边等比缩放后，再计算缩放后的宽高，再计算平移居中
   */
  const containerAspectRatio = wrapperContentRect.width / wrapperContentRect.height
  const contentAspectRatio = contentWidth / contentHeight
  if (contentWidth > wrapperContentRect.width || contentHeight > wrapperContentRect.height) {
    if (containerAspectRatio > contentAspectRatio) {
      console.log('1')
      // 内容高度应等于容器高度
      const scaleContentWidth = contentAspectRatio * wrapperContentRect.height
      const scaleContentHeight = wrapperContentRect.height
      // 此时只需要x轴居中平移
      const offsetX = Math.floor((wrapperContentRect.width - scaleContentWidth) / 2)
      // console.log(
      //   contentWidth,
      //   contentHeight,
      //   scaleContentWidth,
      //   scaleContentHeight
      // );
      // 分别计算宽高缩放系数
      const wScale =
        contentWidth > scaleContentWidth
          ? scaleContentWidth / contentWidth
          : contentWidth / scaleContentWidth
      const hScale =
        contentHeight > scaleContentHeight
          ? scaleContentHeight / contentHeight
          : contentHeight / scaleContentHeight
      matrixData.a = wScale
      matrixData.d = hScale
      matrixData.e = offsetX
      matrixData.f = 0
    }
    if (containerAspectRatio < contentAspectRatio) {
      console.log('2')
      // 内容宽度应等于容器宽度
      const scaleContentHeight = (contentHeight / contentWidth) * wrapperContentRect.width
      const scaleContentWidth = wrapperContentRect.width
      // 此时只需要y轴居中平移
      const offsetY = Math.floor((wrapperContentRect.height - scaleContentHeight) / 2)
      // 分别计算宽高缩放系数
      const wScale =
        contentWidth > scaleContentWidth
          ? scaleContentWidth / contentWidth
          : contentWidth / scaleContentWidth
      const hScale =
        contentHeight > scaleContentHeight
          ? scaleContentHeight / contentHeight
          : contentHeight / scaleContentHeight
      matrixData.a = wScale
      matrixData.d = hScale
      matrixData.e = 0
      matrixData.f = offsetY
    }
    if (containerAspectRatio === contentAspectRatio) {
      console.log('3')
      // 如果内容大于容器，则等比缩放，否则直接居中
      if (contentWidth > wrapperContentRect.width) {
        const cScale = wrapperContentRect.width / contentWidth
        matrixData.a = cScale
        matrixData.d = cScale
      } else {
        const offsetLength = Math.floor((wrapperContentRect.width - contentWidth) / 2)
        matrixData.e = offsetLength
        matrixData.f = offsetLength
      }
    }
  } else {
    console.log('4')

    const offsetX = Math.floor((wrapperContentRect.width - contentWidth) / 2)
    const offsetY = Math.floor((wrapperContentRect.height - contentHeight) / 2)
    matrixData.e = offsetX + contentWidth / 2
    matrixData.f = offsetY + contentHeight / 2
    matrixData.e = offsetX
    matrixData.f = offsetY
  }
}

const moveData = reactive({
  isDragging: false,
  lastX: 0,
  lastY: 0
})

const handleMouseDown = (e) => {
  moveData.isDragging = true
  moveData.lastX = e.clientX
  moveData.lastY = e.clientY
}

const handleMouseMove = (e) => {
  if (moveData.isDragging) {
    const deltaX = e.clientX - moveData.lastX
    const deltaY = e.clientY - moveData.lastY
    matrixData.e += deltaX
    matrixData.f += deltaY
    moveData.lastX = e.clientX
    moveData.lastY = e.clientY
  }
}

const handleMouseUp = (e) => {
  moveData.isDragging = false
}

const handleWheel = (e) => {
  e.preventDefault()
  const delta = e.deltaY > 0 ? 1.1 : 0.9
  matrixData.a *= delta
  matrixData.d *= delta
}

const handleMouseLeave = (e) => {
  moveData.isDragging = false
}

provide('reRender', renderSvg)
defineExpose({
  renderSvg
})
</script>

<style></style>
