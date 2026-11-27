import { resolveNetwatchBaseUrl } from './config';

export async function toAbsoluteNetwatchApiPath(pathOrUrl: string): Promise<string> {
  if (pathOrUrl.startsWith('http://') || pathOrUrl.startsWith('https://')) {
    return pathOrUrl;
  }
  const base = await resolveNetwatchBaseUrl();
  const apiPath = pathOrUrl.startsWith('/') ? pathOrUrl : `/${pathOrUrl}`;
  return `${base}${apiPath}`;
}