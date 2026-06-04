export interface ElementMetadata {
  selector?: string;
  text?: string;
  tag?: string;
  class?: string;
  attributes?: Record<string, string>;
  position?: { x: number; y: number };
}

export interface SelectorModel {
  primary: string;
  fallbacks: ElementMetadata[];
  context?: {
    parent?: string;
    nearbyText?: string;
  };
}

export async function findBestMatch(
  target: ElementMetadata,
  domElements: ElementMetadata[]
): Promise<{ match: ElementMetadata; score: number } | null> {
  let bestScore = 0;
  let bestMatch: ElementMetadata | null = null;

  for (const el of domElements) {
    let score = 0;

    // textMatch (40%)
    if (el.text && target.text && el.text === target.text) {
      score += 0.4;
    } else if (el.text && target.text && el.text.includes(target.text)) {
      score += 0.2; // partial match
    }

    // tagMatch (10%)
    if (el.tag && target.tag && el.tag === target.tag) {
      score += 0.1;
    }

    // attributeMatch (30%)
    if (el.attributes && target.attributes) {
      const keys = Object.keys(target.attributes);
      let matchCount = 0;
      keys.forEach(k => {
        if (el.attributes![k] === target.attributes![k]) matchCount++;
      });
      if (keys.length > 0) {
        score += (matchCount / keys.length) * 0.3;
      }
    }

    // classMatch (as part of attributes or separate)
    if (el.class && target.class && el.class === target.class) {
      score += 0.1; // shared class bonus
    }

    if (score > bestScore) {
      bestScore = score;
      bestMatch = el;
    }
  }

  return bestMatch ? { match: bestMatch, score: bestScore } : null;
}

export async function autoHealSelector(
  model: SelectorModel,
  domSnapshot: ElementMetadata[],
  threshold: number = 0.75
): Promise<{ healed: boolean; selector?: string; confidence?: number }> {
  // 1. Try Primary
  // (In a real browser, we'd check document.querySelector(model.primary))
  
  // 2. Try Fallbacks
  for (const fallback of model.fallbacks) {
    // Check if fallback precisely matches anything in snapshot
    const match = domSnapshot.find(el => 
      el.text === fallback.text && el.tag === fallback.tag
    );
    if (match) return { healed: true, selector: match.selector, confidence: 1.0 };
  }

  // 3. Similarity Engine
  const target = model.fallbacks[0] || { selector: model.primary }; // Use first fallback or primary as target
  const result = await findBestMatch(target, domSnapshot);

  if (result && result.score >= threshold) {
    return {
      healed: true,
      selector: result.match.selector,
      confidence: result.score
    };
  }

  return { healed: false };
}
