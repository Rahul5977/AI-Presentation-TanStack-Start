import { prisma } from './src/lib/db.ts'
const userId = process.argv[2]
const pres = await prisma.presentation.create({
  data: {
    userId, title: 'Verify Deck', prompt: 'Solar energy market',
    status: 'READY', template: 'MINIMAL_MONO',
    slides: { create: [{
      position: 0, status: 'READY',
      title: 'Solar adoption is accelerating',
      intent: 'Show the growth trend',
      bullets: ['Global capacity grew rapidly over the last decade and continues to rise each year across many regions','Costs per watt have fallen dramatically making solar competitive with fossil fuels in most markets worldwide','Residential and commercial installations are both increasing as incentives improve and technology matures'],
      visualConcept: 'A field of solar panels at sunrise',
    }]},
  },
  include: { slides: true },
})
console.log('SEEDED ' + JSON.stringify({ presentationId: pres.id, slideId: pres.slides[0].id }))
await prisma.$disconnect()
process.exit(0)
