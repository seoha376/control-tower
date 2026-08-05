export function parseGithubRepositoryUrl(value = '') {
  let url;
  try {
    url = new URL(String(value).trim());
  } catch {
    return null;
  }

  if (url.hostname.toLowerCase() !== 'github.com') return null;

  const [owner, rawRepo] = url.pathname.split('/').filter(Boolean);
  if (!owner || !rawRepo) return null;

  const repo = rawRepo.replace(/\.git$/i, '');
  if (!repo) return null;

  return {
    owner,
    repo,
    fullName: `${owner}/${repo}`,
    normalizedUrl: `https://github.com/${owner}/${repo}`
  };
}

export function suggestProjectNameFromRepository(repo = '') {
  return String(repo)
    .replace(/[-_.]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map(word => {
      if (word.length <= 2) return word.toUpperCase();
      return `${word.slice(0, 1).toUpperCase()}${word.slice(1)}`;
    })
    .join(' ');
}
