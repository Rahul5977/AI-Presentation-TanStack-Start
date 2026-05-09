import type amqplib from 'amqplib'

import { DLX_NAME, QUEUE_NAMES, queueDlqName, queueRetryName } from '@/server/queue/queues'

export async function ensureQueueTopology(channel: amqplib.Channel) {
  await channel.assertExchange(DLX_NAME, 'direct', { durable: true })

  for (const queueName of Object.values(QUEUE_NAMES)) {
    const dlqName = queueDlqName(queueName)
    const retryName = queueRetryName(queueName)

    await channel.assertQueue(queueName, {
      durable: true,
      arguments: {
        'x-dead-letter-exchange': DLX_NAME,
        'x-dead-letter-routing-key': dlqName,
      },
    })

    await channel.assertQueue(retryName, {
      durable: true,
      arguments: {
        'x-dead-letter-exchange': '',
        'x-dead-letter-routing-key': queueName,
      },
    })

    await channel.assertQueue(dlqName, { durable: true })
    await channel.bindQueue(dlqName, DLX_NAME, dlqName)
  }
}
