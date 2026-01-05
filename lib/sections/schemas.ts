import { z } from 'zod';

// Shared Helpers
const urlSchema = z.string().url().optional().or(z.literal(''));
const hexColorSchema = z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/).optional();

const ctaSchema = z.object({
    label: z.string().min(1),
    actionType: z.enum(['link', 'scroll', 'openEstimator']).default('link'),
    target: z.string().optional(), // URL or Element ID
    payload: z.any().optional(),   // For complex actions like openEstimator config
    variant: z.enum(['primary', 'secondary', 'outline']).default('primary').optional()
});

// 1. Hero Template
export const heroSchema = z.object({
    eyebrow: z.string().optional(),
    title: z.string().min(1, "Title is required"),
    subtitle: z.string().optional(),
    ctas: z.array(ctaSchema).max(2).optional(),
    stats: z.array(z.object({
        value: z.string(),
        label: z.string()
    })).max(4).optional(),
    kpis: z.array(z.object({
        value: z.string(),
        label: z.string()
    })).optional(), // Legacy field, same as stats
    backgroundImage: urlSchema
}).passthrough(); // Allow extra fields for backwards compatibility

// 2. Value Props (Fixed 3 cards)
export const valuePropsSchema = z.object({
    title: z.string().min(1),
    description: z.string().optional(),
    cards: z.array(z.object({
        icon: z.string().optional(), // Lucide icon name or image URL
        title: z.string().min(1),
        description: z.string().min(1)
    })).min(3).max(3)
}).passthrough();

// 3. Concept (Addressable TV)
export const conceptSchema = z.object({
    title: z.string().min(1),
    subtitle: z.string().optional(),
    description: z.string().optional(),
    image: urlSchema, // Diagram or concept image
    features: z.array(z.string()).optional()
}).passthrough();

// 4. Comparison (Traditional vs Addressable)
export const comparisonSchema = z.object({
    title: z.string().min(1),
    left: z.object({
        title: z.string(),
        items: z.array(z.string())
    }),
    right: z.object({
        title: z.string(),
        items: z.array(z.string()),
        highlight: z.boolean().default(true).optional()
    })
}).passthrough();

// 5. How It Works (4 Steps)
export const howItWorksSchema = z.object({
    title: z.string().min(1),
    steps: z.array(z.object({
        step: z.number(),
        title: z.string(),
        description: z.string(),
        image: urlSchema.optional()
    })).min(4).max(4)
}).passthrough();

// 6. Use Cases (Flexible Grid)
export const useCasesSchema = z.object({
    title: z.string().min(1),
    subtitle: z.string().optional(),
    description: z.string().optional(),
    cases: z.array(z.object({
        tag: z.string().min(1),
        title: z.string(),
        description: z.string(),
        metrics: z.array(z.string()).optional(), // Optional now
        image: urlSchema.optional()
    })).min(1).max(6) // Relaxed limit
}).passthrough();

// 7. Why (Extra Reach)
export const whySchema = z.object({
    title: z.string().min(1),
    description: z.string().optional(),
    cards: z.array(z.object({
        title: z.string(),
        value: z.string(),
        description: z.string().optional()
    })).optional()
}).passthrough();

// 8. Estimate Guide
export const estimateGuideSchema = z.object({
    title: z.string().min(1),
    steps: z.array(z.string()).min(1)
}).passthrough();

// 9. CTA (Global Bottom CTA)
export const globalCtaSchema = z.object({
    title: z.string().min(1),
    description: z.string().optional(),
    buttonText: z.string().min(1),
    buttonLink: z.string().optional()
}).passthrough();

// FAQ (Optional but present in code)
const faqItemSchema = z.object({
    question: z.string(),
    answer: z.string()
});
export const faqSchema = z.object({
    title: z.string(),
    questions: z.array(faqItemSchema)
}).passthrough();

// Reporting (Optional but present in code)
export const reportingSchema = z.object({
    title: z.string(),
    description: z.string(),
    image: urlSchema
}).passthrough();


// Type Registry for Validation
export const SECTION_SCHEMAS: Record<string, z.ZodObject<any>> = {
    hero: heroSchema,
    valueProps: valuePropsSchema,
    concept: conceptSchema,
    comparison: comparisonSchema,
    howItWorks: howItWorksSchema,
    useCases: useCasesSchema,
    why: whySchema,
    estimateGuide: estimateGuideSchema,
    cta: globalCtaSchema,
    faq: faqSchema,
    reporting: reportingSchema
};

export type SectionType = keyof typeof SECTION_SCHEMAS;
