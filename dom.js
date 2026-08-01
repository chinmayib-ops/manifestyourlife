// Tiny DOM builder. Prefix a tag with "svg:" to create it in the SVG namespace.
//
// Note: on SVG elements `className` is a read-only SVGAnimatedString, so class
// must always go through setAttribute -- which works for HTML elements too.

export function h(tag, attrs = {}, children = []) {
  const el = tag.startsWith("svg:")
    ? document.createElementNS("http://www.w3.org/2000/svg", tag.slice(4))
    : document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === "className") el.setAttribute("class", v);
    else if (k === "style" && typeof v === "object") setStyle(el, v);
    else if (k.startsWith("on") && typeof v === "function") el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === "text") el.textContent = v;
    else el.setAttribute(k, v);
  }
  for (const c of [].concat(children)) {
    if (c == null || c === false) continue;
    el.appendChild(typeof c === "string" || typeof c === "number" ? document.createTextNode(String(c)) : c);
  }
  return el;
}

// Object.assign onto el.style silently drops CSS custom properties (--foo),
// which the star animations rely on, so set those explicitly.
function setStyle(el, styles) {
  for (const [prop, val] of Object.entries(styles)) {
    if (prop.startsWith("--")) el.style.setProperty(prop, val);
    else el.style[prop] = val;
  }
}

export const svg = (tag, attrs, children) => h("svg:" + tag, attrs, children);
