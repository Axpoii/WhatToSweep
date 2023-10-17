<script setup>
import { darkTheme } from 'naive-ui'
import { useSocketStore } from '@/stores/socket.js'
import { storeToRefs } from 'pinia'

const { connected } = storeToRefs(useSocketStore())
</script>

<template>
  <n-config-provider :theme="darkTheme">
    <n-dialog-provider>
      <n-message-provider>
        <n-layout>
          <div class="loading-page" v-if="!connected">Loading...</div>
          <router-view v-else></router-view>
        </n-layout>
      </n-message-provider>
    </n-dialog-provider>
  </n-config-provider>
</template>

<style scoped>
.loading-page {
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 24px;
}
</style>
