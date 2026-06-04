/**
 * RecorderAgent — Selector Generator (TypeScript)
 * Ported for Next Gen Automation Studio
 */

export interface ElementInfo {
  id?: string;
  tagName?: string;
  className?: string;
  innerText?: string;
  name?: string;
  type?: string;
  placeholder?: string;
  ariaLabel?: string;
  dataTestId?: string;
  dataAttributes?: Record<string, string>;
  cssPath?: string;
  xpath?: string;
}

export interface SelectorMeta {
  selector: string;
  type: 'css' | 'xpath' | 'id' | 'text';
  confidence: number;
  strategy: string;
}

export class SelectorGenerator {
  /**
   * Generate a ranked list of selectors for a given element descriptor
   */
  static generateSelectors(elementInfo: ElementInfo) {
    const selectors: SelectorMeta[] = [];

    // Strategy 1: ID
    if (elementInfo.id) {
      selectors.push({
        selector: `#${elementInfo.id}`,
        type: 'id',
        confidence: 1.0,
        strategy: 'id'
      });
    }

    // Strategy 2: data-testid
    if (elementInfo.dataTestId) {
      selectors.push({
        selector: `[data-testid="${elementInfo.dataTestId}"]`,
        type: 'css',
        confidence: 0.95,
        strategy: 'data-testid'
      });
    }

    // Strategy 3: data-* attributes
    if (elementInfo.dataAttributes) {
      for (const [attr, val] of Object.entries(elementInfo.dataAttributes)) {
        if (attr !== 'testid' && val) {
          selectors.push({
            selector: `[data-${attr}="${val}"]`,
            type: 'css',
            confidence: 0.9,
            strategy: `data-${attr}`
          });
        }
      }
    }

    // Strategy 4: aria-label
    if (elementInfo.ariaLabel) {
      selectors.push({
        selector: `[aria-label="${elementInfo.ariaLabel}"]`,
        type: 'css',
        confidence: 0.85,
        strategy: 'aria-label'
      });
    }

    // Strategy 5: name attribute
    if (elementInfo.name && elementInfo.tagName) {
      selectors.push({
        selector: `${elementInfo.tagName.toLowerCase()}[name="${elementInfo.name}"]`,
        type: 'css',
        confidence: 0.85,
        strategy: 'name'
      });
    }

    // Strategy 6: Playwright-style text selector
    if (elementInfo.innerText && elementInfo.innerText.length < 50) {
      selectors.push({
        selector: `text="${elementInfo.innerText.trim()}"`,
        type: 'text',
        confidence: 0.7,
        strategy: 'text-content'
      });
    }

    // Strategy 7: Unique CSS path
    if (elementInfo.cssPath) {
      selectors.push({
        selector: elementInfo.cssPath,
        type: 'css',
        confidence: 0.6,
        strategy: 'css-path'
      });
    }

    // Strategy 8: XPath
    if (elementInfo.xpath) {
      selectors.push({
        selector: elementInfo.xpath,
        type: 'xpath',
        confidence: 0.5,
        strategy: 'xpath'
      });
    }

    // Strategy 9: Composite
    const compositeSelector = this._buildCompositeSelector(elementInfo);
    if (compositeSelector) {
      selectors.push({
        selector: compositeSelector,
        type: 'css',
        confidence: 0.65,
        strategy: 'composite-css'
      });
    }

    selectors.sort((a, b) => b.confidence - a.confidence);

    return {
      best: selectors[0] || { selector: elementInfo.cssPath || '', type: 'css', confidence: 0.3, strategy: 'fallback' },
      alternatives: selectors.slice(1),
      all: selectors
    };
  }

  private static _buildCompositeSelector(elementInfo: ElementInfo): string | null {
    const parts: string[] = [];

    if (elementInfo.tagName) {
      parts.push(elementInfo.tagName.toLowerCase());
    }

    if (elementInfo.className) {
      const classes = elementInfo.className.split(/\s+/).filter(c => {
        return c && c.length < 30 && !/^[a-z]{1,3}[-_][A-Za-z0-9]{4,}/.test(c);
      });
      if (classes.length > 0 && classes.length <= 3) {
        parts.push(classes.map(c => `.${c}`).join(''));
      }
    }

    if (elementInfo.type && ['text', 'email', 'password', 'submit', 'button', 'checkbox', 'radio'].includes(elementInfo.type)) {
      parts.push(`[type="${elementInfo.type}"]`);
    }

    if (elementInfo.placeholder) {
      parts.push(`[placeholder="${elementInfo.placeholder}"]`);
    }

    return parts.length > 1 ? parts.join('') : null;
  }

  static describeSelector(selector: string, type: string): string {
    if (type === 'id') return `element with ID "${selector.replace('#', '')}"`;
    if (type === 'text') return `element with text ${selector}`;
    if (selector.startsWith('[aria-label=')) return `element labeled "${selector.match(/"([^"]+)"/)?.[1] || selector}"`;
    if (selector.startsWith('[data-testid=')) return `test element "${selector.match(/"([^"]+)"/)?.[1] || selector}"`;
    return `element matching "${selector}"`;
  }
}
