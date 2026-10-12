/**
 * Runtime DOM translator.
 *
 * When activated, this walks the document body and replaces visible
 * English text with Marathi equivalents (using `marathiDictionary`).
 * A MutationObserver keeps the document in sync as React re-renders.
 *
 * Design constraints:
 *   - Never mutates input/textarea values (only their placeholders).
 *   - Never touches text inside <script>, <style>, <code>, <pre>, or
 *     any element with [data-no-translate] / .notranslate.
 *   - Tracks translated text nodes via a WeakMap to avoid feedback
 *     loops when our own writes trigger characterData mutations.
 *   - Reverts back to the original text when deactivated.
 */

import { isTranslatable, translateToMarathi } from './marathiDictionary';

type TextCache = {
  /** The most recent English source we saw for this node. */
  source: string;
  /** The Marathi value we wrote (so we can detect React re-rendering). */
  translated: string;
};

class DomTranslator {
  private active = false;
  private observer: MutationObserver | null = null;
  private textCache = new WeakMap<Text, TextCache>();
  private attrCache = new WeakMap<Element, Map<string, { source: string; translated: string }>>();

  // Attributes we translate (visible to users).
  private static readonly TRANSLATABLE_ATTRS = ['placeholder', 'title', 'aria-label', 'alt'];

  // Elements whose contents we never touch.
  private static readonly SKIP_TAGS = new Set([
    'SCRIPT',
    'STYLE',
    'CODE',
    'PRE',
    'KBD',
    'SAMP',
    'TEXTAREA',
    'INPUT',
    'NOSCRIPT',
    'svg',
    'SVG',
    'PATH',
    'path',
  ]);

  start() {
    if (this.active) return;
    this.active = true;
    this.translateSubtree(document.body);
    this.observer = new MutationObserver(this.onMutations);
    this.observer.observe(document.body, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
      attributeFilter: DomTranslator.TRANSLATABLE_ATTRS,
    });
  }

  stop() {
    if (!this.active) return;
    this.active = false;
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
    this.revertAll(document.body);
  }

  private onMutations = (mutations: MutationRecord[]) => {
    if (!this.active) return;
    // Disconnect briefly so our own writes don't re-trigger us.
    this.observer?.disconnect();
    try {
      for (const m of mutations) {
        if (m.type === 'characterData' && m.target.nodeType === Node.TEXT_NODE) {
          this.translateTextNode(m.target as Text);
        } else if (m.type === 'childList') {
          m.addedNodes.forEach(n => this.translateNode(n));
        } else if (m.type === 'attributes' && m.target.nodeType === Node.ELEMENT_NODE) {
          this.translateAttributes(m.target as Element);
        }
      }
    } finally {
      this.observer?.observe(document.body, {
        subtree: true,
        childList: true,
        characterData: true,
        attributes: true,
        attributeFilter: DomTranslator.TRANSLATABLE_ATTRS,
      });
    }
  };

  private translateNode(node: Node) {
    if (node.nodeType === Node.TEXT_NODE) {
      this.translateTextNode(node as Text);
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    const el = node as Element;
    if (this.shouldSkipElement(el)) return;
    this.translateAttributes(el);
    this.translateSubtree(el);
  }

  private translateSubtree(root: Node) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, {
      acceptNode: (n: Node) => {
        if (n.nodeType === Node.ELEMENT_NODE) {
          if (this.shouldSkipElement(n as Element)) return NodeFilter.FILTER_REJECT;
          return NodeFilter.FILTER_SKIP; // continue into element but don't translate the element itself
        }
        return NodeFilter.FILTER_ACCEPT;
      },
    });

    // Walk: also translate attributes on each element along the way.
    if (root.nodeType === Node.ELEMENT_NODE) {
      this.translateAttributes(root as Element);
    }

    let current: Node | null = walker.nextNode();
    while (current) {
      if (current.nodeType === Node.TEXT_NODE) {
        this.translateTextNode(current as Text);
      } else if (current.nodeType === Node.ELEMENT_NODE) {
        this.translateAttributes(current as Element);
      }
      current = walker.nextNode();
    }
  }

  private shouldSkipElement(el: Element): boolean {
    const tag = el.tagName;
    if (DomTranslator.SKIP_TAGS.has(tag)) return true;
    if (el.hasAttribute('data-no-translate')) return true;
    if (el.classList && el.classList.contains('notranslate')) return true;
    if ((el as HTMLElement).contentEditable === 'true') return true;
    return false;
  }

  private translateTextNode(node: Text) {
    if (!this.active) return;
    const parent = node.parentElement;
    if (!parent || this.shouldSkipElement(parent)) return;

    // Skip if any ancestor is skip-worthy
    let walker: Element | null = parent;
    while (walker) {
      if (this.shouldSkipElement(walker)) return;
      walker = walker.parentElement;
    }

    const current = node.nodeValue ?? '';
    if (!current) return;

    const cached = this.textCache.get(node);
    if (cached && cached.translated === current) {
      // Our previous translation is still in place; nothing to do.
      return;
    }

    // The source is whatever's there now (English from React render).
    if (!isTranslatable(current)) return;

    const translated = translateToMarathi(current);
    if (translated === current) return;

    node.nodeValue = translated;
    this.textCache.set(node, { source: current, translated });
  }

  private translateAttributes(el: Element) {
    if (!this.active) return;
    if (this.shouldSkipElement(el)) return;

    let map = this.attrCache.get(el);
    for (const attr of DomTranslator.TRANSLATABLE_ATTRS) {
      const value = el.getAttribute(attr);
      if (!value) continue;
      const entry = map?.get(attr);
      if (entry && entry.translated === value) continue;
      if (!isTranslatable(value)) continue;
      const translated = translateToMarathi(value);
      if (translated === value) continue;
      el.setAttribute(attr, translated);
      if (!map) {
        map = new Map();
        this.attrCache.set(el, map);
      }
      map.set(attr, { source: value, translated });
    }
  }

  private revertAll(root: Node) {
    // Restore original English text & attributes.
    const restore = (n: Node) => {
      if (n.nodeType === Node.TEXT_NODE) {
        const t = n as Text;
        const cached = this.textCache.get(t);
        if (cached && t.nodeValue === cached.translated) {
          t.nodeValue = cached.source;
        }
        return;
      }
      if (n.nodeType !== Node.ELEMENT_NODE) return;
      const el = n as Element;
      const map = this.attrCache.get(el);
      if (map) {
        for (const [attr, { source, translated }] of map.entries()) {
          if (el.getAttribute(attr) === translated) el.setAttribute(attr, source);
        }
      }
      for (const child of Array.from(n.childNodes)) restore(child);
    };
    restore(root);
    // Drop caches so next activation starts fresh.
    this.textCache = new WeakMap();
    this.attrCache = new WeakMap();
  }
}

export const domTranslator = new DomTranslator();
