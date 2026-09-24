"use client";

import { useEffect, type ReactNode } from "react";

import { useLocaleContext } from "@/components/i18n/LocaleProvider";
import { translateFrenchUiText } from "@/lib/i18n/french-runtime-translations";

const translatableAttributes = ["aria-label", "placeholder", "title"];
const skippedElementSelector = [
  "script",
  "style",
  "code",
  "pre",
  "kbd",
  "textarea",
  "input",
  "[contenteditable='true']",
  "[data-no-translate]",
].join(",");
const skippedAttributeElementSelector = [
  "script",
  "style",
  "code",
  "pre",
  "kbd",
  "[data-no-translate]",
].join(",");

const originalTextValues = new Map<Text, string>();
const originalAttributeValues = new Map<Element, Map<string, string>>();

function shouldSkipNode(node: Node) {
  const parent = node.parentElement;
  return !parent || Boolean(parent.closest(skippedElementSelector));
}

function translateTextNode(node: Text) {
  if (shouldSkipNode(node)) return;

  const value = node.nodeValue ?? "";
  const previousOriginal = originalTextValues.get(node);
  const previousTranslation = previousOriginal
    ? translateFrenchUiText(previousOriginal)
    : null;
  const originalValue =
    previousOriginal && value === previousTranslation ? previousOriginal : value;
  const translated = translateFrenchUiText(originalValue);

  if (translated === value) {
    if (previousOriginal !== undefined && value !== previousTranslation) {
      originalTextValues.delete(node);
    }
    return;
  }

  originalTextValues.set(node, originalValue);
  node.nodeValue = translated;
}

function rememberOriginalAttribute(
  element: Element,
  attribute: string,
  value: string,
) {
  let originals = originalAttributeValues.get(element);
  if (!originals) {
    originals = new Map<string, string>();
    originalAttributeValues.set(element, originals);
  }
  originals.set(attribute, value);
}

function translateElementAttributes(element: Element) {
  if (element.closest(skippedAttributeElementSelector)) return;

  for (const attribute of translatableAttributes) {
    const value = element.getAttribute(attribute);
    if (!value) continue;

    const previousOriginal = originalAttributeValues.get(element)?.get(attribute);
    const previousTranslation = previousOriginal
      ? translateFrenchUiText(previousOriginal)
      : null;
    const originalValue =
      previousOriginal && value === previousTranslation
        ? previousOriginal
        : value;
    const translated = translateFrenchUiText(originalValue);

    if (translated === value) {
      if (previousOriginal !== undefined && value !== previousTranslation) {
        originalAttributeValues.get(element)?.delete(attribute);
      }
      continue;
    }

    rememberOriginalAttribute(element, attribute, originalValue);
    element.setAttribute(attribute, translated);
  }
}

function translateTree(root: ParentNode) {
  const textWalker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);

  while (textWalker.nextNode()) {
    translateTextNode(textWalker.currentNode as Text);
  }

  if (root instanceof Element) {
    translateElementAttributes(root);
  }

  root.querySelectorAll?.("*").forEach((element) => {
    translateElementAttributes(element);
  });
}

function restoreOriginalText() {
  for (const [node, value] of originalTextValues) {
    if (
      node.isConnected &&
      !shouldSkipNode(node) &&
      node.nodeValue === translateFrenchUiText(value)
    ) {
      node.nodeValue = value;
    }
  }
  originalTextValues.clear();

  for (const [element, attributes] of originalAttributeValues) {
    for (const [attribute, value] of attributes) {
      if (
        element.isConnected &&
        element.getAttribute(attribute) === translateFrenchUiText(value)
      ) {
        element.setAttribute(attribute, value);
      }
    }
  }
  originalAttributeValues.clear();
}

export function FrenchRuntimeTranslator({
  children,
}: {
  children: ReactNode;
}) {
  const { locale } = useLocaleContext();

  useEffect(() => {
    if (locale !== "fr-CA") {
      restoreOriginalText();
      return;
    }

    translateTree(document.body);

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === "characterData") {
          translateTextNode(mutation.target as Text);
          continue;
        }

        if (
          mutation.type === "attributes" &&
          mutation.target instanceof Element
        ) {
          translateElementAttributes(mutation.target);
          continue;
        }

        for (const node of Array.from(mutation.addedNodes)) {
          if (node.nodeType === Node.TEXT_NODE) {
            translateTextNode(node as Text);
          } else if (node instanceof Element) {
            translateTree(node);
          }
        }
      }
    });

    observer.observe(document.body, {
      attributeFilter: translatableAttributes,
      attributes: true,
      childList: true,
      characterData: true,
      subtree: true,
    });

    return () => observer.disconnect();
  }, [locale]);

  return <>{children}</>;
}
