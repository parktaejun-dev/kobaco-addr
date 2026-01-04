
import { defineConfig } from 'sanity'
import { deskTool } from 'sanity/desk'
import { schemaTypes } from './sanity/schemaTypes'

export default defineConfig({
  name: 'default',
  title: 'KOBACO Addressable TV',

  projectId: 'b3t3grue',
  dataset: 'production',

  basePath: '/admin/cms', // 접속 주소: localhost:3000/admin/cms

  plugins: [deskTool()],

  schema: {
    types: schemaTypes,
  },
})
