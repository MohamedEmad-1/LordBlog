---
author: Mohamed Emad
pubDatetime: 2026-03-16T11:40:00Z
modDatetime: null
title: How I Think About Picking a Tech Stack for a New Project
featured: true
draft: false
tags:
  - engineering
  - architecture
  - strategy
  - client-work
description: A practical decision framework for choosing a tech stack based on maintenance, deployment, and real client needs.
timezone: Asia/Bangkok
---

Every developer has a default stack they reach for. Mine used to be Next.js for almost everything.

Then I shipped a small marketing site and spent disproportionate time on deployment complexity for a project that could have been static HTML. That was a useful wake-up call.

## The Wrong Way to Choose

- Whatever you used last time.
- Whatever is trending this month.
- Whatever has the most stars.

These methods optimize for comfort or hype, not project outcomes.

## Key Facts

### The right early questions

- Who maintains this after launch?
- What does the client actually need in month 1?
- What is the deployment and rollback story?
- What are the ongoing hosting and operational costs?

### Static vs dynamic

Most projects are over-engineered on first version.

If content is mostly static and user-specific behavior is limited, static-first architecture is often the better baseline.

### The WordPress conversation

WordPress is still a valid answer for many business sites.

It becomes technical debt when forced into workflows that need app-like behavior, strict custom architecture, or modern deployment discipline.

## My Practical Decision Tree

1. Is this primarily content delivery?
   - Yes: start static-first.
2. Do we need auth and user-specific server logic now?
   - Yes: use an app framework.
3. Who owns maintenance after launch?
   - If non-technical, reduce moving parts aggressively.
4. Can hosting and deployment be operated reliably by the actual team?
   - If not, simplify stack before writing more code.

## Personal Take

"Use what you know" is underrated for client reliability and overrated for personal growth.

For paid work, consistency and maintainability usually matter more than chasing the newest tool.

For personal projects, experimentation is valuable. But I still try to keep deployment and maintenance realistic.

## The Real Priority

Framework choice is often less important than deployment, hosting, and maintenance strategy.

A technically perfect stack with weak operations is worse than a simpler stack that ships reliably.

## Final Thoughts

The stack should serve the project, not the other way around.

Pick the boring, durable option unless the requirements clearly justify extra complexity.