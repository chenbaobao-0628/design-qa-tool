(function collectDesignQADomNodes() {
  const MAX_TEXT = 120;
  const MIN_AREA = 16;

  function visible(el, rect, style) {
    if (rect.width <= 0 || rect.height <= 0) return false;
    if (rect.width * rect.height < MIN_AREA) return false;
    if (style.display === "none" || style.visibility === "hidden") return false;
    if (Number(style.opacity) === 0) return false;
    return true;
  }

  function selectorFor(el, index) {
    if (el.id) return `#${CSS.escape(el.id)}`;
    const dataTestId = el.getAttribute("data-testid");
    if (dataTestId) return `[data-testid="${CSS.escape(dataTestId)}"]`;
    const cls = Array.from(el.classList || []).slice(0, 3);
    const suffix = cls.length ? `.${cls.map((c) => CSS.escape(c)).join(".")}` : "";
    return `${el.tagName.toLowerCase()}${suffix}:nth-scan(${index})`;
  }

  const nodes = Array.from(document.querySelectorAll("body *"))
    .map((el, index) => {
      const rect = el.getBoundingClientRect();
      const style = getComputedStyle(el);
      if (!visible(el, rect, style)) return null;
      const text = (el.textContent || "").replace(/\s+/g, " ").trim();
      return {
        id: selectorFor(el, index),
        selector: selectorFor(el, index),
        tag: el.tagName.toLowerCase(),
        x: Math.round(rect.x + window.scrollX),
        y: Math.round(rect.y + window.scrollY),
        width: Math.round(rect.width),
        height: Math.round(rect.height),
        color: style.color,
        backgroundColor: style.backgroundColor,
        fontSize: style.fontSize,
        fontWeight: style.fontWeight,
        borderRadius: style.borderRadius,
        text: text.length > MAX_TEXT ? `${text.slice(0, MAX_TEXT)}...` : text,
      };
    })
    .filter(Boolean);

  const payload = {
    capturedAt: new Date().toISOString(),
    url: location.href,
    viewport: {
      width: window.innerWidth,
      height: window.innerHeight,
      scrollX: window.scrollX,
      scrollY: window.scrollY,
    },
    domNodes: nodes,
  };

  const json = JSON.stringify(payload, null, 2);
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(json).then(
      () => console.log(`[Design QA] Copied ${nodes.length} DOM nodes to clipboard.`, payload),
      () => console.log(`[Design QA] ${nodes.length} DOM nodes:`, payload),
    );
  } else {
    console.log(`[Design QA] ${nodes.length} DOM nodes:`, payload);
    console.log(json);
  }
})();
