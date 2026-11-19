export const getCssVarInPx = (
  element: HTMLElement | Document,
  varName: string,
): number => {
  // Custom properties inherit, so an element's computed style also sees
  // values declared on its ancestors or :root.
  const style = getComputedStyle(
    element instanceof Document ? element.documentElement : element,
  );
  const rawValue = style.getPropertyValue(varName)?.trim() || "";

  if (!rawValue) return 0;

  if (rawValue.endsWith("px")) {
    return parseFloat(rawValue) || 0;
  }

  if (rawValue.endsWith("rem")) {
    const rootFontSize = parseFloat(style.fontSize) || 16;
    return (parseFloat(rawValue) || 0) * rootFontSize;
  }

  // fallback: try to parse whatever value is provided (e.g., number)
  return parseFloat(rawValue) || 0;
};

export const getDocumentCssVarInPx = (varName: string): number =>
  getCssVarInPx(window.document, varName);
