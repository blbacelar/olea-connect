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

  originalTextValues.set(node, originalValue);

  if (translated !== node.nodeValue) {
    node.nodeValue = translated;
  }
}

function translateElementAttributes(element: Element) {
  if (element.closest(skippedAttributeElementSelector)) return;

  for (const attribute of translatableAttributes) {
    const value = element.getAttribute(attribute);
    if (!value) continue;

    let originalAttributes = originalAttributeValues.get(element);
    if (!originalAttributes) {
      originalAttributes = new Map<string, string>();
      originalAttributeValues.set(element, originalAttributes);
    }

    const previousOriginal = originalAttributes.get(attribute);
    const previousTranslation = previousOriginal
      ? translateFrenchUiText(previousOriginal)
      : null;
    const originalValue =
      previousOriginal && value === previousTranslation
        ? previousOriginal
        : value;
    const translated = translateFrenchUiText(originalValue);

    originalAttributes.set(attribute, originalValue);

    if (translated !== value) {
      element.setAttribute(attribute, translated);
    }
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
    if (!node.isConnected) {
      originalTextValues.delete(node);
    } else if (!shouldSkipNode(node)) {
      node.nodeValue = value;
    }
  }

  for (const [element, attributes] of originalAttributeValues) {
    if (!element.isConnected) {
      originalAttributeValues.delete(element);
      continue;
    }

    for (const [attribute, value] of attributes) {
      element.setAttribute(attribute, value);
    }
  }
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
