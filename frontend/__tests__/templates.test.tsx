import { render, screen } from '@testing-library/react'
import { templates } from '@/lib/templates'

describe('Templates Configuration', () => {
  test('should have exactly 4 templates', () => {
    expect(templates).toHaveLength(4)
  })

  test('all templates should have required properties', () => {
    templates.forEach(template => {
      expect(template).toHaveProperty('id')
      expect(template).toHaveProperty('name')
      expect(template).toHaveProperty('description')
      expect(template).toHaveProperty('category')
      expect(template).toHaveProperty('estimatedCost')
      expect(template).toHaveProperty('parameters')
      expect(template.id).toMatch(/^[a-z-]+$/) // lowercase with hyphens
      expect(template.name).toBeTruthy()
      expect(template.description).toBeTruthy()
      expect(Array.isArray(template.parameters)).toBe(true)
    })
  })

  test('template parameters should have valid types', () => {
    const validTypes = ['text', 'select', 'number', 'boolean']
    
    templates.forEach(template => {
      template.parameters.forEach(param => {
        expect(param).toHaveProperty('name')
        expect(param).toHaveProperty('label')
        expect(param).toHaveProperty('type')
        expect(param).toHaveProperty('required')
        expect(validTypes).toContain(param.type)
        
        if (param.type === 'select') {
          expect(param).toHaveProperty('options')
          expect(Array.isArray(param.options)).toBe(true)
        }
      })
    })
  })

  test('template IDs should be unique', () => {
    const ids = templates.map(t => t.id)
    const uniqueIds = new Set(ids)
    expect(uniqueIds.size).toBe(ids.length)
  })
})