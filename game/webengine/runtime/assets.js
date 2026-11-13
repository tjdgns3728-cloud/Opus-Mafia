// assets module: where the project's files are (images, sounds, data), and loading data files.
// engine.assets.url("그림/고양이.png") → address for <img>/Audio; await engine.assets.json("data/문제.json").
WebEngine.module("assets", engine => {
  const base = engine.opts.assetBase ?? "/project/assets/", query = engine.opts.assetQuery || "";
  const cache = {};
  return {
    url: path => path ? base + String(path).split("/").map(encodeURIComponent).join("/") + query : "",
    async json(path) {
      if (cache[path]) return cache[path];
      if (typeof fetch !== "function") throw new Error("이 환경에서는 파일을 불러올 수 없음");
      const r = await fetch(this.url(path));
      if (!r.ok) throw new Error(`자원 없음: ${path}`);
      return (cache[path] = await r.json());
    },
    async text(path) { const r = await fetch(this.url(path)); if (!r.ok) throw new Error(`자원 없음: ${path}`); return r.text(); }
  };
});
