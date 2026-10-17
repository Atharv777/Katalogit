import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { mkdirSync, writeFileSync } from "node:fs";
import ProductArt, { type ProductKind } from "../src/components/ProductArt";
mkdirSync("public/demo", { recursive: true });
for (const [kind, color] of [
  ["bag", "#ed7959"],
  ["headphones", "#aaa0db"],
  ["vase", "#b6bba0"],
  ["lamp", "#e4ab65"],
]) {
  const svg = renderToStaticMarkup(
    <ProductArt kind={kind as ProductKind} color={color} />,
  ).replace("<svg ", '<svg xmlns="http://www.w3.org/2000/svg" ');
  writeFileSync(`public/demo/${kind}.svg`, svg);
}
