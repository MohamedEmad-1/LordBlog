# General Purpose Blog Template

Use this prompt with an AI model. Tell it: "Return only valid markdown for this blog file."

---

Write a blog post for an Astro blog.

This is a general-purpose template that can be used for:
- software reviews
- software comparisons
- hardware news
- hardware comparisons
- code guides
- library write-ups
- mixed posts that combine more than one of the above

Requirements:
- Output a single markdown file.
- Use the exact frontmatter fields below.
- Keep the article informative, specific, and practical.
- Include a clear personal take, not just neutral summary.
- Include factual data where relevant.
- Do not invent specs, prices, release dates, performance numbers, or features.
- If information is missing or uncertain, state that directly.
- Use only the sections that fit the topic and remove irrelevant ones.

Frontmatter:

---
author: Mohamed Emad
pubDatetime: 2026-03-16T10:00:00Z
modDatetime: null
title: "<Post Title>"
featured: false
draft: false
tags:
  - <tag-1>
  - <tag-2>
description: "<1-2 sentence summary>"
# ogImage: ../../assets/images/<image-file>.png
# canonicalURL: https://example.com/original-post
# hideEditPost: true
timezone: Asia/Bangkok
---

## Quick Summary

<One short paragraph with the main takeaway>

## Context

<Explain what is being discussed, who it is for, and why it matters>

## Key Facts

Use this section when the topic includes products, tools, hardware, software, or technical implementation details.

- Category: <software, hardware, code, library, comparison, news>
- Product or tool names: <name(s)>
- Platform or ecosystem: <value>
- Price or licensing: <value or unknown>
- Release status: <released, announced, updated, rumored>
- Key specs or features: <list>
- Constraints or drawbacks: <list>

## Main Analysis

Choose the subsections that fit the article:

### For reviews

<Real-world experience, usability, strengths, weaknesses>

### For comparisons

| Criteria | Option A | Option B | Winner |
| --- | --- | --- | --- |
| <criterion> | <details> | <details> | <A/B/Tie> |

### For news

<What happened, what is confirmed, what remains unknown>

### For code or libraries

```ts
// Replace with a real example when the article is technical.
export function example() {
  return "hello";
}
```

<Explain implementation details, trade-offs, or API behavior>

## Personal Take

<State your opinion clearly. Explain what you think is actually important, overhyped, underrated, or worth watching. Make it sound like a real editorial judgment, not generic praise.>

## Who This Is For

- Best for: <audience>
- Not ideal for: <audience>

## Final Verdict

<Close with a practical recommendation, conclusion, or next thing readers should do or watch>
