
import { createClient } from 'next-sanity';
import imageUrlBuilder from '@sanity/image-url';

export const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || 'dummy_project_id'; // Fallback to avoid crash
export const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || 'production';
export const apiVersion = process.env.NEXT_PUBLIC_SANITY_API_VERSION || '2024-01-01';

export const client = createClient({
  projectId,
  dataset,
  apiVersion,
  useCdn: false,
});

// Safe builder that handles missing project ID gracefully
const builder = imageUrlBuilder({
    clientConfig: {
        projectId: projectId,
        dataset: dataset,
    }
});

export function urlFor(source: any) {
  try {
      return builder.image(source);
  } catch (e) {
      return { url: () => '' }; // Fallback
  }
}
