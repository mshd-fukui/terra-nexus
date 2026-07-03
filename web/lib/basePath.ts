// GitHub Pages のサブパス配信に対応するためのベースパス。
// next.config の basePath と同じ値を、クライアントの fetch でも使う。
// （Next.js は fetch() のパスに basePath を自動付与しないため明示的に前置する）
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

/** public 配下の静的データへのパスを basePath 付きで解決する。 */
export function dataUrl(path: string): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${BASE_PATH}${p}`;
}
