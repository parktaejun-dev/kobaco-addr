
export const homePage = {
  name: 'homePage',
  title: 'Home Page',
  type: 'document',
  fields: [
    {
      name: 'hero',
      title: 'Hero Section',
      type: 'object',
      fields: [
        { name: 'eyebrow', title: 'Eyebrow (Small Text)', type: 'string' },
        { name: 'title', title: 'Title', type: 'string' },
        { name: 'subtitle', title: 'Subtitle', type: 'text' },
        { 
          name: 'badges', 
          title: 'KPI Badges', 
          type: 'array', 
          of: [{ type: 'string' }],
          validation: (Rule: any) => Rule.min(2).max(4)
        },
        {
          name: 'cta',
          title: 'Primary CTA',
          type: 'object',
          fields: [
            { name: 'label', title: 'Button Label', type: 'string' },
            { name: 'link', title: 'Link (e.g. /estimate)', type: 'string' }
          ]
        }
      ]
    },
    {
      name: 'sections',
      title: 'Page Sections',
      type: 'array',
      of: [
        {
          type: 'object',
          name: 'valueProps',
          title: 'Value Proposition (Cards)',
          fields: [
            { name: 'adminLabel', title: 'Admin Label', type: 'string' },
            { name: 'title', title: 'Section Title', type: 'string' },
            { 
              name: 'items', 
              type: 'array', 
              of: [{
                type: 'object',
                fields: [
                  { name: 'title', type: 'string' },
                  { name: 'description', type: 'text' }
                ]
              }]
            }
          ]
        },
        {
          type: 'object',
          name: 'faq',
          title: 'FAQ Section',
          fields: [
            { name: 'adminLabel', title: 'Admin Label', type: 'string' },
            { 
              name: 'questions', 
              type: 'array', 
              of: [{
                type: 'object',
                fields: [
                  { name: 'question', type: 'string' },
                  { name: 'answer', type: 'text' }
                ]
              }]
            }
          ]
        }
      ]
    }
  ]
}
