import { ref, computed, onMounted } from 'vue'
import { defineStore } from 'pinia'
import { io } from 'socket.io-client'

export const useSocketStore = defineStore('socket', () => {
  const router = useRouter()
  const connected = ref(false)
  const socket = ref()
  onMounted(() => {
    setTimeout(() => {
      const conn = io(`ws://${location.hostname}:3001`, {
        transports: ['websocket'],
        path: '/socket/'
      })
      conn.on('connect', () => {
        // 首次连接 跳首页
        router.push({ path: '/' })
        console.log('jump')
        connected.value = true
        socket.value = conn
      })
      conn.on('error', (err) => {
        console.log(err)
      })
    }, 1000)
  })
  return { socket, connected }
})
