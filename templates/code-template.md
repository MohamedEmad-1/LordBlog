# Code Guide Template

Use this prompt with an AI model. Tell it: "Return only valid markdown for this blog file."

---

Write a code-focused article for an Astro blog.

Requirements:
- Output a single markdown file.
- Be practical and example-driven.
- Include informative technical detail and a personal take.
- Use real code, not pseudocode unless explicitly stated.
- Explain trade-offs, not just syntax.

Frontmatter:

---
author: Mohamed Emad
pubDatetime: 2026-03-16T10:00:00Z
modDatetime: null
title: "<Coding Topic or Problem>"
featured: false
draft: false
tags:
  - code
  - tutorial
description: "<1-2 sentence summary of the coding problem and solution>"
# ogImage: ../../assets/images/<image-file>.png
# canonicalURL: https://example.com/original-post
# hideEditPost: true
timezone: Asia/Bangkok
---

## Problem

<What is broken, slow, hard, or unclear>

## Key Facts

- Language or framework: <name>
- Environment or version: <value>
- Constraints: <value>
- Expected outcome: <value>

## Approach

<Explain the solution strategy and why it was chosen>

## Implementation

```ts
// Replace with real code relevant to the article.
export function example() {
  return "hello";
}
```

## Explanation

<Walk through the code in plain language>

## Personal Take

<Explain what you like about the approach, where it is weak, and when you would choose something else>

## Common Mistakes

- <mistake 1>
- <mistake 2>

## Final Thoughts

<Short conclusion and next step>
