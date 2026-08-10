import assert from "node:assert/strict";
import test from "node:test";

import {
  normalizeMdxHtmlImages,
  parseImageSizeTitle,
} from "@/lib/mdx/normalize-content-images";

test("converts JSX/HTML img to markdown image and keeps size in title", () => {
  const input =
    'Hello\n\n<img src="https://res.cloudinary.com/demo/image/upload/sample.jpg" alt="buffalo" width="400" height="300" />\n\nBye';
  const output = normalizeMdxHtmlImages(input);
  assert.equal(
    output,
    'Hello\n\n![buffalo](https://res.cloudinary.com/demo/image/upload/sample.jpg "400x300")\n\nBye'
  );
});

test("omits size title when width/height are inherit", () => {
  const input =
    '<img src="https://res.cloudinary.com/demo/image/upload/sample.jpg" alt="x" width="inherit" height="inherit" />';
  assert.equal(
    normalizeMdxHtmlImages(input),
    "![x](https://res.cloudinary.com/demo/image/upload/sample.jpg)"
  );
});

test("drops unsafe or src-less img tags", () => {
  assert.equal(normalizeMdxHtmlImages('<img alt="x" />'), "");
  assert.equal(normalizeMdxHtmlImages('<img src="javascript:alert(1)" alt="x" />'), "");
});

test("parseImageSizeTitle reads WxH", () => {
  assert.deepEqual(parseImageSizeTitle("400x300"), { width: 400, height: 300 });
  assert.deepEqual(parseImageSizeTitle("400x"), { width: 400, height: undefined });
  assert.deepEqual(parseImageSizeTitle("caption"), {});
});
