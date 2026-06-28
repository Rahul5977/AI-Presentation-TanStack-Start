import { prisma } from './src/lib/db.ts'
const pres = await prisma.presentation.create({ data: {
  userId: process.argv[2], title:'Verify Deck 2', prompt:'Solar', status:'READY', template:'MINIMAL_MONO',
  slides:{ create:[{ position:0, status:'READY', title:'Solar adoption is accelerating', intent:'Show the growth trend',
    bullets:['Global capacity grew rapidly over the last decade and keeps rising every year across many regions','Costs per watt have fallen dramatically making solar competitive with fossil fuels in most markets','Residential and commercial installations are both increasing as incentives improve'],
    visualConcept:'Solar panels at sunrise' }] } }, include:{ slides:true } })
console.log('SEEDED ' + JSON.stringify({ presentationId: pres.id, slideId: pres.slides[0].id }))
await prisma.$disconnect(); process.exit(0)
