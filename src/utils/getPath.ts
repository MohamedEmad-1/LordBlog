import { BLOG_PATH } from "@/content.config";
import { slugifyStr } from "./slugify";

const BASE_URL = import.meta.env.BASE_URL;
const normalizedBasePath = BASE_URL.endsWith("/")
  ? BASE_URL.slice(0, -1)
  : BASE_URL;

const withBase = (path: string) => {
  const normalizedPath = path.replace(/^\/+/, "");

  if (!normalizedBasePath || normalizedBasePath === "/") {
    return `/${normalizedPath}`;
  }

  return `${normalizedBasePath}/${normalizedPath}`;
};

/**
 * Get full path of a blog post
 * @param id - id of the blog post (aka slug)
 * @param filePath - the blog post full file location
 * @param includeBase - whether to include `/posts` in return value
 * @returns blog post path
 */
export function getPath(
  id: string,
  filePath: string | undefined,
  includeBase = true
) {
  const pathSegments = filePath
    ?.replace(BLOG_PATH, "")
    .split("/")
    .filter(path => path !== "") // remove empty string in the segments ["", "other-path"] <- empty string will be removed
    .filter(path => !path.startsWith("_")) // exclude directories start with underscore "_"
    .slice(0, -1) // remove the last segment_ file name_ since it's unnecessary
    .map(segment => slugifyStr(segment)); // slugify each segment path

  const basePath = includeBase ? withBase("posts") : "";

  // Making sure `id` does not contain the directory
  const blogId = id.split("/");
  const slug = blogId.at(-1) ?? id;

  // If not inside the sub-dir, simply return the file path
  if (!pathSegments || pathSegments.length < 1) {
    return [basePath, slug].join("/");
  }

  return [basePath, ...pathSegments, slug].join("/");
}
