import amqplib from 'amqplib'

import { ensureQueueTopology } from '@/server/queue/topology'

let connectionPromise: Promise<amqplib.ChannelModel> | null = null
let channelPromise: Promise<amqplib.Channel> | null = null

function getRabbitUrl() {
  return process.env.RABBITMQ_URL ?? 'amqp://localhost:5672'
}

async function getConnection() {
  if (!connectionPromise) {
    connectionPromise = amqplib.connect(getRabbitUrl())
  }
  return await connectionPromise
}

export async function getRabbitChannel() {
  if (!channelPromise) {
    channelPromise = (async () => {
      const connection = await getConnection()
      const channel = await connection.createChannel()
      await ensureQueueTopology(channel)
      return channel
    })()
  }

  return await channelPromise
}
export async function closeRabbit() {
  if (channelPromise) {
    const channel = await channelPromise
    await channel.close()
    channelPromise = null
  }
  if (connectionPromise) {
    const connection = await connectionPromise
    await connection.close()
    connectionPromise = null
  }
}
