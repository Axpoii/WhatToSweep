<template>
  <n-popconfirm @positive-click="onDel" positive-text="确定" negative-text="取消">
    <template #trigger>
      <n-icon size="16" @click.stop>
        <Delete24Filled />
      </n-icon>
    </template>
    确定删除吗?
  </n-popconfirm>
</template>

<script setup>
import { Delete24Filled } from '@vicons/fluent'

const props = defineProps(['option'])

const emit = defineEmits(['update'])

const onDel = () => {
  const { key } = props.option
  console.log(key)
  const menus = JSON.parse(localStorage.getItem('menus'))
  const resMenus = menus.filter((item) => item.value != key)
  localStorage.removeItem(key)
  localStorage.setItem('menus', JSON.stringify(resMenus))
  emit('update')
}
</script>

<style lang="scss" scoped></style>
