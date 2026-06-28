import { prisma } from './src/lib/db.ts'
const [pid, uid] = [process.argv[2], process.argv[3]]
const p = await prisma.presentation.findUnique({ where:{ id: pid }, select:{ userId:true } })
const s = await prisma.session.count({ where:{ userId: uid, expiresAt: { gt: new Date() } } })
console.log('presentation.userId=', p?.userId, ' expectedUser=', uid, ' match=', p?.userId===uid, ' activeSessions=', s)
await prisma.$disconnect(); process.exit(0)
