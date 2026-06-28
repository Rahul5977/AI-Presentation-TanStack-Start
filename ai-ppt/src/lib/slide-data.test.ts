import { describe, expect, it } from 'vitest'

import { coerceSlideData, parseSlideData } from '@/lib/slide-data'

describe('parseSlideData', () => {
  it('returns null for nullish/invalid input', () => {
    expect(parseSlideData(null)).toBeNull()
    expect(parseSlideData({ kind: 'nope' })).toBeNull()
    expect(parseSlideData({ kind: 'chart' })).toBeNull()
  })

  it('parses a valid chart', () => {
    const data = parseSlideData({
      kind: 'chart',
      chartType: 'bar',
      categories: ['A', 'B'],
      series: [{ name: 'Revenue', values: [1, 2] }],
    })
    expect(data?.kind).toBe('chart')
  })
})

describe('coerceSlideData', () => {
  it('coerces numeric strings in chart series', () => {
    const data = coerceSlideData({
      kind: 'chart',
      chartType: 'BarChart',
      categories: ['Q1', 'Q2'],
      series: [{ name: 'Sales', values: ['10', '$20'] }],
    })
    expect(data).not.toBeNull()
    if (data?.kind === 'chart') {
      expect(data.chartType).toBe('bar')
      expect(data.series[0].values).toEqual([10, 20])
    }
  })

  it('accepts table rows given as {cells} objects', () => {
    const data = coerceSlideData({
      kind: 'table',
      columns: ['Feature', 'Us'],
      rows: [{ cells: ['Speed', 'Fast'] }],
    })
    expect(data?.kind).toBe('table')
    if (data?.kind === 'table') {
      expect(data.rows[0]).toEqual(['Speed', 'Fast'])
    }
  })

  it('maps timeline date/name aliases', () => {
    const data = coerceSlideData({
      kind: 'timeline',
      events: [{ date: '2024', name: 'Launch', detail: 'v1' }],
    })
    expect(data?.kind).toBe('timeline')
    if (data?.kind === 'timeline') {
      expect(data.events[0].label).toBe('2024')
      expect(data.events[0].title).toBe('Launch')
      expect(data.events[0].description).toBe('v1')
    }
  })

  it('parses metrics items', () => {
    const data = coerceSlideData({
      kind: 'metrics',
      items: [{ value: '98%', label: 'Uptime' }],
    })
    expect(data?.kind).toBe('metrics')
  })

  it('returns null for an unknown kind', () => {
    expect(coerceSlideData({ kind: 'pie-chart' })).toBeNull()
  })
})
