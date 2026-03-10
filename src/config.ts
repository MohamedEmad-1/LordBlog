export const SITE = {
  website: "https://astro-ink.pages.dev/", // replace this with your deployed domain
  author: "Mohamed Emad",
  profile: "https://evelx.com/",
  desc: "A minimal, responsive and SEO-friendly Astro blog theme.",
  title: "Astro Ink",
  ogImage: "astro-ink-og.jpg",
  lightAndDarkMode: true,
  postPerIndex: 4,
  postPerPage: 10,
  scheduledPostMargin: 15 * 60 * 1000, // 15 minutes
  showArchives: true,
  showBackButton: true, // show back button in post detail
  editPost: {
    enabled: true,
    text: "Edit page",
    url: "https://github.com/satnaing/astro-ink/edit/main/",
  },
  dynamicOgImage: true,
  dir: "ltr", // "rtl" | "auto"
  lang: "en", // html lang code. Set this empty and default will be "en"
  timezone: "Asia/Bangkok", // Default global timezone (IANA format) https://en.wikipedia.org/wiki/List_of_tz_database_time_zones
} as const;
