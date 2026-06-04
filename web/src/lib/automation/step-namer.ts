/**
 * RecorderAgent — AI Step Namer (TypeScript)
 * Ported for Next Gen Automation Studio
 */

export type AIProvider = 'heuristic' | 'openai' | 'ollama';

export interface StepData {
  actionType: string;
  elementInfo?: any;
  value?: string;
  key?: string;
  url?: string;
  modifiers?: any;
  selectedText?: string;
  assertion?: string;
}

export class StepNamer {
  private provider: AIProvider;

  constructor(provider: AIProvider = 'heuristic') {
    this.provider = provider;
  }

  /**
   * Generate a human-readable label for a recorded step
   */
  async nameStep(step: StepData): Promise<string> {
    switch (this.provider) {
      case 'heuristic':
        return this._heuristicName(step);
      case 'openai':
        return await this._openAIName(step);
      case 'ollama':
        return await this._ollamaName(step);
      default:
        return this._heuristicName(step);
    }
  }

  /**
   * Heuristic-based step naming
   */
  private _heuristicName(step: StepData): string {
    const { actionType, elementInfo, value, key, url } = step;
    const tag = elementInfo?.tagName?.toLowerCase() || 'element';
    const label = this._getElementLabel(elementInfo);

    switch (actionType) {
      case 'click': {
        if (tag === 'a') return `Click link "${label}"`;
        if (tag === 'button' || elementInfo?.type === 'submit') return `Click button "${label}"`;
        if (tag === 'input' && elementInfo?.type === 'checkbox') return `Toggle checkbox "${label}"`;
        if (tag === 'input' && elementInfo?.type === 'radio') return `Select radio "${label}"`;
        if (tag === 'select') return `Open dropdown "${label}"`;
        if (['img', 'svg'].includes(tag)) return `Click image "${label}"`;
        if (tag === 'li') return `Click list item "${label}"`;
        if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'span', 'p', 'div'].includes(tag)) return `Click "${label}"`;
        return `Click ${tag} "${label}"`;
      }

      case 'dblclick':
        return `Double-click ${tag} "${label}"`;

      case 'type': {
        const fieldName = this._getFieldName(elementInfo);
        if (elementInfo?.type === 'password') return `Type password in ${fieldName}`;
        if (elementInfo?.type === 'email') return `Type email "${value}" in ${fieldName}`;
        if (elementInfo?.type === 'search') return `Search for "${value}"`;
        const truncatedValue = value && value.length > 40 ? value.substring(0, 40) + '...' : value;
        return `Type "${truncatedValue}" in ${fieldName}`;
      }

      case 'select':
        return `Select "${step.selectedText || value}" from ${this._getFieldName(elementInfo)}`;

      case 'check':
        return value === 'true'
          ? `Check "${label}"`
          : `Uncheck "${label}"`;

      case 'submit':
        return `Submit form "${label}"`;

      case 'navigate':
        return `Navigate to ${this._truncateUrl(url)}`;

      case 'keypress':
        return `Press ${this._formatKey(key || '', step.modifiers)}`;

      case 'scroll':
        return `Scroll page`;

      case 'hover':
        return `Hover over "${label}"`;

      case 'wait':
        return `Wait for ${value || 'element'}`;

      case 'screenshot':
        return `Take screenshot`;

      case 'assert':
        return `Verify "${label}" ${step.assertion || 'exists'}`;

      default:
        return `${actionType} on "${label}"`;
    }
  }

  private _getElementLabel(info: any): string {
    if (!info) return 'unknown';
    if (info.ariaLabel) return this._truncate(info.ariaLabel, 30);
    if (info.innerText) return this._truncate(info.innerText.trim(), 30);
    if (info.placeholder) return this._truncate(info.placeholder, 30);
    if (info.name) return info.name;
    if (info.id) return `#${info.id}`;
    if (info.className) {
      const firstClass = info.className.split(/\s+/)[0];
      if (firstClass && firstClass.length < 25) return `.${firstClass}`;
    }
    return info.tagName?.toLowerCase() || 'element';
  }

  private _getFieldName(info: any): string {
    if (!info) return 'field';
    if (info.ariaLabel) return `"${this._truncate(info.ariaLabel, 25)}" field`;
    if (info.placeholder) return `"${this._truncate(info.placeholder, 25)}" field`;
    if (info.name) return `"${info.name}" field`;
    if (info.id) return `"${info.id}" field`;
    if (info.type) return `${info.type} field`;
    return 'field';
  }

  private _truncate(str: string, maxLen: number): string {
    if (!str) return '';
    str = str.replace(/\n/g, ' ').trim();
    return str.length > maxLen ? str.substring(0, maxLen) + '…' : str;
  }

  private _truncateUrl(url?: string): string {
    if (!url) return 'page';
    try {
      const u = new URL(url);
      return u.hostname + (u.pathname !== '/' ? u.pathname : '');
    } catch {
      return url.substring(0, 50);
    }
  }

  private _formatKey(key: string, modifiers?: any): string {
    const parts: string[] = [];
    if (modifiers?.meta) parts.push('Cmd');
    if (modifiers?.ctrl) parts.push('Ctrl');
    if (modifiers?.alt) parts.push('Alt');
    if (modifiers?.shift) parts.push('Shift');
    parts.push(key);
    return parts.join('+');
  }

  private async _openAIName(step: StepData): Promise<string> {
    console.warn('[StepNamer] OpenAI provider not yet implemented, falling back to heuristic');
    return this._heuristicName(step);
  }

  private async _ollamaName(step: StepData): Promise<string> {
    console.warn('[StepNamer] Ollama provider not yet implemented, falling back to heuristic');
    return this._heuristicName(step);
  }
}
