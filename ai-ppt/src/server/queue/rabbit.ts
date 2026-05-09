import amqplib from 'amqplib'

import { DLX_NAME, QUEUE_NAMES, queueDlqName } from '@/server/queue/queues'

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
      await ensureQueues(channel)
      return channel
    })()
  }

  return await channelPromise
}

async function ensureQueues(channel: amqplib.Channel) {
  await channel.assertExchange(DLX_NAME, 'direct', { durable: true })

  for (const queueName of Object.values(QUEUE_NAMES)) {
    const dlqName = queueDlqName(queueName)

    await channel.assertQueue(queueName, {
      durable: true,
      arguments: {
        'x-dead-letter-exchange': DLX_NAME,
        'x-dead-letter-routing-key': dlqName,
      },
    })

    await channel.assertQueue(dlqName, { durable: true })
    await channel.bindQueue(dlqName, DLX_NAME, dlqName)
  }
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
