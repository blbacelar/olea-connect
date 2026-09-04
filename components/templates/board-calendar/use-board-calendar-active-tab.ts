import { useEffect, useRef, useState } from "react";

import {
  isBoardCalendarModuleTab,
  type BoardCalendarModuleTab,
} from "./workbench-options";

const boardCalendarActiveTabStorageKey = "olea:board-calendar:active-tab";

function getBoardCalendarActiveTabStorageKey() {
  return `${boardCalendarActiveTabStorageKey}:${window.location.pathname}`;
}

export function useBoardCalendarActiveTab() {
  const [activeTab, setActiveTab] =
    useState<BoardCalendarModuleTab>("dashboard");
  const hasMountedActiveTabPersistence = useRef(false);

  useEffect(() => {
    const storedTab = window.sessionStorage.getItem(
      getBoardCalendarActiveTabStorageKey(),
    );
    if (storedTab && isBoardCalendarModuleTab(storedTab)) {
      setActiveTab(storedTab);
    }
  }, []);

  useEffect(() => {
    if (!hasMountedActiveTabPersistence.current) {
      hasMountedActiveTabPersistence.current = true;
      return;
    }

    window.sessionStorage.setItem(
      getBoardCalendarActiveTabStorageKey(),
      activeTab,
    );
  }, [activeTab]);

  return { activeTab, setActiveTab };
}
