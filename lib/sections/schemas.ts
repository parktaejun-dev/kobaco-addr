import { z } from 'zod';

// Shared Helpers
const urlSchema = z.string().url().optional().or(z.literal(''));

// Common Style Fields - can be added to any section
const sizeEnum = z.enum(['sm', 'md', 'lg', 'xl']).optional();
const colorEnum = z.enum(['white', 'slate', 'blue', 'green', 'purple', 'orange', 'red']).optional();

const ctaSchema = z.object({
    label: z.string().min(1),
    actionType: z.enum(['link', 'scroll', 'openEstimator']).default('link'),
    target: z.string().optional(),
    payload: z.any().optional(),
    variant: z.enum(['primary', 'secondary', 'outline']).default('primary').optional()
}).passthrough();

// 1. Hero Template
export const heroSchema = z.object({
    eyebrow: z.string().optional(),
    eyebrowBg: z.enum(['blue', 'green', 'purple', 'orange', 'red', 'slate', 'none']).optional(),
    title: z.string().min(1, "Title is required"),
    titleSize: sizeEnum,
    titleColor: colorEnum,
    subtitle: z.string().optional(),
    subtitleSize: sizeEnum,
    subtitleColor: colorEnum,
    ctas: z.array(ctaSchema).optional(),
    stats: z.any().optional(),
    kpis: z.any().optional(),
    backgroundImage: urlSchema
}).passthrough();

// 2. Value Props
export const valuePropsSchema = z.object({
    title: z.string().min(1),
    titleSize: sizeEnum,
    titleColor: colorEnum,
    description: z.string().optional(),
    cards: z.array(z.object({
        icon: z.string().optional(),
        title: z.string().optional(),
        description: z.string().optional()
    }).passthrough()).optional()
}).passthrough();

// 3. Concept
export const conceptSchema = z.object({
    eyebrow: z.string().optional(),
    title: z.string().min(1),
    titleSize: sizeEnum,
    titleColor: colorEnum,
    subtitle: z.string().optional(),
    description: z.string().optional(),
    image: urlSchema,
    features: z.array(z.string()).optional(),
    bullets: z.array(z.string()).optional()
}).passthrough();

// 4. Comparison
export const comparisonSchema = z.object({
    title: z.string().min(1),
    titleSize: sizeEnum,
    titleColor: colorEnum,
    left: z.object({
        title: z.string().optional(),
        label: z.string().optional(),
        headline: z.string().optional(),
        description: z.string().optional(),
        items: z.array(z.string()).optional(),
        points: z.array(z.string()).optional()
    }).passthrough(),
    right: z.object({
        title: z.string().optional(),
        label: z.string().optional(),
        headline: z.string().optional(),
        description: z.string().optional(),
        items: z.array(z.string()).optional(),
        points: z.array(z.string()).optional(),
        highlight: z.boolean().optional()
    }).passthrough()
}).passthrough();

// 5. How It Works
export const howItWorksSchema = z.object({
    title: z.string().min(1),
    titleSize: sizeEnum,
    titleColor: colorEnum,
    subtitle: z.string().optional(),
    steps: z.array(z.object({
        step: z.number().optional(),
        title: z.string().optional(),
        description: z.string().optional(),
        image: urlSchema
    }).passthrough()).optional()
}).passthrough();

// 6. Use Cases
export const useCasesSchema = z.object({
    title: z.string().min(1),
    titleSize: sizeEnum,
    titleColor: colorEnum,
    subtitle: z.string().optional(),
    description: z.string().optional(),
    cases: z.array(z.object({
        tag: z.string().optional(),
        title: z.string().optional(),
        description: z.string().optional(),
        metrics: z.array(z.string()).optional(),
        image: urlSchema
    }).passthrough()).optional()
}).passthrough();

// 7. Why
export const whySchema = z.object({
    eyebrow: z.string().optional(),
    title: z.string().min(1),
    titleSize: sizeEnum,
    titleColor: colorEnum,
    description: z.string().optional(),
    cards: z.array(z.object({
        title: z.string().optional(),
        value: z.string().optional(),
        description: z.string().optional()
    }).passthrough()).optional()
}).passthrough();

// 8. Estimate Guide
export const estimateGuideSchema = z.object({
    title: z.string().min(1),
    titleSize: sizeEnum,
    titleColor: colorEnum,
    steps: z.array(z.string()).optional()
}).passthrough();

// 9. CTA (Global Bottom CTA)
export const globalCtaSchema = z.object({
    title: z.string().optional(),
    titleSize: sizeEnum,
    titleColor: colorEnum,
    description: z.string().optional(),
    buttonText: z.string().optional(),
    buttonLink: z.string().optional()
}).passthrough();

// 10. FAQ
const faqItemSchema = z.object({
    question: z.string().optional(),
    answer: z.string().optional()
}).passthrough();

export const faqSchema = z.object({
    title: z.string().optional(),
    titleSize: sizeEnum,
    titleColor: colorEnum,
    questions: z.array(faqItemSchema).optional()
}).passthrough();

// 11. Reporting
export const reportingSchema = z.object({
    title: z.string().optional(),
    titleSize: sizeEnum,
    titleColor: colorEnum,
    description: z.string().optional(),
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
