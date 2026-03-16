# AI Blog Writing Template (Universal)

Use this template as a prompt for any AI model.
Tell the AI: "Return only valid markdown for this blog file."

---

You are writing a blog post for an Astro blog.

Post type (choose one):
- hardware-review
- software-comparison
- code-guide

Global requirements:
- Output must be a single markdown file.
- Include valid frontmatter with this exact field set only.
- Tone must be clear, practical, and evidence-based.
- Avoid fake claims, avoid fluff, and clearly state assumptions.
- Add a concise conclusion with recommendations.
- Include useful headings and scannable sections.

Frontmatter rules (must match project schema):
- author: string
- pubDatetime: ISO date time string
- modDatetime: null or ISO date time string
- title: string
- featured: boolean
- draft: boolean
- tags: array of strings
- description: string
- ogImage: optional (use only if provided)
- canonicalURL: optional
- hideEditPost: optional boolean
- timezone: optional string

Output in this exact format:

---
author: Mohamed Emad
pubDatetime: 2026-03-16T10:00:00Z
modDatetime: null
title: "<Post Title>"
featured: false
draft: false
tags:
  - <primary-tag>
  - <secondary-tag>
description: "<1-2 sentence summary>"
# ogImage: ../../assets/images/<image-file>.png
# canonicalURL: https://example.com/original-post
# hideEditPost: true
timezone: Asia/Bangkok
---

## Quick Summary

<One short paragraph with the key takeaway>

## Context

<Who this is for, use-case, budget/performance constraints>

## Main Content

Use exactly one of these structures based on post type:

### If post type is hardware-review

## Product Overview
<What it is, target user, price segment>

## Test Setup
<Environment, methodology, what was measured>

## Performance and Real-World Use
<Benchmarks and practical experience>

## Pros and Cons
- Pros: <bullet list>
- Cons: <bullet list>

## Verdict
<Who should buy it, who should skip it>

### If post type is software-comparison

## What Is Being Compared
<Tool A vs Tool B (and C if needed)>

## Comparison Criteria
<Features, pricing, learning curve, ecosystem, performance>

## Side-by-Side Table
| Criteria | Option A | Option B | Winner |
| --- | --- | --- | --- |
| <criterion> | <details> | <details> | <A/B/Tie> |

## Trade-Off Analysis
<Where each option wins and loses>

## Recommendation by Scenario
- For beginners: <choice>
- For teams: <choice>
- For power users: <choice>

### If post type is code-guide

## Problem
<What we are solving>

## Approach
<High-level strategy>

## Implementation
<Step-by-step explanation>

```ts
// Replace with a real, runnable example relevant to the article.
export function example() {
  return "hello";
}
```

## Common Mistakes
- <mistake 1>
- <mistake 2>

## Final Thoughts

<Short conclusion and next action>
