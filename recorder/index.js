/**
 * QA Automation Recorder Module
 *
 * This module provides utilities for recording browser interactions
 * and converting them to test steps.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Get the bookmarklet code for injection
 */
export function getBookmarkletCode() {
  const bookmarkletPath = path.join(__dirname, 'bookmarklet.js');
  const code = fs.readFileSync(bookmarkletPath, 'utf-8');

  // Minify for bookmarklet
  const minified = code
    .replace(/\/\*[\s\S]*?\*\//g, '') // Remove block comments
    .replace(/\/\/.*$/gm, '') // Remove line comments
    .replace(/\s+/g, ' ') // Collapse whitespace
    .trim();

  return `javascript:${encodeURIComponent(minified)}`;
}

/**
 * Generate selector for an element based on various strategies
 */
export function generateSelector(element, strategy = 'auto') {
  const strategies = {
    // Try data-testid attribute first (most reliable for testing)
    testid: (el) => {
      if (el.dataset?.testid) {
        return `[data-testid="${el.dataset.testid}"]`;
      }
      return null;
    },

    // Try ID
    id: (el) => {
      if (el.id) {
        return `#${el.id}`;
      }
      return null;
    },

    // Try name attribute
    name: (el) => {
      if (el.name) {
        return `[name="${el.name}"]`;
      }
      return null;
    },

    // Try CSS class combination
    class: (el) => {
      if (el.className && typeof el.className === 'string') {
        const classes = el.className.split(' ').filter(c => c);
        if (classes.length > 0) {
          return `${el.tagName.toLowerCase()}.${classes.join('.')}`;
        }
      }
      return null;
    },

    // XPath generation
    xpath: (el) => {
      const parts = [];
      let current = el;
      while (current && current.nodeType === 1) {
        let index = 1;
        let sibling = current.previousSibling;
        while (sibling) {
          if (sibling.nodeType === 1 && sibling.tagName === current.tagName) {
            index++;
          }
          sibling = sibling.previousSibling;
        }
        const tagName = current.tagName.toLowerCase();
        const part = index > 1 ? `${tagName}[${index}]` : tagName;
        parts.unshift(part);
        current = current.parentNode;
      }
      return '/' + parts.join('/');
    },

    // Text content based selector
    text: (el) => {
      const text = el.textContent?.trim();
      if (text && text.length < 50) {
        return `${el.tagName.toLowerCase()}:contains("${text}")`;
      }
      return null;
    }
  };

  if (strategy === 'auto') {
    // Try strategies in order of reliability
    const order = ['testid', 'id', 'name', 'class', 'xpath'];
    for (const strat of order) {
      const selector = strategies[strat](element);
      if (selector) {
        return { selector, strategy: strat };
      }
    }
  } else if (strategies[strategy]) {
    const selector = strategies[strategy](element);
    if (selector) {
      return { selector, strategy };
    }
  }

  return null;
}

/**
 * Convert raw recorded events to test steps
 */
export function eventsToSteps(events) {
  const steps = [];

  for (const event of events) {
    switch (event.type) {
      case 'click':
        steps.push({
          type: 'click',
          selector: event.selector,
          description: `Click on ${event.selector}`
        });
        break;

      case 'input':
      case 'change':
        steps.push({
          type: 'type',
          selector: event.selector,
          value: event.value,
          description: `Type "${event.value}" into ${event.selector}`
        });
        break;

      case 'keydown':
        if (['Enter', 'Tab', 'Escape'].includes(event.key)) {
          steps.push({
            type: 'keyboard',
            key: event.key,
            description: `Press ${event.key} key`
          });
        }
        break;

      case 'scroll':
        steps.push({
          type: 'scroll',
          y: event.scrollY,
          description: `Scroll to ${event.scrollY}px`
        });
        break;

      case 'navigation':
        steps.push({
          type: 'navigate',
          url: event.url,
          description: `Navigate to ${event.url}`
        });
        break;

      default:
        // Unknown event type, skip
        break;
    }
  }

  return steps;
}

/**
 * Merge consecutive similar steps
 */
export function mergeSteps(steps) {
  const merged = [];

  for (const step of steps) {
    const lastStep = merged[merged.length - 1];

    // Merge consecutive type steps on same element
    if (
      lastStep &&
      lastStep.type === 'type' &&
      step.type === 'type' &&
      lastStep.selector === step.selector
    ) {
      lastStep.value = step.value;
      lastStep.description = `Type "${step.value}" into ${step.selector}`;
      continue;
    }

    // Skip duplicate consecutive clicks on same element
    if (
      lastStep &&
      lastStep.type === 'click' &&
      step.type === 'click' &&
      lastStep.selector === step.selector
    ) {
      continue;
    }

    merged.push(step);
  }

  return merged;
}

export default {
  getBookmarkletCode,
  generateSelector,
  eventsToSteps,
  mergeSteps
};
